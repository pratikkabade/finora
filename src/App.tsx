import { useState, useEffect, useMemo, useCallback, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, CalendarDays, Calendar1, ArrowUpDown, LayoutGrid, Table, Download } from 'lucide-react';
import type { Category, FinanceData, PlannedPaymentRule, Transaction } from './types/finance.types';
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
    NET_BALANCE_ACCOUNT_IDS_PREF_KEY,
    type BalanceSummary,
} from './services/storageService';
import {
    backupFinanceDataToFirebase,
    deleteFinanceDataRecordsFromFirebase,
    fetchFinanceDataFromFirebase,
    syncFinanceDataPatchToFirebase,
    type FirebaseFinanceData,
    type FinanceDataDeletes,
    type FinanceDataPatch,
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
    getNextPlannedPaymentDate,
    getPlannedPaymentAlertSummary,
    normalizePlannedPaymentIntervalType,
} from './utils/plannedPaymentUtils';

const GUEST_USER_ID = '__guest__';
const NORMALIZED_BACKUP_READY_KEY_PREFIX = 'normalizedCloudBackupReady_';

interface AppHeaderProps {
    onLogoClick?: () => void;
}

type ReportTransactionView = 'cards' | 'table';
type ReportTransactionSort = 'date' | 'amount';

const getTransactionTimestamp = (transaction: Transaction) => {
    return transaction.dateTime || transaction.dueDate || 0;
};

const sortCategoriesByOrder = (categories: Category[]) => {
    return [...categories].sort((categoryA, categoryB) => {
        const orderA = Number(categoryA.orderNum) || 0;
        const orderB = Number(categoryB.orderNum) || 0;
        if (orderA !== orderB) {
            return orderA - orderB;
        }

        return categoryA.name.localeCompare(categoryB.name);
    });
};

const keepIfAlreadyEmpty = (values: string[]) => values.length === 0 ? values : [];

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

export const AppHeader = ({ onLogoClick }: AppHeaderProps) => {
    const logo = <img src="/finora-icon.svg" alt="Finora Logo" className="mx-auto h-24 w-24 sm:mx-0" />;

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
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [editingPlannedPayment, setEditingPlannedPayment] = useState<PlannedPaymentRule | null>(null);
    const [selectedExpenseCategories, setSelectedExpenseCategories] = useState<string[]>([]);
    const [selectedIncomeCategories, setSelectedIncomeCategories] = useState<string[]>([]);
    const [homeVisibleCount, setHomeVisibleCount] = useState(20);
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
    const pendingCloudSyncCountRef = useRef(0);
    const hasCloudSyncFailureRef = useRef(false);

    const isNormalizedCloudBackupReady = useCallback(() => {
        if (!cloudUserId) return false;
        return localStorage.getItem(getNormalizedBackupReadyKey(cloudUserId)) === 'true';
    }, [cloudUserId]);

    const markNormalizedCloudBackupReady = useCallback((isReady: boolean) => {
        if (!cloudUserId) return;

        const key = getNormalizedBackupReadyKey(cloudUserId);
        if (isReady) {
            localStorage.setItem(key, 'true');
            return;
        }

        localStorage.removeItem(key);
    }, [cloudUserId]);

    const runBackgroundCloudSync = useCallback((operation: (userId: string) => Promise<void>) => {
        if (!cloudUserId || !isNormalizedCloudBackupReady()) {
            return;
        }

        if (pendingCloudSyncCountRef.current === 0) {
            hasCloudSyncFailureRef.current = false;
        }

        pendingCloudSyncCountRef.current += 1;

        void operation(cloudUserId)
            .catch((error) => {
                hasCloudSyncFailureRef.current = true;
                localStorage.setItem('outOfSync', 'true');
                console.warn('Background Firebase sync failed:', error);
            })
            .finally(() => {
                pendingCloudSyncCountRef.current = Math.max(0, pendingCloudSyncCountRef.current - 1);

                if (pendingCloudSyncCountRef.current === 0 && !hasCloudSyncFailureRef.current) {
                    const now = Date.now();
                    localStorage.setItem('lastCloudBackup', now.toString());
                    localStorage.setItem('outOfSync', 'false');
                }
            });
    }, [cloudUserId, isNormalizedCloudBackupReady]);

    const syncCloudChangeInBackground = useCallback((
        patch?: FinanceDataPatch,
        deletes?: FinanceDataDeletes,
    ) => {
        runBackgroundCloudSync(async (userId) => {
            if (patch) {
                await syncFinanceDataPatchToFirebase(userId, patch);
            }

            if (deletes) {
                await deleteFinanceDataRecordsFromFirebase(userId, deletes);
            }
        });
    }, [runBackgroundCloudSync]);

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
            const summary = saveToLocalStorage(storageUserId, financeData);
            setBalanceSummary(summary);
            return;
        }

        setBalanceSummary(null);
    }, [financeData, storageUserId]);

    const handleBackupToFirebase = async () => {
        if (!user || !financeData) {
            throw new Error('User not authenticated or no data to backup');
        }

        await backupFinanceDataToFirebase(user.uid, financeData);
        markNormalizedCloudBackupReady(true);
    };

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

    const monthYearOptions = useMemo(() => {
        return generateMonthYearOptions(validTransactions);
    }, [validTransactions]);

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

    const handleCreateTransaction = (transaction: Transaction) => {
        if (!financeData) return;

        localStorage.setItem('outOfSync', 'true');
        syncCloudChangeInBackground({ transactions: [transaction] });

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

        localStorage.setItem('outOfSync', 'true');
        syncCloudChangeInBackground({ plannedPaymentRules: [nextRule] });

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

        localStorage.setItem('outOfSync', 'true');
        syncCloudChangeInBackground(undefined, { plannedPaymentRules: [plannedPaymentRuleId] });
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

        localStorage.setItem('outOfSync', 'true');
        syncCloudChangeInBackground(
            advancedRule
                ? { transactions: [transaction], plannedPaymentRules: [advancedRule] }
                : { transactions: [transaction] },
            advancedRule ? undefined : { plannedPaymentRules: [plannedPaymentRule.id] },
        );
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

        localStorage.setItem('outOfSync', 'true');
        syncCloudChangeInBackground(
            advancedRule ? { plannedPaymentRules: [advancedRule] } : undefined,
            advancedRule ? undefined : { plannedPaymentRules: [plannedPaymentRule.id] },
        );
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

        localStorage.setItem('outOfSync', 'true');
        syncCloudChangeInBackground(undefined, { transactions: [transactionId] });
        setFinanceData({
            ...financeData,
            transactions: financeData.transactions.filter(transaction => transaction.id !== transactionId),
        });
    };

    const handleResetData = () => {
        if (!storageUserId) return;

        clearUserData(storageUserId);
        markNormalizedCloudBackupReady(false);
        localStorage.setItem('outOfSync', 'true');
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
        localStorage.setItem('outOfSync', 'true');
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
        localStorage.setItem('outOfSync', 'true');
        syncCloudChangeInBackground({ sharedPrefs: nextSharedPrefs });
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
        localStorage.setItem('outOfSync', 'true');
        syncCloudChangeInBackground({ categories: [newCategory] });
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
        localStorage.setItem('outOfSync', 'true');
        syncCloudChangeInBackground({ categories: [nextCategory] });
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
        localStorage.setItem('outOfSync', 'true');
        syncCloudChangeInBackground({ categories: [nextCategory] });
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
        localStorage.setItem('outOfSync', 'true');
        syncCloudChangeInBackground({ categories: nextCategories });
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
        localStorage.setItem('outOfSync', 'true');
        syncCloudChangeInBackground(undefined, { categories: [categoryId] });
        return true;
    };

    const applyFirebaseData = (firebaseData: FinanceData) => {
        setFinanceData(normalizeFinanceData(firebaseData));
        setShowDataSourceModal(false);
    };

    const applyFetchedFirebaseData = (firebaseData: FirebaseFinanceData) => {
        markNormalizedCloudBackupReady(firebaseData.__source === 'normalized');
        applyFirebaseData(firebaseData);
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
        localStorage.setItem('outOfSync', 'true');
        setFinanceData(sampleData);
        setShowDataSourceModal(false);
    };

    const handleApplyDateRange = (startDate: number, endDate: number) => {
        setDateRange({ start: startDate, end: endDate });
        setSelectedMonthYear('');
    };

    const handleApplyMonthSelection = (monthYear: string) => {
        setSelectedMonthYear(monthYear);
        setDateRange(null);
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

        return monthYearOptions.find((option) => option.value === activeMonthYear)?.label || 'Selected period';
    }, [dateRange, monthYearOptions, activeMonthYear]);
    const selectedReportTransactions = useMemo(() => {
        if (selectedReportCategoryIds.length === 0) return [];

        const selectedExpenseCategoryIds = new Set(selectedExpenseCategories);
        const selectedIncomeCategoryIds = new Set(selectedIncomeCategories);

        return filteredTransactions
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
    }, [filteredTransactions, selectedReportCategoryIds.length, selectedExpenseCategoryKey, selectedIncomeCategoryKey, reportTransactionSort]);
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
    const selectedReportExportTitle = useMemo(() => {
        return selectedReportHeading ? `${selectedReportHeading} Transactions` : 'Report Transactions';
    }, [selectedReportHeading]);
    const selectedReportExportSubtitle = useMemo(() => {
        return `${activeReportPeriodLabel} | ${selectedReportTransactions.length} selected transaction${selectedReportTransactions.length !== 1 ? 's' : ''}`;
    }, [activeReportPeriodLabel, selectedReportTransactions.length]);
    const selectedReportExportFileBase = useMemo(() => {
        return `${selectedReportHeading || 'report-transactions'}-${activeReportPeriodLabel}`;
    }, [selectedReportHeading, activeReportPeriodLabel]);
    const pinVerificationModal = storageUserId ? (
        <PINVerificationModal
            isOpen={showPINModal}
            onClose={() => navigate('/')}
            onVerified={() => setIsPINVerified(true)}
            userId={storageUserId}
        />
    ) : null;

    const renderTransactionGrid = (transactions: Transaction[]) => {
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
                        onEdit={(transactionToEdit) => setEditingTransaction(transactionToEdit)}
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
        if (!financeData || selectedReportTransactions.length === 0) {
            alert('No selected transactions are available to export.');
            return;
        }

        exportTransactionsToPdf({
            transactions: selectedReportTransactions,
            accounts: financeData.accounts,
            categories: financeData.categories,
            title: selectedReportExportTitle,
            subtitle: selectedReportExportSubtitle,
            fileBaseName: selectedReportExportFileBase,
        });
    };

    const handleExportSelectedTransactionsAsExcel = () => {
        if (!financeData || selectedReportTransactions.length === 0) {
            alert('No selected transactions are available to export.');
            return;
        }

        exportTransactionsToExcel({
            transactions: selectedReportTransactions,
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
                    transactionCount={selectedReportTransactions.length}
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
        let touchStartY = 0;

        const handleTouchStart = (event: TouchEvent) => {
            if (event.touches.length === 1) {
                touchStartY = event.touches[0].clientY;
            }
        };

        const handleTouchMove = (event: TouchEvent) => {
            if (event.touches.length !== 1) return;

            const currentTouchY = event.touches[0].clientY;
            const isPullingDown = currentTouchY > touchStartY;
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
        setSelectedExpenseCategories(keepIfAlreadyEmpty);
        setSelectedIncomeCategories(keepIfAlreadyEmpty);
        setIsExportModalOpen(false);
    }, [selectedMonthYear, dateRange?.start, dateRange?.end]);

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

                        <div className="flex flex-col gap-2 self-start">
                            {dateRange ? (
                                <button
                                    onClick={() => setDateRange(null)}
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

                    <IncomeExpenseTrendChart
                        transactions={reportTrendTransactions}
                        selectedMonthKey={selectedMonthYear}
                        onSelectMonth={handleApplyMonthSelection}
                        onClearMonthSelection={handleClearMonthSelection}
                        isRangeLocked={Boolean(dateRange)}
                        rangeLabelOverride={dateRange ? activeReportPeriodLabel : undefined}
                    />

                    <ExpensePieChart
                        transactions={filteredTransactions}
                        categories={financeData.categories}
                        selectedExpenseCategories={selectedExpenseCategories}
                        selectedIncomeCategories={selectedIncomeCategories}
                        onSelectExpenseCategory={handleSelectExpenseReportCategory}
                        onSelectIncomeCategory={handleSelectIncomeReportCategory}
                        onSelectAllExpenseCategories={handleSelectAllExpenseReportCategories}
                        onSelectAllIncomeCategories={handleSelectAllIncomeReportCategories}
                    />

                    {selectedReportCategoryIds.length > 0 && (
                        <div className="app-section mt-6">
                            <div className="mb-4 flex flex-col flex-wrap gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="min-w-0">
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50 sm:text-xl md:text-2xl">
                                        {selectedReportHeading} Transactions
                                    </h2>
                                    <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 sm:mt-1 sm:text-sm">
                                        Showing {selectedReportTransactions.length} transaction{selectedReportTransactions.length !== 1 ? 's' : ''} for {selectedReportCategoryName} in this report period.
                                    </p>
                                </div>

                                <div className="flex max-sm:flex-col max-sm:items-start gap-2">
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
                                    transactions={selectedReportTransactions}
                                    accounts={financeData.accounts}
                                    categories={financeData.categories}
                                    onEdit={(transactionToEdit) => setEditingTransaction(transactionToEdit)}
                                />
                            ) : (
                                renderTransactionGrid(selectedReportTransactions)
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
                        <AppHeader onLogoClick={handleHomeLogoRefresh} />

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
