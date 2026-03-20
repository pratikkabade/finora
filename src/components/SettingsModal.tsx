import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, RotateCcw, Download, Upload, Cloud, LogOut, Zap, Landmark, Tags, Plus } from 'lucide-react';
import type { FinanceData } from '../types/finance.types';
import { useAuth } from '../context/AuthContext';
// import { useDarkMode } from '../context/DarkModeContext';
import { FreeBlueBtn, FreeWhiteBtn, settingBtnDangerClass, settingBtnDetailTextClass, settingBtnInteractiveClass } from '../constants/TailwindClasses';
// import { PINManagement } from './PINManagement';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { getIncludedNetBalanceAccountIds } from '../services/storageService';
import { intToHex } from '../utils/colorUtils';

type ActionStatus = 'idle' | 'success' | 'error';
type ActionStatusKey = 'backup' | 'sync' | 'import' | 'sample' | 'category';

const ACTION_STATUS_RESET_MS = 2000;
    const ACTION_SUCCESS_CLASSES = '!bg-green-50/80 dark:!bg-green-950/35 !text-green-700 dark:!text-green-300 !border-green-200/70 dark:!border-green-800/60';
    const ACTION_ERROR_CLASSES = '!bg-red-50/80 dark:!bg-red-950/35 !text-red-700 dark:!text-red-300 !border-red-200/70 dark:!border-red-800/60';
    const ACTION_IDLE_CLASSES = 'text-gray-900 dark:text-gray-50';
const ACTION_BASE_CLASSES = 'disabled:opacity-50 disabled:cursor-not-allowed';
const SECTION_CARD_CLASSES = 'rounded-[1.75rem] border border-white/60 bg-white/70 p-4 shadow-[0_18px_44px_-28px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/40 sm:p-5';

interface SettingsSectionProps {
    eyebrow: string;
    title: string;
    description: string;
    children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
    eyebrow,
    title,
    description,
    children,
}) => (
    <section className={SECTION_CARD_CLASSES}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-600/80 dark:text-sky-300/75">
            {eyebrow}
        </p>
        <h3 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
        <div className="mt-5 space-y-3">{children}</div>
    </section>
);

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
    variant?: 'modal' | 'page';
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
    variant = 'modal',
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
        if (status === 'success') return `${settingBtnInteractiveClass} ${ACTION_SUCCESS_CLASSES} ${ACTION_BASE_CLASSES}`;
        if (status === 'error') return `${settingBtnInteractiveClass} ${ACTION_ERROR_CLASSES} ${ACTION_BASE_CLASSES}`;
        return `${settingBtnInteractiveClass} ${ACTION_IDLE_CLASSES} ${ACTION_BASE_CLASSES}`;
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

    const isPageVariant = variant === 'page';
    const shellClasses = isPageVariant
        ? 'relative w-full'
        : 'fixed inset-0 z-50 overflow-y-auto bg-slate-950/30 px-4 py-6 backdrop-blur-xl sm:py-10';
    const cardClasses = isPageVariant
        ? 'w-full'
        : 'mx-auto w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/60 bg-white/90 shadow-[0_28px_80px_-34px_rgba(15,23,42,0.55)] backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-900/85';
    const headerClasses = isPageVariant
        ? 'mb-6'
        : 'border-b border-slate-200/70 px-5 py-5 dark:border-slate-800/80 sm:px-7 sm:py-6';
    const contentClasses = isPageVariant
        ? 'grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(300px,0.92fr)]'
        : 'grid gap-4 p-4 sm:gap-5 sm:p-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(300px,0.92fr)]';

    return (
        <div className={shellClasses}>
            <div className={cardClasses}>
                <div className={headerClasses}>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-sky-600/80 dark:text-sky-300/75">
                                Workspace
                            </p>
                            <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50 sm:text-3xl">
                                Settings
                            </h2>
                            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400 sm:text-base">
                                Manage categories, backups, and the accounts that shape your dashboard.
                            </p>
                        </div>

                        {!isPageVariant && (
                            <button
                                type="button"
                                onClick={onClose}
                                className={FreeWhiteBtn}
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>

                <div className={contentClasses}>
                    <div className="space-y-4 sm:space-y-5">
                        <SettingsSection
                            eyebrow="Profile"
                            title="Account at a glance"
                            description="See who is working in this workspace and keep your setup easy to understand."
                        >
                            {localUser ? (
                                <div className="rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-slate-800 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/45 dark:text-slate-100">
                                    Welcome, <span className="font-semibold">{localUser}</span>
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-slate-300/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-700/80 dark:text-slate-400">
                                    No local display name is set yet.
                                </div>
                            )}

                            {user && (
                                <div className="rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/45 dark:text-slate-300">
                                    {user.email}
                                </div>
                            )}

                            {!user && isGuest && (
                                <div className="rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/45 dark:text-slate-300">
                                    You are using guest mode. Data stays local unless you choose to back it up.
                                </div>
                            )}
                        </SettingsSection>

                        <SettingsSection
                            eyebrow="Balance"
                            title="Optimization"
                            description="Choose which accounts contribute to the top-level net balance shown on your home screen."
                        >
                            <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/45">
                                <Landmark size={18} className="mt-0.5 shrink-0 text-slate-700 dark:text-slate-200" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                    Keep at least one account enabled so the headline balance always has a source.
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {financeData?.accounts?.length ? (
                                    financeData.accounts.map((account) => {
                                        const isSelected = selectedNetBalanceAccountIds.includes(account.id);

                                        return (
                                            <button
                                                key={account.id}
                                                type="button"
                                                role="switch"
                                                aria-checked={isSelected}
                                                onClick={() => handleToggleNetBalanceAccount(account.id)}
                                                className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                                                    isSelected
                                                        ? 'border-sky-300 bg-sky-50 text-sky-900 shadow-sm dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-100'
                                                        : 'border-slate-200/80 bg-white/80 text-slate-700 hover:border-slate-300 dark:border-slate-800/80 dark:bg-slate-950/45 dark:text-slate-300 dark:hover:border-slate-700'
                                                }`}
                                            >
                                                <span className={`relative inline-flex h-5.5 w-9.5 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${isSelected ? 'bg-blue-500' : 'bg-gray-300/60 dark:bg-slate-700'}`}>
                                                    <span className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform duration-200 ease-in-out ${isSelected ? 'translate-x-4' : 'translate-x-0'}`} />
                                                </span>
                                                <span>{account.name}</span>
                                            </button>
                                        );
                                    })
                                ) : (
                                    <span className={settingBtnDetailTextClass}>No accounts available.</span>
                                )}
                            </div>
                        </SettingsSection>

                        <SettingsSection
                            eyebrow="Categories"
                            title="Manage categories"
                            description="Add new categories and keep the list clean for faster transaction entry."
                        >
                            <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/45">
                                <Tags size={18} className="mt-0.5 shrink-0 text-slate-700 dark:text-slate-200" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                    New categories appear immediately when you create or edit transactions.
                                </span>
                            </div>

                            <div className="w-full space-y-2">
                                {orderedCategories.length ? (
                                    <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                                        {orderedCategories.map((category) => (
                                            <div
                                                key={category.id}
                                                className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/45"
                                            >
                                                <span
                                                    className="h-3 w-3 rounded-full border border-black/10 dark:border-white/20"
                                                    style={{ backgroundColor: intToHex(category.color) }}
                                                />
                                                <span className="truncate text-sm text-slate-800 dark:text-slate-100">{category.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span className={settingBtnDetailTextClass}>No categories available.</span>
                                )}
                            </div>

                            <form onSubmit={handleAddCategory} className="flex flex-col gap-2">
                                <div className="flex flex-row items-center gap-2">
                                    <input
                                        type="text"
                                        value={newCategoryName}
                                        onChange={(event) => setNewCategoryName(event.target.value)}
                                        placeholder="Category name"
                                        className="glass-input w-full rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-50"
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
                        </SettingsSection>
                    </div>

                    <div className="space-y-4 sm:space-y-5">
                        <SettingsSection
                            eyebrow="Backups"
                            title="Safeguard data"
                            description="Download, import, back up, or restore the local workspace behind this device."
                        >
                            <button
                                onClick={handleDownload}
                                className={getActionButtonClasses('idle')}
                            >
                                <Download size={18} />
                                <div className="flex flex-col items-start">
                                    <span>Download your data</span>
                                    <span className={settingBtnDetailTextClass}>Export a JSON backup to your device</span>
                                </div>
                            </button>

                            {user && (
                                <button
                                    onClick={handleBackupToFirebase}
                                    disabled={isBackingUp}
                                    className={getActionButtonClasses(backupStatus)}
                                >
                                    <Cloud size={18} />
                                    <div className="flex flex-col items-start">
                                        <span>
                                            {isBackingUp
                                                ? 'Backing up...'
                                                : backupStatus === 'success'
                                                    ? 'Backup successful!'
                                                    : backupStatus === 'error'
                                                        ? 'Backup failed'
                                                        : 'Backup to cloud'}
                                        </span>
                                        <SyncStatusIndicator isSynced={cloudSyncStatus.isSynced} lastSyncTime={cloudSyncStatus.lastSyncTime} />
                                    </div>
                                </button>
                            )}

                            {user && (
                                <button
                                    onClick={handleSyncFromFirebase}
                                    disabled={isSyncing}
                                    className={getActionButtonClasses(syncStatus)}
                                >
                                    <Cloud size={18} />
                                    <div className="flex flex-col items-start">
                                        <span>
                                            {isSyncing
                                                ? 'Syncing...'
                                                : syncStatus === 'success'
                                                    ? 'Sync successful!'
                                                    : syncStatus === 'error'
                                                        ? 'Sync failed'
                                                        : 'Restore from cloud'}
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
                                <div className="flex flex-col items-start">
                                    <span>
                                        {importStatus === 'success'
                                            ? 'Import successful!'
                                            : importStatus === 'error'
                                                ? 'Import failed'
                                                : 'Import from file'}
                                    </span>
                                    <span className={settingBtnDetailTextClass}>Upload a JSON backup from your device</span>
                                </div>
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleImport}
                                className="hidden"
                            />
                        </SettingsSection>

                        <SettingsSection
                            eyebrow="Quick tools"
                            title="Workspace shortcuts"
                            description="Jump into sample data fast when you want to demo or explore the app."
                        >
                            <button
                                onClick={() => {
                                    if (!handleGetSampleData()) return;
                                    setActionStatus('sample', setSampleDataStatus, 'success');
                                    markCloudAsOutOfSync();
                                }}
                                className={getActionButtonClasses(sampleDataStatus)}
                            >
                                <Zap size={18} />
                                <div className="flex flex-col items-start">
                                    <span>
                                        {sampleDataStatus === 'success'
                                            ? 'Sample data loaded successfully!'
                                            : sampleDataStatus === 'error'
                                                ? 'Failed to load sample data'
                                                : 'Use sample data'}
                                    </span>
                                    <span className={settingBtnDetailTextClass}>Load sample data to explore the app</span>
                                </div>
                            </button>
                        </SettingsSection>

                        <SettingsSection
                            eyebrow="Danger zone"
                            title="Reset and session controls"
                            description="These actions affect your local workspace or your current sign-in session."
                        >
                            <button
                                onClick={handleReset}
                                className={settingBtnDangerClass}
                            >
                                <RotateCcw size={18} />
                                <div className="flex flex-col items-start">
                                    <span>Reset all data</span>
                                    <span className={settingBtnDetailTextClass}>Clear local data and start fresh</span>
                                </div>
                            </button>

                            {(user || isGuest) && (
                                <button
                                    onClick={handleLogout}
                                    className={settingBtnDangerClass}
                                >
                                    <LogOut size={18} />
                                    <div className="flex flex-col items-start">
                                        <span>{isGuest ? 'Exit guest session' : 'Logout'}</span>
                                        <span className={settingBtnDetailTextClass}>
                                            {isGuest ? 'Return to sign-in screen' : 'Sign out of your account'}
                                        </span>
                                    </div>
                                </button>
                            )}
                        </SettingsSection>
                    </div>
                </div>
            </div>
        </div>
    );
};
