import React, { useEffect, useState } from 'react';
import { Lock, LockKeyholeOpen, RefreshCcw } from 'lucide-react';
import { clearPIN, getPINStatus, PIN_LENGTH, setPIN, verifyPIN } from '../services/pinService';
import { FreeBlueBtn, FreeGreenBtn, FreeWhiteBtn, settingBtnDangerClass, settingBtnDetailTextClass, settingBtnInteractiveClass } from '../constants/TailwindClasses';
import { getFormattedDate } from '../utils/dateUtils';
import { PinSquirclesInput } from './PinSquirclesInput';

interface PINManagementProps {
    userId: string;
    onSuccess?: (message: string) => void;
}

type PINManagementMode = 'view' | 'set' | 'change' | 'remove';

// Sub-steps within set/change flows
type SetStep = 'enter-new' | 'confirm-new';
type ChangeStep = 'verify-current' | 'enter-new' | 'confirm-new';

export const PINManagement: React.FC<PINManagementProps> = ({ userId, onSuccess }) => {
    const [mode, setMode] = useState<PINManagementMode>('view');
    const [successAction, setSuccessAction] = useState<'set' | 'change' | 'remove' | null>(null);
    const [setStep, setSetStep] = useState<SetStep>('enter-new');
    const [changeStep, setChangeStep] = useState<ChangeStep>('verify-current');

    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [removePin, setRemovePin] = useState('');

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState(() => getPINStatus(userId));

    const refreshStatus = () => {
        setStatus(getPINStatus(userId));
    };

    const resetForm = () => {
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
        setRemovePin('');
        setError('');
        setSuccessAction(null);
        setSetStep('enter-new');
        setChangeStep('verify-current');
    };

    useEffect(() => {
        resetForm();
        setMode('view');
        refreshStatus();
    }, [userId]);

    useEffect(() => {
        if (!status.isLocked) return;

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

    // Ref to block auto-advance effects while navigating back
    const isNavigatingBack = React.useRef(false);

    const handleBackFromSetConfirm = () => {
        isNavigatingBack.current = true;
        setConfirmPin('');
        setError('');
        setSuccessAction(null);
        setSetStep('enter-new');
        window.setTimeout(() => { isNavigatingBack.current = false; }, 0);
    };

    const handleBackFromChangeNew = () => {
        isNavigatingBack.current = true;
        setNewPin('');
        setError('');
        setChangeStep('verify-current');
        window.setTimeout(() => { isNavigatingBack.current = false; }, 0);
    };

    const handleBackFromChangeConfirm = () => {
        isNavigatingBack.current = true;
        setConfirmPin('');
        setError('');
        setChangeStep('enter-new');
        window.setTimeout(() => { isNavigatingBack.current = false; }, 0);
    };

    // Escape key -> cancel the whole operation back to view
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && mode !== 'view') {
                handleModeChange('view');
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [mode]);

    // ── Auto-advance when PIN_LENGTH digits are entered ───────────────────────

    // Set: step 1 — new PIN filled -> advance to confirm
    useEffect(() => {
        if (!isNavigatingBack.current && mode === 'set' && setStep === 'enter-new' && newPin.length === PIN_LENGTH && !status.isLocked) {
            setError('');
            setSetStep('confirm-new');
        }
    }, [newPin, mode, setStep, status.isLocked]);

    // Set: step 2 — confirm PIN filled -> submit
    useEffect(() => {
        if (!isNavigatingBack.current && mode === 'set' && setStep === 'confirm-new' && confirmPin.length === PIN_LENGTH && !isLoading && !status.isLocked) {
            handleSetPinStep2({ preventDefault: () => {} } as React.FormEvent);
        }
    }, [confirmPin, mode, setStep, isLoading, status.isLocked]);

    // Change: step 1 — current PIN filled -> verify
    useEffect(() => {
        if (!isNavigatingBack.current && mode === 'change' && changeStep === 'verify-current' && currentPin.length === PIN_LENGTH && !status.isLocked) {
            handleChangePinVerifyCurrent({ preventDefault: () => {} } as React.FormEvent);
        }
    }, [currentPin, mode, changeStep, status.isLocked]);

    // Change: step 2 — new PIN filled -> advance to confirm
    useEffect(() => {
        if (!isNavigatingBack.current && mode === 'change' && changeStep === 'enter-new' && newPin.length === PIN_LENGTH && !status.isLocked) {
            setError('');
            setChangeStep('confirm-new');
        }
    }, [newPin, mode, changeStep, status.isLocked]);

    // Change: step 3 — confirm PIN filled -> submit
    useEffect(() => {
        if (!isNavigatingBack.current && mode === 'change' && changeStep === 'confirm-new' && confirmPin.length === PIN_LENGTH && !isLoading && !status.isLocked) {
            handleChangePinStep3({ preventDefault: () => {} } as React.FormEvent);
        }
    }, [confirmPin, mode, changeStep, isLoading, status.isLocked]);

    // Remove: current PIN filled -> submit
    useEffect(() => {
        if (!isNavigatingBack.current && mode === 'remove' && removePin.length === PIN_LENGTH && !isLoading && !status.isLocked) {
            handleRemovePin({ preventDefault: () => {} } as React.FormEvent);
        }
    }, [removePin, mode, isLoading, status.isLocked]);

    // ── SET PIN flow ──────────────────────────────────────────────────────────

    const handleSetPinStep1 = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (newPin.length !== PIN_LENGTH) {
            setError(`PIN must be exactly ${PIN_LENGTH} digits`);
            return;
        }
        setSetStep('confirm-new');
    };

    const handleSetPinStep2 = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (confirmPin.length !== PIN_LENGTH) {
            setError(`Please confirm your ${PIN_LENGTH}-digit PIN`);
            return;
        }
        if (newPin !== confirmPin) {
            setError('PINs do not match. Please try again.');
            setConfirmPin('');
            return;
        }

        setIsLoading(true);
        try {
            setPIN(userId, newPin);
            refreshStatus();
            setNewPin('');
            setConfirmPin('');
            setMode('view');
            setSuccessAction('set');
            window.setTimeout(() => setSuccessAction(null), 5000);
            onSuccess?.('PIN set successfully!');
        } catch (caughtError) {
            setError(caughtError instanceof Error ? caughtError.message : 'Failed to set PIN');
        } finally {
            setIsLoading(false);
        }
    };

    // ── CHANGE PIN flow ───────────────────────────────────────────────────────

    const handleChangePinVerifyCurrent = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (status.isLocked) return;

        if (currentPin.length !== PIN_LENGTH) {
            setError(`Enter your current ${PIN_LENGTH}-digit PIN`);
            return;
        }

        try {
            verifyPIN(userId, currentPin);
            setChangeStep('enter-new');
        } catch (caughtError) {
            setError(caughtError instanceof Error ? caughtError.message : 'Incorrect PIN');
            refreshStatus();
        }
    };

    const handleChangePinStep2 = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (newPin.length !== PIN_LENGTH) {
            setError(`PIN must be exactly ${PIN_LENGTH} digits`);
            return;
        }
        setChangeStep('confirm-new');
    };

    const handleChangePinStep3 = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (confirmPin.length !== PIN_LENGTH) {
            setError(`Please confirm your ${PIN_LENGTH}-digit PIN`);
            return;
        }
        if (newPin !== confirmPin) {
            setError('PINs do not match. Please try again.');
            setConfirmPin('');
            return;
        }

        setIsLoading(true);
        try {
            setPIN(userId, newPin);
            refreshStatus();
            setCurrentPin('');
            setNewPin('');
            setConfirmPin('');
            setMode('view');
            setSuccessAction('change');
            window.setTimeout(() => setSuccessAction(null), 5000);
            onSuccess?.('PIN updated successfully!');
        } catch (caughtError) {
            setError(caughtError instanceof Error ? caughtError.message : 'Failed to update PIN');
        } finally {
            setIsLoading(false);
        }
    };

    // ── REMOVE PIN flow ───────────────────────────────────────────────────────

    const handleRemovePin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (status.isLocked) return;

        if (removePin.length !== PIN_LENGTH) {
            setError(`Enter your current ${PIN_LENGTH}-digit PIN to confirm removal`);
            return;
        }

        setIsLoading(true);
        try {
            verifyPIN(userId, removePin);
            clearPIN(userId);
            refreshStatus();
            setRemovePin('');
            setMode('view');
            setSuccessAction('remove');
            window.setTimeout(() => setSuccessAction(null), 5000);
            onSuccess?.('PIN removed successfully');
        } catch (caughtError) {
            setError(caughtError instanceof Error ? caughtError.message : 'Incorrect PIN');
            refreshStatus();
        } finally {
            setIsLoading(false);
        }
    };

    // ── Shared status/error/success blocks ────────────────────────────────────

    const LockedBanner = () =>
        status.isLocked ? (
            <div className="rounded-lg border border-yellow-200/50 bg-yellow-50/50 p-2 dark:border-yellow-800/50 dark:bg-yellow-950/30">
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    PIN entry is locked. Try again in {getFormattedDate(status.timeUntilUnlock)}
                </p>
            </div>
        ) : null;

    const ErrorBanner = () => (
        <div
            className={`rounded-lg border p-2 transition-opacity duration-200 ${
                error
                    ? 'border-red-200/50 bg-red-50/50 opacity-100 dark:border-red-800/50 dark:bg-red-950/30'
                    : 'invisible border-transparent opacity-0'
            }`}
        >
            <p className="text-xs text-red-600 dark:text-red-400">{error || '\u00A0'}</p>
        </div>
    );


    // ── VIEW mode ─────────────────────────────────────────────────────────────

    if (mode === 'view') {
        return (
            <div className="space-y-3">
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
                            className={`${successAction === 'change' ? FreeGreenBtn : FreeWhiteBtn} w-full`}
                            disabled={successAction === 'change'}
                        >
                            <RefreshCcw size={16} />
                            <div className="flex flex-col items-start">
                                <span>{successAction === 'change' ? 'PIN updated successfully!' : 'Change PIN'}</span>
                                <span className={settingBtnDetailTextClass}>{successAction === 'change' ? 'Your PIN has been changed' : 'Switch to a new 4-digit PIN'}</span>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleModeChange('remove')}
                            className={`${successAction === 'remove' ? FreeGreenBtn : settingBtnDangerClass} w-full`}
                            disabled={successAction === 'remove'}
                        >
                            <LockKeyholeOpen size={16} />
                            <div className="flex flex-col items-start">
                                <span>{successAction === 'remove' ? 'PIN removed successfully!' : 'Remove PIN'}</span>
                                <span className={settingBtnDetailTextClass}>{successAction === 'remove' ? 'Dashboard protection disabled' : 'Disable home dashboard protection'}</span>
                            </div>
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => handleModeChange('set')}
                        className={successAction === 'set' ? `${FreeGreenBtn} w-full` : settingBtnInteractiveClass}
                        disabled={successAction === 'set'}
                    >
                        <Lock size={18} />
                        <div className="flex flex-col items-start">
                            <span>{successAction === 'set' ? 'PIN set successfully!' : 'Set PIN'}</span>
                            <span className={`${settingBtnDetailTextClass} ${successAction === 'set' ? '' : 'text-red-600 dark:text-red-400'}`}>
                                {successAction === 'set' ? 'Dashboard is now protected' : 'Turn on a 4-digit PIN for this device'}
                            </span>
                        </div>
                    </button>
                )}

            </div>
        );
    }

    // ── SET mode ──────────────────────────────────────────────────────────────

    if (mode === 'set') {
        if (setStep === 'enter-new') {
            return (
                <form onSubmit={handleSetPinStep1} className="glass-card space-y-5 px-4 py-4">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Set PIN</h3>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                            Use a {PIN_LENGTH}-digit PIN. The boxes work like an OTP entry.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-semibold text-gray-900 dark:text-gray-50">
                            New PIN
                        </label>
                        <PinSquirclesInput
                            value={newPin}
                            onChange={setNewPin}
                            disabled={isLoading || status.isLocked}
                            autoFocus
                            hasError={!!error}
                            ariaLabel="New PIN"
                        />
                    </div>

                    <LockedBanner />
                    <ErrorBanner />

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
                            Next
                        </button>
                    </div>
                </form>
            );
        }

        // setStep === 'confirm-new'
        return (
            <form onSubmit={handleSetPinStep2} className="glass-card space-y-5 px-4 py-4">
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Set PIN</h3>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        Re-enter your PIN to confirm.
                    </p>
                </div>

                <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-900 dark:text-gray-50">
                        Confirm PIN
                    </label>
                    <PinSquirclesInput
                        value={confirmPin}
                        onChange={setConfirmPin}
                        disabled={isLoading || status.isLocked}
                        autoFocus
                        hasError={!!error}
                        ariaLabel="Confirm PIN"
                    />
                </div>

                <LockedBanner />
                <ErrorBanner />

                <div className="flex flex-row justify-end gap-2 pt-1">
                    <button
                        type="button"
                        onClick={handleBackFromSetConfirm}
                        className={FreeWhiteBtn}
                        disabled={isLoading}
                    >
                        Back
                    </button>
                    <button
                        type="submit"
                        className={FreeBlueBtn}
                        disabled={isLoading || status.isLocked}
                    >
                        {isLoading ? 'Setting...' : 'Set PIN'}
                    </button>
                </div>
            </form>
        );
    }

    // ── CHANGE mode ───────────────────────────────────────────────────────────

    if (mode === 'change') {
        if (changeStep === 'verify-current') {
            return (
                <form onSubmit={handleChangePinVerifyCurrent} className="glass-card space-y-5 px-4 py-4">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Change PIN</h3>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                            First, confirm your current PIN.
                        </p>
                    </div>

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

                    <LockedBanner />
                    <ErrorBanner />

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
                            Next
                        </button>
                    </div>
                </form>
            );
        }

        if (changeStep === 'enter-new') {
            return (
                <form onSubmit={handleChangePinStep2} className="glass-card space-y-5 px-4 py-4">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Change PIN</h3>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                            Enter your new {PIN_LENGTH}-digit PIN.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-semibold text-gray-900 dark:text-gray-50">
                            New PIN
                        </label>
                        <PinSquirclesInput
                            value={newPin}
                            onChange={setNewPin}
                            disabled={isLoading || status.isLocked}
                            autoFocus
                            hasError={!!error}
                            ariaLabel="New PIN"
                        />
                    </div>

                    <LockedBanner />
                    <ErrorBanner />

                    <div className="flex flex-row justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={handleBackFromChangeNew}
                            className={FreeWhiteBtn}
                            disabled={isLoading}
                        >
                            Back
                        </button>
                        <button
                            type="submit"
                            className={FreeBlueBtn}
                            disabled={isLoading || status.isLocked}
                        >
                            Next
                        </button>
                    </div>
                </form>
            );
        }

        // changeStep === 'confirm-new'
        return (
            <form onSubmit={handleChangePinStep3} className="glass-card space-y-5 px-4 py-4">
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Change PIN</h3>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        Re-enter your new PIN to confirm.
                    </p>
                </div>

                <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-900 dark:text-gray-50">
                        Confirm New PIN
                    </label>
                    <PinSquirclesInput
                        value={confirmPin}
                        onChange={setConfirmPin}
                        disabled={isLoading || status.isLocked}
                        autoFocus
                        hasError={!!error}
                        ariaLabel="Confirm New PIN"
                    />
                </div>

                <LockedBanner />
                <ErrorBanner />

                <div className="flex flex-row justify-end gap-2 pt-1">
                    <button
                        type="button"
                        onClick={handleBackFromChangeConfirm}
                        className={FreeWhiteBtn}
                        disabled={isLoading}
                    >
                        Back
                    </button>
                    <button
                        type="submit"
                        className={FreeBlueBtn}
                        disabled={isLoading || status.isLocked}
                    >
                        {isLoading ? 'Updating...' : 'Update PIN'}
                    </button>
                </div>
            </form>
        );
    }

    // ── REMOVE mode ───────────────────────────────────────────────────────────

    return (
        <form onSubmit={handleRemovePin} className="glass-card space-y-5 px-4 py-4">
            <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Remove PIN</h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Enter your current PIN to disable protection.
                </p>
            </div>

            <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-900 dark:text-gray-50">
                    Current PIN
                </label>
                <PinSquirclesInput
                    value={removePin}
                    onChange={setRemovePin}
                    disabled={isLoading || status.isLocked}
                    autoFocus
                    hasError={!!error}
                    ariaLabel="Current PIN"
                />
            </div>

            <LockedBanner />
            <ErrorBanner />

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
                    className={`w-fit! ${settingBtnDangerClass}`}
                    disabled={isLoading || status.isLocked}
                >
                    {isLoading ? 'Removing...' : 'Remove PIN'}
                </button>
            </div>
        </form>
    );
};
