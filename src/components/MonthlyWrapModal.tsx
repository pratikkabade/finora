import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    X,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    PiggyBank,
    Crown,
    CheckCircle2,
    AlertCircle,
    Calendar,
    Sparkles,
} from 'lucide-react';
import type { Category, PlannedPaymentRule, Transaction } from '../types/finance.types';
import { calculateMonthlyWrapData } from '../utils/monthlyWrapUtils';
import { intToHex } from '../utils/colorUtils';
import { formatNumberWithCommas } from '../utils/numberFormatterUtils';

interface MonthlyWrapModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
    categories: Category[];
    budgets: Record<string, number>;
    plannedPaymentRules: PlannedPaymentRule[];
    month?: number;
    year?: number;
}

const TOTAL_SLIDES = 5;

export const MonthlyWrapModal: React.FC<MonthlyWrapModalProps> = ({
    isOpen,
    onClose,
    transactions,
    categories,
    budgets,
    plannedPaymentRules,
    month,
    year,
}) => {
    const now = useMemo(() => new Date(), []);
    const targetMonth = month ?? now.getMonth();
    const targetYear = year ?? now.getFullYear();

    const [currentSlide, setCurrentSlide] = useState(0);

    const wrapData = useMemo(() => {
        return calculateMonthlyWrapData(
            transactions,
            categories,
            budgets,
            plannedPaymentRules,
            targetMonth,
            targetYear,
        );
    }, [transactions, categories, budgets, plannedPaymentRules, targetMonth, targetYear]);

    const handleNextSlide = useCallback(() => {
        if (currentSlide < TOTAL_SLIDES - 1) {
            setCurrentSlide((prev) => prev + 1);
        } else {
            onClose();
        }
    }, [currentSlide, onClose]);

    const handlePrevSlide = useCallback(() => {
        if (currentSlide > 0) {
            setCurrentSlide((prev) => prev - 1);
        }
    }, [currentSlide]);

    // Keyboard support
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'Space') {
                e.preventDefault();
                handleNextSlide();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrevSlide();
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleNextSlide, handlePrevSlide, onClose]);

    if (!isOpen) return null;

    return (
        <div className="monthly-wrap app-modal-backdrop app-modal-backdrop-enter fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/34 p-4 backdrop-blur-xl sm:p-6">
            <div
                className="app-modal-panel app-modal-panel-enter app-border-soft relative flex h-[min(760px,88dvh)] max-h-[92dvh] min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-white/92 text-slate-900 shadow-[0_32px_90px_-38px_rgba(15,23,42,0.58)] backdrop-blur-2xl dark:bg-slate-900/92 dark:text-slate-100"
            >
                <div className="app-divider-border border-b px-5 pt-4 sm:px-8 sm:pt-6">
                    <div className="mb-4 flex gap-2" aria-label={`Monthly Wrap page ${currentSlide + 1} of ${TOTAL_SLIDES}`}>
                    {Array.from({ length: TOTAL_SLIDES }).map((_, index) => {
                        return (
                            <div
                                key={index}
                                className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
                            >
                                <div
                                    className={`h-full rounded-full bg-blue-600 transition-[width] duration-300 ${index <= currentSlide ? 'w-full' : 'w-0'}`}
                                />
                            </div>
                        );
                    })}
                    </div>

                    <div className="flex items-center justify-between gap-4 pb-4 sm:pb-5">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                                <Sparkles size={18} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-sky-300">
                                    Financial insights
                                </p>
                                <p className="mt-0.5 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {wrapData.monthName} {wrapData.year} <span className="font-normal text-slate-500 dark:text-slate-400">· Monthly Wrap</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                                title="Close Monthly Wrap"
                                aria-label="Close Monthly Wrap"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                <div
                    className="relative flex-1 overflow-y-auto bg-slate-50/70 px-4 py-5 dark:bg-slate-950/25 sm:px-8 sm:py-7"
                >
                    {/* Slide 0: The Big Picture */}
                    {currentSlide === 0 && (
                        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col items-center justify-center gap-8 text-center animate-in fade-in zoom-in-95 duration-300">
                            <div className="mt-4">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-medium tracking-wide text-amber-300 backdrop-blur-md">
                                    <Sparkles size={12} />
                                    Chapter 1 • The Overview
                                </span>
                                <h3 className="mt-3 text-2xl font-black text-white sm:text-3xl">
                                    Your Month in Numbers
                                </h3>
                                <p className="mt-1 text-xs text-white/70">
                                    Here's what your money flow looked like in {wrapData.monthName}
                                </p>
                            </div>

                            {/* Net Balance Circle */}
                            <div className="my-auto grid w-full max-w-3xl grid-cols-1 items-center gap-6 sm:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)]">
                                <div className="relative flex h-44 w-44 flex-col items-center justify-center rounded-full border border-white/20 bg-gradient-to-tr from-blue-600/30 to-purple-600/30 shadow-[0_0_60px_rgba(99,102,241,0.25)] backdrop-blur-xl">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
                                        Net Saved
                                    </p>
                                    <p className={`mt-1 text-2xl font-black sm:text-3xl ${wrapData.netSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        ₹{formatNumberWithCommas(Math.abs(wrapData.netSavings))}
                                    </p>
                                    <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-white/80">
                                        {wrapData.savingsRate}% Savings Rate
                                    </span>
                                </div>

                                <div className="mt-6 grid w-full grid-cols-2 gap-3 text-left">
                                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/30 p-3.5 backdrop-blur-md">
                                        <div className="flex items-center gap-1.5 text-xs text-emerald-300">
                                            <TrendingUp size={14} />
                                            <span>Earned</span>
                                        </div>
                                        <p className="mt-1 text-lg font-bold text-emerald-400">
                                            ₹{formatNumberWithCommas(wrapData.totalIncome)}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-rose-500/20 bg-rose-950/30 p-3.5 backdrop-blur-md">
                                        <div className="flex items-center gap-1.5 text-xs text-rose-300">
                                            <TrendingDown size={14} />
                                            <span>Spent</span>
                                        </div>
                                        <p className="mt-1 text-lg font-bold text-rose-400">
                                            ₹{formatNumberWithCommas(wrapData.totalExpense)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Slide 1: Where Money Flowed & Biggest Splurge */}
                    {currentSlide === 1 && (
                        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col items-center justify-center gap-8 text-center animate-in fade-in zoom-in-95 duration-300">
                            <div className="mt-4">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-medium tracking-wide text-sky-300 backdrop-blur-md">
                                    Chapter 2 • Spending Split
                                </span>
                                <h3 className="mt-3 text-2xl font-black text-white sm:text-3xl">
                                    Where Your Money Flowed
                                </h3>
                                <p className="mt-1 text-xs text-white/70">
                                    Your top spending categories this month
                                </p>
                            </div>

                            <div className="my-auto w-full space-y-3.5">
                                {wrapData.topCategories.length > 0 ? (
                                    wrapData.topCategories.map(({ category, total, percentage }) => (
                                        <div
                                            key={category.id}
                                            className="rounded-2xl border border-white/10 bg-white/5 p-3.5 text-left backdrop-blur-md"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="h-3 w-3 rounded-full"
                                                        style={{ backgroundColor: intToHex(category.color) }}
                                                    />
                                                    <span className="text-sm font-bold text-white">
                                                        {category.name}
                                                    </span>
                                                </div>
                                                <span className="text-sm font-bold text-white">
                                                    ₹{formatNumberWithCommas(total)}{' '}
                                                    <span className="text-xs text-white/60">({percentage}%)</span>
                                                </span>
                                            </div>
                                            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700"
                                                    style={{
                                                        width: `${Math.min(100, percentage)}%`,
                                                        backgroundColor: intToHex(category.color),
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
                                        No category expenses logged for this month yet.
                                    </div>
                                )}

                                {/* Biggest Splurge Card */}
                                {wrapData.biggestExpense && (
                                    <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-yellow-950/30 to-amber-950/40 p-3.5 text-left backdrop-blur-md">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                                                <Crown size={14} className="text-amber-400" />
                                                <span>Crown Splurge</span>
                                            </div>
                                            <span className="text-[11px] text-white/60">
                                                {wrapData.biggestExpense.date}
                                            </span>
                                        </div>
                                        <div className="mt-1 flex items-baseline justify-between">
                                            <p className="truncate text-sm font-bold text-white">
                                                {wrapData.biggestExpense.title}
                                            </p>
                                            <p className="text-base font-black text-amber-400">
                                                ₹{formatNumberWithCommas(wrapData.biggestExpense.amount)}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    )}

                    {/* Slide 2: Budget Scorecard */}
                    {currentSlide === 2 && (
                        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col items-center justify-center gap-8 text-center animate-in fade-in zoom-in-95 duration-300">
                            <div className="mt-4">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-medium tracking-wide text-emerald-300 backdrop-blur-md">
                                    Chapter 3 • Discipline
                                </span>
                                <h3 className="mt-3 text-2xl font-black text-white sm:text-3xl">
                                    Budget Scorecard
                                </h3>
                                <p className="mt-1 text-xs text-white/70">
                                    How well you honored your monthly limits
                                </p>
                            </div>

                            <div className="my-auto w-full space-y-4">
                                {wrapData.budgetScorecard.totalBudgets > 0 ? (
                                    <>
                                        <div className="rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur-xl">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                                                    <CheckCircle2 size={28} />
                                                </div>
                                            </div>
                                            <h4 className="mt-3 text-3xl font-black text-white">
                                                {wrapData.budgetScorecard.budgetsKept} / {wrapData.budgetScorecard.totalBudgets}
                                            </h4>
                                            <p className="mt-1 text-xs font-medium text-emerald-300">
                                                Budgets Kept Under Limit
                                            </p>
                                        </div>

                                        {wrapData.budgetScorecard.bestCategory && (
                                            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-left backdrop-blur-md">
                                                <p className="text-xs text-emerald-300">
                                                    🏆 Most Disciplined Category
                                                </p>
                                                <p className="mt-1 text-lg font-bold text-white">
                                                    {wrapData.budgetScorecard.bestCategory.name}
                                                </p>
                                                <p className="text-xs text-emerald-400">
                                                    Saved ₹{formatNumberWithCommas(wrapData.budgetScorecard.bestCategory.savedUnder)} under your budget!
                                                </p>
                                            </div>
                                        )}

                                        {wrapData.budgetScorecard.budgetsExceeded > 0 && (
                                            <div className="flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-950/30 p-3 text-left text-xs text-rose-300">
                                                <AlertCircle size={16} className="shrink-0 text-rose-400" />
                                                <span>
                                                    {wrapData.budgetScorecard.budgetsExceeded} category exceeded limit. Small tweaks next month will fix it!
                                                </span>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="rounded-3xl border border-white/15 bg-white/5 p-6 text-center backdrop-blur-xl">
                                        <PiggyBank size={36} className="mx-auto text-amber-400" />
                                        <h4 className="mt-3 text-lg font-bold text-white">
                                            No Budgets Configured
                                        </h4>
                                        <p className="mt-1 text-xs text-white/60">
                                            Setting monthly category limits helps Finora grade your spending habits.
                                        </p>
                                    </div>
                                )}
                            </div>

                        </div>
                    )}

                    {/* Slide 3: Subscriptions & Recurring Bills */}
                    {currentSlide === 3 && (
                        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col items-center justify-center gap-8 text-center animate-in fade-in zoom-in-95 duration-300">
                            <div className="mt-4">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-medium tracking-wide text-purple-300 backdrop-blur-md">
                                    Chapter 4 • Fixed Costs
                                </span>
                                <h3 className="mt-3 text-2xl font-black text-white sm:text-3xl">
                                    Subscription & Bills
                                </h3>
                                <p className="mt-1 text-xs text-white/70">
                                    Your recurring autopilot commitments
                                </p>
                            </div>

                            <div className="my-auto w-full space-y-4">
                                <div className="rounded-3xl border border-purple-500/20 bg-gradient-to-b from-purple-950/40 to-slate-900/60 p-6 backdrop-blur-xl">
                                    <Calendar size={32} className="mx-auto text-purple-400" />
                                    <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-purple-300">
                                        Monthly Recurring Commitment
                                    </p>
                                    <h4 className="mt-1 text-3xl font-black text-white">
                                        ₹{formatNumberWithCommas(wrapData.recurringSummary.monthlyCommitment)}
                                    </h4>
                                    <p className="mt-1 text-xs text-white/60">
                                        across {wrapData.recurringSummary.activeCount} planned bill{wrapData.recurringSummary.activeCount !== 1 ? 's' : ''}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left backdrop-blur-md">
                                    <p className="text-xs font-semibold text-white/60">
                                        Annualized Fixed Cost
                                    </p>
                                    <p className="mt-1 text-lg font-bold text-amber-300">
                                        ₹{formatNumberWithCommas(wrapData.recurringSummary.annualCommitment)} / year
                                    </p>
                                    <p className="mt-1 text-[11px] text-white/50">
                                        Reviewing your recurring subscriptions once a quarter can unlock surprise savings.
                                    </p>
                                </div>
                            </div>

                        </div>
                    )}

                    {/* Slide 4: Final Financial Vibe & Badge */}
                    {currentSlide === 4 && (
                        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col items-center justify-center gap-8 text-center animate-in fade-in zoom-in-95 duration-300">
                            <div className="mt-4">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-medium tracking-wide text-amber-300 backdrop-blur-md">
                                    Grand Finale • Your Vibe
                                </span>
                                <h3 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                                    Monthly Financial Vibe
                                </h3>
                            </div>

                            {/* Award Badge */}
                            <div className="my-auto flex flex-col items-center">
                                <div className={`flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-tr ${wrapData.vibe.badgeColor} text-4xl shadow-[0_15px_40px_rgba(245,158,11,0.35)]`}>
                                    {wrapData.vibe.emoji}
                                </div>

                                <h4 className="mt-4 text-2xl font-black text-white">
                                    {wrapData.vibe.title}
                                </h4>
                                <p className="mt-0.5 text-xs font-semibold text-amber-300">
                                    {wrapData.vibe.subtitle}
                                </p>
                                <p className="mt-2 max-w-xs text-xs text-white/70 italic">
                                    "{wrapData.vibe.quote}"
                                </p>

                                {/* Micro Stats */}
                                <div className="mt-5 grid w-full grid-cols-2 gap-2 text-left">
                                    <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                                        <p className="text-[10px] text-white/50">Total Movements</p>
                                        <p className="text-sm font-bold text-white">
                                            {wrapData.transactionCount} transactions
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                                        <p className="text-[10px] text-white/50">Avg Expense Size</p>
                                        <p className="text-sm font-bold text-white">
                                            ₹{formatNumberWithCommas(wrapData.avgExpenseAmount)}
                                        </p>
                                    </div>
                                    {wrapData.busiestDay && (
                                        <div className="col-span-2 rounded-xl border border-white/10 bg-white/5 p-2.5">
                                            <p className="text-[10px] text-white/50">Favorite Spending Day</p>
                                            <p className="text-xs font-bold text-white">
                                                {wrapData.busiestDay.dayName}s (₹{formatNumberWithCommas(wrapData.busiestDay.amount)} across {wrapData.busiestDay.count} transactions)
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    )}
                </div>

                {/* Bottom Story Navigation Arrows (Tap or Click) */}
                <div className="app-divider-border flex items-center justify-between border-t px-5 py-3 text-xs text-slate-500 dark:text-slate-400 sm:px-8">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handlePrevSlide();
                        }}
                        disabled={currentSlide === 0}
                        className="flex items-center gap-1 rounded-lg px-3 py-2 font-semibold transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                        <ChevronLeft size={16} />
                        <span>Prev</span>
                    </button>

                    <span className="text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500">
                        {currentSlide + 1} / {TOTAL_SLIDES}
                    </span>

                    {currentSlide < TOTAL_SLIDES - 1 ? (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleNextSlide();
                            }}
                            className="flex items-center gap-1 rounded-lg px-3 py-2 font-semibold text-blue-700 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10"
                        >
                            <span>Next</span>
                            <ChevronRight size={16} />
                        </button>
                    ) : (
                        <span aria-hidden="true" className="w-16" />
                    )}
                </div>
            </div>
        </div>
    );
};
