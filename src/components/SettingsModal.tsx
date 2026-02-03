import React, { useEffect, useRef, useState } from 'react';
import { X, RotateCcw, Download, Upload, Cloud, LogOut, Zap } from 'lucide-react';
import type { FinanceData } from '../types/finance.types';
import { useAuth } from '../context/AuthContext';
// import { useDarkMode } from '../context/DarkModeContext';
import { FreeWhiteBtn, ModalHeader, settingBtnDangerClass, settingBtnDetailTextClass, settingBtnPlainClass } from '../constants/TailwindClasses';
import { PINManagement } from './PINManagement';
import { SyncStatusIndicator } from './SyncStatusIndicator';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onReset: () => void;
    onImport: (data: FinanceData) => void;
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
    financeData,
    onBackupToFirebase,
    onSyncFromFirebase,
    onGetSampleData,
    onResetClick,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [cloudSyncStatus, setCloudSyncStatus] = useState({ isSynced: true, lastSyncTime: localStorage.getItem('lastCloudBackup') ? parseInt(localStorage.getItem('lastCloudBackup') as string, 10) : 0 });
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [backupStatus, setBackupStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [sampleDataStatus, setSampleDataStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const { user, logout } = useAuth();
    // const { isDarkMode, toggleDarkMode } = useDarkMode();
    const [localUser, setLocalUser] = useState<string>('');

    useEffect(() => {
        if (financeData) {
            setLocalUser(financeData.settings?.[0]?.name || '');
        }
    }, []);

    const handleBackupToFirebase = async () => {
        if (!onBackupToFirebase) return;

        setIsBackingUp(true);
        setBackupStatus('idle');
        try {
            await onBackupToFirebase();
            setBackupStatus('success');
            setTimeout(() => setBackupStatus('idle'), 3000);
            setCloudSyncStatus({ isSynced: true, lastSyncTime: Date.now() });
            localStorage.setItem('lastCloudBackup', Date.now().toString());
        } catch (error: any) {
            console.error('Backup error:', error);
            setBackupStatus('error');
            // Show detailed error to user
            const errorMessage = error?.message || 'An unknown error occurred during backup.';
            alert('Backup Failed:\n\n' + errorMessage);
            setTimeout(() => setBackupStatus('idle'), 3000);
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleLogout = async () => {
        if (window.confirm('Are you sure you want to logout?')) {
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

        setIsSyncing(true);
        setSyncStatus('idle');
        try {
            await onSyncFromFirebase();
            setSyncStatus('success');
            setTimeout(() => setSyncStatus('idle'), 3000);
            setCloudSyncStatus({ isSynced: true, lastSyncTime: Date.now() });
            localStorage.setItem('lastCloudBackup', Date.now().toString());
        } catch (error: any) {
            console.error('Sync error:', error);
            setSyncStatus('error');
            const errorMessage = error?.message || 'An unknown error occurred during sync.';
            alert('Sync Failed:\n\n' + errorMessage);
            setTimeout(() => setSyncStatus('idle'), 3000);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleGetSampleData = () => {
        if (onGetSampleData) {
            if (window.confirm('Replace your current data with sample data?')) {
                onGetSampleData();
            }
        }
    };

    const handleDownload = () => {
        if (!financeData) return;

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
        setImportStatus('idle');

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
                    // onClose();
                    // Reset file input
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                    setImportStatus('success');
                    setCloudSyncStatus({ isSynced: false, lastSyncTime: Date.now() });
                    setTimeout(() => setImportStatus('idle'), 3000);
                } else {
                    setImportStatus('error');
                    alert('Invalid data format in the imported file.');
                    setTimeout(() => setImportStatus('idle'), 3000);
                }
            } catch (error) {
                console.error('Import error:', error);
                setImportStatus('error');
                alert('Error importing file. Please make sure it\'s a valid JSON file.');
            }
        };
        reader.readAsText(file);
    };

    if (!isOpen) return null;

    return (
        <div className='fixed inset-0 overflow-y-hidden flex items-center justify-center z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full fade-in'>
            <div className='w-full max-w-xl'>
                {/* Header */}
                <div className={ModalHeader}>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-50">Settings</h2>
                    <button
                        onClick={onClose}
                        className={FreeWhiteBtn}
                    >
                        <X size={20} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50" />
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

                    <div className="px-4 pt-4">
                        <span className="text-sm text-gray-800 dark:text-gray-300">Security</span>
                    </div>

                    {user && <PINManagement userId={user.uid} onSuccess={() => { }} />}


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
                                className={`${settingBtnPlainClass} ${backupStatus === 'success'
                                    ? 'bg-green-50/50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border border-green-200/50 dark:border-green-800/50'
                                    : backupStatus === 'error'
                                        ? 'bg-red-50/50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-800/50'
                                        : 'text-gray-900 dark:text-gray-50 hover:bg-white/40 dark:hover:bg-gray-700/40'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
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
                            className={`${settingBtnPlainClass} ${syncStatus === 'success'
                                ? 'bg-green-50/50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border border-green-200/50 dark:border-green-800/50'
                                : syncStatus === 'error'
                                    ? 'bg-red-50/50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-800/50'
                                    : 'text-gray-900 dark:text-gray-50 hover:bg-white/40 dark:hover:bg-gray-700/40'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
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
                        onClick={() => fileInputRef.current?.click()}
                        className={`${settingBtnPlainClass} ${importStatus === 'success'
                            ? 'bg-green-50/50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border border-green-200/50 dark:border-green-800/50'
                            : importStatus === 'error'
                                ? 'bg-red-50/50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-800/50'
                                : 'text-gray-900 dark:text-gray-50 hover:bg-white/40 dark:hover:bg-gray-700/40'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
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
                            handleGetSampleData();
                            setSampleDataStatus('success');
                            setCloudSyncStatus({ isSynced: false, lastSyncTime: Date.now() });
                            setTimeout(() => setSampleDataStatus('idle'), 3000);
                        }}
                        className={`${settingBtnPlainClass} ${sampleDataStatus === 'success'
                            ? 'bg-green-50/50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border border-green-200/50 dark:border-green-800/50'
                            : sampleDataStatus === 'error'
                                ? 'bg-red-50/50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-800/50'
                                : 'text-gray-900 dark:text-gray-50 hover:bg-white/40 dark:hover:bg-gray-700/40'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
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

                    {user && (
                        <button
                            onClick={handleLogout}
                            className={settingBtnDangerClass}
                        >
                            <LogOut size={18} />
                            <div className='flex flex-col items-start'>
                                <span>Logout</span>
                                <span className={settingBtnDetailTextClass}>Sign out of your account</span>
                            </div>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
