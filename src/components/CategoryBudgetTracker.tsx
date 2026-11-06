import React, { useMemo, useState } from 'react';
import {
    SlidersHorizontal,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Pencil,
    Plus,
    Search,
    TrendingUp,
} from 'lucide-react';
import type { Category, Transaction } from '../types/finance.types';
import {
    calculateCategoryBudgetSummaries,
    calculateWeeklyCategoryBudgetSummaries,
    getWeeksForMonth,
} from '../utils/budgetUtils';
import { intToHex } from '../utils/colorUtils';
import { formatNumberWithCommas } from '../utils/numberFormatterUtils';
import { getMonthName } from '../utils/dateUtils';
import { FreeBlueBtn, FreeWhiteBtn } from '../constants/TailwindClasses';

interface CategoryBudgetTrackerProps {
    categories: Category[];
    budgets: Record<string, number>;
    transactions: Transaction[];
    onOpenBudgetModal: (categoryId?: string) => void;
    onFilterByCategory?: (categoryName: string) => void;
}

export const CategoryBudgetTracker: React.FC<CategoryBudgetTrackerProps> = ({
    categories,
    budgets,
    transactions,
    onOpenBudgetModal,
    onFilterByCategory,
}) => {
    // Current date reference
    const now = useMemo(() => new Date(), []);
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Mode: 'month' or 'week'
    const [viewPeriod, setViewPeriod] = useState<'month' | 'week'>('month');

    // Active viewing month & year for budget tracking
    const [selectedDate, setSelectedDate] = useState<{ month: number; year: number }>({
        month: currentMonth,
        year: currentYear,
    });

    // Weeks calculation for active month
    const weeks = useMemo(() => {
        return getWeeksForMonth(selectedDate.year, selectedDate.month);
    }, [selectedDate.year, selectedDate.month]);

    const initialWeekIndex = useMemo(() => {
        const found = weeks.findIndex((w) => w.isCurrent);
        return found >= 0 ? found : 0;
    }, [weeks]);

    const [selectedWeekIndex, setSelectedWeekIndex] = useState(initialWeekIndex);

    // Keep week index in valid bounds
    const activeWeekIndex = Math.min(Math.max(0, selectedWeekIndex), Math.max(0, weeks.length - 1));
    const activeWeek = weeks[activeWeekIndex] || weeks[0];

    const daysInMonth = useMemo(() => {
        return new Date(selectedDate.year, selectedDate.month + 1, 0).getDate();
    }, [selectedDate.year, selectedDate.month]);

    const handlePrevious = () => {
        if (viewPeriod === 'month') {
            setSelectedDate((prev) => {
                if (prev.month === 0) {
                    return { month: 11, year: prev.year - 1 };
                }
                return { month: prev.month - 1, year: prev.year };
            });
        } else {
            // Week mode: step through weeks or go to prev month's last week
            if (activeWeekIndex > 0) {
                setSelectedWeekIndex(activeWeekIndex - 1);
            } else {
                setSelectedDate((prev) => {
                    const newMonth = prev.month === 0 ? 11 : prev.month - 1;
                    const newYear = prev.month === 0 ? prev.year - 1 : prev.year;
                    const prevWeeks = getWeeksForMonth(newYear, newMonth);
                    setSelectedWeekIndex(prevWeeks.length - 1);
                    return { month: newMonth, year: newYear };
                });
            }
        }
    };

    const handleNext = () => {
        if (viewPeriod === 'month') {
            setSelectedDate((prev) => {
                if (prev.month === 11) {
                    return { month: 0, year: prev.year + 1 };
                }
                return { month: prev.month + 1, year: prev.year };
            });
        } else {
            // Week mode: step through weeks or go to next month's first week
            if (activeWeekIndex < weeks.length - 1) {
                setSelectedWeekIndex(activeWeekIndex + 1);
            } else {
                setSelectedDate((prev) => {
                    const newMonth = prev.month === 11 ? 0 : prev.month + 1;
                    const newYear = prev.month === 11 ? prev.year + 1 : prev.year;
                    setSelectedWeekIndex(0);
                    return { month: newMonth, year: newYear };
                });
            }
        }
    };

    const handleResetToCurrent = () => {
        setSelectedDate({
            month: currentMonth,
            year: currentYear,
        });
        const currentWeeks = getWeeksForMonth(currentYear, currentMonth);
        const curIdx = currentWeeks.findIndex((w) => w.isCurrent);
        setSelectedWeekIndex(curIdx >= 0 ? curIdx : 0);
    };

    // Calculate budget summaries based on viewPeriod
    const { items, summary, expensesByCategory } = useMemo(() => {
        if (viewPeriod === 'week' && activeWeek) {
            return calculateWeeklyCategoryBudgetSummaries(
                categories,
                budgets,
                transactions,
                activeWeek,
                daysInMonth,
            );
        }

        return calculateCategoryBudgetSummaries(
            categories,
            budgets,
            transactions,
            selectedDate.month,
            selectedDate.year,
        );
    }, [viewPeriod, activeWeek, categories, budgets, transactions, selectedDate.month, selectedDate.year, daysInMonth]);

    const hasAnyBudgets = Object.keys(budgets).length > 0;
    const monthLabel = `${getMonthName(selectedDate.month)} ${selectedDate.year}`;
    const periodDisplayLabel = viewPeriod === 'month' ? monthLabel : (activeWeek?.label ?? monthLabel);

    // Top spending categories without budget (for empty state suggestions)
    const topUnbudgetedExpenses = useMemo(() => {
        if (hasAnyBudgets) return [];
        const unbudgeted: Array<{ category: Category; total: number }> = [];
        for (const category of categories) {
            const exp = expensesByCategory.get(category.id);
            if (exp && exp.total > 0) {
                unbudgeted.push({ category, total: exp.total });
            }
        }
        return unbudgeted.sort((a, b) => b.total - a.total).slice(0, 3);
    }, [categories, expensesByCategory, hasAnyBudgets]);

    return (
        <section className="app-section mb-6" aria-label="Category Budget Tracker">
            {/* Header */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50 sm:text-xl md:text-2xl">
                            Category Budgets
                        </h2>
                    </div>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
                        {hasAnyBudgets
                            ? `${periodDisplayLabel} • ${summary.trackedCategoriesCount} tracked • ₹${formatNumberWithCommas(summary.totalSpent)} of ₹${formatNumberWithCommas(summary.totalBudget)} spent (${Math.round(summary.overallPercentage)}%)`
                            : 'Set monthly spending limits for specific categories to stay on track'}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Month / Week View Toggle */}
                    <div className="flex items-center rounded-2xl border border-slate-200/80 bg-white/70 p-0.5 shadow-xs backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60">
                        <button
                            type="button"
                            onClick={() => setViewPeriod('month')}
                            className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                                viewPeriod === 'month'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                        >
                            Month
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setViewPeriod('week');
                                const curIdx = weeks.findIndex((w) => w.isCurrent);
                                setSelectedWeekIndex(curIdx >= 0 ? curIdx : 0);
                            }}
                            className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                                viewPeriod === 'week'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                        >
                            Week
                        </button>
                    </div>

                    {/* Stepper Navigator */}
                    <div className="flex items-center rounded-2xl border border-slate-200/80 bg-white/70 p-0.5 shadow-xs backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60">
                        <button
                            type="button"
                            onClick={handlePrevious}
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                            title={viewPeriod === 'month' ? 'Previous month' : 'Previous week'}
                            aria-label={viewPeriod === 'month' ? 'Previous month' : 'Previous week'}
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <button
                            type="button"
                            onClick={handleResetToCurrent}
                            className="px-2.5 text-xs font-semibold text-slate-700 hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-400 truncate max-w-[170px]"
                            title="Click to jump to current period"
                        >
                            {periodDisplayLabel}
                        </button>

                        <button
                            type="button"
                            onClick={handleNext}
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                            title={viewPeriod === 'month' ? 'Next month' : 'Next week'}
                            aria-label={viewPeriod === 'month' ? 'Next month' : 'Next week'}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Manage Budgets Button */}
                    <button
                        type="button"
                        onClick={() => onOpenBudgetModal()}
                        className={`${FreeWhiteBtn} whitespace-nowrap`}
                        title="Manage category budget limits"
                    >
                        <SlidersHorizontal size={15} />
                        <span>Manage Budgets</span>
                    </button>
                </div>
            </div>

            {/* Empty State */}
            {!hasAnyBudgets && (
                <div className="app-border-soft flex flex-col items-center justify-center rounded-[1.75rem] bg-white/75 p-6 text-center shadow-md backdrop-blur-xl dark:bg-slate-900/55 sm:p-8">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">
                        Take control with Category Budgets
                    </h3>
                    <p className="mt-1 max-w-md text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
                        Set monthly spending limits for categories like Food & Drinks, Travel, or Shopping. Finora will track your spending in real-time right here on your home dashboard.
                    </p>

                    {topUnbudgetedExpenses.length > 0 && (
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                This month's top spends:
                            </span>
                            {topUnbudgetedExpenses.map(({ category, total }) => (
                                <button
                                    key={category.id}
                                    type="button"
                                    onClick={() => onOpenBudgetModal(category.id)}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-xs hover:border-blue-300 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200"
                                >
                                    <span
                                        className="h-2 w-2 rounded-full"
                                        style={{ backgroundColor: intToHex(category.color) }}
                                    />
                                    <span>{category.name}: ₹{formatNumberWithCommas(total)}</span>
                                    <Plus size={11} className="text-blue-500" />
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="mt-5">
                        <button
                            type="button"
                            onClick={() => onOpenBudgetModal()}
                            className={FreeBlueBtn}
                        >
                            <Plus size={16} />
                            <span>Set Category Budgets</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Active Budgets View */}
            {hasAnyBudgets && (
                <div className="space-y-4">
                    {/* Overall Progress & Summary Banner */}
                    <div className="app-border-soft rounded-[1.75rem] bg-white/80 p-4 shadow-md backdrop-blur-xl dark:bg-slate-900/60 sm:p-5">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="grid grid-cols-3 gap-2 sm:gap-4 flex-1">
                                <div>
                                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:text-xs">
                                        {viewPeriod === 'week' ? 'Weekly Budget' : 'Total Budget'}
                                    </p>
                                    <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-slate-50 sm:text-xl">
                                        ₹{formatNumberWithCommas(summary.totalBudget)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:text-xs">
                                        {viewPeriod === 'week' ? 'Spent This Week' : 'Total Spent'}
                                    </p>
                                    <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-slate-50 sm:text-xl">
                                        ₹{formatNumberWithCommas(summary.totalSpent)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:text-xs">
                                        {summary.totalOverspent > 0 ? 'Over Budget' : 'Remaining'}
                                    </p>
                                    <p
                                        className={`mt-0.5 text-base font-bold sm:text-xl ${
                                            summary.totalOverspent > 0
                                                ? 'text-red-600 dark:text-red-400'
                                                : 'text-emerald-600 dark:text-emerald-400'
                                        }`}
                                    >
                                        ₹{formatNumberWithCommas(
                                            summary.totalOverspent > 0 ? summary.totalOverspent : summary.totalRemaining,
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Overall Percentage Badge */}
                            <div className="flex items-center gap-2 self-start md:self-center">
                                <span
                                    className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold ${
                                        summary.overallPercentage > 100
                                            ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                                            : summary.overallPercentage >= 80
                                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                    }`}
                                >
                                    {summary.overallPercentage > 100 ? (
                                        <AlertTriangle size={13} />
                                    ) : (
                                        <TrendingUp size={13} />
                                    )}
                                    {Math.round(summary.overallPercentage)}% used
                                </span>
                            </div>
                        </div>

                        {/* Overall Progress Bar */}
                        <div className="mt-3.5">
                            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                                        summary.overallPercentage > 100
                                            ? 'bg-gradient-to-r from-red-500 to-rose-600'
                                            : summary.overallPercentage >= 80
                                            ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                            : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(0, summary.overallPercentage))}%` }}
                                />
                            </div>
                        </div>
                        {viewPeriod === 'week' && activeWeek && (
                            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                                Monthly limits are prorated across this week's {activeWeek.daysCount} days.
                            </p>
                        )}
                    </div>

                    {/* Overbudget Alert Notice if applicable */}
                    {summary.overBudgetCount > 0 && (
                        <div className="flex items-center gap-2 rounded-2xl border border-red-200/80 bg-red-50/80 px-4 py-2.5 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                            <AlertTriangle size={15} className="shrink-0 text-red-600 dark:text-red-400" />
                            <span>
                                <strong>{summary.overBudgetCount}</strong> categor{summary.overBudgetCount !== 1 ? 'ies have' : 'y has'} exceeded {summary.overBudgetCount !== 1 ? 'their' : 'its'} {viewPeriod === 'week' ? 'weekly' : 'monthly'} budget limit.
                            </span>
                        </div>
                    )}

                    {/* Category Cards Grid */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                        {items.map((item) => {
                            const isExceeded = item.isOverBudget;
                            const isWarning = item.status === 'warning';
                            const percentageRound = Math.round(item.percentage);

                            return (
                                <div
                                    key={item.categoryId}
                                    className="app-border-surface group relative flex flex-col justify-between rounded-[1.5rem] bg-white/85 p-4 shadow-sm backdrop-blur-xl transition-[transform,box-shadow,border-color] duration-300 hover:border-slate-300/90 hover:shadow-md dark:bg-slate-900/60 dark:hover:border-slate-700"
                                >
                                    {/* Top Row: Category Badge + Status + Quick Edit */}
                                    <div>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <span
                                                    className="h-3 w-3 shrink-0 rounded-full shadow-xs"
                                                    style={{ backgroundColor: intToHex(item.category.color) }}
                                                />
                                                <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base">
                                                    {item.category.name}
                                                </h3>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold ${
                                                        isExceeded
                                                            ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                                            : isWarning
                                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                    }`}
                                                >
                                                    {isExceeded && <AlertTriangle size={11} />}
                                                    {percentageRound}%
                                                </span>

                                                <button
                                                    type="button"
                                                    onClick={() => onOpenBudgetModal(item.categoryId)}
                                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 opacity-80 transition hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                                    title={`Edit budget for ${item.category.name}`}
                                                    aria-label={`Edit budget for ${item.category.name}`}
                                                >
                                                    <Pencil size={13} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Amount Row */}
                                        <div className="mt-3 flex items-baseline justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-lg font-bold text-slate-900 dark:text-slate-50 sm:text-xl">
                                                        ₹{formatNumberWithCommas(item.spent)}
                                                    </span>
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                                        / ₹{formatNumberWithCommas(item.budget)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <span
                                                    className={`text-xs font-semibold ${
                                                        isExceeded
                                                            ? 'text-red-600 dark:text-red-400'
                                                            : 'text-slate-600 dark:text-slate-400'
                                                    }`}
                                                >
                                                    {isExceeded
                                                        ? `+₹${formatNumberWithCommas(item.overspent)} over`
                                                        : `₹${formatNumberWithCommas(item.remaining)} left`}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="mt-2.5">
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                                                        isExceeded
                                                            ? 'bg-gradient-to-r from-red-500 to-rose-600'
                                                            : isWarning
                                                            ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                                            : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                                                    }`}
                                                    style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer Info & Quick Filter */}
                                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500 dark:border-slate-800/60 dark:text-slate-400">
                                        <span>
                                            {item.transactionCount} transaction{item.transactionCount !== 1 ? 's' : ''}{' '}
                                            {viewPeriod === 'week' ? 'this week' : ''}
                                        </span>

                                        {onFilterByCategory && (
                                            <button
                                                type="button"
                                                onClick={() => onFilterByCategory(item.category.name)}
                                                className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline dark:text-blue-400"
                                                title={`View ${item.category.name} transactions`}
                                            >
                                                <span>View</span>
                                                <Search size={11} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </section>
    );
};
