import React, { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import type { PlannedPaymentRule, Transaction } from '../types/finance.types';
import { pieChartCard } from '../constants/TailwindClasses';
import { getFollowingPlannedPaymentDate } from '../utils/plannedPaymentUtils';
import { formatNumberWithCommas } from '../utils/numberFormatterUtils';

interface YearlyCashflowHeatmapProps {
    transactions: Transaction[];
    plannedPaymentRules: PlannedPaymentRule[];
    year: number;
    rangeLabel?: string;
    selectedDateKey?: string;
    onSelectDate?: (dateKey: string) => void;
}

interface DayBucket {
    key: string;
    date: Date;
    label: string;
    shortLabel: string;
    income: number;
    expense: number;
    incomeCount: number;
    expenseCount: number;
    plannedIncome: number;
    plannedExpense: number;
    plannedCount: number;
}

interface HeatmapCell {
    key: string;
    date: Date;
    bucket: DayBucket;
}

interface MonthGroup {
    label: string;
    cells: Array<HeatmapCell | null>;
    weekCount: number;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const weekDayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const heatmapColors = {
    income: '#22c55e',
    heavyIncome: '#15803d',
    expense: '#ef4444',
    heavyExpense: '#991b1b',
    planned: '#facc15',
    heavyPlanned: '#a16207',
    empty: 'rgba(148, 163, 184, 0.18)',
};

const formatCurrency = (amount: number) => {
    return `₹ ${formatNumberWithCommas(Number(amount.toFixed(2)))}`;
};

const toStartOfDay = (value: number | Date) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
};

const toDateKey = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
};

const getTransactionTimestamp = (transaction: Transaction) => {
    return transaction.dateTime || transaction.dueDate || 0;
};

const createEmptyBucket = (date: Date): DayBucket => {
    const day = toStartOfDay(date);

    return {
        key: toDateKey(day),
        date: day,
        label: day.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }),
        shortLabel: day.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        }),
        income: 0,
        expense: 0,
        incomeCount: 0,
        expenseCount: 0,
        plannedIncome: 0,
        plannedExpense: 0,
        plannedCount: 0,
    };
};

const buildTooltipText = (bucket: DayBucket) => {
    const actualCount = bucket.incomeCount + bucket.expenseCount;
    const lines = [
        bucket.label,
        `Income: ${formatCurrency(bucket.income)} (${bucket.incomeCount})`,
        `Expense: ${formatCurrency(bucket.expense)} (${bucket.expenseCount})`,
    ];

    if (bucket.plannedCount > 0) {
        lines.push(
            `Planned: ${formatCurrency(bucket.plannedIncome + bucket.plannedExpense)} (${bucket.plannedCount})`,
        );
    }

    lines.push(`Transactions: ${actualCount}`);

    return lines.join('\n');
};

const getPlannedOccurrenceStart = (rule: PlannedPaymentRule) => {
    return toStartOfDay(rule.nextDueDate ?? rule.startDate).getTime();
};

const getHeavyThreshold = (values: number[]) => {
    const sortedValues = values.filter((value) => value > 0).sort((amountA, amountB) => amountA - amountB);

    if (sortedValues.length === 0) {
        return Number.POSITIVE_INFINITY;
    }

    return sortedValues[Math.max(0, Math.floor(sortedValues.length * 0.72))];
};

const buildYearBuckets = (
    transactions: Transaction[],
    plannedPaymentRules: PlannedPaymentRule[],
    year: number,
) => {
    const yearStart = toStartOfDay(new Date(year, 0, 1));
    const yearEnd = toStartOfDay(new Date(year, 11, 31));
    const today = toStartOfDay(new Date());
    const futureStart = today.getTime() > yearStart.getTime() ? today : yearStart;
    const dayCount = Math.round((yearEnd.getTime() - yearStart.getTime()) / DAY_IN_MS) + 1;
    const buckets = new Map<string, DayBucket>();

    Array.from({ length: dayCount }, (_, index) => {
        const date = new Date(yearStart);
        date.setDate(yearStart.getDate() + index);
        const bucket = createEmptyBucket(date);
        buckets.set(bucket.key, bucket);
        return bucket;
    });

    transactions.forEach((transaction) => {
        if (transaction.type !== 'INCOME' && transaction.type !== 'EXPENSE') return;

        const timestamp = getTransactionTimestamp(transaction);
        if (!timestamp) return;

        const date = toStartOfDay(timestamp);
        if (date.getFullYear() !== year) return;

        const bucket = buckets.get(toDateKey(date));
        if (!bucket) return;

        if (transaction.type === 'INCOME') {
            bucket.income += transaction.amount;
            bucket.incomeCount += 1;
        } else {
            bucket.expense += transaction.amount;
            bucket.expenseCount += 1;
        }
    });

    plannedPaymentRules.forEach((rule) => {
        if (rule.type !== 'EXPENSE') return;

        let occurrenceDate = getPlannedOccurrenceStart(rule);
        let safetyCounter = 0;

        if (!rule.oneTime) {
            while (occurrenceDate < futureStart.getTime() && safetyCounter < 800) {
                const nextOccurrenceDate = getFollowingPlannedPaymentDate(rule, occurrenceDate);
                if (nextOccurrenceDate <= occurrenceDate) break;
                occurrenceDate = toStartOfDay(nextOccurrenceDate).getTime();
                safetyCounter += 1;
            }
        }

        while (occurrenceDate <= yearEnd.getTime() && safetyCounter < 800) {
            if (occurrenceDate >= futureStart.getTime()) {
                const bucket = buckets.get(toDateKey(new Date(occurrenceDate)));

                if (bucket) {
                    bucket.plannedExpense += rule.amount;
                    bucket.plannedCount += 1;
                }
            }

            if (rule.oneTime) break;

            const nextOccurrenceDate = getFollowingPlannedPaymentDate(rule, occurrenceDate);
            if (nextOccurrenceDate <= occurrenceDate) break;
            occurrenceDate = toStartOfDay(nextOccurrenceDate).getTime();
            safetyCounter += 1;
        }
    });

    return Array.from(buckets.values()).map((bucket) => ({
        ...bucket,
        income: Number(bucket.income.toFixed(2)),
        expense: Number(bucket.expense.toFixed(2)),
        plannedIncome: Number(bucket.plannedIncome.toFixed(2)),
        plannedExpense: Number(bucket.plannedExpense.toFixed(2)),
    }));
};

const getDayTone = (
    bucket: DayBucket,
    heavyIncomeThreshold: number,
    heavyExpenseThreshold: number,
    heavyPlannedThreshold: number,
) => {
    const hasPlannedTransactions = bucket.plannedCount > 0;
    const hasActualTransactions = bucket.incomeCount + bucket.expenseCount > 0;

    if (hasPlannedTransactions) {
        const isHeavyPlanned = bucket.plannedExpense >= heavyPlannedThreshold;

        return {
            label: isHeavyPlanned ? 'Heavy planned' : 'Planned',
            backgroundColor: isHeavyPlanned ? heatmapColors.heavyPlanned : heatmapColors.planned,
            borderColor: isHeavyPlanned ? '#78350f' : '#eab308',
            textColor: isHeavyPlanned ? 'text-amber-900 dark:text-amber-100' : 'text-amber-800 dark:text-amber-100',
        };
    }

    if (!hasActualTransactions) {
        return {
            label: 'No activity',
            backgroundColor: heatmapColors.empty,
            borderColor: 'rgba(148, 163, 184, 0.22)',
            textColor: 'text-slate-500 dark:text-slate-400',
        };
    }

    if (bucket.income >= bucket.expense) {
        const isHeavyIncome = bucket.income >= heavyIncomeThreshold;

        return {
            label: isHeavyIncome ? 'Heavy income' : 'Income',
            backgroundColor: isHeavyIncome ? heatmapColors.heavyIncome : heatmapColors.income,
            borderColor: isHeavyIncome ? '#166534' : '#16a34a',
            textColor: isHeavyIncome ? 'text-green-800 dark:text-green-100' : 'text-green-700 dark:text-green-200',
        };
    }

    if (bucket.expense >= heavyExpenseThreshold) {
        return {
            label: 'Heavy expense',
            backgroundColor: heatmapColors.heavyExpense,
            borderColor: '#7f1d1d',
            textColor: 'text-red-800 dark:text-red-100',
        };
    }

    return {
        label: 'Expense',
        backgroundColor: heatmapColors.expense,
        borderColor: '#dc2626',
        textColor: 'text-red-700 dark:text-red-200',
    };
};

export const YearlyCashflowHeatmap: React.FC<YearlyCashflowHeatmapProps> = ({
    transactions,
    plannedPaymentRules,
    year,
    rangeLabel,
    selectedDateKey = '',
    onSelectDate,
}) => {
    const safeYear = Number.isFinite(year) ? year : new Date().getFullYear();
    const buckets = useMemo(() => {
        return buildYearBuckets(transactions, plannedPaymentRules, safeYear);
    }, [transactions, plannedPaymentRules, safeYear]);

    const bucketByKey = useMemo(() => {
        return new Map(buckets.map((bucket) => [bucket.key, bucket]));
    }, [buckets]);
    const monthGroups = useMemo((): MonthGroup[] => {
        return monthLabels.map((label, monthIndex) => {
            const monthStart = new Date(safeYear, monthIndex, 1);
            const monthEnd = new Date(safeYear, monthIndex + 1, 0);
            const leadingBlankCells = monthStart.getDay();
            const dayCount = monthEnd.getDate();
            const slotCount = Math.ceil((leadingBlankCells + dayCount) / 7) * 7;
            const blankStartCells = Array.from({ length: leadingBlankCells }, () => null);
            const activityCells = Array.from({ length: dayCount }, (_, index): HeatmapCell | null => {
                const date = new Date(safeYear, monthIndex, index + 1);
                const bucket = bucketByKey.get(toDateKey(date));

                if (!bucket) return null;

                return {
                    key: bucket.key,
                    date: bucket.date,
                    bucket,
                };
            });
            const trailingBlankCells = Array.from({ length: slotCount - blankStartCells.length - activityCells.length }, () => null);

            return {
                label,
                cells: [...blankStartCells, ...activityCells, ...trailingBlankCells],
                weekCount: slotCount / 7,
            };
        });
    }, [bucketByKey, safeYear]);

    const incomeValues = buckets
        .filter((bucket) => bucket.income >= bucket.expense)
        .map((bucket) => bucket.income);
    const expenseValues = buckets
        .filter((bucket) => bucket.expense > bucket.income)
        .map((bucket) => bucket.expense);
    const plannedValues = buckets
        .filter((bucket) => bucket.plannedExpense > 0)
        .map((bucket) => bucket.plannedExpense);
    const heavyIncomeThreshold = getHeavyThreshold(incomeValues);
    const heavyExpenseThreshold = getHeavyThreshold(expenseValues);
    const heavyPlannedThreshold = getHeavyThreshold(plannedValues);
    const legendGroups = [
        {
            label: 'Income',
            colors: [heatmapColors.income, heatmapColors.heavyIncome],
        },
        {
            label: 'Expense',
            colors: [heatmapColors.expense, heatmapColors.heavyExpense],
        },
        {
            label: 'Planned Payment',
            colors: [heatmapColors.planned, heatmapColors.heavyPlanned],
        },
    ];

    const totalIncome = buckets.reduce((sum, bucket) => sum + bucket.income, 0);
    const totalExpense = buckets.reduce((sum, bucket) => sum + bucket.expense, 0);
    const plannedTotal = buckets.reduce((sum, bucket) => sum + bucket.plannedIncome + bucket.plannedExpense, 0);
    const transactionCount = buckets.reduce((sum, bucket) => sum + bucket.incomeCount + bucket.expenseCount, 0);
    const plannedCount = buckets.reduce((sum, bucket) => sum + bucket.plannedCount, 0);
    const firstActiveBucket = buckets.find((bucket) => {
        return bucket.incomeCount + bucket.expenseCount + bucket.plannedCount > 0;
    }) ?? buckets[0];
    const [hoveredDayKey, setHoveredDayKey] = useState('');
    const activeDayKey = buckets.some((bucket) => bucket.key === hoveredDayKey)
        ? hoveredDayKey
        : buckets.some((bucket) => bucket.key === selectedDateKey)
            ? selectedDateKey
            : firstActiveBucket?.key ?? '';
    const activeBucket = buckets.find((bucket) => bucket.key === activeDayKey) ?? firstActiveBucket;
    const activeTone = activeBucket ? getDayTone(activeBucket, heavyIncomeThreshold, heavyExpenseThreshold, heavyPlannedThreshold) : null;

    return (
        <div className={pieChartCard}>
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-50 sm:text-xl md:text-2xl">
                            Yearly Activity Heatmap
                        </h2>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
                            {rangeLabel || safeYear}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                        <div className="rounded-2xl bg-green-50 px-3 py-2 font-semibold text-green-700 dark:bg-green-950/30 dark:text-green-200">
                            {formatCurrency(totalIncome)}
                        </div>
                        <div className="rounded-2xl bg-red-50 px-3 py-2 font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-200">
                            {formatCurrency(totalExpense)}
                        </div>
                        <div className="rounded-2xl bg-lime-50 px-3 py-2 font-semibold text-lime-800 dark:bg-lime-950/30 dark:text-lime-100">
                            {formatCurrency(plannedTotal)}
                        </div>
                        <div className="rounded-2xl bg-slate-100 px-3 py-2 font-semibold text-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
                            {transactionCount + plannedCount} items
                        </div>
                    </div>
                </div>

                <div className="finora-thin-scrollbar overflow-x-auto pb-2">
                    <div
                        className="min-w-max"
                        style={{
                            ['--heatmap-cell-size' as string]: '12px',
                            ['--heatmap-cell-gap' as string]: '4px',
                        }}
                    >
                        <div className="flex gap-3">
                            <div
                                className="mt-5 grid gap-[var(--heatmap-cell-gap)] text-[10px] font-semibold leading-[var(--heatmap-cell-size)] text-slate-500 dark:text-slate-400"
                                style={{
                                    gridTemplateRows: 'repeat(7, var(--heatmap-cell-size))',
                                }}
                            >
                                {weekDayLabels.map((label, index) => (
                                    <span key={`${label}-${index}`} className="h-[var(--heatmap-cell-size)] w-7 text-right">
                                        {label}
                                    </span>
                                ))}
                            </div>

                            {monthGroups.map((monthGroup) => (
                                <div key={monthGroup.label} className="shrink-0">
                                    <div className="mb-1 h-4 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                        {monthGroup.label}
                                    </div>

                                    <div
                                        className="grid grid-flow-col gap-[var(--heatmap-cell-gap)]"
                                        style={{
                                            gridTemplateColumns: `repeat(${monthGroup.weekCount}, var(--heatmap-cell-size))`,
                                            gridTemplateRows: 'repeat(7, var(--heatmap-cell-size))',
                                        }}
                                    >
                                        {monthGroup.cells.map((cell, index) => {
                                            if (!cell) {
                                                return (
                                                    <span
                                                        key={`empty-${monthGroup.label}-${index}`}
                                                        className="h-[var(--heatmap-cell-size)] w-[var(--heatmap-cell-size)]"
                                                        aria-hidden="true"
                                                    />
                                                );
                                            }

                                            const tone = getDayTone(cell.bucket, heavyIncomeThreshold, heavyExpenseThreshold, heavyPlannedThreshold);
                                            const isActive = activeDayKey === cell.key;
                                            const isSelected = selectedDateKey === cell.key;

                                            return (
                                                <button
                                                    key={cell.key}
                                                    type="button"
                                                    onMouseEnter={() => setHoveredDayKey(cell.key)}
                                                    onFocus={() => setHoveredDayKey(cell.key)}
                                                    onClick={() => onSelectDate?.(cell.key)}
                                                    data-activity-summary={buildTooltipText(cell.bucket)}
                                                    // title={buildTooltipText(cell.bucket)}
                                                    // aria-label={buildTooltipText(cell.bucket)}
                                                    className={`h-[var(--heatmap-cell-size)] w-[var(--heatmap-cell-size)] rounded-[3px] border transition-[transform,box-shadow,border-color] duration-200 hover:scale-125 focus-visible:scale-125 focus-visible:outline-2 focus-visible:outline-sky-500 ${isSelected ? 'shadow-[0_0_0_2px_rgba(2,132,199,0.75)]' : isActive ? 'shadow-[0_0_0_2px_rgba(14,165,233,0.45)]' : ''}`}
                                                    style={{
                                                        backgroundColor: tone.backgroundColor,
                                                        borderColor: isActive ? '#0284c7' : tone.borderColor,
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-row justify-between gap-3 border-t border-slate-200/70 pt-4 dark:border-slate-700/55 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300 w-fit">
                        {legendGroups.map((legendItem) => (
                            <span key={legendItem.label} className="flex items-center gap-1.5">
                                {legendItem.label}
                                <span className="flex items-center gap-1">
                                    {legendItem.colors.map((color) => (
                                        <span
                                            key={color}
                                            className="h-3 w-3 rounded-[3px] border border-black/10 dark:border-white/10"
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </span>
                            </span>
                        ))}
                    </div>

                    {activeBucket && activeTone && (
                        <div
                            className="text-sm flex flex-col gap-1 justify-end items-end bg-slate-100 hover:brightness-95 dark:bg-slate-800 rounded-xl px-3 py-1 cursor-pointer transition duration-200 select-none"
                            onClick={() => {
                                //scroll to bottom
                                window.scrollTo(0, document.body.scrollHeight);
                            }}
                        >
                            <span className="font-semibold text-slate-900 dark:text-slate-50">{activeBucket.label}</span>
                            {activeBucket.incomeCount !== 0 || activeBucket.expenseCount !== 0 || activeBucket.plannedCount !== 0 ?
                                <p className='flex flex-row gap-2 font-semibold'>
                                    <span className="text-green-700 dark:text-green-200">
                                        {activeBucket.incomeCount !== 0 && `${formatCurrency(activeBucket.income)} (${activeBucket.incomeCount})`}
                                    </span>

                                    <span className="text-red-700 dark:text-red-200">
                                        {activeBucket.expenseCount !== 0 && `${formatCurrency(activeBucket.expense)} (${activeBucket.expenseCount})`}
                                    </span>

                                    <span className="text-lime-700 dark:text-lime-200">
                                        {activeBucket.plannedCount !== 0 && `${formatCurrency(activeBucket.plannedIncome + activeBucket.plannedExpense)} (${activeBucket.plannedCount})`}
                                    </span>
                                </p>
                                :
                                <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    <span className={`font-bold ${activeTone.textColor}`}>{activeTone.label}</span>
                                </p>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
