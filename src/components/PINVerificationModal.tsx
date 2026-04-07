import React, { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { clearAccount, getPINStatus, PIN_LENGTH, verifyPIN } from '../services/pinService';
import { FreeRedBtn, ModalHeader, ModalOut, ModalPopUp } from '../constants/TailwindClasses';
import { getFormattedDate } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';
import { useAnimatedOpen } from '../hooks/useAnimatedOpen';
import { PinSquirclesInput } from './PinSquirclesInput';

interface PINVerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVerified: () => void;
    userId: string;
}

export const PINVerificationModal: React.FC<PINVerificationModalProps> = ({
    isOpen,
    onVerified,
    userId,
}) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState(() => getPINStatus(userId));
    const { shouldRender, isVisible } = useAnimatedOpen(isOpen);
    const { logout } = useAuth();

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setPin('');
        setError('');
        setStatus(getPINStatus(userId));
        setIsLoading(false);
    }, [isOpen, userId]);

    useEffect(() => {
        if (!isOpen || !status.isLocked) {
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
    }, [isOpen, status.isLocked, userId]);

    const handleVerify = async (pinValue: string) => {
        if (isLoading || status.isLocked) {
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            verifyPIN(userId, pinValue);
            setPin('');
            setStatus(getPINStatus(userId));
            onVerified();
        } catch (caughtError) {
            const message = caughtError instanceof Error ? caughtError.message : 'Could not verify PIN';
            setStatus(getPINStatus(userId));
            setPin('');

            if (!message.toLowerCase().includes('locked')) {
                setError(message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!shouldRender) return null;

    return (
        <div className={`${ModalOut} ${isVisible ? 'app-modal-backdrop-enter' : 'app-modal-backdrop-exit'}`}>
            <div className={`${ModalPopUp} max-w-sm sm:max-w-md ${isVisible ? 'app-modal-panel-enter' : 'app-modal-panel-exit'}`}>
                <div className={ModalHeader}>
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-50 sm:text-xl">
                        <Lock size={20} />
                        Enter PIN
                    </h2>
                </div>

                <div className="space-y-5 p-6">
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            This page is protected. Enter your PIN and we will verify it automatically after digit {PIN_LENGTH}.
                        </p>
                    </div>

                    <PinSquirclesInput
                        value={pin}
                        onChange={setPin}
                        onComplete={(nextPin) => {
                            void handleVerify(nextPin);
                        }}
                        disabled={isLoading || status.isLocked}
                        autoFocus={isOpen}
                        hasError={!!error}
                        ariaLabel="PIN"
                    />

                    {!status.isLocked && (
                        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                            {isLoading ? 'Checking PIN...' : `Enter all ${PIN_LENGTH} digits to continue.`}
                        </p>
                    )}

                    {error && !status.isLocked && (
                        <div className="w-full rounded-lg border border-red-200/50 bg-red-50/50 p-3 dark:border-red-800/50 dark:bg-red-950/30">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    {status.isLocked && (
                        <div className="w-full rounded-lg border border-yellow-200/50 bg-yellow-50/50 p-3 dark:border-yellow-800/50 dark:bg-yellow-950/30">
                            <p className="text-sm text-yellow-600 dark:text-yellow-400">
                                Try again in {getFormattedDate(status.timeUntilUnlock)}
                            </p>
                        </div>
                    )}

                    {status.isLocked && (
                        <div className="flex justify-end pt-1">
                            <button
                                type="button"
                                className={FreeRedBtn}
                                onClick={() => {
                                    void clearAccount(logout);
                                }}
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
