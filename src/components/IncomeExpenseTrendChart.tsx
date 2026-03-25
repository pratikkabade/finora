import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import type { Transaction } from '../types/finance.types';
import { pieChartCard } from '../constants/TailwindClasses';
import { formatNumberWithCommas } from '../utils/numberFormatterUtils';

interface IncomeExpenseTrendChartProps {
    transactions: Transaction[];
    selectedMonthKey?: string;
    onSelectMonth: (monthKey: string) => void;
    isRangeLocked?: boolean;
    rangeLabelOverride?: string;
}

type TrendRangePreset = 'ytd' | 'year' | 'sixMonths' | 'max';

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
const trendRangeOptions: Array<{ value: TrendRangePreset; label: string }> = [
    { value: 'ytd', label: 'Year to Date' },
    { value: 'year', label: '1 Year' },
    { value: 'sixMonths', label: '6 Months' },
    { value: 'max', label: 'Max' },
];

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
    onSelectMonth,
    isRangeLocked = false,
    rangeLabelOverride,
}) => {
    const [rangePreset, setRangePreset] = useState<TrendRangePreset>('ytd');

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

    const visibleTrendData = useMemo(() => {
        if (allMonthlyTrendData.length === 0) {
            return [];
        }

        if (isRangeLocked) {
            return allMonthlyTrendData;
        }

        if (rangePreset === 'max') {
            return allMonthlyTrendData;
        }

        if (rangePreset === 'sixMonths') {
            return allMonthlyTrendData.slice(-6);
        }

        if (rangePreset === 'year') {
            return allMonthlyTrendData.slice(-12);
        }

        const anchorYear = allMonthlyTrendData[allMonthlyTrendData.length - 1]?.year;
        return allMonthlyTrendData.filter((month) => month.year === anchorYear);
    }, [allMonthlyTrendData, isRangeLocked, rangePreset]);

    const trendIncomeTotal = useMemo(() => {
        return visibleTrendData.reduce((sum, month) => sum + month.income, 0);
    }, [visibleTrendData]);

    const trendExpenseTotal = useMemo(() => {
        return visibleTrendData.reduce((sum, month) => sum + month.expense, 0);
    }, [visibleTrendData]);

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

    const handleBarSelect = (index: number) => {
        const monthKey = visibleTrendData[index]?.key;

        if (!monthKey) return;

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

                    <div className="flex flex-row flex-wrap justify-center items-center gap-2">
                        <div className="app-border-soft flex min-w-[11rem] flex-col gap-1 rounded-2xl bg-white/40 dark:bg-slate-900/25">
                            <select
                                value={rangePreset}
                                onChange={(event) => setRangePreset(event.target.value as TrendRangePreset)}
                                disabled={isRangeLocked}
                                title={isRangeLocked ? 'Using the active report date range' : 'Choose a chart range'}
                                className="glass-input w-full rounded-xl px-3 py-2 text-sm text-slate-900 disabled:cursor-not-allowed disabled:opacity-70 dark:text-slate-50"
                            >
                                {trendRangeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {isRangeLocked && (
                            <div className="app-border-soft flex items-center gap-2 rounded-2xl bg-slate-100/85 px-3 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
                                Using report date range
                            </div>
                        )}

                        {selectedMonthLabel && (
                            <div className="app-border-soft flex items-center gap-2 rounded-2xl bg-sky-50/80 px-3 py-2 text-sm font-semibold text-sky-700 dark:bg-sky-950/30 dark:text-sky-200">
                                {selectedMonthLabel}
                            </div>
                        )}

                        <div className="app-border-soft flex items-center gap-2 rounded-2xl bg-green-50/80 px-3 py-2 text-sm font-semibold text-green-700 dark:bg-green-950/30 dark:text-green-200">
                            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                            {formatCurrency(trendIncomeTotal)}
                        </div>
                        <div className="app-border-soft flex items-center gap-2 rounded-2xl bg-red-50/80 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-200">
                            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                            {formatCurrency(trendExpenseTotal)}
                        </div>
                    </div>
                </div>

                {hasTrendData ? (
                    <div className="h-[280px] w-full sm:h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
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
                                    onClick={(_, index) => handleBarSelect(index)}
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
                                    onClick={(_, index) => handleBarSelect(index)}
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
