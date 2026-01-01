import React, { useState, useEffect } from 'react';
import { Lock, X } from 'lucide-react';
import { verifyPIN, getPINStatus, clearAccount } from '../services/pinService';
import { FreeBlueBtn, FreeRedBtn, FreeWhiteBtn, ModalHeader, ModalOut, ModalPopUp } from '../constants/TailwindClasses';
import { getFormattedDate } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';

interface PINVerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVerified: () => void;
    userId: string;
}

export const PINVerificationModal: React.FC<PINVerificationModalProps> = ({
    isOpen,
    onClose,
    onVerified,
    userId,
}) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState(getPINStatus(userId));
    const { logout } = useAuth();
    
    useEffect(() => {
        if (isOpen) {
            setPin('');
            setError('');
            setStatus(getPINStatus(userId));
        }
    }, [isOpen, userId]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (!pin) {
                setError('Please enter your PIN');
                setIsLoading(false);
                return;
            }

            verifyPIN(userId, pin);
            setPin('');
            setIsLoading(false);
            onVerified();
        } catch (err: any) {
            if (!err.message.includes('locked')) {
                setError(err.message);
            } else {
                setError('');
            }
            setStatus(getPINStatus(userId));
            setPin('');
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={ModalOut}>
            <div className={ModalPopUp}>
                {/* Header */}
                <div className={ModalHeader}>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
                        <Lock size={20} />
                        Enter PIN
                    </h2>
                    <button
                        onClick={onClose}
                        className={FreeWhiteBtn}
                        disabled={isLoading}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleVerify} className="p-6 space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        This page is protected. Please enter your PIN to continue.
                    </p>

                    <div>
                        <label className="block text-xs font-semibold text-gray-900 dark:text-gray-50 mb-2 uppercase tracking-wide">
                            PIN
                        </label>
                        <input
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            value={pin}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setPin(val);
                            }}
                            className="glass-input w-full px-4 py-3 text-lg text-start tracking-widest text-gray-900 dark:text-gray-50 rounded-lg"
                            placeholder="••••"
                            disabled={isLoading || status.isLocked}
                            autoFocus
                        />
                    </div>



                    <div className="flex flex-row justify-end gap-3 pt-2">
                        {error && !status.isLocked && (
                            <div className="p-3 bg-red-50/50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/50 rounded-lg w-full">
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        )}
                        {status.isLocked && (
                            <div className="p-3 bg-yellow-50/50 dark:bg-yellow-950/30 border border-yellow-200/50 dark:border-yellow-800/50 rounded-lg w-full">
                                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                                    Try again in {getFormattedDate(status.timeUntilUnlock)}
                                </p>
                            </div>
                        )}
                        {status.isLocked ? (
                            <button
                                className={FreeRedBtn}
                                onClick={clearAccount.bind(null, logout)}
                            >
                                Logout
                            </button>
                        ) : (
                            <button
                                type="submit"
                                className={FreeBlueBtn}
                                disabled={isLoading || status.isLocked}
                            >
                                {isLoading ? 'Verifying...' : 'Verify'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};
