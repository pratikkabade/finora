import { useState, useEffect, useMemo, useCallback, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, CalendarDays, Calendar1, ArrowUpDown, LayoutGrid, Table, Download, Search, ChevronDown, X } from 'lucide-react';
import type { Account, Category, FinanceData, PlannedPaymentRule, Transaction } from './types/finance.types';
import { CreateTransactionModal } from './components/CreateTransactionModal';
import { AddTransactionPage } from './pages/AddTransactionPage';
import { PlannedPaymentsPage } from './pages/PlannedPaymentsPage';
import { SettingsModal } from './components/SettingsModal';
import { DateRangeModal } from './components/DateRangeModal';
import { DataSourceModal } from './components/DataSourceModal';
import { TransactionCard } from './components/TransactionCard';
import { TransactionTable } from './components/TransactionTable';
import { ExportTransactionsModal } from './components/ExportTransactionsModal';
import { ExpensePieChart } from './components/ExpensePieChart';
import { IncomeExpenseTrendChart } from './components/IncomeExpenseTrendChart';
import { YearlyCashflowHeatmap } from './components/YearlyCashflowHeatmap';
import { SkeletonApp } from './components/SkeletonLoader';
import { LoginPage } from './pages/LoginPage';
import { AboutPage } from './pages/AboutPage';
import { PINVerificationModal } from './components/PINVerificationModal';
import { useAuth } from './context/AuthContext';
import { getPINStatus } from './services/pinService';
import {
    generateMonthYearOptions,
    filterTransactionsByMonth,
    getCurrentOrPastTransactions,
    generateUUID,
} from './utils/dateUtils';
import {
    saveToLocalStorage,
    loadFromLocalStorage,
    loadBalanceSummaryFromLocalStorage,
    clearUserData,
    calculateBalanceSummary,
    getIncludedNetBalanceAccountIds,
    getLastCloudBackupDate,
    getLocalModifiedDate,
    getLocalSyncQueue,
    clearLocalSyncQueue,
    markLocalSyncNeedsFullBackup,
    NET_BALANCE_ACCOUNT_IDS_PREF_KEY,
    queueLocalSyncDeletes,
    queueLocalSyncSharedPrefs,
    queueLocalSyncUpdates,
    setLastCloudBackupDate,
    setLocalModifiedDate,
    type BalanceSummary,
    type LocalSyncCollectionName,
} from './services/storageService';
import {
    backupFinanceDataToFirebase,
    fetchFirebaseBackupMetadata,
    fetchFinanceDataFromFirebase,
    syncFinanceDataPatchToFirebase,
    type FirebaseFinanceData,
    type FinanceDataDeletes,
} from './services/firebaseService';
import financeDataJson from './data/finance-data.json';
import './App.css';
import { formatNumberWithCommas } from './utils/numberFormatterUtils.ts';
import {
    amountCard,
    AppChartBtn,
    FreeBlueBtn,
    FreeWhiteBtn,
    SegmentedToggleItemSelected,
    SegmentedToggleItemUnselected,
    SegmentedToggleShell,
    SegmentedToggleThumb,
    SegmentedToggleTrack,
} from './constants/TailwindClasses';
import { AppShell } from './components/AppShell';
import { exportTransactionsToExcel, exportTransactionsToPdf } from './utils/reportExportUtils';
import {
    advancePlannedPaymentRule,
    getFollowingPlannedPaymentDate,
    getNextPlannedPaymentDate,
    getPlannedPaymentAlertSummary,
    normalizePlannedPaymentIntervalType,
} from './utils/plannedPaymentUtils';
import { sortCategoriesByOrder } from './utils/categoryUtils';

const GUEST_USER_ID = '__guest__';
const NORMALIZED_BACKUP_READY_KEY_PREFIX = 'normalizedCloudBackupReady_';

interface AppHeaderProps {
    onLogoClick?: () => void;
    syncStatus?: SyncDisplayState;
}

type ReportTransactionView = 'cards' | 'table';
type ReportTransactionSort = 'date' | 'amount';
export type SyncDisplayState = 'upToDate' | 'pending' | 'outOfSync' | 'localOnly' | 'unknown';

export interface SyncStatusSnapshot {
    state: SyncDisplayState;
    lastBackupDate: string | null;
    cloudBackupDate: string | null;
    localModifiedDate: string | null;
}

const getTransactionTimestamp = (transaction: Transaction) => {
    return transaction.dateTime || transaction.dueDate || 0;
};

const isSyntheticPlannedReportTransaction = (transaction: Transaction) => {
    return transaction.id.startsWith('__planned-');
};

const toReportStartOfDay = (value: number | Date) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
};

const getReportDateKey = (value: number | Date) => {
    const date = toReportStartOfDay(value);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;
};

const getReportDateFromKey = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-').map(Number);

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
        return null;
    }

    return toReportStartOfDay(new Date(year, month - 1, day));
};

const formatReportDateKey = (dateKey: string) => {
    const date = getReportDateFromKey(dateKey);

    if (!date) return '';

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

const keepIfAlreadyEmpty = (values: string[]) => values.length === 0 ? values : [];

const normalizeSearchValue = (value: unknown) => String(value ?? '').toLocaleLowerCase().trim();

const getTransactionSearchDateValues = (timestamp: number) => {
    if (!timestamp) return [];

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return [];

    return [
        date.toLocaleDateString('en-US'),
        date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        date.toISOString().slice(0, 10),
    ];
};

const transactionMatchesSearch = (
    transaction: Transaction,
    account: Account | undefined,
    category: Category | undefined,
    normalizedQuery: string,
) => {
    const timestamp = getTransactionTimestamp(transaction);
    const searchValues = [
        transaction.title,
        transaction.description,
        transaction.type,
        transaction.amount,
        transaction.toAmount,
        account?.name,
        category?.name,
        ...getTransactionSearchDateValues(timestamp),
    ];

    return searchValues.some((value) => normalizeSearchValue(value).includes(normalizedQuery));
};

const formatReportDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

const getNormalizedBackupReadyKey = (userId: string) => `${NORMALIZED_BACKUP_READY_KEY_PREFIX}${userId}`;

const isStringRecord = (value: unknown): value is Record<string, string> => {
    return typeof value === 'object'
        && value !== null
        && !Array.isArray(value)
        && Object.values(value).every((entryValue) => typeof entryValue === 'string');
};

const normalizeFinanceData = (data: FinanceData): FinanceData => {
    return {
        accounts: Array.isArray(data.accounts) ? data.accounts : [],
        categories: Array.isArray(data.categories) ? data.categories : [],
        settings: Array.isArray(data.settings) ? data.settings : [],
        transactions: Array.isArray(data.transactions) ? data.transactions : [],
        sharedPrefs: isStringRecord(data.sharedPrefs) ? data.sharedPrefs : {},
        plannedPaymentRules: Array.isArray(data.plannedPaymentRules)
            ? data.plannedPaymentRules.map((rule) => ({
                ...rule,
                intervalN: Math.max(1, Number(rule.intervalN) || 1),
                intervalType: normalizePlannedPaymentIntervalType(rule.intervalType),
                nextDueDate: typeof rule.nextDueDate === 'number'
                    ? rule.nextDueDate
                    : getNextPlannedPaymentDate({
                        ...rule,
                        intervalN: Math.max(1, Number(rule.intervalN) || 1),
                        intervalType: normalizePlannedPaymentIntervalType(rule.intervalType),
                    }),
            }))
            : [],
    };
};

const getDateTime = (dateValue: string | null) => {
    if (!dateValue) return 0;
    const timestamp = new Date(dateValue).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
};

const getItemsByIds = <T extends { id: string }>(items: T[], itemIds: string[]) => {
    const wantedIds = new Set(itemIds);
    return items.filter((item) => wantedIds.has(item.id));
};

export const AppHeader = ({ onLogoClick, syncStatus }: AppHeaderProps) => {
    const logo = <img src="/finora-icon.svg" alt="Finora Logo" className="mx-auto h-24 w-24 sm:mx-0" />;
    const syncConfig = syncStatus === 'upToDate'
        ? { dot: 'bg-green-500', text: 'uptodate', textClass: 'text-green-700 dark:text-green-400' }
        : syncStatus === 'pending'
            ? { dot: 'bg-yellow-400', text: 'sync pending', textClass: 'text-yellow-700 dark:text-yellow-400' }
            : syncStatus === 'outOfSync'
                ? { dot: 'bg-red-500', text: 'out of sync', textClass: 'text-red-700 dark:text-red-400' }
                : null;

    return (
        <div className="app-section mb-6 flex flex-row items-center gap-4 pt-5 sm:mb-8">
            {onLogoClick ? (
                <button
                    type="button"
                    onClick={onLogoClick}
                    className="cursor-pointer rounded-full transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-blue-500"
                    title="Refresh homepage"
                    aria-label="Refresh homepage"
                >
                    {logo}
                </button>
            ) : logo}
            <div className="text-left">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50 sm:text-4xl md:text-5xl">Finora</h1>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 sm:mt-2 sm:text-sm md:text-base">Clear financial insights for better decisions</p>
                {syncConfig && (
                    <div className={`mt-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] ${syncConfig.textClass}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${syncConfig.dot}`} />
                        <span>{syncConfig.text}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

function App() {
    // const { user, isLoading } = useAuth();
    const { user, isLoading: authLoading, isGuest } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const isAboutPage = location.pathname === '/about' || location.pathname === '/about/';
    const [financeData, setFinanceData] = useState<FinanceData | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPlannedPaymentModalOpen, setIsPlannedPaymentModalOpen] = useState(false);
    const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
    const [showDataSourceModal, setShowDataSourceModal] = useState(false);
    const [selectedMonthYear, setSelectedMonthYear] = useState<string>('');
    const [dateRange, setDateRange] = useState<{ start: number; end: number } | null>(null);
    const [reportTrendRange, setReportTrendRange] = useState<string>('');
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [editingPlannedPayment, setEditingPlannedPayment] = useState<PlannedPaymentRule | null>(null);
    const [selectedExpenseCategories, setSelectedExpenseCategories] = useState<string[]>([]);
    const [selectedIncomeCategories, setSelectedIncomeCategories] = useState<string[]>([]);
    const [homeVisibleCount, setHomeVisibleCount] = useState(20);
    const [transactionSearchQuery, setTransactionSearchQuery] = useState('');
    const [searchWithinSelectedRange, setSearchWithinSelectedRange] = useState(false);
    const [selectedReportDateKey, setSelectedReportDateKey] = useState('');
    const [balanceSummary, setBalanceSummary] = useState<BalanceSummary | null>(null);
    const [isContentVisible, setIsContentVisible] = useState(false);
    const [showSkeletonOverlay, setShowSkeletonOverlay] = useState(true);
    const [hasCompletedInitialHomeReveal, setHasCompletedInitialHomeReveal] = useState(false);
    const [reportTransactionView, setReportTransactionView] = useState<ReportTransactionView>('cards');
    const [reportTransactionSort, setReportTransactionSort] = useState<ReportTransactionSort>('date');
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const isSessionActive = !!user || isGuest;
    const storageUserId = user?.uid ?? (isGuest ? GUEST_USER_ID : null);
    const cloudUserId = user?.uid ?? null;
    const [isPINVerified, setIsPINVerified] = useState(false);
    const [showPINModal, setShowPINModal] = useState(false);
    const [cloudLastBackupDate, setCloudLastBackupDate] = useState<string | null>(null);
    const [syncMetadataVersion, setSyncMetadataVersion] = useState(0);
    const shouldMarkNextLocalSaveModifiedRef = useRef(false);

    const markNormalizedCloudBackupReady = useCallback((isReady: boolean) => {
        if (!cloudUserId) return;

        const key = getNormalizedBackupReadyKey(cloudUserId);
        if (isReady) {
            localStorage.setItem(key, 'true');
            return;
        }

        localStorage.removeItem(key);
    }, [cloudUserId]);

    const markNextLocalSaveAsModified = useCallback(() => {
        shouldMarkNextLocalSaveModifiedRef.current = true;
        setSyncMetadataVersion((version) => version + 1);
    }, []);

    const queueChangedItems = useCallback((collectionName: LocalSyncCollectionName, itemIds: string[]) => {
        if (!storageUserId) return;
        queueLocalSyncUpdates(storageUserId, collectionName, itemIds);
    }, [storageUserId]);

    const queueDeletedItems = useCallback((collectionName: LocalSyncCollectionName, itemIds: string[]) => {
        if (!storageUserId) return;
        queueLocalSyncDeletes(storageUserId, collectionName, itemIds);
    }, [storageUserId]);

    const queueFullBackup = useCallback(() => {
        if (!storageUserId) return;
        markLocalSyncNeedsFullBackup(storageUserId);
    }, [storageUserId]);

    const queueSharedPrefsChange = useCallback(() => {
        if (!storageUserId) return;
        queueLocalSyncSharedPrefs(storageUserId);
    }, [storageUserId]);

    const markNextLocalSaveAsUnmodified = useCallback(() => {
        shouldMarkNextLocalSaveModifiedRef.current = false;
    }, []);

    const refreshCloudBackupMetadata = useCallback(async () => {
        if (!cloudUserId) {
            setCloudLastBackupDate(null);
            return;
        }

        const metadata = await fetchFirebaseBackupMetadata(cloudUserId);
        setCloudLastBackupDate(metadata?.lastBackupDate ?? null);
        markNormalizedCloudBackupReady(metadata?.backupFormat === 'normalized' || metadata?.schemaVersion === 2);
    }, [cloudUserId, markNormalizedCloudBackupReady]);

    useEffect(() => {
        if (!cloudUserId || authLoading) {
            setCloudLastBackupDate(null);
            return;
        }

        void refreshCloudBackupMetadata().catch((error) => {
            console.warn('Could not refresh Firebase backup metadata:', error);
        });
    }, [cloudUserId, authLoading, refreshCloudBackupMetadata]);

    useEffect(() => {
        setIsPINVerified(false);
        setShowPINModal(false);
    }, [storageUserId]);

    useEffect(() => {
        if (!storageUserId || authLoading) {
            setShowPINModal(false);
            return;
        }

        const isHomePage = location.pathname === '/';
        const pinStatus = getPINStatus(storageUserId);

        if (isHomePage && pinStatus.isPINSet && !isPINVerified) {
            setShowPINModal(true);
            return;
        }

        setShowPINModal(false);
    }, [location.pathname, storageUserId, authLoading, isPINVerified]);

    useEffect(() => {
        if (authLoading) return;

        const loadData = async () => {
            try {
                if (!storageUserId) {
                    setFinanceData(null);
                    setBalanceSummary(null);
                    setShowDataSourceModal(false);
                    return;
                }

                const localData = loadFromLocalStorage(storageUserId);
                if (localData) {
                    markNextLocalSaveAsUnmodified();
                    setFinanceData(normalizeFinanceData(localData));
                    setBalanceSummary(loadBalanceSummaryFromLocalStorage(storageUserId));
                    setShowDataSourceModal(false);
                    return;
                }

                setBalanceSummary(null);
                setShowDataSourceModal(true);
            } finally {
                // Data loading complete.
            }
        };

        loadData();
    }, [storageUserId, authLoading]);

    useEffect(() => {
        if (financeData && storageUserId) {
            const markModified = shouldMarkNextLocalSaveModifiedRef.current;
            shouldMarkNextLocalSaveModifiedRef.current = false;
            const summary = saveToLocalStorage(storageUserId, financeData, { markModified });
            setBalanceSummary(summary);
            setSyncMetadataVersion((version) => version + 1);
            return;
        }

        setBalanceSummary(null);
    }, [financeData, storageUserId]);

    const handleBackupToFirebase = async () => {
        if (!user || !financeData || !storageUserId) {
            throw new Error('User not authenticated or no data to backup');
        }

        const syncQueue = getLocalSyncQueue(storageUserId);
        const queuedUpdates = syncQueue.updated;
        const queuedDeletes = syncQueue.deleted;
        const hasQueuedUpdates = Object.values(queuedUpdates).some((itemIds) => itemIds.length > 0);
        const hasQueuedDeletes = Object.values(queuedDeletes).some((itemIds) => itemIds.length > 0);
        const shouldUseFullBackup = syncQueue.needsFullBackup
            || syncStatusSnapshot.state === 'outOfSync'
            || !syncStatusSnapshot.lastBackupDate
            || (!hasQueuedUpdates && !hasQueuedDeletes && !syncQueue.sharedPrefs);

        const backupDate = shouldUseFullBackup
            ? await backupFinanceDataToFirebase(user.uid, financeData)
            : await syncFinanceDataPatchToFirebase(
                user.uid,
                {
                    accounts: getItemsByIds(financeData.accounts, queuedUpdates.accounts),
                    categories: getItemsByIds(financeData.categories, queuedUpdates.categories),
                    transactions: getItemsByIds(financeData.transactions, queuedUpdates.transactions),
                    plannedPaymentRules: getItemsByIds(financeData.plannedPaymentRules, queuedUpdates.plannedPaymentRules),
                    settings: getItemsByIds(financeData.settings, queuedUpdates.settings),
                    ...(syncQueue.sharedPrefs ? { sharedPrefs: financeData.sharedPrefs } : {}),
                },
                {
                    deletes: queuedDeletes as FinanceDataDeletes,
                    snapshotData: financeData,
                },
            );

        setLastCloudBackupDate(storageUserId, backupDate);
        setLocalModifiedDate(storageUserId, backupDate);
        clearLocalSyncQueue(storageUserId);
        setCloudLastBackupDate(backupDate);
        setSyncMetadataVersion((version) => version + 1);
        markNormalizedCloudBackupReady(true);
    };

    const syncStatusSnapshot = useMemo<SyncStatusSnapshot>(() => {
        if (!storageUserId || !cloudUserId) {
            return {
                state: 'localOnly',
                lastBackupDate: null,
                cloudBackupDate: null,
                localModifiedDate: null,
            };
        }

        const lastBackupDate = getLastCloudBackupDate(storageUserId);
        const localModifiedDate = getLocalModifiedDate(storageUserId);
        const localBackupTime = getDateTime(lastBackupDate);
        const localModifiedTime = getDateTime(localModifiedDate);
        const cloudBackupTime = getDateTime(cloudLastBackupDate);

        if (cloudBackupTime > localBackupTime) {
            return { state: 'outOfSync', lastBackupDate, cloudBackupDate: cloudLastBackupDate, localModifiedDate };
        }

        if (localModifiedTime > localBackupTime) {
            return { state: 'pending', lastBackupDate, cloudBackupDate: cloudLastBackupDate, localModifiedDate };
        }

        if (cloudBackupTime > 0 && localBackupTime > 0 && cloudBackupTime === localBackupTime) {
            return { state: 'upToDate', lastBackupDate, cloudBackupDate: cloudLastBackupDate, localModifiedDate };
        }

        if (localBackupTime > 0 && !cloudLastBackupDate) {
            return { state: 'unknown', lastBackupDate, cloudBackupDate: cloudLastBackupDate, localModifiedDate };
        }

        return { state: localModifiedDate ? 'pending' : 'localOnly', lastBackupDate, cloudBackupDate: cloudLastBackupDate, localModifiedDate };
    }, [cloudLastBackupDate, cloudUserId, storageUserId, syncMetadataVersion]);

    const netBalanceAccountIds = useMemo(() => {
        if (!financeData) return [];
        return getIncludedNetBalanceAccountIds(financeData);
    }, [financeData]);
    const visibleAccountIds = useMemo(() => new Set(netBalanceAccountIds), [netBalanceAccountIds]);
    const defaultTransactionAccountId = netBalanceAccountIds[0] ?? financeData?.accounts?.[0]?.id ?? '';

    const validTransactions = useMemo(() => {
        if (!financeData) return [];
        return getCurrentOrPastTransactions(financeData.transactions)
            .filter((transaction) => visibleAccountIds.has(transaction.accountId));
    }, [financeData, visibleAccountIds]);

    const accountById = useMemo(() => {
        return new Map((financeData?.accounts ?? []).map((account) => [account.id, account]));
    }, [financeData?.accounts]);

    const categoryById = useMemo(() => {
        return new Map((financeData?.categories ?? []).map((category) => [category.id, category]));
    }, [financeData?.categories]);

    const monthYearOptions = useMemo(() => {
        return generateMonthYearOptions(validTransactions);
    }, [validTransactions]);
    const reportYearOptions = useMemo(() => {
        const yearSet = new Set(monthYearOptions.map((option) => option.year.toString()));
        const currentYear = new Date().getFullYear();
        const plannedYearLimit = currentYear + 5;

        yearSet.add(currentYear.toString());

        (financeData?.transactions ?? []).forEach((transaction) => {
            const timestamp = getTransactionTimestamp(transaction);
            if (!timestamp) return;

            yearSet.add(new Date(timestamp).getFullYear().toString());
        });

        (financeData?.plannedPaymentRules ?? []).forEach((rule) => {
            if (!visibleAccountIds.has(rule.accountId)) return;
            if (rule.type !== 'EXPENSE') return;

            let occurrenceDate = toReportStartOfDay(rule.nextDueDate ?? rule.startDate).getTime();
            let safetyCounter = 0;

            while (new Date(occurrenceDate).getFullYear() <= plannedYearLimit && safetyCounter < 800) {
                yearSet.add(new Date(occurrenceDate).getFullYear().toString());

                if (rule.oneTime) break;

                const nextOccurrenceDate = getFollowingPlannedPaymentDate(rule, occurrenceDate);
                if (nextOccurrenceDate <= occurrenceDate) break;
                occurrenceDate = toReportStartOfDay(nextOccurrenceDate).getTime();
                safetyCounter += 1;
            }
        });

        return Array.from(yearSet)
            .sort((yearA, yearB) => Number(yearA) - Number(yearB));
    }, [financeData?.plannedPaymentRules, financeData?.transactions, monthYearOptions, visibleAccountIds]);
    const activeReportTrendRange = useMemo(() => {
        if (dateRange) {
            return '';
        }

        if (selectedMonthYear) {
            return selectedMonthYear.split('-')[0] ?? '';
        }

        if (reportTrendRange === 'max') {
            return 'max';
        }

        if (reportTrendRange && reportYearOptions.includes(reportTrendRange)) {
            return reportTrendRange;
        }

        const currentYear = new Date().getFullYear().toString();
        return reportYearOptions.includes(currentYear)
            ? currentYear
            : reportYearOptions[reportYearOptions.length - 1] ?? '';
    }, [dateRange, selectedMonthYear, reportTrendRange, reportYearOptions]);

    const activeMonthYear = useMemo(() => {
        if (dateRange) {
            return '';
        }

        if (selectedMonthYear && monthYearOptions.some(option => option.value === selectedMonthYear)) {
            return selectedMonthYear;
        }

        return monthYearOptions[0]?.value ?? '';
    }, [dateRange, selectedMonthYear, monthYearOptions]);

    const filteredTransactions = useMemo(() => {
        if (!activeMonthYear && !dateRange) return [];

        let transactions = validTransactions;

        if (dateRange) {
            transactions = transactions.filter((transaction) => {
                const txDate = transaction.dateTime || transaction.dueDate || 0;
                return txDate >= dateRange.start && txDate <= dateRange.end;
            });
        } else if (activeMonthYear) {
            const [year, month] = activeMonthYear.split('-').map(Number);
            transactions = filterTransactionsByMonth(validTransactions, month, year);
        }

        return transactions;
    }, [validTransactions, activeMonthYear, dateRange]);

    const homeTransactions = useMemo(() => {
        const baseTransactions = dateRange || selectedMonthYear ? filteredTransactions : validTransactions;

        return [...baseTransactions].sort((transactionA, transactionB) => {
            return getTransactionTimestamp(transactionB) - getTransactionTimestamp(transactionA);
        });
    }, [filteredTransactions, validTransactions, dateRange, selectedMonthYear]);

    const activeSearchMonthYear = useMemo(() => {
        if (selectedMonthYear && monthYearOptions.some((option) => option.value === selectedMonthYear)) {
            return selectedMonthYear;
        }

        return '';
    }, [selectedMonthYear, monthYearOptions]);

    const hasSelectedTransactionSearchRange = Boolean(dateRange || activeSearchMonthYear);

    const selectedTransactionSearchRangeLabel = useMemo(() => {
        if (dateRange) {
            return `${formatReportDate(dateRange.start)} - ${formatReportDate(dateRange.end)}`;
        }

        if (activeSearchMonthYear) {
            return monthYearOptions.find((option) => option.value === activeSearchMonthYear)?.label || 'Selected range';
        }

        return 'No range selected';
    }, [dateRange, activeSearchMonthYear, monthYearOptions]);

    const selectedRangeSearchTransactions = useMemo(() => {
        if (!financeData || !hasSelectedTransactionSearchRange) return [];

        if (dateRange) {
            return financeData.transactions.filter((transaction) => {
                const txDate = getTransactionTimestamp(transaction);
                return txDate >= dateRange.start && txDate <= dateRange.end;
            });
        }

        const [year, month] = activeSearchMonthYear.split('-').map(Number);
        return filterTransactionsByMonth(financeData.transactions, month, year);
    }, [financeData, hasSelectedTransactionSearchRange, dateRange, activeSearchMonthYear]);

    const normalizedTransactionSearchQuery = normalizeSearchValue(transactionSearchQuery);
    const hasActiveTransactionSearch = normalizedTransactionSearchQuery.length > 0;

    const transactionSearchSourceTransactions = useMemo(() => {
        if (!financeData) return [];

        const sourceTransactions = searchWithinSelectedRange && hasSelectedTransactionSearchRange
            ? selectedRangeSearchTransactions
            : financeData.transactions;

        return [...sourceTransactions].sort((transactionA, transactionB) => {
            return getTransactionTimestamp(transactionB) - getTransactionTimestamp(transactionA);
        });
    }, [financeData, searchWithinSelectedRange, hasSelectedTransactionSearchRange, selectedRangeSearchTransactions]);

    const transactionSearchResults = useMemo(() => {
        if (!hasActiveTransactionSearch) return [];

        return transactionSearchSourceTransactions.filter((transaction) => {
            return transactionMatchesSearch(
                transaction,
                accountById.get(transaction.accountId),
                categoryById.get(transaction.categoryId || ''),
                normalizedTransactionSearchQuery,
            );
        });
    }, [transactionSearchSourceTransactions, accountById, categoryById, hasActiveTransactionSearch, normalizedTransactionSearchQuery]);

    const transactionSearchScopeLabel = searchWithinSelectedRange && hasSelectedTransactionSearchRange
        ? selectedTransactionSearchRangeLabel
        : 'Entire database';

    const handleCreateTransaction = (transaction: Transaction) => {
        if (!financeData) return;

        markNextLocalSaveAsModified();
        queueChangedItems('transactions', [transaction.id]);

        if (editingTransaction) {
            setFinanceData({
                ...financeData,
                transactions: financeData.transactions.map((item) => item.id === transaction.id ? transaction : item),
            });
            setEditingTransaction(null);
            return;
        }

        setFinanceData({
            ...financeData,
            transactions: [...financeData.transactions, transaction],
        });
    };

    const handleCreatePlannedPayment = (plannedPaymentRule: PlannedPaymentRule) => {
        if (!financeData) return;

        const nextRule = {
            ...plannedPaymentRule,
            nextDueDate: plannedPaymentRule.nextDueDate ?? plannedPaymentRule.startDate,
        };

        markNextLocalSaveAsModified();
        queueChangedItems('plannedPaymentRules', [nextRule.id]);

        if (editingPlannedPayment) {
            setFinanceData({
                ...financeData,
                plannedPaymentRules: financeData.plannedPaymentRules.map((rule) => {
                    return rule.id === nextRule.id ? nextRule : rule;
                }),
            });
            setEditingPlannedPayment(null);
            setIsPlannedPaymentModalOpen(false);
            return;
        }

        setFinanceData({
            ...financeData,
            plannedPaymentRules: [...(financeData.plannedPaymentRules ?? []), nextRule],
        });
    };

    const handleDeletePlannedPayment = (plannedPaymentRuleId: string) => {
        if (!financeData) return;

        markNextLocalSaveAsModified();
        queueDeletedItems('plannedPaymentRules', [plannedPaymentRuleId]);
        setFinanceData({
            ...financeData,
            plannedPaymentRules: financeData.plannedPaymentRules.filter((rule) => rule.id !== plannedPaymentRuleId),
        });
        setEditingPlannedPayment(null);
        setIsPlannedPaymentModalOpen(false);
    };

    const handlePayPlannedPayment = (plannedPaymentRule: PlannedPaymentRule) => {
        if (!financeData) return;

        const occurrenceDate = getNextPlannedPaymentDate(plannedPaymentRule);
        const transaction: Transaction = {
            id: generateUUID(),
            accountId: plannedPaymentRule.accountId,
            type: plannedPaymentRule.type,
            amount: plannedPaymentRule.amount,
            title: plannedPaymentRule.title,
            categoryId: plannedPaymentRule.categoryId,
            dateTime: Date.now(),
            isSynced: false,
        };
        const advancedRule = advancePlannedPaymentRule(plannedPaymentRule, occurrenceDate);

        markNextLocalSaveAsModified();
        queueChangedItems('transactions', [transaction.id]);
        if (advancedRule) {
            queueChangedItems('plannedPaymentRules', [advancedRule.id]);
        } else {
            queueDeletedItems('plannedPaymentRules', [plannedPaymentRule.id]);
        }
        setFinanceData({
            ...financeData,
            transactions: [...financeData.transactions, transaction],
            plannedPaymentRules: advancedRule
                ? financeData.plannedPaymentRules.map((rule) => {
                    return rule.id === plannedPaymentRule.id ? advancedRule : rule;
                })
                : financeData.plannedPaymentRules.filter((rule) => rule.id !== plannedPaymentRule.id),
        });
    };

    const handleSkipPlannedPayment = (plannedPaymentRule: PlannedPaymentRule) => {
        if (!financeData) return;

        const occurrenceDate = getNextPlannedPaymentDate(plannedPaymentRule);
        const advancedRule = advancePlannedPaymentRule(plannedPaymentRule, occurrenceDate);

        markNextLocalSaveAsModified();
        if (advancedRule) {
            queueChangedItems('plannedPaymentRules', [advancedRule.id]);
        } else {
            queueDeletedItems('plannedPaymentRules', [plannedPaymentRule.id]);
        }
        setFinanceData({
            ...financeData,
            plannedPaymentRules: advancedRule
                ? financeData.plannedPaymentRules.map((rule) => {
                    return rule.id === plannedPaymentRule.id ? advancedRule : rule;
                })
                : financeData.plannedPaymentRules.filter((rule) => rule.id !== plannedPaymentRule.id),
        });
    };

    const handleDeleteTransaction = (transactionId: string) => {
        if (!financeData) return;

        markNextLocalSaveAsModified();
        queueDeletedItems('transactions', [transactionId]);
        setFinanceData({
            ...financeData,
            transactions: financeData.transactions.filter(transaction => transaction.id !== transactionId),
        });
    };

    const handleResetData = () => {
        if (!storageUserId) return;

        clearUserData(storageUserId);
        markNormalizedCloudBackupReady(false);
        setCloudLastBackupDate(null);
        setSyncMetadataVersion((version) => version + 1);
        setFinanceData(null);
        setSelectedMonthYear('');
        setDateRange(null);
        setIsPlannedPaymentModalOpen(false);
        setEditingPlannedPayment(null);
        setEditingTransaction(null);
        setSelectedExpenseCategories([]);
        setSelectedIncomeCategories([]);
        setBalanceSummary(null);
        setShowDataSourceModal(true);
    };

    const handleImportData = (importedData: FinanceData) => {
        markNormalizedCloudBackupReady(false);
        markNextLocalSaveAsModified();
        queueFullBackup();
        setFinanceData(normalizeFinanceData(importedData));
        setSelectedMonthYear('');
        setDateRange(null);
        setIsPlannedPaymentModalOpen(false);
        setEditingPlannedPayment(null);
        setEditingTransaction(null);
        setSelectedExpenseCategories([]);
        setSelectedIncomeCategories([]);
    };

    const handleUpdateNetBalanceAccounts = (accountIds: string[]) => {
        if (!financeData) return;

        const nextSharedPrefs = {
            ...(financeData.sharedPrefs || {}),
            [NET_BALANCE_ACCOUNT_IDS_PREF_KEY]: JSON.stringify(accountIds),
        };

        setFinanceData({
            ...financeData,
            sharedPrefs: nextSharedPrefs,
        });
        markNextLocalSaveAsModified();
        queueSharedPrefsChange();
    };

    const handleAddCategory = (categoryName: string, color: number): boolean => {
        if (!financeData) return false;

        const trimmedCategoryName = categoryName.trim();
        if (!trimmedCategoryName) {
            alert('Category name is required.');
            return false;
        }

        const isDuplicateCategory = financeData.categories.some(
            (category) => category.name.trim().toLowerCase() === trimmedCategoryName.toLowerCase(),
        );

        if (isDuplicateCategory) {
            alert('A category with this name already exists.');
            return false;
        }

        const nextOrderNum = financeData.categories.reduce((maxOrderNum, category) => {
            return Math.max(maxOrderNum, Number(category.orderNum) || 0);
        }, 0) + 1;

        const newCategory: Category = {
            id: generateUUID(),
            name: trimmedCategoryName,
            color,
            icon: 'category',
            orderNum: nextOrderNum,
            isSynced: false,
        };

        setFinanceData({
            ...financeData,
            categories: [...financeData.categories, newCategory],
        });
        markNextLocalSaveAsModified();
        queueChangedItems('categories', [newCategory.id]);
        return true;
    };

    const handleRenameCategory = (categoryId: string, categoryName: string): boolean => {
        if (!financeData) return false;

        const trimmedCategoryName = categoryName.trim();
        if (!trimmedCategoryName) {
            alert('Category name is required.');
            return false;
        }

        const currentCategory = financeData.categories.find((category) => category.id === categoryId);
        if (!currentCategory) {
            return false;
        }

        const isDuplicateCategory = financeData.categories.some(
            (category) => category.id !== categoryId && category.name.trim().toLowerCase() === trimmedCategoryName.toLowerCase(),
        );

        if (isDuplicateCategory) {
            alert('A category with this name already exists.');
            return false;
        }

        if (currentCategory.name.trim() === trimmedCategoryName) {
            return true;
        }

        const nextCategory: Category = {
            ...currentCategory,
            name: trimmedCategoryName,
            isSynced: false,
        };

        setFinanceData({
            ...financeData,
            categories: financeData.categories.map((category) => category.id === categoryId
                ? nextCategory
                : category),
        });
        markNextLocalSaveAsModified();
        queueChangedItems('categories', [nextCategory.id]);
        return true;
    };

    const handleUpdateCategoryColor = (categoryId: string, color: number): boolean => {
        if (!financeData) return false;

        const currentCategory = financeData.categories.find((category) => category.id === categoryId);
        if (!currentCategory) {
            return false;
        }

        if (currentCategory.color === color) {
            return true;
        }

        const nextCategory: Category = {
            ...currentCategory,
            color,
            isSynced: false,
        };

        setFinanceData({
            ...financeData,
            categories: financeData.categories.map((category) => category.id === categoryId
                ? nextCategory
                : category),
        });
        markNextLocalSaveAsModified();
        queueChangedItems('categories', [nextCategory.id]);
        return true;
    };

    const handleReorderCategories = (orderedCategoryIds: string[]): boolean => {
        if (!financeData) return false;
        if (orderedCategoryIds.length !== financeData.categories.length) {
            return false;
        }

        const currentOrderedCategoryIds = sortCategoriesByOrder(financeData.categories).map((category) => category.id);
        const isSameOrder = currentOrderedCategoryIds.every((categoryId, index) => categoryId === orderedCategoryIds[index]);
        if (isSameOrder) {
            return true;
        }

        const categoriesById = new Map(financeData.categories.map((category) => [category.id, category]));
        const nextCategories: Category[] = [];

        for (const [index, categoryId] of orderedCategoryIds.entries()) {
            const currentCategory = categoriesById.get(categoryId);
            if (!currentCategory) {
                return false;
            }

            const nextOrderNum = index + 1;
            nextCategories.push({
                ...currentCategory,
                orderNum: nextOrderNum,
                isSynced: currentCategory.orderNum === nextOrderNum ? currentCategory.isSynced : false,
            });
        }

        setFinanceData({
            ...financeData,
            categories: nextCategories,
        });
        markNextLocalSaveAsModified();
        queueChangedItems('categories', nextCategories.map((category) => category.id));
        return true;
    };

    const handleDeleteCategory = (categoryId: string): boolean => {
        if (!financeData) return false;

        const categoryExists = financeData.categories.some((category) => category.id === categoryId);
        if (!categoryExists) {
            return false;
        }

        setFinanceData({
            ...financeData,
            categories: financeData.categories.filter((category) => category.id !== categoryId),
        });
        markNextLocalSaveAsModified();
        queueDeletedItems('categories', [categoryId]);
        return true;
    };

    const applyFirebaseData = (firebaseData: FinanceData, lastBackupDate?: string | null) => {
        markNextLocalSaveAsUnmodified();
        if (storageUserId) {
            const restoredBackupDate = lastBackupDate ?? new Date().toISOString();
            setLastCloudBackupDate(storageUserId, restoredBackupDate);
            setLocalModifiedDate(storageUserId, restoredBackupDate);
            clearLocalSyncQueue(storageUserId);
            setCloudLastBackupDate(restoredBackupDate);
            setSyncMetadataVersion((version) => version + 1);
        }
        setFinanceData(normalizeFinanceData(firebaseData));
        setShowDataSourceModal(false);
    };

    const applyFetchedFirebaseData = (firebaseData: FirebaseFinanceData) => {
        markNormalizedCloudBackupReady(firebaseData.__source === 'normalized');
        applyFirebaseData(firebaseData, firebaseData.lastBackupDate);
    };

    const handleFetchFromFirebase = async () => {
        if (!user) return;

        try {
            const firebaseData = await fetchFinanceDataFromFirebase(user.uid);
            if (firebaseData) {
                applyFetchedFirebaseData(firebaseData);
                return;
            }

            alert('No data found in Firebase. Starting with sample data instead.');
            handleGetSampleData();
        } catch (error) {
            console.error('Error fetching from Firebase:', error);
            alert('Failed to fetch data from Firebase. Starting with sample data instead.');
            handleGetSampleData();
        }
    };

    const handleSyncFromFirebase = async () => {
        if (!user) {
            throw new Error('User is not authenticated');
        }

        const firebaseData = await fetchFinanceDataFromFirebase(user.uid, { throwOnTransientError: true });
        if (!firebaseData) {
            throw new Error('No data found in Firebase backup for this account.');
        }

        applyFetchedFirebaseData(firebaseData);
    };

    const handleGetSampleData = () => {
        const sampleData = normalizeFinanceData(financeDataJson as FinanceData);
        markNormalizedCloudBackupReady(false);
        markNextLocalSaveAsModified();
        queueFullBackup();
        setFinanceData(sampleData);
        setShowDataSourceModal(false);
    };

    const handleApplyDateRange = (startDate: number, endDate: number) => {
        setDateRange({ start: startDate, end: endDate });
        setSelectedMonthYear('');
        setSelectedReportDateKey('');
    };

    const handleApplyReportTrendRange = (rangeValue: string) => {
        setReportTrendRange(rangeValue);
        setSelectedMonthYear('');
        setDateRange(null);
        setSelectedReportDateKey('');
    };

    const handleApplyMonthSelection = (monthYear: string) => {
        setSelectedMonthYear(monthYear);
        setReportTrendRange(monthYear.split('-')[0] ?? '');
        setDateRange(null);
        setSelectedReportDateKey('');
    };

    const handleClearMonthSelection = () => {
        setSelectedMonthYear('');
    };

    const fallbackLifetimeSummary = useMemo(() => {
        if (!financeData) {
            return {
                totalIncome: 0,
                totalExpense: 0,
                netBalance: 0,
                transactionCount: 0,
                lastCalculatedAt: '',
            };
        }

        return calculateBalanceSummary(financeData);
    }, [financeData]);

    const lifetimeSummary = balanceSummary ?? fallbackLifetimeSummary;
    const isHomeDataReady = isSessionActive && !!financeData && !authLoading;
    const plannedPaymentAlertSummary = useMemo(() => {
        return getPlannedPaymentAlertSummary(financeData?.plannedPaymentRules ?? []);
    }, [financeData?.plannedPaymentRules]);
    const isAnyModalOpen = isModalOpen || isPlannedPaymentModalOpen || !!editingPlannedPayment || isDateRangeOpen || showDataSourceModal || !!editingTransaction || isExportModalOpen || showPINModal;
    const loadingView =
        location.pathname === '/report'
            ? 'report'
            : location.pathname === '/settings'
                ? 'settings'
                : location.pathname === '/planned-payments'
                    ? 'planned'
                    : 'home';
    const visibleHomeTransactions = useMemo(() => {
        return homeTransactions.slice(0, homeVisibleCount);
    }, [homeTransactions, homeVisibleCount]);
    const canLoadMoreHomeTransactions = homeVisibleCount < homeTransactions.length;
    const selectedExpenseCategoryKey = selectedExpenseCategories.join('|');
    const selectedIncomeCategoryKey = selectedIncomeCategories.join('|');
    const selectedReportCategoryIds = useMemo(() => {
        return [...selectedExpenseCategories, ...selectedIncomeCategories];
    }, [selectedExpenseCategoryKey, selectedIncomeCategoryKey]);
    const selectedReportCategoryNames = useMemo(() => {
        if (selectedReportCategoryIds.length === 0 || !financeData) return [];

        return selectedReportCategoryIds.map((categoryId) => {
            return financeData.categories.find(category => category.id === categoryId)?.name || 'Uncategorized';
        });
    }, [selectedReportCategoryIds, financeData]);
    const selectedReportCategoryName = useMemo(() => {
        if (selectedReportCategoryNames.length === 0) return '';
        if (selectedReportCategoryNames.length === 1) return selectedReportCategoryNames[0];
        if (selectedReportCategoryNames.length === 2) return selectedReportCategoryNames.join(' & ');
        return `${selectedReportCategoryNames.slice(0, 2).join(', ')} +${selectedReportCategoryNames.length - 2} more`;
    }, [selectedReportCategoryNames]);
    const selectedReportHeading = useMemo(() => {
        if (selectedReportCategoryIds.length <= 1) {
            return selectedReportCategoryName;
        }

        if (selectedExpenseCategories.length > 0 && selectedIncomeCategories.length === 0) {
            return `${selectedExpenseCategories.length} Expense Categories`;
        }

        if (selectedIncomeCategories.length > 0 && selectedExpenseCategories.length === 0) {
            return `${selectedIncomeCategories.length} Income Categories`;
        }

        return `${selectedReportCategoryIds.length} Selected Categories`;
    }, [selectedReportCategoryIds.length, selectedReportCategoryName, selectedExpenseCategories.length, selectedIncomeCategories.length]);
    const activeReportPeriodLabel = useMemo(() => {
        if (dateRange) {
            return `${formatReportDate(dateRange.start)} - ${formatReportDate(dateRange.end)}`;
        }

        if (selectedMonthYear) {
            return monthYearOptions.find((option) => option.value === activeMonthYear)?.label || 'Selected period';
        }

        if (activeReportTrendRange === 'max') {
            return 'Max';
        }

        return activeReportTrendRange || 'Selected period';
    }, [dateRange, selectedMonthYear, monthYearOptions, activeMonthYear, activeReportTrendRange]);
    const reportPeriodTransactions = useMemo(() => {
        if (dateRange || selectedMonthYear) {
            return filteredTransactions;
        }

        if (activeReportTrendRange === 'max') {
            return validTransactions;
        }

        const activeYear = Number(activeReportTrendRange);
        if (!activeYear) {
            return [];
        }

        return validTransactions.filter((transaction) => {
            const timestamp = getTransactionTimestamp(transaction);
            if (!timestamp) return false;

            return new Date(timestamp).getFullYear() === activeYear;
        });
    }, [dateRange, selectedMonthYear, filteredTransactions, activeReportTrendRange, validTransactions]);
    const selectedReportTransactions = useMemo(() => {
        if (selectedReportCategoryIds.length === 0) return [];

        const selectedExpenseCategoryIds = new Set(selectedExpenseCategories);
        const selectedIncomeCategoryIds = new Set(selectedIncomeCategories);

        return reportPeriodTransactions
            .filter((transaction) => {
                const categoryId = transaction.categoryId || '';

                if (transaction.type === 'EXPENSE') {
                    return selectedExpenseCategoryIds.has(categoryId);
                }

                if (transaction.type === 'INCOME') {
                    return selectedIncomeCategoryIds.has(categoryId);
                }

                return false;
            })
            .sort((transactionA, transactionB) => {
                if (reportTransactionSort === 'amount') {
                    const amountDelta = transactionB.amount - transactionA.amount;

                    if (amountDelta !== 0) {
                        return amountDelta;
                    }
                } else {
                    const dateDelta = getTransactionTimestamp(transactionB) - getTransactionTimestamp(transactionA);

                    if (dateDelta !== 0) {
                        return dateDelta;
                    }

                    return transactionB.amount - transactionA.amount;
                }

                return getTransactionTimestamp(transactionB) - getTransactionTimestamp(transactionA);
            });
    }, [reportPeriodTransactions, selectedReportCategoryIds.length, selectedExpenseCategoryKey, selectedIncomeCategoryKey, reportTransactionSort]);
    const reportTrendTransactions = useMemo(() => {
        const baseTransactions = dateRange ? filteredTransactions : validTransactions;

        if (selectedReportCategoryIds.length === 0) {
            return baseTransactions;
        }

        const selectedExpenseCategoryIds = new Set(selectedExpenseCategories);
        const selectedIncomeCategoryIds = new Set(selectedIncomeCategories);

        return baseTransactions.filter((transaction) => {
            const categoryId = transaction.categoryId || '';

            if (transaction.type === 'EXPENSE') {
                return selectedExpenseCategoryIds.has(categoryId);
            }

            if (transaction.type === 'INCOME') {
                return selectedIncomeCategoryIds.has(categoryId);
            }

            return false;
        });
    }, [dateRange, filteredTransactions, validTransactions, selectedReportCategoryIds.length, selectedExpenseCategoryKey, selectedIncomeCategoryKey]);
    const reportHeatmapYear = useMemo(() => {
        if (dateRange) {
            return new Date(dateRange.start).getFullYear();
        }

        if (selectedMonthYear) {
            const selectedYear = Number(selectedMonthYear.split('-')[0]);
            if (Number.isFinite(selectedYear)) {
                return selectedYear;
            }
        }

        if (activeReportTrendRange !== 'max') {
            const activeYear = Number(activeReportTrendRange);
            if (Number.isFinite(activeYear) && activeYear > 0) {
                return activeYear;
            }
        }

        const latestTransactionYear = reportTrendTransactions.reduce((latestYear, transaction) => {
            const timestamp = getTransactionTimestamp(transaction);
            if (!timestamp) return latestYear;

            return Math.max(latestYear, new Date(timestamp).getFullYear());
        }, 0);

        return latestTransactionYear || new Date().getFullYear();
    }, [dateRange, selectedMonthYear, activeReportTrendRange, reportTrendTransactions]);
    const reportRangeSelectValue = activeReportTrendRange === 'max'
        ? 'max'
        : `${reportHeatmapYear}`;
    const reportRangeSelectLabel = reportRangeSelectValue === 'max' ? 'Max' : reportRangeSelectValue;
    const isReportRangeSelectDisabled = Boolean(dateRange) || reportYearOptions.length === 0;
    const reportHeatmapPlannedPaymentRules = useMemo(() => {
        if (!financeData) return [];

        const selectedExpenseCategoryIds = new Set(selectedExpenseCategories);
        const hasCategorySelection = selectedReportCategoryIds.length > 0;

        return financeData.plannedPaymentRules.filter((rule) => {
            if (!visibleAccountIds.has(rule.accountId)) return false;
            if (rule.type !== 'EXPENSE') return false;

            if (!hasCategorySelection) {
                return true;
            }

            if (rule.type === 'EXPENSE') {
                return selectedExpenseCategoryIds.has(rule.categoryId);
            }

            return false;
        });
    }, [financeData, visibleAccountIds, selectedReportCategoryIds.length, selectedExpenseCategories]);
    const selectedReportDateLabel = useMemo(() => {
        return selectedReportDateKey ? formatReportDateKey(selectedReportDateKey) : '';
    }, [selectedReportDateKey]);
    const selectedReportDateTransactions = useMemo(() => {
        if (!selectedReportDateKey) return [];

        const selectedDate = getReportDateFromKey(selectedReportDateKey);
        if (!selectedDate) return [];

        const selectedTimestamp = selectedDate.getTime();
        const todayTimestamp = toReportStartOfDay(new Date()).getTime();
        const actualTransactions = reportTrendTransactions.filter((transaction) => {
            const timestamp = getTransactionTimestamp(transaction);
            if (!timestamp) return false;

            return getReportDateKey(timestamp) === selectedReportDateKey;
        });
        const plannedTransactions = selectedTimestamp < todayTimestamp
            ? []
            : reportHeatmapPlannedPaymentRules.flatMap((rule): Transaction[] => {
                let occurrenceDate = toReportStartOfDay(rule.nextDueDate ?? rule.startDate).getTime();
                let safetyCounter = 0;

                while (!rule.oneTime && occurrenceDate < selectedTimestamp && safetyCounter < 800) {
                    const nextOccurrenceDate = getFollowingPlannedPaymentDate(rule, occurrenceDate);
                    if (nextOccurrenceDate <= occurrenceDate) break;
                    occurrenceDate = toReportStartOfDay(nextOccurrenceDate).getTime();
                    safetyCounter += 1;
                }

                if (occurrenceDate !== selectedTimestamp) {
                    return [];
                }

                return [{
                    id: `__planned-${rule.id}-${selectedReportDateKey}`,
                    accountId: rule.accountId,
                    type: rule.type,
                    amount: rule.amount,
                    title: `${rule.title || 'Planned payment'} (Planned)`,
                    dueDate: selectedTimestamp,
                    categoryId: rule.categoryId,
                    recurringRuleId: rule.id,
                    isSynced: false,
                }];
            });

        return [...actualTransactions, ...plannedTransactions].sort((transactionA, transactionB) => {
            return getTransactionTimestamp(transactionB) - getTransactionTimestamp(transactionA);
        });
    }, [reportHeatmapPlannedPaymentRules, reportTrendTransactions, selectedReportDateKey]);
    const reportDrilldownTransactions = selectedReportDateKey
        ? selectedReportDateTransactions
        : selectedReportTransactions;
    const hasReportDrilldown = Boolean(selectedReportDateKey || selectedReportCategoryIds.length > 0);
    const reportDrilldownHeading = selectedReportDateKey
        ? `${selectedReportDateLabel || 'Selected day'} Transactions`
        : `${selectedReportHeading} Transactions`;
    const reportDrilldownDescription = selectedReportDateKey
        ? `Showing ${reportDrilldownTransactions.length} transaction${reportDrilldownTransactions.length !== 1 ? 's' : ''} for ${selectedReportDateLabel || 'the selected day'}${selectedReportCategoryName ? ` filtered by ${selectedReportCategoryName}` : ''}.`
        : `Showing ${reportDrilldownTransactions.length} transaction${reportDrilldownTransactions.length !== 1 ? 's' : ''} for ${selectedReportCategoryName} in this report period.`;
    const selectedReportExportTitle = useMemo(() => {
        return reportDrilldownHeading || 'Report Transactions';
    }, [reportDrilldownHeading]);
    const selectedReportExportSubtitle = useMemo(() => {
        return `${activeReportPeriodLabel} | ${reportDrilldownTransactions.length} selected transaction${reportDrilldownTransactions.length !== 1 ? 's' : ''}`;
    }, [activeReportPeriodLabel, reportDrilldownTransactions.length]);
    const selectedReportExportFileBase = useMemo(() => {
        return `${reportDrilldownHeading || 'report-transactions'}-${activeReportPeriodLabel}`;
    }, [reportDrilldownHeading, activeReportPeriodLabel]);
    const pinVerificationModal = storageUserId ? (
        <PINVerificationModal
            isOpen={showPINModal}
            onClose={() => navigate('/')}
            onVerified={() => setIsPINVerified(true)}
            userId={storageUserId}
        />
    ) : null;

    const renderTransactionGrid = (
        transactions: Transaction[],
        isTransactionEditable: (transaction: Transaction) => boolean = () => true,
    ) => {
        if (!financeData) return null;

        if (transactions.length === 0) {
            return (
                <div className={AppChartBtn}>
                    <p className="text-sm text-gray-700 dark:text-gray-300 sm:text-base">No transactions found</p>
                </div>
            );
        }

        return (
            <div className="app-stagger-grid grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {transactions.map((transaction) => (
                    <TransactionCard
                        key={transaction.id}
                        transaction={transaction}
                        account={financeData.accounts.find(account => account.id === transaction.accountId)}
                        category={financeData.categories.find(category => category.id === transaction.categoryId)}
                        onEdit={isTransactionEditable(transaction) ? (transactionToEdit) => setEditingTransaction(transactionToEdit) : undefined}
                    />
                ))}
            </div>
        );
    };

    const handleSelectExpenseReportCategory = (categoryId: string) => {
        setSelectedExpenseCategories((currentCategories) => {
            if (currentCategories.includes(categoryId)) {
                return currentCategories.filter((currentCategoryId) => currentCategoryId !== categoryId);
            }

            return [...currentCategories, categoryId];
        });
    };

    const handleSelectIncomeReportCategory = (categoryId: string) => {
        setSelectedIncomeCategories((currentCategories) => {
            if (currentCategories.includes(categoryId)) {
                return currentCategories.filter((currentCategoryId) => currentCategoryId !== categoryId);
            }

            return [...currentCategories, categoryId];
        });
    };

    const handleSelectAllExpenseReportCategories = (categoryIds: string[]) => {
        setSelectedExpenseCategories(categoryIds);
    };

    const handleSelectAllIncomeReportCategories = (categoryIds: string[]) => {
        setSelectedIncomeCategories(categoryIds);
    };

    const handleExportSelectedTransactionsAsPdf = () => {
        if (!financeData || reportDrilldownTransactions.length === 0) {
            alert('No selected transactions are available to export.');
            return;
        }

        exportTransactionsToPdf({
            transactions: reportDrilldownTransactions,
            accounts: financeData.accounts,
            categories: financeData.categories,
            title: selectedReportExportTitle,
            subtitle: selectedReportExportSubtitle,
            fileBaseName: selectedReportExportFileBase,
        });
    };

    const handleExportSelectedTransactionsAsExcel = () => {
        if (!financeData || reportDrilldownTransactions.length === 0) {
            alert('No selected transactions are available to export.');
            return;
        }

        exportTransactionsToExcel({
            transactions: reportDrilldownTransactions,
            accounts: financeData.accounts,
            categories: financeData.categories,
            title: selectedReportExportTitle,
            subtitle: selectedReportExportSubtitle,
            fileBaseName: selectedReportExportFileBase,
        });
    };

    const renderSharedFloatingUi = () => {
        if (!financeData) return null;

        return (
            <>
                <CreateTransactionModal
                    isOpen={isModalOpen || !!editingTransaction}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingTransaction(null);
                    }}
                    onSave={handleCreateTransaction}
                    onDelete={handleDeleteTransaction}
                    accounts={financeData.accounts}
                    categories={financeData.categories}
                    transactions={financeData.transactions}
                    editingTransaction={editingTransaction}
                    defaultAccountId={defaultTransactionAccountId}
                />

                <CreateTransactionModal
                    mode="planned-payment"
                    isOpen={isPlannedPaymentModalOpen || !!editingPlannedPayment}
                    onClose={() => {
                        setIsPlannedPaymentModalOpen(false);
                        setEditingPlannedPayment(null);
                    }}
                    onSave={handleCreatePlannedPayment}
                    onDelete={handleDeletePlannedPayment}
                    accounts={financeData.accounts}
                    categories={financeData.categories}
                    transactions={financeData.transactions}
                    editingPlannedPayment={editingPlannedPayment}
                    defaultAccountId={defaultTransactionAccountId}
                />

                <DateRangeModal
                    isOpen={isDateRangeOpen}
                    onClose={() => setIsDateRangeOpen(false)}
                    onApply={handleApplyDateRange}
                    onApplyMonth={handleApplyMonthSelection}
                    activeDateRange={dateRange}
                    selectedMonthYear={activeMonthYear}
                    transactions={validTransactions}
                />

                <DataSourceModal
                    isOpen={showDataSourceModal}
                    onFetchFirebase={handleFetchFromFirebase}
                    onGetDummyData={handleGetSampleData}
                    showCloudOption={!!user}
                />

                <ExportTransactionsModal
                    isOpen={isExportModalOpen}
                    onClose={() => setIsExportModalOpen(false)}
                    onExportPdf={handleExportSelectedTransactionsAsPdf}
                    onExportExcel={handleExportSelectedTransactionsAsExcel}
                    transactionCount={reportDrilldownTransactions.length}
                    title={selectedReportExportTitle}
                    subtitle={selectedReportExportSubtitle}
                />

                {location.pathname === '/' && (
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className={`${FreeBlueBtn} fixed bottom-18 right-4 md:bottom-4 md:right-4`}
                    >
                        <Plus size={22} />
                        <span>Add</span>
                    </button>
                )}
            </>
        );
    };

    useEffect(() => {
        if (isAnyModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isAnyModalOpen]);

    useEffect(() => {
        if (location.pathname !== '/' || isAnyModalOpen) {
            return;
        }

        const html = document.documentElement;
        const body = document.body;
        const previousHtmlOverscroll = html.style.overscrollBehaviorY;
        const previousBodyOverscroll = body.style.overscrollBehaviorY;
        const interactiveTouchTargetSelector = [
            'button',
            'a',
            'input',
            'select',
            'textarea',
            '[role="button"]',
            '[role="link"]',
            '[tabindex]',
            '.cursor-pointer',
            '[contenteditable="true"]',
        ].join(',');
        const pullToRefreshDragThresholdPx = 12;
        let touchStartY = 0;
        let shouldBlockPullToRefresh = false;

        const isInteractiveTouchTarget = (target: EventTarget | null) => {
            return target instanceof Element && Boolean(target.closest(interactiveTouchTargetSelector));
        };

        const handleTouchStart = (event: TouchEvent) => {
            if (event.touches.length === 1) {
                touchStartY = event.touches[0].clientY;
                shouldBlockPullToRefresh = !isInteractiveTouchTarget(event.target);
                return;
            }

            shouldBlockPullToRefresh = false;
        };

        const handleTouchMove = (event: TouchEvent) => {
            if (!shouldBlockPullToRefresh || event.touches.length !== 1) return;

            const currentTouchY = event.touches[0].clientY;
            const isPullingDown = currentTouchY - touchStartY > pullToRefreshDragThresholdPx;
            const isPageAtTop = window.scrollY <= 0;

            if (isPageAtTop && isPullingDown && event.cancelable) {
                event.preventDefault();
            }
        };

        html.style.overscrollBehaviorY = 'none';
        body.style.overscrollBehaviorY = 'none';

        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });

        return () => {
            html.style.overscrollBehaviorY = previousHtmlOverscroll;
            body.style.overscrollBehaviorY = previousBodyOverscroll;
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
        };
    }, [location.pathname, isAnyModalOpen]);

    useEffect(() => {
        if (location.pathname !== '/report') {
            setIsDateRangeOpen(false);
            setIsExportModalOpen(false);
        }
    }, [location.pathname]);

    useLayoutEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    }, [location.pathname]);

    useEffect(() => {
        setHasCompletedInitialHomeReveal(false);
        setIsContentVisible(false);
        setShowSkeletonOverlay(true);
    }, [storageUserId]);

    useEffect(() => {
        setHomeVisibleCount(20);
    }, [selectedMonthYear, dateRange?.start, dateRange?.end, homeTransactions.length]);

    useEffect(() => {
        if (!hasSelectedTransactionSearchRange) {
            setSearchWithinSelectedRange(false);
        }
    }, [hasSelectedTransactionSearchRange]);

    useEffect(() => {
        setSelectedExpenseCategories(keepIfAlreadyEmpty);
        setSelectedIncomeCategories(keepIfAlreadyEmpty);
        setIsExportModalOpen(false);
    }, [selectedMonthYear, dateRange?.start, dateRange?.end, activeReportTrendRange]);

    const handleHomeLogoRefresh = useCallback(() => {
        if (window.confirm('Refresh homepage now?')) {
            window.location.reload();
        }
    }, []);

    useEffect(() => {
        if (location.pathname !== '/') {
            return;
        }

        if (!isHomeDataReady) {
            setIsContentVisible(false);
            setShowSkeletonOverlay(true);
            return;
        }

        if (hasCompletedInitialHomeReveal) {
            setIsContentVisible(true);
            setShowSkeletonOverlay(false);
            return;
        }

        const rafId = window.requestAnimationFrame(() => {
            setIsContentVisible(true);
        });
        const timerId = window.setTimeout(() => {
            setShowSkeletonOverlay(false);
            setHasCompletedInitialHomeReveal(true);
        }, 320);

        return () => {
            window.cancelAnimationFrame(rafId);
            window.clearTimeout(timerId);
        };
    }, [isHomeDataReady, hasCompletedInitialHomeReveal, location.pathname]);

    if (isAboutPage) {
        return <AboutPage />;
    }

    if (!isSessionActive) {
        return <LoginPage />;
    }

    if (location.pathname === '/add') {
        return (
            <>
                <AddTransactionPage
                    financeData={financeData}
                    onSave={handleCreateTransaction}
                    defaultAccountId={defaultTransactionAccountId}
                />
                {pinVerificationModal}
            </>
        );
    }

    if (location.pathname === '/settings') {
        return (
            <AppShell
                activeView="settings"
                plannedPaymentsBadge={plannedPaymentAlertSummary}
                overlayChildren={(
                    <DataSourceModal
                        isOpen={showDataSourceModal}
                        onFetchFirebase={handleFetchFromFirebase}
                        onGetDummyData={handleGetSampleData}
                        showCloudOption={!!user}
                    />
                )}
            >
                <SettingsModal
                    variant="page"
                    isOpen={true}
                    onClose={() => navigate('/')}
                    onReset={handleResetData}
                    onImport={handleImportData}
                    onUpdateNetBalanceAccounts={handleUpdateNetBalanceAccounts}
                    onAddCategory={handleAddCategory}
                    onRenameCategory={handleRenameCategory}
                    onUpdateCategoryColor={handleUpdateCategoryColor}
                    onReorderCategories={handleReorderCategories}
                    onDeleteCategory={handleDeleteCategory}
                    financeData={financeData}
                    pinUserId={storageUserId}
                    onBackupToFirebase={user ? handleBackupToFirebase : undefined}
                    onSyncFromFirebase={user ? handleSyncFromFirebase : undefined}
                    syncStatusSnapshot={syncStatusSnapshot}
                    onGetSampleData={handleGetSampleData}
                />
            </AppShell>
        );
    }

    if (!isHomeDataReady) {
        return (
            <>
                <AppShell
                    activeView={loadingView}
                    plannedPaymentsBadge={plannedPaymentAlertSummary}
                    overlayChildren={(
                        <>
                            <DataSourceModal
                                isOpen={showDataSourceModal}
                                onFetchFirebase={handleFetchFromFirebase}
                                onGetDummyData={handleGetSampleData}
                                showCloudOption={!!user}
                            />
                            {pinVerificationModal}
                        </>
                    )}
                >
                    <SkeletonApp variant={loadingView === 'report' ? 'report' : 'home'} />
                </AppShell>
            </>
        );
    }

    if (location.pathname === '/planned-payments') {
        return (
            <AppShell
                activeView="planned"
                plannedPaymentsBadge={plannedPaymentAlertSummary}
                overlayChildren={renderSharedFloatingUi()}
            >
                <PlannedPaymentsPage
                    plannedPaymentRules={financeData.plannedPaymentRules}
                    accounts={financeData.accounts}
                    categories={financeData.categories}
                    onCreate={() => {
                        setEditingPlannedPayment(null);
                        setIsPlannedPaymentModalOpen(true);
                    }}
                    onEdit={(plannedPaymentRule) => {
                        setIsPlannedPaymentModalOpen(false);
                        setEditingPlannedPayment(plannedPaymentRule);
                    }}
                    onPay={handlePayPlannedPayment}
                    onSkip={handleSkipPlannedPayment}
                />
            </AppShell>
        );
    }

    if (location.pathname === '/report') {
        return (
            <AppShell
                activeView="report"
                plannedPaymentsBadge={plannedPaymentAlertSummary}
                overlayChildren={renderSharedFloatingUi()}
            >
                <div className="space-y-6 sm:space-y-7">
                    <div className="app-section mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                        <div className="max-w-xl">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-sky-600/80 dark:text-sky-300/75">
                                Insights
                            </p>
                            <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50 sm:text-4xl">
                                Reports
                            </h1>
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
                                Review totals, explore category splits, and inspect matching transactions for the selected period.
                            </p>
                        </div>

                        <div className="flex flex-row flex-wrap gap-2 self-start">
                            <div className={`${FreeWhiteBtn} relative w-36! ${isReportRangeSelectDisabled ? 'cursor-not-allowed opacity-70' : ''}`}>
                                <CalendarDays size={16} />
                                <span className="min-w-0 flex-1 truncate text-left">
                                    {reportRangeSelectLabel || 'Year'}
                                </span>
                                <ChevronDown size={16} className="text-slate-500 dark:text-slate-300" />
                                <select
                                    value={reportRangeSelectValue}
                                    onChange={(event) => handleApplyReportTrendRange(event.target.value)}
                                    disabled={isReportRangeSelectDisabled}
                                    aria-label="Choose report year"
                                    title={dateRange ? 'Using the active report date range' : 'Choose report year'}
                                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                                >
                                    <option value="max">Max</option>
                                    {reportYearOptions.map((year) => (
                                        <option key={year} value={year}>
                                            {year}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {dateRange ? (
                                <button
                                    onClick={() => {
                                        setDateRange(null);
                                        setSelectedReportDateKey('');
                                    }}
                                    className={`${FreeWhiteBtn} w-36!`}
                                    title="Clear date range"
                                >
                                    <Calendar1 size={16} className="text-red-600" />
                                    Clear Dates
                                </button>
                            ) : (
                                <button
                                    onClick={() => setIsDateRangeOpen(true)}
                                    className={`${FreeWhiteBtn} w-36!`}
                                    title="Select month or custom date range"
                                >
                                    <CalendarDays size={16} />
                                    Date Range
                                </button>
                            )}
                        </div>
                    </div>

                    <YearlyCashflowHeatmap
                        transactions={reportTrendTransactions}
                        plannedPaymentRules={reportHeatmapPlannedPaymentRules}
                        year={reportHeatmapYear}
                        rangeLabel={dateRange ? activeReportPeriodLabel : `${reportHeatmapYear}`}
                        selectedDateKey={selectedReportDateKey}
                        onSelectDate={setSelectedReportDateKey}
                    />

                    <IncomeExpenseTrendChart
                        transactions={reportTrendTransactions}
                        selectedMonthKey={selectedMonthYear}
                        rangeValue={activeReportTrendRange}
                        onSelectRange={handleApplyReportTrendRange}
                        onSelectMonth={handleApplyMonthSelection}
                        onClearMonthSelection={handleClearMonthSelection}
                        isRangeLocked={Boolean(dateRange)}
                        rangeLabelOverride={dateRange ? activeReportPeriodLabel : undefined}
                        showRangeSelector={false}
                    />

                    <ExpensePieChart
                        transactions={reportPeriodTransactions}
                        categories={financeData.categories}
                        selectedExpenseCategories={selectedExpenseCategories}
                        selectedIncomeCategories={selectedIncomeCategories}
                        onSelectExpenseCategory={handleSelectExpenseReportCategory}
                        onSelectIncomeCategory={handleSelectIncomeReportCategory}
                        onSelectAllExpenseCategories={handleSelectAllExpenseReportCategories}
                        onSelectAllIncomeCategories={handleSelectAllIncomeReportCategories}
                    />

                    {hasReportDrilldown && (
                        <div className="app-section mt-6">
                            <div className="mb-4 flex flex-col flex-wrap gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="min-w-0">
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50 sm:text-xl md:text-2xl">
                                        {reportDrilldownHeading}
                                    </h2>
                                    <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 sm:mt-1 sm:text-sm">
                                        {reportDrilldownDescription}
                                    </p>
                                </div>

                                <div className="flex max-sm:flex-col max-sm:items-start gap-2">
                                    {selectedReportDateKey && (
                                        <button
                                            type="button"
                                            onClick={() => setSelectedReportDateKey('')}
                                            className={`${FreeWhiteBtn} whitespace-nowrap`}
                                            title="Clear selected date"
                                        >
                                            {selectedReportDateLabel || 'Selected date'}
                                            <X size={14} />
                                        </button>
                                    )}

                                    <div className={SegmentedToggleShell}>
                                        <div className={SegmentedToggleTrack}>
                                            <div
                                                className={`${SegmentedToggleThumb} ${reportTransactionView === 'table' ? 'translate-x-full' : 'translate-x-0'}`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setReportTransactionView('cards')}
                                                className={reportTransactionView === 'cards' ? SegmentedToggleItemSelected : SegmentedToggleItemUnselected}
                                                aria-pressed={reportTransactionView === 'cards'}
                                            >
                                                <LayoutGrid size={16} />
                                                Cards
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setReportTransactionView('table')}
                                                className={reportTransactionView === 'table' ? SegmentedToggleItemSelected : SegmentedToggleItemUnselected}
                                                aria-pressed={reportTransactionView === 'table'}
                                            >
                                                <Table size={16} />
                                                Table
                                            </button>
                                        </div>
                                    </div>

                                    <div className='flex flex-wrap items-center gap-2'>
                                        <button
                                            type="button"
                                            onClick={() => setReportTransactionSort((currentSort) => currentSort === 'date' ? 'amount' : 'date')}
                                            className={`${FreeWhiteBtn} whitespace-nowrap`}
                                            title="Toggle sorting between date and amount"
                                        >
                                            <ArrowUpDown size={16} />
                                            Sort: {reportTransactionSort === 'date' ? 'Latest' : 'Highest Amount'}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setIsExportModalOpen(true)}
                                            className={`${FreeWhiteBtn} whitespace-nowrap`}
                                            title="Export selected report transactions"
                                        >
                                            <Download size={16} />
                                            Export
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {reportTransactionView === 'table' ? (
                                <TransactionTable
                                    transactions={reportDrilldownTransactions}
                                    accounts={financeData.accounts}
                                    categories={financeData.categories}
                                    onEdit={(transactionToEdit) => setEditingTransaction(transactionToEdit)}
                                    isTransactionEditable={(transaction) => !isSyntheticPlannedReportTransaction(transaction)}
                                />
                            ) : (
                                renderTransactionGrid(
                                    reportDrilldownTransactions,
                                    (transaction) => !isSyntheticPlannedReportTransaction(transaction),
                                )
                            )}
                        </div>
                    )}
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell
            activeView="home"
            plannedPaymentsBadge={plannedPaymentAlertSummary}
            overlayChildren={(
                <>
                    {renderSharedFloatingUi()}
                    {pinVerificationModal}
                </>
            )}
        >
            <div className="relative">
                <div className={`transition-opacity duration-500 ease-out ${isContentVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
                    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                        <AppHeader onLogoClick={handleHomeLogoRefresh} syncStatus={syncStatusSnapshot.state} />

                        <div className={`${amountCard} w-full sm:max-w-xs`}>
                            <p className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300 sm:mb-2 sm:text-sm">Net Balance</p>
                            <p className={`text-xl font-bold sm:text-2xl md:text-3xl ${lifetimeSummary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ₹ {formatNumberWithCommas(lifetimeSummary.netBalance)}
                            </p>
                        </div>
                    </div>

                    <div className="app-section">
                        <div className="mb-4 flex flex-col gap-2 xs:flex-row xs:items-center xs:justify-between xs:gap-4">
                            <div className="min-w-0">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50 sm:text-xl md:text-2xl">
                                    Recent Transactions
                                </h2>
                                <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 sm:mt-1 sm:text-sm">
                                    Showing {Math.min(visibleHomeTransactions.length, homeTransactions.length)} of {homeTransactions.length} transaction{homeTransactions.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>

                        {renderTransactionGrid(visibleHomeTransactions)}

                        {canLoadMoreHomeTransactions && (
                            <div className="mt-4 flex justify-center">
                                <button
                                    type="button"
                                    onClick={() => setHomeVisibleCount(homeTransactions.length)}
                                    className={FreeWhiteBtn}
                                >
                                    Load All
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="app-section mt-6">
                        <div className="mb-4 flex flex-col gap-2 xs:flex-row xs:items-center xs:justify-between xs:gap-4">
                            <div className="min-w-0">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50 sm:text-xl md:text-2xl">
                                    Search Transactions
                                </h2>
                                <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 sm:mt-1 sm:text-sm">
                                    {hasActiveTransactionSearch
                                        ? `${transactionSearchResults.length} result${transactionSearchResults.length !== 1 ? 's' : ''} | ${transactionSearchScopeLabel}`
                                        : transactionSearchScopeLabel}
                                </p>
                            </div>
                        </div>

                        <div className="app-border-soft flex flex-col gap-3 rounded-[1.75rem] bg-white/78 p-3 shadow-[0_18px_48px_-30px_rgba(15,23,42,0.34)] backdrop-blur-2xl dark:bg-slate-900/58 sm:flex-row sm:items-center">
                            <label htmlFor="transaction-search-input" className="relative flex min-w-0 flex-1 items-center">
                                <Search size={18} className="pointer-events-none absolute left-3.5 text-slate-400 dark:text-slate-500" />
                                <input
                                    id="transaction-search-input"
                                    type="search"
                                    value={transactionSearchQuery}
                                    onChange={(event) => setTransactionSearchQuery(event.target.value)}
                                    placeholder="Search transactions"
                                    autoComplete="off"
                                    className="h-12 w-full rounded-2xl border border-slate-200/80 bg-white/88 pl-11 pr-4 text-sm font-medium text-slate-900 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.34)] outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-slate-400 focus:border-blue-300 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.16)] dark:border-slate-700/70 dark:bg-slate-950/45 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:border-blue-500/70"
                                />
                            </label>

                            <label
                                htmlFor="transaction-search-range-toggle"
                                className={`app-border-soft flex h-12 shrink-0 cursor-pointer items-center gap-2 rounded-2xl bg-slate-50/82 px-3 text-sm font-semibold text-slate-700 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.34)] transition-colors duration-200 dark:bg-slate-950/35 dark:text-slate-200 ${hasSelectedTransactionSearchRange ? 'hover:bg-sky-50 dark:hover:bg-sky-500/10' : 'cursor-not-allowed opacity-55'}`}
                                title={hasSelectedTransactionSearchRange ? selectedTransactionSearchRangeLabel : 'No range selected'}
                            >
                                <input
                                    id="transaction-search-range-toggle"
                                    type="checkbox"
                                    checked={searchWithinSelectedRange && hasSelectedTransactionSearchRange}
                                    disabled={!hasSelectedTransactionSearchRange}
                                    onChange={(event) => setSearchWithinSelectedRange(event.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 disabled:cursor-not-allowed"
                                />
                                <span className="whitespace-nowrap">Selected range</span>
                            </label>
                        </div>

                        {hasActiveTransactionSearch && (
                            <div className="mt-4">
                                {renderTransactionGrid(transactionSearchResults)}
                            </div>
                        )}
                    </div>
                </div>

                {showSkeletonOverlay && (
                    <div className={`absolute inset-0 z-20 pointer-events-none transition-opacity duration-500 ease-out ${isContentVisible ? 'opacity-0' : 'opacity-100'}`}>
                        <SkeletonApp variant="home" />
                    </div>
                )}
            </div>
        </AppShell>
    );
}

export default App;
