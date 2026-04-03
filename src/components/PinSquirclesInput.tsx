import React, { useEffect, useRef, useState } from 'react';
import { PIN_LENGTH } from '../services/pinService';

interface PinSquirclesInputProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    autoFocus?: boolean;
    hasError?: boolean;
    onComplete?: (value: string) => void;
    ariaLabel: string;
}

export const PinSquirclesInput: React.FC<PinSquirclesInputProps> = ({
    value,
    onChange,
    disabled = false,
    autoFocus = false,
    hasError = false,
    onComplete,
    ariaLabel,
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const lastCompletedValueRef = useRef('');
    const [isFocused, setIsFocused] = useState(false);
    const digits = Array.from({ length: PIN_LENGTH }, (_, index) => value[index] ?? '');

    useEffect(() => {
        if (!autoFocus || disabled) {
            return;
        }

        const timerId = window.setTimeout(() => {
            inputRef.current?.focus();
        }, 60);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [autoFocus, disabled]);

    useEffect(() => {
        if (!onComplete || disabled) {
            return;
        }

        if (value.length === PIN_LENGTH) {
            if (lastCompletedValueRef.current === value) {
                return;
            }

            lastCompletedValueRef.current = value;
            onComplete(value);
            return;
        }

        lastCompletedValueRef.current = '';
    }, [value, disabled, onComplete]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextValue = event.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH);
        onChange(nextValue);
    };

    const handleFocusInput = () => {
        if (!disabled) {
            inputRef.current?.focus();
        }
    };

    const activeIndex = value.length >= PIN_LENGTH ? PIN_LENGTH - 1 : value.length;

    return (
        <div className="relative" onClick={handleFocusInput}>
            <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={PIN_LENGTH}
                autoComplete="one-time-code"
                value={value}
                onChange={handleChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="absolute inset-0 h-full w-full cursor-text opacity-0"
                disabled={disabled}
                aria-label={ariaLabel}
                aria-invalid={hasError}
            />

            <div className="flex items-center justify-center gap-3 sm:gap-4">
                {digits.map((digit, index) => {
                    const isActive = isFocused && index === activeIndex;
                    const baseClasses = hasError
                        ? 'border-red-300/90 bg-red-50/85 text-red-700 shadow-[0_16px_38px_-26px_rgba(220,38,38,0.35)] dark:border-red-800/70 dark:bg-red-950/35 dark:text-red-200'
                        : digit
                            ? 'border-sky-300/90 bg-sky-50/85 text-slate-900 shadow-[0_18px_42px_-28px_rgba(14,165,233,0.28)] dark:border-sky-500/50 dark:bg-sky-500/12 dark:text-slate-50'
                            : 'border-slate-200/90 bg-white/88 text-slate-400 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.22)] dark:border-slate-700/70 dark:bg-slate-900/62 dark:text-slate-500';

                    return (
                        <div
                            key={index}
                            className={`flex h-14 w-14 items-center justify-center rounded-[1.35rem] border text-2xl font-semibold transition-all duration-200 sm:h-16 sm:w-16 sm:text-[1.7rem] ${baseClasses} ${isActive ? 'scale-[1.03] ring-2 ring-sky-300/70 dark:ring-sky-500/45' : ''} ${disabled ? 'opacity-60' : ''}`}
                        >
                            {digit || ''}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
