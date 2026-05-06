import React, { useEffect, useMemo, useState } from 'react';
import { X, Calendar } from 'lucide-react';
import type { Transaction } from '../types/finance.types';
import { generateMonthYearOptions, getMonthName } from '../utils/dateUtils';
import {
    FreeBlueBtn,
    FreeWhiteBtn,
    ModalHeader,
    ModalOut,
    ModalPopUp,
    SegmentedToggleItemSelected,
    SegmentedToggleItemUnselected,
    SegmentedToggleShell,
    SegmentedToggleThumb,
    SegmentedToggleTrack,
} from '../constants/TailwindClasses';
import { useAnimatedOpen } from '../hooks/useAnimatedOpen';

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
    const { shouldRender, isVisible } = useAnimatedOpen(isOpen);
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

    if (!shouldRender) return null;

    const hasOptions = monthYearOptions.length > 0;
    const actionLabel = selectionMode === 'month' ? 'Apply Month' : 'Apply Range';
    const selectClassName = 'glass-input w-full rounded-lg border border-slate-200/70 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none dark:border-slate-700/55 dark:text-gray-50';
    const sectionSurfaceClassName = 'app-border-soft rounded-2xl bg-white/25 backdrop-blur-md dark:bg-gray-800/25';
    const panelAnimationClass = selectionMode === 'month' ? 'filter-panel-enter-left' : 'filter-panel-enter-right';
    const yearSelectOptions = yearOptions.map((year) => ({ value: year, label: year }));
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

    const renderSelectField = (
        label: string,
        value: string,
        onChange: (value: string) => void,
        options: Array<{ value: string; label: string }>,
    ) => (
        <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={selectClassName}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );

    const contentPanel = selectionMode === 'month' ? (
        <div key="month-panel" className={`${panelAnimationClass} ${sectionSurfaceClassName} grid h-full content-center p-4`}>
            <div className="grid grid-cols-2 gap-3">
                {renderSelectField(
                    'Year',
                    singleYear,
                    handleSingleYearChange,
                    yearSelectOptions,
                )}
                {renderSelectField(
                    'Month',
                    singleMonth,
                    setSingleMonth,
                    singleMonthOptions,
                )}
            </div>
        </div>
    ) : (
        <div key="range-panel" className={`${panelAnimationClass} ${sectionSurfaceClassName} p-4`}>
            <div className="grid grid-cols-2 gap-3">
                {renderSelectField(
                    'Start Year',
                    startYear,
                    handleStartYearChange,
                    yearSelectOptions,
                )}
                {renderSelectField(
                    'Start Month',
                    startMonth,
                    setStartMonth,
                    startMonthOptions,
                )}
                {renderSelectField(
                    'End Year',
                    endYear,
                    handleEndYearChange,
                    yearSelectOptions,
                )}
                {renderSelectField(
                    'End Month',
                    endMonth,
                    setEndMonth,
                    endMonthOptions,
                )}
            </div>
        </div>
    );

    return (
        <div className={`${ModalOut} ${isVisible ? 'app-modal-backdrop-enter' : 'app-modal-backdrop-exit'}`}>
            <div className={`${ModalPopUp} relative max-w-sm sm:max-w-lg ${isVisible ? 'app-modal-panel-enter' : 'app-modal-panel-exit'}`}>
                <div className="app-modal-glow pointer-events-none absolute inset-x-10 top-16 h-16 rounded-full bg-linear-to-r from-sky-300/12 via-white/5 to-cyan-300/12 blur-3xl" />

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
                <div className="app-panel-stagger relative space-y-4 p-4 sm:p-6">
                    <div className={SegmentedToggleShell}>
                        <div className={SegmentedToggleTrack}>
                            <div
                                className={`${SegmentedToggleThumb} ${selectionMode === 'range' ? 'translate-x-full' : 'translate-x-0'}`}
                            />
                            <button
                                type="button"
                                onClick={() => setSelectionMode('month')}
                                className={selectionMode === 'month' ? SegmentedToggleItemSelected : SegmentedToggleItemUnselected}
                            >
                                Single Month
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectionMode('range')}
                                className={selectionMode === 'range' ? SegmentedToggleItemSelected : SegmentedToggleItemUnselected}
                            >
                                Set Range
                            </button>
                        </div>
                    </div>
                    {/* </div> */}

                    <div className="overflow-hidden min-h-[12.25rem] sm:min-h-[11.5rem]">
                        {contentPanel}
                    </div>

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
