import { useState, useEffect, useMemo, useCallback, useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, CalendarDays, Calendar1 } from 'lucide-react';
import type { Category, FinanceData, Transaction } from './types/finance.types';
import { CreateTransactionModal } from './components/CreateTransactionModal';
import { AddTransactionPage } from './pages/AddTransactionPage';
import { SettingsModal } from './components/SettingsModal';
import { DateRangeModal } from './components/DateRangeModal';
import { DataSourceModal } from './components/DataSourceModal';
import { TransactionCard } from './components/TransactionCard';
import { ExpensePieChart } from './components/ExpensePieChart';
import { SkeletonApp } from './components/SkeletonLoader';
import { LoginPage } from './pages/LoginPage';
// import { PINVerificationModal } from './components/PINVerificationModal';
import { useAuth } from './context/AuthContext';
// import { getPINStatus } from './services/pinService';
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
import { fetchFinanceDataFromFirebase, backupFinanceDataToFirebase } from './services/firebaseService';
import financeDataJson from './data/finance-data.json';
import './App.css';
import { formatNumberWithCommas } from './utils/numberFormatterUtils.ts';
import { amountCard, AppChartBtn, FreeBlueBtn, FreeWhiteBtn } from './constants/TailwindClasses';
import { AppShell } from './components/AppShell';

const GUEST_USER_ID = '__guest__';

interface AppHeaderProps {
    onLogoClick?: () => void;
}

export const AppHeader = ({ onLogoClick }: AppHeaderProps) => {
    const logo = <img src="/finora-icon.svg" alt="Finora Logo" className="mx-auto h-24 w-24 sm:mx-0" />;

    return (
        <div className="mb-6 flex flex-row items-center gap-4 pt-5 sm:mb-8">
            {onLogoClick ? (
                <button
                    type="button"
                    onClick={onLogoClick}
                    className="cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-blue-500"
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
    const [financeData, setFinanceData] = useState<FinanceData | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
    const [showDataSourceModal, setShowDataSourceModal] = useState(false);
    const [selectedMonthYear, setSelectedMonthYear] = useState<string>('');
    const [dateRange, setDateRange] = useState<{ start: number; end: number } | null>(null);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [selectedExpenseCategories, setSelectedExpenseCategories] = useState<string[]>([]);
    const [selectedIncomeCategory, setSelectedIncomeCategory] = useState<string | null>(null);
    const [homeVisibleCount, setHomeVisibleCount] = useState(20);
    const [balanceSummary, setBalanceSummary] = useState<BalanceSummary | null>(null);
    const [animation, setAnimation] = useState(true);
    const [isContentVisible, setIsContentVisible] = useState(false);
    const [showSkeletonOverlay, setShowSkeletonOverlay] = useState(true);
    const isSessionActive = !!user || isGuest;
    const storageUserId = user?.uid ?? (isGuest ? GUEST_USER_ID : null);
    // const [isPINVerified, setIsPINVerified] = useState(false);
    // const [showPINModal, setShowPINModal] = useState(false);

    // // Check if PIN is required for homepage
    // useEffect(() => {
    //     if (!user || authLoading) return;

    //     const isHomePage = location.pathname === '/';
    //     const pinStatus = getPINStatus(user.uid);

    //     if (isHomePage && pinStatus.isPINSet && !isPINVerified) {
    //         setShowPINModal(true);
    //     } else {
    //         setShowPINModal(false);
    //     }
    // }, [location.pathname, user, authLoading, isPINVerified]);

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
                    setFinanceData(localData);
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
    };

    const validTransactions = useMemo(() => {
        if (!financeData) return [];
        return getCurrentOrPastTransactions(financeData.transactions);
    }, [financeData]);

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
            const dateA = transactionA.dateTime || transactionA.dueDate || 0;
            const dateB = transactionB.dateTime || transactionB.dueDate || 0;
            return dateB - dateA;
        });
    }, [filteredTransactions, validTransactions, dateRange, selectedMonthYear]);

    const reportTotalExpense = useMemo(() => {
        return filteredTransactions
            .filter(transaction => transaction.type === 'EXPENSE')
            .reduce((sum, transaction) => sum + transaction.amount, 0);
    }, [filteredTransactions]);

    const reportTotalIncome = useMemo(() => {
        return filteredTransactions
            .filter(transaction => transaction.type === 'INCOME')
            .reduce((sum, transaction) => sum + transaction.amount, 0);
    }, [filteredTransactions]);

    const handleCreateTransaction = (transaction: Transaction) => {
        if (!financeData) return;

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

    const handleDeleteTransaction = (transactionId: string) => {
        if (!financeData) return;

        setFinanceData({
            ...financeData,
            transactions: financeData.transactions.filter(transaction => transaction.id !== transactionId),
        });
    };

    const handleResetData = () => {
        if (!storageUserId) return;

        clearUserData(storageUserId);
        setFinanceData(null);
        setSelectedMonthYear('');
        setDateRange(null);
        setEditingTransaction(null);
        setSelectedExpenseCategories([]);
        setSelectedIncomeCategory(null);
        setBalanceSummary(null);
        setShowDataSourceModal(true);
    };

    const handleImportData = (importedData: FinanceData) => {
        setFinanceData(importedData);
        setSelectedMonthYear('');
        setDateRange(null);
        setEditingTransaction(null);
        setSelectedExpenseCategories([]);
        setSelectedIncomeCategory(null);
    };

    const handleUpdateNetBalanceAccounts = (accountIds: string[]) => {
        if (!financeData) return;

        setFinanceData({
            ...financeData,
            sharedPrefs: {
                ...(financeData.sharedPrefs || {}),
                [NET_BALANCE_ACCOUNT_IDS_PREF_KEY]: JSON.stringify(accountIds),
            },
        });
        localStorage.setItem('outOfSync', 'true');
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
        return true;
    };

    const applyFirebaseData = (firebaseData: FinanceData) => {
        setFinanceData(firebaseData);
        setShowDataSourceModal(false);
    };

    const handleFetchFromFirebase = async () => {
        if (!user) return;

        try {
            const firebaseData = await fetchFinanceDataFromFirebase(user.uid);
            if (firebaseData) {
                applyFirebaseData(firebaseData);
                return;
            }

            alert('No data found in Firebase. Starting with sample data instead.');
            handleGetSampleData();
        } catch (error: any) {
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

        applyFirebaseData(firebaseData);
    };

    const handleGetSampleData = () => {
        const sampleData = financeDataJson as FinanceData;
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
    const isAnyModalOpen = isModalOpen || isDateRangeOpen || showDataSourceModal || !!editingTransaction;
    const netBalanceAccountIds = useMemo(() => {
        if (!financeData) return [];
        return getIncludedNetBalanceAccountIds(financeData);
    }, [financeData]);
    const defaultTransactionAccountId = netBalanceAccountIds[0] ?? financeData?.accounts?.[0]?.id ?? '';
    const lockDefaultTransactionAccount = netBalanceAccountIds.length === 1;
    const loadingView = location.pathname === '/report' ? 'report' : 'home';
    const visibleHomeTransactions = useMemo(() => {
        return homeTransactions.slice(0, homeVisibleCount);
    }, [homeTransactions, homeVisibleCount]);
    const canLoadMoreHomeTransactions = homeVisibleCount < homeTransactions.length;
    const selectedReportCategoryIds = useMemo(() => {
        if (selectedExpenseCategories.length > 0) {
            return selectedExpenseCategories;
        }

        return selectedIncomeCategory ? [selectedIncomeCategory] : [];
    }, [selectedExpenseCategories, selectedIncomeCategory]);
    const selectedReportCategoryType = selectedExpenseCategories.length > 0 ? 'EXPENSE' : selectedIncomeCategory ? 'INCOME' : null;
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

        return `${selectedReportCategoryIds.length} ${selectedReportCategoryType === 'EXPENSE' ? 'Expense' : 'Income'} Categories`;
    }, [selectedReportCategoryIds.length, selectedReportCategoryName, selectedReportCategoryType]);
    const selectedReportTransactions = useMemo(() => {
        if (selectedReportCategoryIds.length === 0 || !selectedReportCategoryType) return [];

        const selectedCategoryIds = new Set(selectedReportCategoryIds);

        return filteredTransactions
            .filter((transaction) => {
                return selectedCategoryIds.has(transaction.categoryId || '') && transaction.type === selectedReportCategoryType;
            })
            .sort((transactionA, transactionB) => {
                const dateA = transactionA.dateTime || transactionA.dueDate || 0;
                const dateB = transactionB.dateTime || transactionB.dueDate || 0;
                return dateB - dateA;
            });
    }, [filteredTransactions, selectedReportCategoryIds, selectedReportCategoryType]);

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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
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
        setSelectedIncomeCategory(null);
    };

    const handleSelectIncomeReportCategory = (categoryId: string) => {
        setSelectedIncomeCategory((currentCategory) => currentCategory === categoryId ? null : categoryId);
        setSelectedExpenseCategories([]);
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
                    editingTransaction={editingTransaction}
                    defaultAccountId={defaultTransactionAccountId}
                    lockAccountSelection={lockDefaultTransactionAccount}
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

                <button
                    onClick={() => setIsModalOpen(true)}
                    className={`${FreeBlueBtn} fixed bottom-24 right-4 md:bottom-4 md:right-4`}
                >
                    <Plus size={18} />
                    <span>Add</span>
                </button>
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
        }
    }, [location.pathname]);

    useLayoutEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    }, [location.pathname]);

    useEffect(() => {
        setHomeVisibleCount(20);
    }, [selectedMonthYear, dateRange?.start, dateRange?.end, homeTransactions.length]);

    useEffect(() => {
        setSelectedExpenseCategories([]);
        setSelectedIncomeCategory(null);
    }, [selectedMonthYear, dateRange?.start, dateRange?.end]);

    const handleHomeLogoRefresh = useCallback(() => {
        if (window.confirm('Refresh homepage now?')) {
            window.location.reload();
        }
    }, []);

    useEffect(() => {
        const timerId = window.setTimeout(() => {
            setAnimation(false);
        }, 1500);

        return () => {
            window.clearTimeout(timerId);
        };
    }, []);

    useEffect(() => {
        if (!isHomeDataReady || animation) {
            setIsContentVisible(false);
            setShowSkeletonOverlay(true);
            return;
        }

        const rafId = window.requestAnimationFrame(() => {
            setIsContentVisible(true);
        });
        const timerId = window.setTimeout(() => {
            setShowSkeletonOverlay(false);
        }, 500);

        return () => {
            window.cancelAnimationFrame(rafId);
            window.clearTimeout(timerId);
        };
    }, [isHomeDataReady, animation]);

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
                    lockAccountSelection={lockDefaultTransactionAccount}
                />
                {/* <PINVerificationModal
                    isOpen={showPINModal}
                    onClose={() => navigate('/')}
                    onVerified={() => setIsPINVerified(true)}
                    userId={user.uid}
                /> */}
            </>
        );
    }

    if (location.pathname === '/settings') {
        return (
            <AppShell activeView="settings">
                <SettingsModal
                    variant="page"
                    isOpen={true}
                    onClose={() => navigate('/')}
                    onReset={handleResetData}
                    onImport={handleImportData}
                    onUpdateNetBalanceAccounts={handleUpdateNetBalanceAccounts}
                    onAddCategory={handleAddCategory}
                    financeData={financeData}
                    onBackupToFirebase={user ? handleBackupToFirebase : undefined}
                    onSyncFromFirebase={user ? handleSyncFromFirebase : undefined}
                    onGetSampleData={handleGetSampleData}
                />

                <DataSourceModal
                    isOpen={showDataSourceModal}
                    onFetchFirebase={handleFetchFromFirebase}
                    onGetDummyData={handleGetSampleData}
                    showCloudOption={!!user}
                />
            </AppShell>
        );
    }

    if (!isHomeDataReady) {
        return (
            <>
                <AppShell activeView={loadingView}>
                    <SkeletonApp variant={loadingView === 'report' ? 'report' : 'home'} />
                </AppShell>
                <DataSourceModal
                    isOpen={showDataSourceModal}
                    onFetchFirebase={handleFetchFromFirebase}
                    onGetDummyData={handleGetSampleData}
                    showCloudOption={!!user}
                />
            </>
        );
    }

    if (location.pathname === '/report') {
        return (
            <AppShell activeView="report">
                <div className="">
                    <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
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

                    <div className="mb-6 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 md:gap-6">
                        <div className={amountCard}>
                            <p className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300 sm:mb-2 sm:text-sm">Total Expense</p>
                            <p className="text-xl font-bold text-red-600 sm:text-2xl md:text-3xl">₹ {formatNumberWithCommas(reportTotalExpense.toFixed(2))}</p>
                        </div>
                        <div className={amountCard}>
                            <p className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300 sm:mb-2 sm:text-sm">Total Income</p>
                            <p className="text-xl font-bold text-green-600 sm:text-2xl md:text-3xl">₹ {formatNumberWithCommas(reportTotalIncome.toFixed(2))}</p>
                        </div>
                    </div>

                    <ExpensePieChart
                        transactions={filteredTransactions}
                        categories={financeData.categories}
                        selectedExpenseCategories={selectedExpenseCategories}
                        selectedIncomeCategory={selectedIncomeCategory}
                        onSelectExpenseCategory={handleSelectExpenseReportCategory}
                        onSelectIncomeCategory={handleSelectIncomeReportCategory}
                    />

                    {selectedReportCategoryIds.length > 0 && (
                        <div className="mt-6">
                            <div className="mb-4 flex flex-col gap-2 xs:flex-row xs:items-center xs:justify-between xs:gap-4">
                                <div className="min-w-0">
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50 sm:text-xl md:text-2xl">
                                        {selectedReportHeading} Transactions
                                    </h2>
                                    <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 sm:mt-1 sm:text-sm">
                                        Showing {selectedReportTransactions.length} {selectedReportCategoryType?.toLowerCase()} transaction{selectedReportTransactions.length !== 1 ? 's' : ''} for {selectedReportCategoryName} in this report period.
                                    </p>
                                </div>
                            </div>

                            {renderTransactionGrid(selectedReportTransactions)}
                        </div>
                    )}
                </div>

                {renderSharedFloatingUi()}
            </AppShell>
        );
    }

    return (
        <AppShell activeView="home">
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

                    <div>
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

            {renderSharedFloatingUi()}
        </AppShell>
    );
}

export default App;
