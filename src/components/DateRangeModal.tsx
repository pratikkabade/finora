import React, { useState, useMemo } from 'react';
import { X, Calendar } from 'lucide-react';
import type { Transaction } from '../types/finance.types';
import { generateMonthYearOptions } from '../utils/dateUtils';
import { FreeBlueBtn, FreeWhiteBtn, ModalHeader, ModalOut, ModalPopUp } from '../constants/TailwindClasses';

interface DateRangeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (startDate: number, endDate: number) => void;
    transactions: Transaction[];
}

export const DateRangeModal: React.FC<DateRangeModalProps> = ({
    isOpen,
    onClose,
    onApply,
    transactions,
}) => {
    const monthYearOptions = useMemo(() => {
        return generateMonthYearOptions(transactions);
    }, [transactions]);

    const [startMonth, setStartMonth] = useState<string>(
        monthYearOptions.length > 0 ? monthYearOptions[monthYearOptions.length - 1].value : ''
    );
    const [endMonth, setEndMonth] = useState<string>(
        monthYearOptions.length > 0 ? monthYearOptions[0].value : ''
    );

    const handleApply = () => {
        if (!startMonth || !endMonth) return;

        const [startYear, startMonthNum] = startMonth.split('-').map(Number);
        const [endYear, endMonthNum] = endMonth.split('-').map(Number);

        // Start of start month (00:00:00)
        const startDate = new Date(startYear, startMonthNum - 1, 1).getTime();

        // End of end month (23:59:59)
        const endDate = new Date(endYear, endMonthNum, 0, 23, 59, 59, 999).getTime();

        onApply(startDate, endDate);
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
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-50">Select Date Range</h2>
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
                    {/* Start Month */}
                    <div>
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
                    </div>

                    {/* End Month */}
                    <div>
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
                    </div>

                    {/* Info text */}
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-4">
                        This will show all transactions from the first day of the start month to the last day of the end month.
                    </p>
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
                        onClick={handleApply}
                        className={FreeBlueBtn}
                    >
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
};
