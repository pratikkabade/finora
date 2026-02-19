import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Settings, CircleX, CalendarDays, Calendar1, ChartPie } from 'lucide-react';
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
import { AppChartBtn, FreeBlueBtn, FreeWhiteBtn } from './constants/TailwindClasses';

const GUEST_USER_ID = '__guest__';

interface AppHeaderProps {
    onLogoClick?: () => void;
}

export const AppHeader = ({ onLogoClick }: AppHeaderProps) => {
    const logo = <img src="/finora-icon.svg" alt="Finora Logo" className="h-24 w-24 mx-auto sm:mx-0" />;

    return (
        <div className='flex flex-row items-center gap-4 mb-6 sm:mb-8 pt-5'>
            {onLogoClick ? (
                <button
                    type="button"
                    onClick={onLogoClick}
                    className="rounded-full focus-visible:outline-2 focus-visible:outline-blue-500 cursor-pointer"
                    title="Refresh homepage"
                    aria-label="Refresh homepage"
                >
                    {logo}
                </button>
            ) : logo}
            <div className="text-left">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-50">Finora</h1>
                <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">Clear financial insights for better decisions</p>
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
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
    const [showPieChart, setShowPieChart] = useState(false);
    const [showDataSourceModal, setShowDataSourceModal] = useState(false);
    const [selectedMonthYear, setSelectedMonthYear] = useState<string>('');
    const [dateRange, setDateRange] = useState<{ start: number; end: number } | null>(null);
    const [filterType, setFilterType] = useState<'account' | 'category' | 'type' | null>(null);
    const [filterId, setFilterId] = useState<string | null>(null);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<string | null>(null);
    const [selectedIncomeCategory, setSelectedIncomeCategory] = useState<string | null>(null);
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

    // Load data when user logs in
    useEffect(() => {
        if (authLoading) return;

        const loadData = async () => {
            try {
                if (!storageUserId) {
                    // User not logged in, will show login page
                    setFinanceData(null);
                    setBalanceSummary(null);
                    setShowDataSourceModal(false);
                    return;
                }

                // First try to load from localStorage (local cache)
                const localData = loadFromLocalStorage(storageUserId);
                if (localData) {
                    setFinanceData(localData);
                    setBalanceSummary(loadBalanceSummaryFromLocalStorage(storageUserId));
                    setShowDataSourceModal(false);
                    // Optionally fetch from Firebase in background to sync if needed
                    return;
                }

                setBalanceSummary(null);
                // No local data, show data source selection modal on first login
                setShowDataSourceModal(true);
            } finally {
                // Data loading complete
            }
        };

        loadData();
    }, [storageUserId, authLoading]);

    // Save data to localStorage whenever financeData changes
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

        // Apply date range if set
        if (dateRange) {
            transactions = transactions.filter(t => {
                const txDate = t.dateTime || t.dueDate || 0;
                return txDate >= dateRange.start && txDate <= dateRange.end;
            });
        } else if (activeMonthYear) {
            // Use month year selection
            const [year, month] = activeMonthYear.split('-').map(Number);
            transactions = filterTransactionsByMonth(validTransactions, month, year);
        }

        // Apply additional filters
        if (filterType && filterId) {
            if (filterType === 'account') {
                transactions = transactions.filter(t => t.accountId === filterId);
            } else if (filterType === 'category') {
                transactions = transactions.filter(t => t.categoryId === filterId);
            } else if (filterType === 'type') {
                transactions = transactions.filter(t => t.type === filterId);
            }
        }

        return transactions;
    }, [validTransactions, activeMonthYear, dateRange, filterType, filterId]);

    const handleCreateTransaction = (transaction: Transaction) => {
        if (!financeData) return;

        if (editingTransaction) {
            // Update existing transaction
            setFinanceData({
                ...financeData,
                transactions: financeData.transactions.map(t => t.id === transaction.id ? transaction : t),
            });
            setEditingTransaction(null);
        } else {
            // Create new transaction
            setFinanceData({
                ...financeData,
                transactions: [...financeData.transactions, transaction],
            });
        }
    };

    const handleDeleteTransaction = (transactionId: string) => {
        if (!financeData) return;

        setFinanceData({
            ...financeData,
            transactions: financeData.transactions.filter(t => t.id !== transactionId),
        });
    };

    const handleResetData = () => {
        if (storageUserId) {
            // Only clear local storage, preserve Firebase data
            clearUserData(storageUserId);
            setFinanceData(null);
            setSelectedMonthYear('');
            setDateRange(null);
            setFilterType(null);
            setFilterId(null);
            setEditingTransaction(null);
            setShowPieChart(false);
            setSelectedExpenseCategory(null);
            setSelectedIncomeCategory(null);
            setBalanceSummary(null);
            // Show data source modal to let user choose how to start fresh
            setShowDataSourceModal(true);
        }
    };

    const handleImportData = (importedData: FinanceData) => {
        setFinanceData(importedData);
        setSelectedMonthYear('');
        setDateRange(null);
        setFilterType(null);
        setFilterId(null);
        setEditingTransaction(null);
        setShowPieChart(false);
        setSelectedExpenseCategory(null);
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
        setSelectedMonthYear(''); // Clear month selection when using date range
    };

    const handleApplyMonthSelection = (monthYear: string) => {
        setSelectedMonthYear(monthYear);
        setDateRange(null);
    };

    const totalIncome = filteredTransactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = filteredTransactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0);

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
    const isAnyModalOpen = isModalOpen || isSettingsOpen || isDateRangeOpen || showDataSourceModal || !!editingTransaction;
    const netBalanceAccountIds = useMemo(() => {
        if (!financeData) return [];
        return getIncludedNetBalanceAccountIds(financeData);
    }, [financeData]);
    const defaultTransactionAccountId = netBalanceAccountIds[0] ?? financeData?.accounts?.[0]?.id ?? '';
    const lockDefaultTransactionAccount = netBalanceAccountIds.length === 1;

    // Prevent background scroll when any modal is open
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

    // Prevent iOS pull-to-refresh on homepage while keeping regular scrolling.
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

    // Handle /add route
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

    // Handle /settings route
    if (location.pathname === '/settings') {
        return (
            <>
                <SettingsModal
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
                {/* <PINVerificationModal
                    isOpen={showPINModal}
                    onClose={() => {
                        setIsPINVerified(false);
                        navigate('/');
                    }}
                    onVerified={() => {
                        setIsPINVerified(true);
                    }}
                    userId={user.uid}
                /> */}
            </>
        );
    }

    if (!isHomeDataReady) {
        return (
            <>
                <SkeletonApp
                    handleResetData={handleResetData}
                    handleImportData={handleImportData}
                    financeData={financeData}
                    user={user}
                    handleBackupToFirebase={handleBackupToFirebase}
                    handleFetchFromFirebase={handleFetchFromFirebase}
                    handleGetSampleData={handleGetSampleData}
                    isSettingsOpen={isSettingsOpen}
                    setIsSettingsOpen={setIsSettingsOpen}
                />
                <DataSourceModal
                    isOpen={showDataSourceModal}
                    onFetchFirebase={handleFetchFromFirebase}
                    onGetDummyData={handleGetSampleData}
                    showCloudOption={!!user}
                />
            </>
        );
    }

    return (
        <div className="relative min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 overflow-hidden">
            <div className={`max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 fade-in transition-opacity duration-500 ease-out ${isContentVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="flex flex-col sm:flex-row justify-between gap-3 md:gap-4 mb-6">
                    {/* Header */}
                    <AppHeader onLogoClick={handleHomeLogoRefresh} />

                    {/* Controls */}
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={() => setShowPieChart(!showPieChart)}
                            className={AppChartBtn}>
                            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium mb-1 sm:mb-2 flex flex-row justify-between items-center">
                                Net Balance
                                {showPieChart ?
                                    <div className='flex gap-2'>
                                        {/* <X size={16} className='text-red-600' /> */}
                                        <CircleX size={16} className='text-red-600' />
                                    </div>
                                    :
                                    <ChartPie size={16} className='scale-100 group-hover:scale-110 transition-all duration-300 ease-in-out' />}
                            </p>
                            <p className={`text-xl sm:text-2xl md:text-3xl font-bold ${lifetimeSummary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ₹ {formatNumberWithCommas((lifetimeSummary.netBalance))}
                            </p>
                        </button>

                        <div className='flex flex-col gap-2'>
                            {dateRange ? (
                                <button
                                    onClick={() => setDateRange(null)}
                                    className={`${FreeWhiteBtn} w-36!`}
                                    title="Clear date range">
                                    <Calendar1 size={16} className='text-red-600' />
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
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className={`${FreeWhiteBtn} w-36!`}
                            >
                                <Settings size={18} />
                                Settings
                            </button>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                {showPieChart && (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6">
                        <div
                            className="glass-card p-4 sm:p-5 md:p-6 hover:bg-white dark:hover:bg-gray-800 transition-colors text-left rounded-xl"
                        >
                            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium mb-1 sm:mb-2">Total Expense</p>
                            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-red-600">₹ {formatNumberWithCommas(totalExpense.toFixed(2))}</p>
                        </div>
                        <div
                            className="glass-card p-4 sm:p-5 md:p-6 hover:bg-white dark:hover:bg-gray-800 transition-colors text-left rounded-xl"
                        >
                            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium mb-1 sm:mb-2">Total Income</p>
                            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600">₹ {formatNumberWithCommas(totalIncome.toFixed(2))}</p>
                        </div>
                    </div>
                )}

                {/* Pie Chart */}
                {showPieChart && (
                    <ExpensePieChart
                        transactions={filteredTransactions}
                        categories={financeData.categories}
                        onSetShowPieChart={setShowPieChart}
                        selectedExpenseCategory={selectedExpenseCategory}
                        selectedIncomeCategory={selectedIncomeCategory}
                        onSelectExpenseCategory={setSelectedExpenseCategory}
                        onSelectIncomeCategory={setSelectedIncomeCategory}
                        onFilterChange={(type, id) => {
                            setFilterType(type);
                            setFilterId(id);
                        }}
                    />
                )}

                {/* Transactions List */}
                {!showPieChart && (
                    <div>
                        <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 xs:gap-4 mb-4">
                            <div className="min-w-0">
                                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-50">
                                    Recent Transactions
                                </h2>
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1">Showing {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}</p>
                            </div>
                        </div>
                        {filteredTransactions.length === 0 ? (
                            <div className="glass-card p-6 sm:p-8 text-center">
                                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">No transactions found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                                {filteredTransactions
                                    .sort((a, b) => {
                                        const dateA = a.dateTime || a.dueDate || 0;
                                        const dateB = b.dateTime || b.dueDate || 0;
                                        return dateB - dateA;
                                    })
                                    .map((transaction) => (
                                        <TransactionCard
                                            key={`${transaction.id}-${filterType ?? 'all'}-${filterId ?? 'all'}`}
                                            transaction={transaction}
                                            account={financeData.accounts.find(a => a.id === transaction.accountId)}
                                            category={financeData.categories.find(c => c.id === transaction.categoryId)}
                                            filterType={filterType}
                                            onFilterChange={(type, id) => {
                                                setFilterType(type);
                                                setFilterId(id);
                                            }}
                                            onEdit={(trans) => setEditingTransaction(trans)}
                                        />
                                    ))
                                }
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showSkeletonOverlay && (
                <div className={`absolute inset-0 z-20 pointer-events-none transition-opacity duration-500 ease-out ${isContentVisible ? 'opacity-0' : 'opacity-100'}`}>
                    <SkeletonApp
                        handleResetData={handleResetData}
                        handleImportData={handleImportData}
                        financeData={financeData}
                        user={user}
                        handleBackupToFirebase={handleBackupToFirebase}
                        handleFetchFromFirebase={handleFetchFromFirebase}
                        handleGetSampleData={handleGetSampleData}
                        isSettingsOpen={isSettingsOpen}
                        setIsSettingsOpen={setIsSettingsOpen}
                    />
                </div>
            )}


            {/* {showPINModal && (
                <PINVerificationModal
                    isOpen={showPINModal}
                    onClose={() => {
                        setIsPINVerified(false);
                        setShowPINModal(false);
                    }}
                    onVerified={() => {
                        setIsPINVerified(true);
                        setShowPINModal(false);
                    }}
                    userId={user.uid}
                />
            )} */}

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

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onReset={handleResetData}
                onImport={handleImportData}
                onUpdateNetBalanceAccounts={handleUpdateNetBalanceAccounts}
                onAddCategory={handleAddCategory}
                financeData={financeData}
                onBackupToFirebase={user ? handleBackupToFirebase : undefined}
                onSyncFromFirebase={user ? handleSyncFromFirebase : undefined}
                onGetSampleData={handleGetSampleData}
                onResetClick={() => setShowDataSourceModal(true)}
            />

            <DateRangeModal
                isOpen={isDateRangeOpen}
                onClose={() => setIsDateRangeOpen(false)}
                onApply={handleApplyDateRange}
                onApplyMonth={handleApplyMonthSelection}
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
                className={`${FreeBlueBtn} fixed bottom-3 right-3`}>
                <Plus size={18} />
                <span>Add</span>
            </button>
        </div>
    );
}


export default App;
