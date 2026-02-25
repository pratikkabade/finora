import React, { useEffect, useMemo, useState } from 'react';
import { X, Calendar } from 'lucide-react';
import type { Transaction } from '../types/finance.types';
import { generateMonthYearOptions } from '../utils/dateUtils';
import { FreeBlueBtn, FreeWhiteBtn, ModalHeader, ModalOut, ModalPopUp } from '../constants/TailwindClasses';

interface DateRangeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (startDate: number, endDate: number) => void;
    onApplyMonth: (monthYear: string) => void;
    selectedMonthYear: string;
    transactions: Transaction[];
}

export const DateRangeModal: React.FC<DateRangeModalProps> = ({
    isOpen,
    onClose,
    onApply,
    onApplyMonth,
    selectedMonthYear,
    transactions,
}) => {
    const monthYearOptions = useMemo(() => {
        return generateMonthYearOptions(transactions);
    }, [transactions]);

    const [singleMonth, setSingleMonth] = useState<string>('');
    const [startMonth, setStartMonth] = useState<string>('');
    const [endMonth, setEndMonth] = useState<string>('');

    useEffect(() => {
        if (!isOpen) return;

        const newestMonth = monthYearOptions[0]?.value ?? '';
        const oldestMonth = monthYearOptions[monthYearOptions.length - 1]?.value ?? '';
        const isSelectedMonthValid = monthYearOptions.some(option => option.value === selectedMonthYear);

        setSingleMonth(isSelectedMonthValid ? selectedMonthYear : newestMonth);
        setStartMonth(oldestMonth);
        setEndMonth(newestMonth);
    }, [isOpen, monthYearOptions, selectedMonthYear]);

    const handleApplySingleMonth = () => {
        if (!singleMonth) return;
        onApplyMonth(singleMonth);
        onClose();
    };

    const handleApplyRange = () => {
        if (!startMonth || !endMonth) return;

        const [startYear, startMonthNum] = startMonth.split('-').map(Number);
        const [endYear, endMonthNum] = endMonth.split('-').map(Number);

        const startDate = new Date(startYear, startMonthNum, 1).getTime();
        const endDate = new Date(endYear, endMonthNum + 1, 0, 23, 59, 59, 999).getTime();
        const normalizedStart = Math.min(startDate, endDate);
        const normalizedEnd = Math.max(startDate, endDate);

        onApply(normalizedStart, normalizedEnd);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className={ModalOut}>
            <div className={ModalPopUp}>
                {/* Header */}
                <div className={ModalHeader}>
                    <div className="flex items-center gap-2">
                        <Calendar size={20} className="text-gray-600 dark:text-gray-400" />
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-50">Select Date Filter</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className={FreeWhiteBtn}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Month</label>
                        <select
                            value={singleMonth}
                            onChange={(e) => setSingleMonth(e.target.value)}
                            className="glass-input w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-50 rounded-lg border border-white/20 dark:border-gray-700/30 focus:border-blue-400 focus:outline-none"
                        >
                            {monthYearOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={handleApplySingleMonth}
                            disabled={monthYearOptions.length === 0}
                            className={`${FreeBlueBtn} mt-3 w-full disabled:opacity-60 disabled:cursor-not-allowed`}
                        >
                            Apply Month
                        </button>
                    </div>

                    <div className="border-t border-white/20 dark:border-gray-700/30 pt-4 space-y-4">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Or use a month range</h3>

                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Month</label>
                        <select
                            value={startMonth}
                            onChange={(e) => setStartMonth(e.target.value)}
                            className="glass-input w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-50 rounded-lg border border-white/20 dark:border-gray-700/30 focus:border-blue-400 focus:outline-none"
                        >
                            {monthYearOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Month</label>
                        <select
                            value={endMonth}
                            onChange={(e) => setEndMonth(e.target.value)}
                            className="glass-input w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-50 rounded-lg border border-white/20 dark:border-gray-700/30 focus:border-blue-400 focus:outline-none"
                        >
                            {monthYearOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-4">
                            This shows transactions from the first day of the start month to the last day of the end month.
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 p-4 sm:p-6 border-t border-white/20 dark:border-gray-700/30">
                    <button
                        onClick={onClose}
                        className={FreeWhiteBtn}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApplyRange}
                        disabled={monthYearOptions.length === 0}
                        className={FreeBlueBtn}
                    >
                        Apply Range
                    </button>
                </div>
            </div>
        </div>
    );
};
