import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, RotateCcw, Download, Upload, Cloud, LogOut, Zap, Landmark, Tags, Plus } from 'lucide-react';
import type { FinanceData } from '../types/finance.types';
import { useAuth } from '../context/AuthContext';
// import { useDarkMode } from '../context/DarkModeContext';
import { FreeBlueBtn, FreeWhiteBtn, ModalHeader, settingBtnDangerClass, settingBtnDetailTextClass, settingBtnPlainClass, settingBtnPlainNoHoverClass1, settingBtnPlainNoHoverClass2 } from '../constants/TailwindClasses';
// import { PINManagement } from './PINManagement';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { getIncludedNetBalanceAccountIds } from '../services/storageService';
import { intToHex } from '../utils/colorUtils';

type ActionStatus = 'idle' | 'success' | 'error';
type ActionStatusKey = 'backup' | 'sync' | 'import' | 'sample' | 'category';

const ACTION_STATUS_RESET_MS = 2000;
const ACTION_SUCCESS_CLASSES = 'bg-green-50/50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border border-green-200/50 dark:border-green-800/50';
const ACTION_ERROR_CLASSES = 'bg-red-50/50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-800/50';
const ACTION_IDLE_CLASSES = 'text-gray-900 dark:text-gray-50 hover:bg-white/40 dark:hover:bg-gray-700/40';
const ACTION_BASE_CLASSES = 'disabled:opacity-50 disabled:cursor-not-allowed';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onReset: () => void;
    onImport: (data: FinanceData) => void;
    onUpdateNetBalanceAccounts?: (accountIds: string[]) => void;
    onAddCategory?: (categoryName: string, color: number) => boolean;
    financeData: FinanceData | null;
    onBackupToFirebase?: () => Promise<void>;
    onSyncFromFirebase?: () => Promise<void>;
    onGetSampleData?: () => void;
    onResetClick?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen,
    onClose,
    onReset,
    onImport,
    onUpdateNetBalanceAccounts,
    onAddCategory,
    financeData,
    onBackupToFirebase,
    onSyncFromFirebase,
    onGetSampleData,
    onResetClick,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const actionStatusTimersRef = useRef<Partial<Record<ActionStatusKey, number>>>({});
    const [cloudSyncStatus, setCloudSyncStatus] = useState({ isSynced: true, lastSyncTime: localStorage.getItem('lastCloudBackup') ? parseInt(localStorage.getItem('lastCloudBackup') as string, 10) : 0 });
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [backupStatus, setBackupStatus] = useState<ActionStatus>('idle');
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<ActionStatus>('idle');
    const [importStatus, setImportStatus] = useState<ActionStatus>('idle');
    const [sampleDataStatus, setSampleDataStatus] = useState<ActionStatus>('idle');
    const [categoryStatus, setCategoryStatus] = useState<ActionStatus>('idle');
    const [selectedNetBalanceAccountIds, setSelectedNetBalanceAccountIds] = useState<string[]>([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColorHex, setNewCategoryColorHex] = useState('#3B82F6');
    const { user, isGuest, logout } = useAuth();
    // const { isDarkMode, toggleDarkMode } = useDarkMode();
    const [localUser, setLocalUser] = useState<string>('');

    useEffect(() => {
        if (financeData) {
            setLocalUser(financeData.settings?.[0]?.name || '');
            setSelectedNetBalanceAccountIds(getIncludedNetBalanceAccountIds(financeData));
        } else {
            setSelectedNetBalanceAccountIds([]);
        }
    }, [financeData]);

    const orderedCategories = useMemo(() => {
        if (!financeData?.categories) return [];

        return [...financeData.categories].sort((categoryA, categoryB) => {
            const orderA = Number(categoryA.orderNum) || 0;
            const orderB = Number(categoryB.orderNum) || 0;
            if (orderA !== orderB) {
                return orderA - orderB;
            }

            return categoryA.name.localeCompare(categoryB.name);
        });
    }, [financeData?.categories]);

    useEffect(() => {
        return () => {
            Object.values(actionStatusTimersRef.current).forEach((timeoutId) => {
                if (timeoutId) {
                    window.clearTimeout(timeoutId);
                }
            });
        };
    }, []);

    const setActionStatus = (
        key: ActionStatusKey,
        setStatus: React.Dispatch<React.SetStateAction<ActionStatus>>,
        status: ActionStatus,
    ) => {
        const existingTimeoutId = actionStatusTimersRef.current[key];
        if (existingTimeoutId) {
            window.clearTimeout(existingTimeoutId);
        }

        setStatus(status);

        if (status === 'idle') {
            delete actionStatusTimersRef.current[key];
            return;
        }

        actionStatusTimersRef.current[key] = window.setTimeout(() => {
            setStatus('idle');
            delete actionStatusTimersRef.current[key];
        }, ACTION_STATUS_RESET_MS);
    };

    const getActionButtonClasses = (status: ActionStatus) => {
        if (status === 'success') return `${settingBtnPlainClass} ${ACTION_SUCCESS_CLASSES} ${ACTION_BASE_CLASSES}`;
        if (status === 'error') return `${settingBtnPlainClass} ${ACTION_ERROR_CLASSES} ${ACTION_BASE_CLASSES}`;
        return `${settingBtnPlainClass} ${ACTION_IDLE_CLASSES} ${ACTION_BASE_CLASSES}`;
    };

    const markCloudAsSynced = () => {
        const now = Date.now();
        setCloudSyncStatus({ isSynced: true, lastSyncTime: now });
        localStorage.setItem('lastCloudBackup', now.toString());
        localStorage.setItem('outOfSync', 'false');
    };

    const markCloudAsOutOfSync = () => {
        setCloudSyncStatus({ isSynced: false, lastSyncTime: Date.now() });
    };

    const handleToggleNetBalanceAccount = (accountId: string) => {
        if (!onUpdateNetBalanceAccounts) return;

        const isSelected = selectedNetBalanceAccountIds.includes(accountId);
        const nextSelectedAccountIds = isSelected
            ? selectedNetBalanceAccountIds.filter(id => id !== accountId)
            : [...selectedNetBalanceAccountIds, accountId];

        if (nextSelectedAccountIds.length === 0) {
            alert('Please keep at least one account selected for net balance.');
            return;
        }

        setSelectedNetBalanceAccountIds(nextSelectedAccountIds);
        onUpdateNetBalanceAccounts(nextSelectedAccountIds);
    };

    const hexToColorNumber = (hexColor: string): number => {
        const sanitized = hexColor.replace('#', '');
        return Number.parseInt(sanitized, 16);
    };

    const handleAddCategory = (event: React.FormEvent) => {
        event.preventDefault();
        if (!onAddCategory) return;

        const trimmedCategoryName = newCategoryName.trim();
        if (!trimmedCategoryName) {
            alert('Category name is required.');
            setActionStatus('category', setCategoryStatus, 'error');
            return;
        }

        const didAddCategory = onAddCategory(trimmedCategoryName, hexToColorNumber(newCategoryColorHex));
        if (!didAddCategory) {
            setActionStatus('category', setCategoryStatus, 'error');
            return;
        }

        setNewCategoryName('');
        setNewCategoryColorHex('#3B82F6');
        setActionStatus('category', setCategoryStatus, 'success');
        markCloudAsOutOfSync();
    };

    const handleBackupToFirebase = async () => {
        if (!onBackupToFirebase) return;
        if (!window.confirm('Back up your current local data to Firebase now?')) return;

        setIsBackingUp(true);
        setActionStatus('backup', setBackupStatus, 'idle');
        try {
            await onBackupToFirebase();
            setActionStatus('backup', setBackupStatus, 'success');
            markCloudAsSynced();
        } catch (error: any) {
            console.error('Backup error:', error);
            setActionStatus('backup', setBackupStatus, 'error');
            const errorMessage = error?.message || 'An unknown error occurred during backup.';
            alert('Backup Failed:\n\n' + errorMessage);
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleLogout = async () => {
        const confirmationMessage = isGuest
            ? 'Exit guest session and return to sign in?'
            : 'Are you sure you want to logout?';

        if (window.confirm(confirmationMessage)) {
            try {
                await logout();
                onClose();
            } catch (error) {
                console.error('Logout error:', error);
                alert('Failed to logout');
            }
        }
    };

    const handleSyncFromFirebase = async () => {
        if (!onSyncFromFirebase) return;
        if (!window.confirm('Restore local data from Firebase backup now? This replaces current local data.')) return;

        setIsSyncing(true);
        setActionStatus('sync', setSyncStatus, 'idle');
        try {
            await onSyncFromFirebase();
            setActionStatus('sync', setSyncStatus, 'success');
            markCloudAsSynced();
        } catch (error: any) {
            console.error('Sync error:', error);
            setActionStatus('sync', setSyncStatus, 'error');
            const errorMessage = error?.message || 'An unknown error occurred during sync.';
            alert('Sync Failed:\n\n' + errorMessage);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleGetSampleData = (): boolean => {
        if (!onGetSampleData) return false;
        if (!window.confirm('Replace your current data with sample data?')) return false;
        onGetSampleData();
        return true;
    };

    const handleDownload = () => {
        if (!financeData) return;
        if (!window.confirm('Download a backup file of your current data?')) return;

        let dataStr = JSON.stringify(financeData, null, 2);

        // Preserve decimal format for numeric fields (e.g., "200" -> "200.0")
        const fieldsToPreserveDecimals = ['amount', 'toAmount', 'orderNum', 'bufferAmount'];
        fieldsToPreserveDecimals.forEach(field => {
            const regex = new RegExp(`"${field}":\\s*(\\d+)([,\\n])`, 'g');
            dataStr = dataStr.replace(regex, `"${field}": $1.0$2`);
        });
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `finance-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const triggerImportFlow = () => {
        if (!window.confirm('Import data from a JSON file? This will replace your current local data.')) {
            return;
        }
        fileInputRef.current?.click();
    };

    const handleReset = () => {
        if (window.confirm('Are you sure you want to reset all data? This will clear your local data only - your Firebase backup (if any) will remain safe.')) {
            onReset();
            if (onResetClick) {
                onResetClick();
            }
            onClose();
        }
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        setActionStatus('import', setImportStatus, 'idle');

        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const importedData = JSON.parse(content) as FinanceData;

                // Validate the imported data structure
                if (importedData && importedData.accounts && importedData.categories && importedData.transactions) {
                    onImport(importedData);
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                    setActionStatus('import', setImportStatus, 'success');
                    markCloudAsOutOfSync();
                } else {
                    setActionStatus('import', setImportStatus, 'error');
                    alert('Invalid data format in the imported file.');
                }
            } catch (error) {
                console.error('Import error:', error);
                setActionStatus('import', setImportStatus, 'error');
                alert('Error importing file. Please make sure it\'s a valid JSON file.');
            }
        };
        reader.readAsText(file);
    };

    if (!isOpen) return null;

    return (
        <div className='fixed inset-0 overflow-y-hidden flex items-center justify-center z-50 bg-white dark:bg-gray-900 rounded-none shadow-xl w-full fade-in'>
            <div className='w-full max-w-xl'>
                {/* Header */}
                <div className={ModalHeader}>
                    <h2 className="text-lg sm:text-xl font-bold">Settings</h2>
                    <button
                        onClick={onClose}
                        className={FreeWhiteBtn}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto max-h-[80vh]">

                    {localUser && (
                        <div className="px-4 pt-2 text-lg">
                            <span className="text-gray-800 dark:text-gray-200">Welcome, <span className='text-xl font-mono'>{localUser}</span></span>
                        </div>
                    )}

                    {user &&
                        <div className="px-4">
                            <span className="text-sm text-gray-800 dark:text-gray-300">{user.email}</span>
                        </div>
                    }

                    {/* <div className="px-4 pt-4">
                        <span className="text-sm text-gray-800 dark:text-gray-300">Security</span>
                    </div> */}

                    {/* {user && <PINManagement userId={user.uid} onSuccess={() => { }} />} */}


                    {/* <div className="px-4 pt-4">
                        <span className="text-sm text-gray-800 dark:text-gray-300">Appearance</span>
                    </div>

                    <button
                        onClick={toggleDarkMode}
                        className={settingBtnPlainClass}
                    >
                        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                        <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                    </button> */}

                    <div className="px-4 pt-4">
                        <span className="text-sm text-gray-800 dark:text-gray-300">Optimization</span>
                    </div>

                    <div className={`${settingBtnPlainNoHoverClass1} flex flex-col items-start`}>
                        <div className={settingBtnPlainNoHoverClass2}>
                            <Landmark size={18} />
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    Net Balance Accounts
                                </span>
                                <span className={settingBtnDetailTextClass}>
                                    Only selected accounts are included in top net balance calculations.
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-row flex-wrap gap-2">
                            {financeData?.accounts?.length ? (
                                financeData.accounts.map((account) => (
                                    <label
                                        key={account.id}
                                        className={`${settingBtnPlainClass} w-fit!`}
                                    >
                                        <button
                                            role="switch"
                                            aria-checked={selectedNetBalanceAccountIds.includes(account.id)}
                                            onClick={() => handleToggleNetBalanceAccount(account.id)}
                                            className={`relative inline-flex h-5.5 w-9.5 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${selectedNetBalanceAccountIds.includes(account.id) ? 'bg-blue-500' : 'bg-gray-300/40'
                                                }`}
                                        >
                                            <span className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform duration-200 ease-in-out ${selectedNetBalanceAccountIds.includes(account.id) ? 'translate-x-4' : 'translate-x-0'
                                                }`} />
                                        </button>
                                        <span>{account.name}</span>
                                    </label>
                                ))
                            ) : (
                                <span className={settingBtnDetailTextClass}>No accounts available.</span>
                            )}
                        </div>
                    </div>

                    <div className="px-4 pt-4">
                        <span className="text-sm text-gray-800 dark:text-gray-300">Categories</span>
                    </div>

                    <div className={`${settingBtnPlainNoHoverClass1} flex flex-col items-start`}>
                        <div className={settingBtnPlainNoHoverClass2}>
                            <Tags size={18} />
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    Manage Categories
                                </span>
                                <span className={settingBtnDetailTextClass}>
                                    Add new categories and review your current list.
                                </span>
                            </div>
                        </div>

                        <div className="w-full mt-3 space-y-2">
                            {orderedCategories.length ? (
                                <div className="max-h-44 overflow-y-auto pr-1 space-y-2">
                                    {orderedCategories.map((category) => (
                                        <div
                                            key={category.id}
                                            className="flex items-center gap-2 rounded-lg border border-white/30 dark:border-gray-700/40 bg-white/10 dark:bg-gray-900/20 px-3 py-2"
                                        >
                                            <span
                                                className="h-3 w-3 rounded-full border border-black/10 dark:border-white/20"
                                                style={{ backgroundColor: intToHex(category.color) }}
                                            />
                                            <span className="text-sm text-gray-900 dark:text-gray-100 truncate">{category.name}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <span className={settingBtnDetailTextClass}>No categories available.</span>
                            )}
                        </div>

                        <form onSubmit={handleAddCategory} className="w-full mt-3 flex flex-col gap-2">
                            <div className="flex flex-row items-center gap-2">
                                <input
                                    type="text"
                                    value={newCategoryName}
                                    onChange={(event) => setNewCategoryName(event.target.value)}
                                    placeholder="Category name"
                                    className="glass-input w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-50 rounded-lg"
                                    disabled={!onAddCategory}
                                />
                                <label
                                    className="h-10 w-12 shrink-0 overflow-hidden rounded-lg border border-white/30 dark:border-gray-700/40"
                                    title="Choose category color"
                                >
                                    <input
                                        type="color"
                                        value={newCategoryColorHex}
                                        onChange={(event) => setNewCategoryColorHex(event.target.value)}
                                        className="h-full w-full cursor-pointer border-0 bg-transparent p-0"
                                        aria-label="Category color"
                                        disabled={!onAddCategory}
                                    />
                                </label>
                                <button type="submit" disabled={!onAddCategory} className={`${FreeBlueBtn} px-3! py-2! disabled:cursor-not-allowed disabled:opacity-50`}>
                                    <Plus size={16} />
                                </button>
                            </div>
                            <span className={settingBtnDetailTextClass}>
                                {categoryStatus === 'success'
                                    ? 'Category added.'
                                    : categoryStatus === 'error'
                                        ? 'Could not add category.'
                                        : 'Use this when you need a new category option in transactions.'}
                            </span>
                        </form>
                    </div>


                    <div className="px-4 pt-4">
                        <span className="text-sm text-gray-800 dark:text-gray-300">Safeguard data</span>
                    </div>


                    <button
                        onClick={handleDownload}
                        className={settingBtnPlainClass}
                    >
                        <Download size={18} />
                        <div className='flex flex-col items-start'>
                            <span>Download Your Data</span>
                            <span className={settingBtnDetailTextClass}>Export and download Your Data</span>
                        </div>
                    </button>


                    {user && (
                        <div className='flex flex-row gap-4'>
                            <button
                                onClick={handleBackupToFirebase}
                                disabled={isBackingUp}
                                className={getActionButtonClasses(backupStatus)}
                            >
                                <Cloud size={18} />
                                <div className='flex flex-col items-start'>
                                    <span>
                                        {isBackingUp
                                            ? 'Backing up...'
                                            : backupStatus === 'success'
                                                ? 'Backup successful!'
                                                : backupStatus === 'error'
                                                    ? 'Backup failed'
                                                    : 'Backup to Cloud'}
                                    </span>
                                    <SyncStatusIndicator isSynced={cloudSyncStatus.isSynced} lastSyncTime={cloudSyncStatus.lastSyncTime} />
                                </div>
                            </button>
                        </div>
                    )}

                    <div className="px-4 pt-4">
                        <span className="text-sm text-gray-800 dark:text-gray-300">Sync local data from</span>
                    </div>

                    {user && (
                        <button
                            onClick={handleSyncFromFirebase}
                            disabled={isSyncing}
                            className={getActionButtonClasses(syncStatus)}
                        >
                            <Cloud size={18} />
                            <div className='flex flex-col items-start'>
                                <span>
                                    {isSyncing
                                        ? 'Syncing...'
                                        : syncStatus === 'success'
                                            ? 'Sync successful!'
                                            : syncStatus === 'error'
                                                ? 'Sync failed'
                                                : 'Restore from Cloud'}
                                </span>
                                <span className={settingBtnDetailTextClass}>Load your previously backed-up data</span>
                            </div>
                        </button>
                    )}

                    <button
                        onClick={triggerImportFlow}
                        className={getActionButtonClasses(importStatus)}
                    >
                        <Upload size={18} />
                        <div className='flex flex-col items-start'>
                            <span>{importStatus === 'success'
                                ? 'Import successful!' : importStatus === 'error'
                                    ? 'Import failed' : 'Import from File'}</span>
                            <span className={settingBtnDetailTextClass}>Upload data file from your device</span>
                        </div>
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleImport}
                        className="hidden"
                    />

                    <button
                        onClick={() => {
                            if (!handleGetSampleData()) return;
                            setActionStatus('sample', setSampleDataStatus, 'success');
                            markCloudAsOutOfSync();
                        }}
                        className={getActionButtonClasses(sampleDataStatus)}
                    >
                        <Zap size={18} />
                        <div className='flex flex-col items-start'>
                            <span>
                                {sampleDataStatus === 'success'
                                    ? 'Sample data loaded successfully!'
                                    : sampleDataStatus === 'error'
                                        ? 'Failed to load sample data'
                                        : 'Use Sample Data'}
                            </span>
                            <span className={settingBtnDetailTextClass}>Load sample data to explore the app</span>
                        </div>
                    </button>


                    <div className="px-4 pt-4">
                        <span className="text-sm text-gray-800 dark:text-gray-300">Danger Zone</span>
                    </div>

                    <button
                        onClick={handleReset}
                        className={settingBtnDangerClass}
                    >
                        <RotateCcw size={18} />
                        <div className='flex flex-col items-start'>
                            <span>Reset All Data</span>
                            <span className={settingBtnDetailTextClass}>Reset all data to their default values</span>
                        </div>
                    </button>

                    {(user || isGuest) && (
                        <button
                            onClick={handleLogout}
                            className={settingBtnDangerClass}
                        >
                            <LogOut size={18} />
                            <div className='flex flex-col items-start'>
                                <span>{isGuest ? 'Exit Guest Session' : 'Logout'}</span>
                                <span className={settingBtnDetailTextClass}>
                                    {isGuest ? 'Return to sign-in screen' : 'Sign out of your account'}
                                </span>
                            </div>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
