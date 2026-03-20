import React, { useEffect, useMemo, useState } from 'react';
import { X, Calendar } from 'lucide-react';
import type { Transaction } from '../types/finance.types';
import { generateMonthYearOptions, getMonthName } from '../utils/dateUtils';
import { FreeBlueBtn, FreeWhiteBtn, ModalHeader, ModalOut, ModalPopUp } from '../constants/TailwindClasses';

type FilterMode = 'month' | 'range';

interface DateRangeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (startDate: number, endDate: number) => void;
    onApplyMonth: (monthYear: string) => void;
    activeDateRange: { start: number; end: number } | null;
    selectedMonthYear: string;
    transactions: Transaction[];
}

const getMonthKeyFromTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${date.getMonth()}`;
};

const getMonthPartsFromKey = (monthKey: string) => {
    const [year = '', month = ''] = monthKey.split('-');
    return { year, month };
};

export const DateRangeModal: React.FC<DateRangeModalProps> = ({
    isOpen,
    onClose,
    onApply,
    onApplyMonth,
    activeDateRange,
    selectedMonthYear,
    transactions,
}) => {
    const monthYearOptions = useMemo(() => {
        return generateMonthYearOptions(transactions);
    }, [transactions]);

    const yearOptions = useMemo(() => {
        return [...new Set(monthYearOptions.map((option) => option.year.toString()))];
    }, [monthYearOptions]);

    const monthsByYear = useMemo(() => {
        return monthYearOptions.reduce<Record<string, Array<{ value: string; label: string }>>>((accumulator, option) => {
            const yearKey = option.year.toString();

            if (!accumulator[yearKey]) {
                accumulator[yearKey] = [];
            }

            accumulator[yearKey].push({
                value: option.month.toString(),
                label: getMonthName(option.month),
            });

            return accumulator;
        }, {});
    }, [monthYearOptions]);

    const [selectionMode, setSelectionMode] = useState<FilterMode>('month');
    const [singleYear, setSingleYear] = useState<string>('');
    const [singleMonth, setSingleMonth] = useState<string>('');
    const [startYear, setStartYear] = useState<string>('');
    const [startMonth, setStartMonth] = useState<string>('');
    const [endYear, setEndYear] = useState<string>('');
    const [endMonth, setEndMonth] = useState<string>('');

    const getDefaultMonthForYear = (year: string) => {
        return monthsByYear[year]?.[0]?.value ?? '';
    };

    useEffect(() => {
        if (!isOpen) return;

        const newestMonth = monthYearOptions[0]?.value ?? '';
        const oldestMonth = monthYearOptions[monthYearOptions.length - 1]?.value ?? '';
        const isSelectedMonthValid = monthYearOptions.some(option => option.value === selectedMonthYear);
        const rangeStartMonth = activeDateRange ? getMonthKeyFromTimestamp(activeDateRange.start) : oldestMonth;
        const rangeEndMonth = activeDateRange ? getMonthKeyFromTimestamp(activeDateRange.end) : newestMonth;
        const isRangeStartValid = monthYearOptions.some(option => option.value === rangeStartMonth);
        const isRangeEndValid = monthYearOptions.some(option => option.value === rangeEndMonth);
        const initialSingleMonth = isSelectedMonthValid ? selectedMonthYear : newestMonth;
        const initialStartMonth = isRangeStartValid ? rangeStartMonth : oldestMonth;
        const initialEndMonth = isRangeEndValid ? rangeEndMonth : newestMonth;
        const initialSingleParts = getMonthPartsFromKey(initialSingleMonth);
        const initialStartParts = getMonthPartsFromKey(initialStartMonth);
        const initialEndParts = getMonthPartsFromKey(initialEndMonth);

        setSelectionMode(activeDateRange ? 'range' : 'month');
        setSingleYear(initialSingleParts.year);
        setSingleMonth(initialSingleParts.month);
        setStartYear(initialStartParts.year);
        setStartMonth(initialStartParts.month);
        setEndYear(initialEndParts.year);
        setEndMonth(initialEndParts.month);
    }, [isOpen, monthYearOptions, selectedMonthYear, activeDateRange]);

    const handleApplySingleMonth = () => {
        if (!singleYear || !singleMonth) return;

        onApplyMonth(`${singleYear}-${singleMonth}`);
        onClose();
    };

    const handleApplyRange = () => {
        if (!startYear || !startMonth || !endYear || !endMonth) return;

        const startMonthNum = Number(startMonth);
        const endMonthNum = Number(endMonth);
        const normalizedStartYear = Number(startYear);
        const normalizedEndYear = Number(endYear);

        const startDate = new Date(normalizedStartYear, startMonthNum, 1).getTime();
        const endDate = new Date(normalizedEndYear, endMonthNum + 1, 0, 23, 59, 59, 999).getTime();
        const normalizedStart = Math.min(startDate, endDate);
        const normalizedEnd = Math.max(startDate, endDate);

        onApply(normalizedStart, normalizedEnd);
        onClose();
    };

    if (!isOpen) return null;

    const hasOptions = monthYearOptions.length > 0;
    const actionLabel = selectionMode === 'month' ? 'Apply Month' : 'Apply Range';
    const modeDescription = selectionMode === 'month'
        ? 'Keep it quick with a single-month filter.'
        : 'Choose a start and end month for a wider view.';
    const selectClassName = 'glass-input w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-50 rounded-lg border border-white/20 dark:border-gray-700/30 focus:border-blue-400 focus:outline-none';
    const sectionSurfaceClassName = 'rounded-2xl border border-white/35 dark:border-gray-700/30 bg-white/25 dark:bg-gray-800/25 backdrop-blur-md';
    const singleMonthOptions = monthsByYear[singleYear] ?? [];
    const startMonthOptions = monthsByYear[startYear] ?? [];
    const endMonthOptions = monthsByYear[endYear] ?? [];
    const canApplySelection = selectionMode === 'month'
        ? !!singleYear && !!singleMonth
        : !!startYear && !!startMonth && !!endYear && !!endMonth;

    const handleSingleYearChange = (year: string) => {
        setSingleYear(year);
        setSingleMonth((currentMonth) => {
            return (monthsByYear[year] ?? []).some((option) => option.value === currentMonth)
                ? currentMonth
                : getDefaultMonthForYear(year);
        });
    };

    const handleStartYearChange = (year: string) => {
        setStartYear(year);
        setStartMonth((currentMonth) => {
            return (monthsByYear[year] ?? []).some((option) => option.value === currentMonth)
                ? currentMonth
                : getDefaultMonthForYear(year);
        });
    };

    const handleEndYearChange = (year: string) => {
        setEndYear(year);
        setEndMonth((currentMonth) => {
            return (monthsByYear[year] ?? []).some((option) => option.value === currentMonth)
                ? currentMonth
                : getDefaultMonthForYear(year);
        });
    };

    const renderYearMonthSelectors = (
        yearLabel: string,
        yearValue: string,
        onYearChange: (year: string) => void,
        monthLabel: string,
        monthValue: string,
        onMonthChange: (month: string) => void,
        monthOptions: Array<{ value: string; label: string }>,
    ) => (
        <div className="grid gap-4 sm:grid-cols-2">
            <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{yearLabel}</label>
                <select
                    value={yearValue}
                    onChange={(e) => onYearChange(e.target.value)}
                    className={selectClassName}
                >
                    {yearOptions.map((year) => (
                        <option key={year} value={year}>
                            {year}
                        </option>
                    ))}
                </select>
            </div>
            <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{monthLabel}</label>
                <select
                    value={monthValue}
                    onChange={(e) => onMonthChange(e.target.value)}
                    className={selectClassName}
                >
                    {monthOptions.map((option) => (
                        <option key={`${yearValue}-${option.value}`} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );

    const contentPanel = selectionMode === 'month' ? (
        <div className={`filter-panel-enter ${sectionSurfaceClassName} space-y-4 p-4`}>
            {renderYearMonthSelectors(
                'Year',
                singleYear,
                handleSingleYearChange,
                'Month',
                singleMonth,
                setSingleMonth,
                singleMonthOptions,
            )}
        </div>
    ) : (
        <div className={`filter-panel-enter ${sectionSurfaceClassName} space-y-4 p-4`}>
            <div className="space-y-4">
                <div>
                    <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Start</p>
                    {renderYearMonthSelectors(
                        'Start Year',
                        startYear,
                        handleStartYearChange,
                        'Start Month',
                        startMonth,
                        setStartMonth,
                        startMonthOptions,
                    )}
                </div>
                <div>
                    <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">End</p>
                    {renderYearMonthSelectors(
                        'End Year',
                        endYear,
                        handleEndYearChange,
                        'End Month',
                        endMonth,
                        setEndMonth,
                        endMonthOptions,
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className={ModalOut}>
            <div className={`${ModalPopUp} relative`}>
                <div className="filter-mode-glow pointer-events-none absolute inset-x-10 top-16 h-16 rounded-full bg-linear-to-r from-sky-300/12 via-white/5 to-cyan-300/12 blur-3xl" />

                {/* Header */}
                <div className={`${ModalHeader} relative`}>
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
                <div className="relative p-4 sm:p-6 space-y-4">
                    <div className={`${sectionSurfaceClassName} space-y-3 p-2`}>
                        <div className="relative grid grid-cols-2 gap-1">
                            <div
                                className={`pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-xl bg-white/90 dark:bg-gray-800/85 shadow-[0_12px_30px_-18px_rgba(37,99,235,0.45)] transition-transform duration-300 ease-out ${selectionMode === 'range' ? 'translate-x-full' : 'translate-x-0'}`}
                            />
                            <button
                                type="button"
                                onClick={() => setSelectionMode('month')}
                                className={`relative z-10 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-300 border cursor-pointer ${selectionMode === 'month' ? 'text-blue-700 dark:text-blue-200' : 'text-gray-600 hover:text-blue-800 dark:text-gray-400 dark:hover:text-blue-200'}`}
                            >
                                Single Month
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectionMode('range')}
                                className={`relative z-10 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-300 border cursor-pointer ${selectionMode === 'range' ? 'text-blue-700 dark:text-blue-200' : 'text-gray-600 hover:text-blue-800 dark:text-gray-400 dark:hover:text-blue-200'}`}
                            >
                                Set Range
                            </button>
                        </div>

                        <div className="flex items-center gap-2 px-2 text-xs text-gray-600 transition-all duration-300 dark:text-gray-400">
                            <span className={`h-2.5 w-2.5 rounded-full ${selectionMode === 'month' ? 'bg-blue-500' : 'bg-cyan-400'} animate-pulse`} />
                            <span>{modeDescription}</span>
                        </div>
                    </div>

                    {contentPanel}

                    <button
                        onClick={selectionMode === 'month' ? handleApplySingleMonth : handleApplyRange}
                        disabled={!hasOptions || !canApplySelection}
                        className={`${FreeBlueBtn} w-full disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                        {actionLabel}
                    </button>

                    {!hasOptions && (
                        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                            No completed months are available yet.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
