import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, X } from 'lucide-react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    CartesianGrid,
    Tooltip,
    XAxis,
    YAxis,
    Cell,
    LineChart,
    Line,
} from 'recharts';
import type { Transaction } from '../types/finance.types';
import { FreeWhiteBtn, pieChartCard, SegmentedToggleItemSelected, SegmentedToggleItemUnselected, SegmentedToggleShell, SegmentedToggleThumb, SegmentedToggleTrack } from '../constants/TailwindClasses';
import { formatNumberWithCommas } from '../utils/numberFormatterUtils';

interface IncomeExpenseTrendChartProps {
    transactions: Transaction[];
    selectedMonthKey?: string;
    rangeValue: string;
    onSelectRange: (rangeValue: string) => void;
    onSelectMonth: (monthKey: string) => void;
    onClearMonthSelection: () => void;
    isRangeLocked?: boolean;
    rangeLabelOverride?: string;
    showRangeSelector?: boolean;
}

interface MonthlyTrendDatum {
    key: string;
    shortLabel: string;
    monthYearLabel: string;
    year: number;
    income: number;
    expense: number;
}

interface TooltipPayloadEntry {
    dataKey?: string;
    value?: number;
    payload: MonthlyTrendDatum;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadEntry[];
}

const incomeBarColor = '#16a34a';
const expenseBarColor = '#dc2626';
const compactNumberFormatter = new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1,
});
const getTransactionTimestamp = (transaction: Transaction) => {
    return transaction.dateTime || transaction.dueDate || 0;
};

const getMonthKey = (date: Date) => {
    return `${date.getFullYear()}-${date.getMonth()}`;
};

const formatCurrency = (amount: number) => {
    return `₹ ${formatNumberWithCommas(Number(amount.toFixed(2)))}`;
};

const formatAxisAmount = (amount: number) => {
    if (amount === 0) return '₹0';
    return `₹${compactNumberFormatter.format(amount)}`;
};

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (!active || !payload || payload.length === 0) {
        return null;
    }

    const monthYearLabel = payload[0].payload.monthYearLabel;

    return (
        <div className="app-border-surface rounded-2xl bg-white/96 px-3 py-2.5 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:bg-slate-900/96">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {monthYearLabel}
            </p>
            <div className="mt-1.5 flex flex-col gap-1">
                {payload.map((entry) => {
                    const isIncome = entry.dataKey === 'income';

                    return (
                        <p
                            key={entry.dataKey}
                            className={`text-sm font-semibold ${isIncome ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'}`}
                        >
                            {isIncome ? 'Income' : 'Expense'}: {formatCurrency(entry.value || 0)}
                        </p>
                    );
                })}
            </div>
        </div>
    );
};

export const IncomeExpenseTrendChart: React.FC<IncomeExpenseTrendChartProps> = ({
    transactions,
    selectedMonthKey = '',
    rangeValue,
    onSelectRange,
    onSelectMonth,
    onClearMonthSelection,
    isRangeLocked = false,
    rangeLabelOverride,
    showRangeSelector = true,
}) => {
    const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
    const allMonthlyTrendData = useMemo(() => {
        const relevantTransactions = transactions.filter(
            (transaction) => transaction.type === 'INCOME' || transaction.type === 'EXPENSE',
        );

        if (relevantTransactions.length === 0) {
            return [];
        }

        const earliestTransactionTimestamp = relevantTransactions.reduce((minTimestamp, transaction) => {
            return Math.min(minTimestamp, getTransactionTimestamp(transaction));
        }, Number.POSITIVE_INFINITY);
        const latestTransactionTimestamp = relevantTransactions.reduce((maxTimestamp, transaction) => {
            return Math.max(maxTimestamp, getTransactionTimestamp(transaction));
        }, 0);

        const earliestDate = new Date(earliestTransactionTimestamp);
        const anchorDate = new Date(latestTransactionTimestamp);
        earliestDate.setDate(1);
        earliestDate.setHours(0, 0, 0, 0);
        anchorDate.setDate(1);
        anchorDate.setHours(0, 0, 0, 0);

        const monthSpan = ((anchorDate.getFullYear() - earliestDate.getFullYear()) * 12)
            + (anchorDate.getMonth() - earliestDate.getMonth())
            + 1;

        const months = Array.from({ length: monthSpan }, (_, index) => {
            const date = new Date(earliestDate.getFullYear(), earliestDate.getMonth() + index, 1);

            return {
                key: getMonthKey(date),
                shortLabel: date.toLocaleDateString('en-US', { month: 'short' }),
                monthYearLabel: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                year: date.getFullYear(),
                income: 0,
                expense: 0,
            };
        });

        const monthlyBuckets = new Map(months.map((month) => [month.key, month]));

        relevantTransactions.forEach((transaction) => {
            const timestamp = getTransactionTimestamp(transaction);
            if (!timestamp) return;

            const date = new Date(timestamp);
            const bucket = monthlyBuckets.get(getMonthKey(date));

            if (!bucket) return;

            if (transaction.type === 'INCOME') {
                bucket.income += transaction.amount;
            } else if (transaction.type === 'EXPENSE') {
                bucket.expense += transaction.amount;
            }
        });

        return months.map((month) => ({
            ...month,
            income: Number(month.income.toFixed(2)),
            expense: Number(month.expense.toFixed(2)),
        }));
    }, [transactions]);

    const yearOptions = useMemo(() => {
        return Array.from(new Set(allMonthlyTrendData.map((month) => month.year)))
            .sort((yearA, yearB) => yearA - yearB)
            .map((year) => year.toString());
    }, [allMonthlyTrendData]);

    const activeSelectedYear = yearOptions.includes(rangeValue)
        ? rangeValue
        : yearOptions[yearOptions.length - 1] ?? '';
    const activeRangeValue = rangeValue === 'max' ? 'max' : activeSelectedYear;

    const visibleTrendData = useMemo(() => {
        if (allMonthlyTrendData.length === 0) {
            return [];
        }

        if (isRangeLocked) {
            return allMonthlyTrendData;
        }

        if (activeRangeValue === 'max') {
            return allMonthlyTrendData;
        }

        const activeYear = Number(activeRangeValue);
        return allMonthlyTrendData.filter((month) => month.year === activeYear);
    }, [allMonthlyTrendData, isRangeLocked, activeRangeValue]);

    const selectedMonthTrendData = useMemo(() => {
        if (!selectedMonthKey) return null;

        return allMonthlyTrendData.find((month) => month.key === selectedMonthKey) ?? null;
    }, [allMonthlyTrendData, selectedMonthKey]);

    const trendIncomeTotal = useMemo(() => {
        if (selectedMonthTrendData) {
            return selectedMonthTrendData.income;
        }

        return visibleTrendData.reduce((sum, month) => sum + month.income, 0);
    }, [selectedMonthTrendData, visibleTrendData]);

    const trendExpenseTotal = useMemo(() => {
        if (selectedMonthTrendData) {
            return selectedMonthTrendData.expense;
        }

        return visibleTrendData.reduce((sum, month) => sum + month.expense, 0);
    }, [selectedMonthTrendData, visibleTrendData]);

    const trendBalanceTotal = trendIncomeTotal - trendExpenseTotal;

    const selectedMonthLabel = useMemo(() => {
        return allMonthlyTrendData.find((month) => month.key === selectedMonthKey)?.monthYearLabel || '';
    }, [allMonthlyTrendData, selectedMonthKey]);

    const rangeSummaryLabel = useMemo(() => {
        if (rangeLabelOverride) {
            return rangeLabelOverride;
        }

        if (visibleTrendData.length === 0) {
            return 'Choose a range to review monthly activity.';
        }

        const firstMonth = visibleTrendData[0].monthYearLabel;
        const lastMonth = visibleTrendData[visibleTrendData.length - 1].monthYearLabel;

        if (firstMonth === lastMonth) {
            return firstMonth;
        }

        return `${firstMonth} - ${lastMonth}`;
    }, [rangeLabelOverride, visibleTrendData]);

    const hasTrendData = visibleTrendData.some((month) => month.income > 0 || month.expense > 0);
    const maxBarSize = visibleTrendData.length > 18 ? 14 : 24;
    const isRangeSelectDisabled = isRangeLocked || yearOptions.length === 0;
    const activeRangeLabel = activeRangeValue === 'max' ? 'Max' : activeRangeValue;

    const handleBarSelect = (monthKey?: string | number) => {
        if (!monthKey || typeof monthKey !== 'string') {
            return;
        }

        onSelectMonth(monthKey);
    };

    return (
        <div className={pieChartCard}>
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 sm:text-xl md:text-2xl">
                            Income vs Expense
                        </h2>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
                            {rangeSummaryLabel}
                        </p>
                    </div>

                    <div className="flex flex-row flex-wrap justify-end items-end gap-2">
                        {showRangeSelector && (
                            <div className={`${FreeWhiteBtn} relative w-36 ${isRangeSelectDisabled ? 'cursor-not-allowed opacity-70' : ''}`}>
                                <CalendarDays size={16} />
                                <span className="min-w-0 flex-1 truncate text-left">
                                    {activeRangeLabel || 'Range'}
                                </span>
                                <ChevronDown size={16} className="text-slate-500 dark:text-slate-300" />
                                <select
                                    value={activeRangeValue}
                                    onChange={(event) => onSelectRange(event.target.value)}
                                    disabled={isRangeSelectDisabled}
                                    aria-label="Choose a report range"
                                    title={isRangeLocked ? 'Using the active report date range' : 'Choose a report range'}
                                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                                >
                                    <option value="max">Max</option>
                                    {yearOptions.map((year) => (
                                        <option key={year} value={year}>
                                            {year}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {isRangeLocked && (
                            <div className="app-border-soft flex items-center gap-2 rounded-2xl bg-slate-100/85 px-3 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
                                Using report date range
                            </div>
                        )}

                        {selectedMonthLabel && (
                            <button
                                type="button"
                                onClick={onClearMonthSelection}
                                className={`${FreeWhiteBtn}`}
                                title="Clear selected month"
                            >
                                {selectedMonthLabel}
                                <X size={14} />
                            </button>
                        )}

                        <div className={`${SegmentedToggleShell} bg-slate-100! dark:bg-slate-800! border-none! p-1! rounded-full!`}>
                            <div className={SegmentedToggleTrack}>
                                <div
                                    className={`${SegmentedToggleThumb} ${chartType === 'line' ? 'translate-x-full dark:bg-slate-700!' : 'translate-x-0 dark:bg-slate-700!'}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setChartType('bar')}
                                    className={`${chartType === 'bar' ? `${SegmentedToggleItemSelected} dark:bg-slate-700!` : SegmentedToggleItemUnselected} py-1!`}
                                >
                                    Bar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setChartType('line')}
                                    className={`${chartType === 'line' ? `${SegmentedToggleItemSelected} dark:bg-slate-700!` : SegmentedToggleItemUnselected} py-1!`}
                                >
                                    Line
                                </button>
                            </div>
                        </div>


                        <div className={`app-border-soft flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold ${trendBalanceTotal >= 0
                            ? 'bg-green-50/80 text-green-700 dark:bg-green-950/30 dark:text-green-200'
                            : 'bg-red-50/80 text-red-700 dark:bg-red-950/30 dark:text-red-200'
                            }`}>
                            <span className={`h-2.5 w-2.5 rounded-full ${trendBalanceTotal >= 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                            Balance: {formatCurrency(trendBalanceTotal)}
                        </div>
                    </div>
                </div>

                {hasTrendData ? (
                    <div className="h-[280px] w-full sm:h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            {chartType === 'bar' ? (
                                <BarChart
                                    data={visibleTrendData}
                                    barCategoryGap="24%"
                                    margin={{ top: 10, right: 4, left: -16, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.18)" />

                                    <XAxis
                                        dataKey="shortLabel"
                                        axisLine={false}
                                        tickLine={false}
                                        minTickGap={18}
                                        padding={{ left: 12, right: 20 }}
                                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        width={56}
                                        tickFormatter={formatAxisAmount}
                                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                                    />

                                    <Tooltip
                                        cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                                        content={<CustomTooltip />}
                                        shared={false}
                                    />

                                    <Bar
                                        dataKey="income"
                                        fill={incomeBarColor}
                                        radius={[10, 10, 0, 0]}
                                        maxBarSize={maxBarSize}
                                        onClick={(data: any) => handleBarSelect(data?.payload?.key)}
                                    >
                                        {visibleTrendData.map((month) => {
                                            const isSelected = month.key === selectedMonthKey;

                                            return (
                                                <Cell
                                                    key={`income-${month.key}`}
                                                    fill={incomeBarColor}
                                                    fillOpacity={selectedMonthKey && !isSelected ? 0.6 : 1}
                                                    stroke={isSelected ? '#166534' : undefined}
                                                    strokeWidth={isSelected ? 2 : 0}
                                                />
                                            );
                                        })}
                                    </Bar>

                                    <Bar
                                        dataKey="expense"
                                        fill={expenseBarColor}
                                        radius={[10, 10, 0, 0]}
                                        maxBarSize={maxBarSize}
                                        // onClick={(_, index) => handleBarSelect(index)}
                                        onClick={(data: any) => handleBarSelect(data?.payload?.key)}
                                    >
                                        {visibleTrendData.map((month) => {
                                            const isSelected = month.key === selectedMonthKey;

                                            return (
                                                <Cell
                                                    key={`expense-${month.key}`}
                                                    fill={expenseBarColor}
                                                    fillOpacity={selectedMonthKey && !isSelected ? 0.6 : 1}
                                                    stroke={isSelected ? '#991b1b' : undefined}
                                                    strokeWidth={isSelected ? 2 : 0}
                                                />
                                            );
                                        })}
                                    </Bar>
                                </BarChart>
                            ) : (
                                <LineChart
                                    data={visibleTrendData}
                                    // margin={{ top: 10, right: 10, left: -16, bottom: 0 }}
                                    margin={{ top: 10, right: 32, left: -8, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.18)" />

                                    <XAxis
                                        dataKey="shortLabel"
                                        axisLine={false}
                                        tickLine={false}
                                        minTickGap={18}
                                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                                    />

                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        width={56}
                                        tickFormatter={formatAxisAmount}
                                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                                    />

                                    <Tooltip content={<CustomTooltip />} />

                                    <Line
                                        type="monotone"
                                        dataKey="income"
                                        stroke={incomeBarColor}
                                        strokeWidth={3}
                                        dot={{ r: 4 }}
                                        activeDot={{ r: 6 }}
                                        onClick={(data: any) => handleBarSelect(data?.payload?.key)}
                                    />

                                    <Line
                                        type="monotone"
                                        dataKey="expense"
                                        stroke={expenseBarColor}
                                        strokeWidth={3}
                                        dot={{ r: 4 }}
                                        activeDot={{ r: 6 }}
                                        onClick={(data: any) => handleBarSelect(data?.payload?.key)}
                                    />
                                </LineChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="app-border-soft rounded-2xl bg-white/45 px-4 py-8 text-center text-sm text-slate-600 dark:bg-slate-900/28 dark:text-slate-400">
                        No income or expense history is available for the selected range yet.
                    </div>
                )}
            </div>
        </div>
    );
};
