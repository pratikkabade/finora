import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Settings, CircleX, CalendarDays, Calendar1, ChartPie } from 'lucide-react';
import type { FinanceData, Transaction } from './types/finance.types';
import { CreateTransactionModal } from './components/CreateTransactionModal';
import { AddTransactionPage } from './pages/AddTransactionPage';
import { SettingsModal } from './components/SettingsModal';
import { DateRangeModal } from './components/DateRangeModal';
import { DataSourceModal } from './components/DataSourceModal';
import { TransactionCard } from './components/TransactionCard';
import { ExpensePieChart } from './components/ExpensePieChart';
import { SkeletonApp } from './components/SkeletonLoader';
import { LoginPage } from './pages/LoginPage';
import { PINVerificationModal } from './components/PINVerificationModal';
import { useAuth } from './context/AuthContext';
import { getPINStatus } from './services/pinService';
import {
    generateMonthYearOptions,
    filterTransactionsByMonth,
    getCurrentOrPastTransactions,
} from './utils/dateUtils';
import { saveToLocalStorage, loadFromLocalStorage, clearUserData } from './services/storageService';
import { fetchFinanceDataFromFirebase, backupFinanceDataToFirebase } from './services/firebaseService';
import financeDataJson from './data/finance-data.json';
import './App.css';
import { formatNumberWithCommas } from './utils/numberFormatterUtils.ts';
import { BlueBtn } from './constants/TailwindClasses';

export const appHeader = (
    <div className='flex flex-row items-center gap-4 mb-6 sm:mb-8 pt-5'>
        <img src="https://upload.wikimedia.org/wikipedia/commons/a/a1/Wallet_App_icon_iOS_12.png" alt="Finora Logo" className="h-24 w-24 mx-auto sm:mx-0" />
        <div className="text-left">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-50">Finora</h1>
            <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">Clear financial insights for better decisions</p>
        </div>
    </div>
);

function App() {
    // const { user, isLoading } = useAuth();
    const { user, isLoading: authLoading } = useAuth();
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
    const [animation, setAnimation] = useState(true);
    const [isPINVerified, setIsPINVerified] = useState(false);
    const [showPINModal, setShowPINModal] = useState(false);

    // Check if PIN is required for homepage
    useEffect(() => {
        if (!user || authLoading) return;

        const isHomePage = location.pathname === '/';
        const pinStatus = getPINStatus(user.uid);

        if (isHomePage && pinStatus.isPINSet && !isPINVerified) {
            setShowPINModal(true);
        } else {
            setShowPINModal(false);
        }
    }, [location.pathname, user, authLoading, isPINVerified]);

    // Load data when user logs in
    useEffect(() => {
        if (authLoading) return;

        const loadData = async () => {
            try {
                if (!user) {
                    // User not logged in, will show login page
                    setFinanceData(null);
                    return;
                }

                // First try to load from localStorage (local cache)
                const localData = loadFromLocalStorage(user.uid);
                if (localData) {
                    setFinanceData(localData);
                    // Optionally fetch from Firebase in background to sync if needed
                    return;
                }

                // No local data, show data source selection modal on first login
                setShowDataSourceModal(true);
            } finally {
                // Data loading complete
            }
        };

        loadData();
    }, [user, authLoading]);

    // Save data to localStorage whenever financeData changes
    useEffect(() => {
        if (financeData && user) {
            saveToLocalStorage(user.uid, financeData);
        }
    }, [financeData, user]);

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

    useEffect(() => {
        if (monthYearOptions.length > 0 && !selectedMonthYear) {
            setSelectedMonthYear(monthYearOptions[0].value);
        }
    }, [monthYearOptions, selectedMonthYear]);

    const filteredTransactions = useMemo(() => {
        if (!selectedMonthYear && !dateRange) return [];

        let transactions = validTransactions;

        // Apply date range if set
        if (dateRange) {
            transactions = transactions.filter(t => {
                const txDate = t.dateTime || t.dueDate || 0;
                return txDate >= dateRange.start && txDate <= dateRange.end;
            });
        } else if (selectedMonthYear) {
            // Use month year selection
            const [year, month] = selectedMonthYear.split('-').map(Number);
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
    }, [validTransactions, selectedMonthYear, dateRange, filterType, filterId]);

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
        if (user) {
            // Only clear local storage, preserve Firebase data
            clearUserData(user.uid);
            setFinanceData(null);
            setSelectedMonthYear('');
            setDateRange(null);
            setFilterType(null);
            setFilterId(null);
            setEditingTransaction(null);
            setShowPieChart(false);
            setSelectedExpenseCategory(null);
            setSelectedIncomeCategory(null);
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

    const handleFetchFromFirebase = async () => {
        if (!user) return;
        try {
            const firebaseData = await fetchFinanceDataFromFirebase(user.uid);
            if (firebaseData) {
                setFinanceData(firebaseData);
                saveToLocalStorage(user.uid, firebaseData);
                setShowDataSourceModal(false);
            } else {
                alert('No data found in Firebase. Starting with sample data instead.');
                handleGetSampleData();
            }
        } catch (error: any) {
            console.error('Error fetching from Firebase:', error);
            alert('Failed to fetch data from Firebase. Starting with sample data instead.');
            handleGetSampleData();
        }
    };

    const handleGetSampleData = () => {
        const sampleData = financeDataJson as FinanceData;
        setFinanceData(sampleData);
        if (user) {
            saveToLocalStorage(user.uid, sampleData);
        }
        setShowDataSourceModal(false);
    };

    const handleApplyDateRange = (startDate: number, endDate: number) => {
        setDateRange({ start: startDate, end: endDate });
        setSelectedMonthYear(''); // Clear month selection when using date range
    };

    const totalIncome = filteredTransactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = filteredTransactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0);

    // Prevent background scroll when any modal is open
    useEffect(() => {
        const isAnyModalOpen = isModalOpen || isSettingsOpen || isDateRangeOpen || showDataSourceModal || showPINModal || !!editingTransaction;

        if (isAnyModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isModalOpen, isSettingsOpen, isDateRangeOpen, showDataSourceModal, showPINModal, editingTransaction]);

    useEffect(() => {
        setTimeout(() => {
            setAnimation(false);
        }, 1500);
    }, [])

    if (!user) {
        return <LoginPage />;
    }

    // Handle /add route
    if (location.pathname === '/add') {
        return (
            <>
                <AddTransactionPage
                    financeData={financeData}
                    onSave={handleCreateTransaction}
                />
                <PINVerificationModal
                    isOpen={showPINModal}
                    onClose={() => navigate('/')}
                    onVerified={() => setIsPINVerified(true)}
                    userId={user.uid}
                />
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
                    financeData={financeData}
                    onBackupToFirebase={user ? handleBackupToFirebase : undefined}
                    onSyncFromFirebase={user ? handleFetchFromFirebase : undefined}
                    onGetSampleData={handleGetSampleData}
                />
                <PINVerificationModal
                    isOpen={showPINModal}
                    onClose={() => {
                        setIsPINVerified(false);
                        navigate('/');
                    }}
                    onVerified={() => {
                        setIsPINVerified(true);
                    }}
                    userId={user.uid}
                />
            </>
        );
    }

    if (!financeData || authLoading || animation) {
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
                />
            </>
        );
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 fade-in">
                <div className="flex flex-col sm:flex-row justify-between gap-3 md:gap-4 mb-6">
                    {/* Header */}
                    {appHeader}

                    {/* Controls */}
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={() => setShowPieChart(!showPieChart)}
                            className="glass-card p-4 sm:p-5 md:p-3 hover:bg-white dark:hover:bg-gray-800 transition-colors text-left rounded-xl w-64 cursor-pointer group">
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
                            <p className={`text-xl sm:text-2xl md:text-3xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ₹ {formatNumberWithCommas((totalIncome - totalExpense))}
                            </p>
                        </button>

                        <div className='flex flex-col gap-2'>
                            <select
                                value={selectedMonthYear}
                                onChange={(e) => {
                                    setSelectedMonthYear(e.target.value);
                                    setDateRange(null);
                                }}
                                disabled={dateRange !== null}
                                className={`glass-input px-3 py-2 text-sm text-gray-900 dark:text-gray-50 rounded-lg disabled:opacity-50 hover:bg-white dark:hover:bg-gray-800 ${dateRange ? 'text-red-600 cursor-not-allowed' : ''}`}
                            >
                                {monthYearOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>

                            <div className='flex justify-between gap-2'>
                                {dateRange ? (
                                    <button
                                        onClick={() => setDateRange(null)}
                                        className="glass-button flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-50 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
                                        title="Clear date range">
                                        <Calendar1 size={16} className='text-red-600' />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setIsDateRangeOpen(true)}
                                        className="glass-button flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-50 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
                                        title="Select custom date range"
                                    >
                                        <CalendarDays size={16} />
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsSettingsOpen(true)}
                                    className="glass-button flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-50 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
                                >
                                    <Settings size={18} />
                                    Settings
                                </button>
                            </div>
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
                                            key={transaction.id}
                                            transaction={transaction}
                                            account={financeData.accounts.find(a => a.id === transaction.accountId)}
                                            category={financeData.categories.find(c => c.id === transaction.categoryId)}
                                            filterType={filterType}
                                            filterId={filterId}
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


            {showPINModal && (
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
            )}

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
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onReset={handleResetData}
                onImport={handleImportData}
                financeData={financeData}
                onBackupToFirebase={user ? handleBackupToFirebase : undefined}
                onSyncFromFirebase={user ? handleFetchFromFirebase : undefined}
                onGetSampleData={handleGetSampleData}
                onResetClick={() => setShowDataSourceModal(true)}
            />

            <DateRangeModal
                isOpen={isDateRangeOpen}
                onClose={() => setIsDateRangeOpen(false)}
                onApply={handleApplyDateRange}
                transactions={validTransactions}
            />

            <DataSourceModal
                isOpen={showDataSourceModal}
                onFetchFirebase={handleFetchFromFirebase}
                onGetDummyData={handleGetSampleData}
            />


            <button
                onClick={() => setIsModalOpen(true)}
                className={BlueBtn}>
                <Plus size={18} />
                <span className="text-xs sm:text-sm">Add</span>
            </button>
        </div>
    );
}


export default App;
