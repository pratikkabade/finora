import React, { useEffect, useState } from 'react';
import { Lock, LockKeyholeOpen, RefreshCcw } from 'lucide-react';
import { clearPIN, getPINStatus, PIN_LENGTH, setPIN, verifyPIN } from '../services/pinService';
import { FreeBlueBtn, FreeWhiteBtn, settingBtnDangerClass, settingBtnDetailTextClass, settingBtnInteractiveClass } from '../constants/TailwindClasses';
import { getFormattedDate } from '../utils/dateUtils';
import { PinSquirclesInput } from './PinSquirclesInput';

interface PINManagementProps {
    userId: string;
    onSuccess?: () => void;
}

type PINManagementMode = 'view' | 'set' | 'change';

export const PINManagement: React.FC<PINManagementProps> = ({ userId, onSuccess }) => {
    const [mode, setMode] = useState<PINManagementMode>('view');
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState(() => getPINStatus(userId));

    const refreshStatus = () => {
        setStatus(getPINStatus(userId));
    };

    const resetForm = () => {
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
        setError('');
        setSuccess('');
    };

    useEffect(() => {
        resetForm();
        setMode('view');
        refreshStatus();
    }, [userId]);

    useEffect(() => {
        if (!status.isLocked) {
            return;
        }

        const intervalId = window.setInterval(() => {
            const nextStatus = getPINStatus(userId);
            setStatus(nextStatus);
            if (!nextStatus.isLocked) {
                setError('');
            }
        }, 1000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [status.isLocked, userId]);

    const handleModeChange = (nextMode: PINManagementMode) => {
        resetForm();
        refreshStatus();
        setMode(nextMode);
    };

    const handleSavePin = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        if (status.isLocked) {
            return;
        }

        setIsLoading(true);

        try {
            if (mode === 'change') {
                if (currentPin.length !== PIN_LENGTH) {
                    setError(`Enter your current ${PIN_LENGTH}-digit PIN`);
                    return;
                }

                verifyPIN(userId, currentPin);
            }

            if (newPin.length !== PIN_LENGTH) {
                setError(`PIN must be exactly ${PIN_LENGTH} digits`);
                return;
            }

            if (confirmPin.length !== PIN_LENGTH) {
                setError(`Confirm your ${PIN_LENGTH}-digit PIN`);
                return;
            }

            if (newPin !== confirmPin) {
                setError('PINs do not match');
                return;
            }

            setPIN(userId, newPin);
            refreshStatus();
            setSuccess(mode === 'change' ? 'PIN updated successfully!' : 'PIN set successfully!');
            setCurrentPin('');
            setNewPin('');
            setConfirmPin('');

            window.setTimeout(() => {
                setMode('view');
                setSuccess('');
                onSuccess?.();
            }, 1200);
        } catch (caughtError) {
            setError(caughtError instanceof Error ? caughtError.message : 'Failed to save PIN');
            refreshStatus();
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemovePin = () => {
        if (!window.confirm('Are you sure you want to remove the PIN protection? Anyone with access to your device will be able to view your financial data.')) {
            return;
        }

        try {
            clearPIN(userId);
            refreshStatus();
            setSuccess('PIN removed successfully');
            window.setTimeout(() => {
                setMode('view');
                setSuccess('');
                onSuccess?.();
            }, 1200);
        } catch (caughtError) {
            setError(caughtError instanceof Error ? caughtError.message : 'Failed to remove PIN');
        }
    };

    if (mode === 'view') {
        return (
            <div className="space-y-3">
                {/* <div className={`${settingBtnPlainNoHoverClass2} cursor-default`}>
                    <Lock size={18} />
                    <div className="flex flex-col items-start">
                        <span>{status.isPINSet ? 'PIN is enabled' : 'PIN is not set'}</span>
                        <span className={`${settingBtnDetailTextClass} ${status.isPINSet ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {status.isPINSet
                                ? 'Home dashboard will ask for your PIN on this device.'
                                : 'Anyone with this device can open the home dashboard.'}
                        </span>
                    </div>
                </div> */}

                {status.isLocked && (
                    <div className="rounded-2xl border border-yellow-200/70 bg-yellow-50/80 px-4 py-3 text-sm text-yellow-700 dark:border-yellow-800/60 dark:bg-yellow-950/30 dark:text-yellow-300">
                        PIN entry is locked right now. Try again in {getFormattedDate(status.timeUntilUnlock)}
                    </div>
                )}

                {status.isPINSet ? (
                    <div className="flex flex-col gap-3">
                        <button
                            type="button"
                            onClick={() => handleModeChange('change')}
                            className={`${FreeWhiteBtn} w-full`}
                        >
                            <RefreshCcw size={16} />
                            <div className="flex flex-col items-start">
                                <span>Change PIN</span>
                                <span className={settingBtnDetailTextClass}>Switch to a new 4-digit PIN</span>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={handleRemovePin}
                            className={`${settingBtnDangerClass} w-full`}
                        >
                            <LockKeyholeOpen size={16} />
                            <div className="flex flex-col items-start">
                                <span>Remove PIN</span>
                                <span className={settingBtnDetailTextClass}>Disable home dashboard protection</span>
                            </div>
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => handleModeChange('set')}
                        className={settingBtnInteractiveClass}
                    >
                        <Lock size={18} />
                        <div className="flex flex-col items-start">
                            <span>Set PIN</span>
                            <span className={`${settingBtnDetailTextClass} text-red-600 dark:text-red-400`}>
                                Turn on a 4-digit PIN for this device
                            </span>
                        </div>
                    </button>
                )}

                {success && (
                    <div className="rounded-2xl border border-green-200/70 bg-green-50/70 px-4 py-3 text-sm text-green-700 dark:border-green-800/60 dark:bg-green-950/30 dark:text-green-300">
                        {success}
                    </div>
                )}
            </div>
        );
    }

    return (
        <form onSubmit={handleSavePin} className="glass-card space-y-5 px-4 py-4">
            <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                    {mode === 'change' ? 'Change PIN' : 'Set PIN'}
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Use a {PIN_LENGTH}-digit PIN. The boxes work like an OTP entry.
                </p>
            </div>

            {mode === 'change' && (
                <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-900 dark:text-gray-50">
                        Current PIN
                    </label>
                    <PinSquirclesInput
                        value={currentPin}
                        onChange={setCurrentPin}
                        disabled={isLoading || status.isLocked}
                        autoFocus
                        hasError={!!error}
                        ariaLabel="Current PIN"
                    />
                </div>
            )}

            <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-900 dark:text-gray-50">
                    New PIN
                </label>
                <PinSquirclesInput
                    value={newPin}
                    onChange={setNewPin}
                    disabled={isLoading || status.isLocked}
                    autoFocus={mode === 'set'}
                    hasError={!!error}
                    ariaLabel="New PIN"
                />
            </div>

            <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-900 dark:text-gray-50">
                    Confirm PIN
                </label>
                <PinSquirclesInput
                    value={confirmPin}
                    onChange={setConfirmPin}
                    disabled={isLoading || status.isLocked}
                    hasError={!!error}
                    ariaLabel="Confirm PIN"
                />
            </div>

            {status.isLocked && (
                <div className="rounded-lg border border-yellow-200/50 bg-yellow-50/50 p-2 dark:border-yellow-800/50 dark:bg-yellow-950/30">
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                        PIN entry is locked. Try again in {getFormattedDate(status.timeUntilUnlock)}
                    </p>
                </div>
            )}

            {error && (
                <div className="rounded-lg border border-red-200/50 bg-red-50/50 p-2 dark:border-red-800/50 dark:bg-red-950/30">
                    <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            {success && (
                <div className="rounded-lg border border-green-200/50 bg-green-50/50 p-2 dark:border-green-800/50 dark:bg-green-950/30">
                    <p className="text-xs text-green-600 dark:text-green-400">{success}</p>
                </div>
            )}

            <div className="flex flex-row justify-end gap-2 pt-1">
                <button
                    type="button"
                    onClick={() => handleModeChange('view')}
                    className={FreeWhiteBtn}
                    disabled={isLoading}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className={FreeBlueBtn}
                    disabled={isLoading || status.isLocked}
                >
                    {isLoading ? (mode === 'change' ? 'Updating...' : 'Setting...') : (mode === 'change' ? 'Update PIN' : 'Set PIN')}
                </button>
            </div>
        </form>
    );
};
