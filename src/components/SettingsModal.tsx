import React, { useEffect, useRef, useState } from 'react';
import { X, RotateCcw, Download, Upload, Cloud, LogOut, Zap } from 'lucide-react';
import type { FinanceData } from '../types/finance.types';
import { useAuth } from '../context/AuthContext';
import { FreeWhiteBtn, ModalHeader, ModalOut, ModalPopUp } from '../constants/TailwindClasses';

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
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [backupStatus, setBackupStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const { user, logout } = useAuth();
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
                    onClose();
                    // Reset file input
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                    alert('Data imported successfully!');
                } else {
                    alert('Invalid file format. Please ensure the JSON file contains accounts, categories, and transactions.');
                }
            } catch (error) {
                alert('Error importing file. Please make sure it\'s a valid JSON file.');
            }
        };
        reader.readAsText(file);
    };

    if (!isOpen) return null;

    const settingBtnPlainClass = 'w-full glass-button flex items-center justify-start gap-2 px-4 py-3 text-sm font-medium text-gray-900 rounded-xl hover:bg-white/40 transition-colors';
    const settingBtnDangerClass = 'w-full glass-button flex items-center justify-start gap-2 px-4 py-3 text-sm font-medium text-red-600 bg-red-50/50 border border-red-200/50 rounded-xl hover:bg-red-100/50 transition-colors';

    return (
        <div className={ModalOut}>
            <div className={ModalPopUp}>
                {/* Header */}
                <div className={ModalHeader}>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Settings</h2>
                    <button
                        onClick={onClose}
                        className={FreeWhiteBtn}
                    >
                        <X size={20} className="text-gray-600 hover:text-gray-900" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto max-h-[70vh]">

                    {localUser && (
                        <div className="px-4 pt-2 text-lg">
                            <span className="text-gray-800">Welcome, <span className='text-xl font-mono'>{localUser}</span></span>
                        </div>
                    )}

                    {user &&
                        <div className="px-4">
                            <span className="text-sm text-gray-800">{user.email}</span>
                        </div>
                    }


                    <div className="px-4 pt-4">
                        <span className="text-sm text-gray-800">Safeguard data</span>
                    </div>

                    <button
                        onClick={handleDownload}
                        className={settingBtnPlainClass}
                    >
                        <Download size={18} />
                        <span>Export Data</span>
                    </button>

                    {user && (
                        <button
                            onClick={handleBackupToFirebase}
                            disabled={isBackingUp}
                            className={`${settingBtnPlainClass} ${backupStatus === 'success'
                                ? 'bg-green-50/50 text-green-600 border border-green-200/50'
                                : backupStatus === 'error'
                                    ? 'bg-red-50/50 text-red-600 border border-red-200/50'
                                    : 'text-gray-900 hover:bg-white/40'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            <Cloud size={18} />
                            <span>
                                {isBackingUp
                                    ? 'Backing up...'
                                    : backupStatus === 'success'
                                        ? 'Backup successful!'
                                        : backupStatus === 'error'
                                            ? 'Backup failed'
                                            : 'Backup to Cloud'}
                            </span>
                        </button>
                    )}

                    <div className="px-4 pt-4">
                        <span className="text-sm text-gray-800">Sync local data from</span>
                    </div>

                    {user && (
                        <button
                            onClick={handleSyncFromFirebase}
                            disabled={isSyncing}
                            className={`${settingBtnPlainClass} ${syncStatus === 'success'
                                ? 'bg-green-50/50 text-green-600 border border-green-200/50'
                                : syncStatus === 'error'
                                    ? 'bg-red-50/50 text-red-600 border border-red-200/50'
                                    : 'text-gray-900 hover:bg-white/40'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            <Cloud size={18} />
                            <span>
                                {isSyncing
                                    ? 'Syncing...'
                                    : syncStatus === 'success'
                                        ? 'Sync successful!'
                                        : syncStatus === 'error'
                                            ? 'Sync failed'
                                            : 'Cloud'}
                            </span>
                        </button>
                    )}

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className={settingBtnPlainClass}
                    >
                        <Upload size={18} />
                        <span>Local File</span>
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleImport}
                        className="hidden"
                    />

                    <button
                        onClick={handleGetSampleData}
                        className={settingBtnPlainClass}
                    >
                        <Zap size={18} />
                        <span>Dummy Data</span>
                    </button>


                    <div className="px-4 pt-4">
                        <span className="text-sm text-gray-800">Danger Zone</span>
                    </div>

                    <button
                        onClick={handleReset}
                        className={settingBtnDangerClass}
                    >
                        <RotateCcw size={18} />
                        <span>Reset All Data</span>
                    </button>

                    {user && (
                        <button
                            onClick={handleLogout}
                            className={settingBtnDangerClass}
                        >
                            <LogOut size={18} />
                            <span>Logout</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
