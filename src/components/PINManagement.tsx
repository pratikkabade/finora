import React, { useState } from 'react';
import { Lock, Eye, EyeOff, LockKeyholeOpen } from 'lucide-react';
import { setPIN, clearPIN, getPINStatus } from '../services/pinService';
import { FreeBlueBtn, FreeWhiteBtn, settingBtnDangerClass, settingBtnDetailTextClass, settingBtnPlainClass, settingBtnPlainDisabledClass } from '../constants/TailwindClasses';

interface PINManagementProps {
    userId: string;
    onSuccess?: () => void;
}

export const PINManagement: React.FC<PINManagementProps> = ({ userId, onSuccess }) => {
    const [mode, setMode] = useState<'view' | 'set' | 'change'>('view');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const status = getPINStatus(userId);

    const handleSetPin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        try {
            if (!newPin || newPin.length < 4) {
                setError('PIN must be at least 4 digits');
                setIsLoading(false);
                return;
            }

            if (newPin !== confirmPin) {
                setError('PINs do not match');
                setIsLoading(false);
                return;
            }

            setPIN(userId, newPin);
            setSuccess('PIN set successfully!');
            setNewPin('');
            setConfirmPin('');
            setTimeout(() => {
                setMode('view');
                setSuccess('');
                onSuccess?.();
            }, 1500);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemovePin = async () => {
        if (window.confirm('Are you sure you want to remove the PIN protection? Anyone with access to your device will be able to view your financial data.')) {
            try {
                clearPIN(userId);
                setSuccess('PIN removed successfully');
                setTimeout(() => {
                    setMode('view');
                    setSuccess('');
                    onSuccess?.();
                }, 1500);
            } catch (err: any) {
                setError(err.message);
            }
        }
    };

    if (mode === 'view') {
        return (
            <div className="flex flex-row gap-4">
                {status.isPINSet ?
                    <div className={settingBtnPlainDisabledClass}>
                        <Lock size={18} />
                        <div className="flex flex-col items-start">
                            <span>{status.isPINSet ? 'PIN is set' : 'Set PIN'}</span>
                            <span className={`${settingBtnDetailTextClass} text-green-600`}>PIN protection is enabled</span>
                        </div>
                    </div>
                    :
                    <button
                        onClick={() => setMode('set')}
                        className={settingBtnPlainClass}
                    >
                        <Lock size={18} />
                        <div className="flex flex-col items-start">
                            <span>Set PIN</span>
                            <span className={`${settingBtnDetailTextClass} ${'text-red-600'}`}>PIN protection is disabled</span>
                        </div>
                    </button>
                }

                {status.isPINSet && (
                    <button
                        onClick={handleRemovePin}
                        className={`${settingBtnDangerClass} w-40!`}
                    >
                        <LockKeyholeOpen size={14} />
                        <div className='flex flex-col'>
                            <span>Remove</span>
                            <span className='text-xs'>
                                PIN
                            </span>
                        </div>
                    </button>
                )}
            </div>
        );
    }

    if (mode === 'set') {
        return (
            <form onSubmit={handleSetPin} className="glass-card fade-in2 space-y-4 px-4 py-3">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                        Set PIN
                    </h3>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-900 dark:text-gray-50 mb-2">
                        New PIN (4-6 digits)
                    </label>
                    <div className="relative">
                        <input
                            type={showPin ? 'text' : 'password'}
                            inputMode="numeric"
                            maxLength={6}
                            value={newPin}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setNewPin(val);
                            }}
                            className="glass-input w-full px-3 py-2 text-sm tracking-widest text-gray-900 dark:text-gray-50 rounded-lg pr-10"
                            placeholder="••••"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPin(!showPin)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400"
                        >
                            {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-900 dark:text-gray-50 mb-2">
                        Confirm PIN
                    </label>
                    <div className="relative">
                        <input
                            type={showPin ? 'text' : 'password'}
                            inputMode="numeric"
                            maxLength={6}
                            value={confirmPin}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setConfirmPin(val);
                            }}
                            className="glass-input w-full px-3 py-2 text-sm tracking-widest text-gray-900 dark:text-gray-50 rounded-lg pr-10"
                            placeholder="••••"
                            required
                        />
                    </div>
                </div>

                {error && (
                    <div className="p-2 bg-red-50/50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/50 rounded-lg">
                        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="p-2 bg-green-50/50 dark:bg-green-950/30 border border-green-200/50 dark:border-green-800/50 rounded-lg">
                        <p className="text-xs text-green-600 dark:text-green-400">{success}</p>
                    </div>
                )}

                <div className="flex flex-row justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={() => {
                            setMode('view');
                            setError('');
                            setNewPin('');
                            setConfirmPin('');
                        }}
                        className={FreeWhiteBtn}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className={FreeBlueBtn}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Setting...' : 'Set PIN'}
                    </button>
                </div>
            </form>
        );
    }

    return null;
};
