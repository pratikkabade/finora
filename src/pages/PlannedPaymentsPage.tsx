import React, { useMemo, useState } from 'react';
import { BellRing, CalendarClock, CheckCircle2, Clock3, Pencil, Plus, Repeat2, SkipForward } from 'lucide-react';
import type { Account, Category, PlannedPaymentRule } from '../types/finance.types';
import {
    AppChartBtn,
    FreeBlueBtn,
    FreeRedBtn,
    FreeWhiteBtn,
    transactionCard,
} from '../constants/TailwindClasses';
import { formatNumberWithCommas } from '../utils/numberFormatterUtils';
import {
    formatPlannedPaymentFrequency,
    getPlannedPaymentAlertSummary,
    getPlannedPaymentStatus,
} from '../utils/plannedPaymentUtils';
import { hexToRgba, intToHex } from '../utils/colorUtils';

interface PlannedPaymentsPageProps {
    plannedPaymentRules: PlannedPaymentRule[];
    accounts: Account[];
    categories: Category[];
    onCreate: () => void;
    onEdit: (plannedPaymentRule: PlannedPaymentRule) => void;
    onPay: (plannedPaymentRule: PlannedPaymentRule) => void;
    onSkip: (plannedPaymentRule: PlannedPaymentRule) => void;
}

const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

const getStatusChipClassName = (urgency: ReturnType<typeof getPlannedPaymentStatus>['urgency']) => {
    if (urgency === 'due') {
        return 'border border-red-200/80 bg-red-50/95 text-red-700 dark:border-red-800/80 dark:bg-red-950/45 dark:text-red-300';
    }

    if (urgency === 'upcoming') {
        return 'border border-amber-200/80 bg-amber-50/95 text-amber-700 dark:border-amber-800/80 dark:bg-amber-950/45 dark:text-amber-300';
    }

    return 'border border-slate-200/80 bg-slate-100/90 text-slate-700 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-300';
};

const getStatusLabel = (daysUntil: number, urgency: ReturnType<typeof getPlannedPaymentStatus>['urgency']) => {
    if (urgency === 'due') {
        return daysUntil < 0 ? 'Overdue' : 'Due today';
    }

    if (urgency === 'upcoming') {
        return `Due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`;
    }

    return 'Scheduled later';
};

const getPaymentCardClassName = (urgency: ReturnType<typeof getPlannedPaymentStatus>['urgency']) => {
    if (urgency === 'due') {
        return `${transactionCard} bg-red-50/78 ring-2 ring-red-300/70 dark:border-red-700/85 dark:bg-red-950/30 dark:ring-red-800/70`;
    }

    if (urgency === 'upcoming') {
        return `${transactionCard} bg-amber-50/78 ring-2 ring-amber-300/70 dark:border-amber-700/85 dark:bg-amber-950/28 dark:ring-amber-800/70`;
    }

    return transactionCard;
};

const urgencySortRank: Record<ReturnType<typeof getPlannedPaymentStatus>['urgency'], number> = {
    due: 0,
    upcoming: 1,
    scheduled: 2,
};

const metaChipClassName = 'inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold text-slate-900 dark:text-slate-100';
const incomeActionButtonClassName = 'px-4 py-2 rounded-2xl text-sm font-medium backdrop-blur-lg sm:flex-none flex items-center justify-center gap-2 cursor-pointer select-none transition-[transform,box-shadow,border-color,background-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] bg-linear-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-[0_18px_46px_-26px_rgba(22,163,74,0.58)]';

const getMetaChipStyle = (color: number) => {
    const hexColor = intToHex(color);

    return {
        backgroundColor: hexToRgba(hexColor, 0.18),
        borderColor: hexToRgba(hexColor, 0.6),
    };
};

export const PlannedPaymentsPage: React.FC<PlannedPaymentsPageProps> = ({
    plannedPaymentRules,
    accounts,
    categories,
    onCreate,
    onEdit,
    onPay,
    onSkip,
}) => {
    const [expandedPaymentIds, setExpandedPaymentIds] = useState<Set<string>>(() => new Set());

    const togglePaymentDetails = (plannedPaymentRuleId: string) => {
        setExpandedPaymentIds((currentExpandedPaymentIds) => {
            const nextExpandedPaymentIds = new Set(currentExpandedPaymentIds);

            if (nextExpandedPaymentIds.has(plannedPaymentRuleId)) {
                nextExpandedPaymentIds.delete(plannedPaymentRuleId);
            } else {
                nextExpandedPaymentIds.add(plannedPaymentRuleId);
            }

            return nextExpandedPaymentIds;
        });
    };

    const alertSummary = useMemo(() => {
        return getPlannedPaymentAlertSummary(plannedPaymentRules);
    }, [plannedPaymentRules]);

    const plannedPaymentGroups = useMemo(() => {
        const plannedPaymentsWithStatus = plannedPaymentRules
            .map((plannedPaymentRule) => ({
                plannedPaymentRule,
                status: getPlannedPaymentStatus(plannedPaymentRule),
            }))
            .sort((itemA, itemB) => {
                const urgencyRankDifference = urgencySortRank[itemA.status.urgency] - urgencySortRank[itemB.status.urgency];

                if (urgencyRankDifference !== 0) {
                    return urgencyRankDifference;
                }

                return itemA.status.nextDueDate - itemB.status.nextDueDate;
            });

        return {
            attention: plannedPaymentsWithStatus.filter((item) => item.status.urgency !== 'scheduled'),
            scheduled: plannedPaymentsWithStatus.filter((item) => item.status.urgency === 'scheduled'),
        };
    }, [plannedPaymentRules]);

    const hasPlannedPayments = plannedPaymentGroups.attention.length + plannedPaymentGroups.scheduled.length > 0;

    const renderPlannedPaymentCard = ({
        plannedPaymentRule,
        status,
    }: (typeof plannedPaymentGroups.attention)[number]) => {
        const account = accounts.find((item) => item.id === plannedPaymentRule.accountId);
        const category = categories.find((item) => item.id === plannedPaymentRule.categoryId);
        const isIncome = plannedPaymentRule.type === 'INCOME';
        const isDetailsOpen = expandedPaymentIds.has(plannedPaymentRule.id);
        const detailsPanelId = `planned-payment-details-${plannedPaymentRule.id}`;

        return (
            <article
                key={plannedPaymentRule.id}
                className={getPaymentCardClassName(status.urgency)}
            >
                <div
                    onClick={() => togglePaymentDetails(plannedPaymentRule.id)}
                    className="flex cursor-pointer flex-col gap-4 pl-1 sm:flex-row sm:items-start sm:justify-between"
                >
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-xl font-bold text-slate-900 dark:text-slate-50">
                                {plannedPaymentRule.title || 'Untitled payment'}
                            </h2>
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusChipClassName(status.urgency)}`}>
                                {getStatusLabel(status.daysUntil, status.urgency)}
                            </span>
                        </div>
                        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <CalendarClock size={15} className="text-slate-500 dark:text-slate-400" />
                            <span>Next payment</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-50">
                                {formatDateTime(status.nextDueDate)}
                            </span>
                        </p>
                    </div>

                    <div className={`text-left sm:text-right ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                            Amount
                        </p>
                        <p className="mt-1 text-2xl font-bold">
                            {isIncome ? '+' : '-'}₹{formatNumberWithCommas(plannedPaymentRule.amount)}
                        </p>
                    </div>
                </div>

                {isDetailsOpen ? (
                    <div
                        id={detailsPanelId}
                        className="mt-4 rounded-[1.3rem] border border-slate-200/80 bg-slate-50/85 p-3 dark:border-slate-800/80 dark:bg-slate-950/35 fade-in2"
                    >
                        <div className="flex flex-wrap gap-2.5">
                            <div className="flex w-fit max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-slate-200/80 bg-white/85 px-3 py-2 dark:border-slate-700/80 dark:bg-slate-900/70">
                                <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                    <CalendarClock size={14} />
                                    Starts
                                </span>
                                <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                                    {formatDateTime(plannedPaymentRule.startDate)}
                                </span>
                            </div>

                            <div className="flex w-fit max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-slate-200/80 bg-white/85 px-3 py-2 dark:border-slate-700/80 dark:bg-slate-900/70">
                                <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                    <Repeat2 size={14} />
                                    Frequency
                                </span>
                                <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                                    {formatPlannedPaymentFrequency(plannedPaymentRule.intervalN, plannedPaymentRule.intervalType)}
                                </span>
                            </div>

                            <div className="flex w-fit max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-slate-200/80 bg-white/85 px-3 py-2 dark:border-slate-700/80 dark:bg-slate-900/70">
                                <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                    {status.urgency === 'scheduled' ? <Clock3 size={14} /> : <BellRing size={14} />}
                                    Status
                                </span>
                                <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                                    {getStatusLabel(status.daysUntil, status.urgency)}
                                </span>
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2 pl-1">
                    {account ? (
                        <span className={metaChipClassName} style={getMetaChipStyle(account.color)}>
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: intToHex(account.color) }} />
                            {account.name}
                        </span>
                    ) : null}
                    {category ? (
                        <span className={metaChipClassName} style={getMetaChipStyle(category.color)}>
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: intToHex(category.color) }} />
                            {category.name}
                        </span>
                    ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 pl-1">
                    <button
                        type="button"
                        onClick={() => onPay(plannedPaymentRule)}
                        className={`${isIncome ? incomeActionButtonClassName : FreeRedBtn} whitespace-nowrap`}
                    >
                        <CheckCircle2 size={16} />
                        {isIncome ? 'Get' : 'Pay'}
                    </button>
                    <button
                        type="button"
                        onClick={() => onSkip(plannedPaymentRule)}
                        className={`${FreeWhiteBtn} whitespace-nowrap`}
                    >
                        <SkipForward size={16} />
                        Skip
                    </button>
                    <button
                        type="button"
                        onClick={() => onEdit(plannedPaymentRule)}
                        className={`${FreeWhiteBtn} whitespace-nowrap`}
                    >
                        <Pencil size={16} />
                        Edit
                    </button>
                </div>
            </article>
        );
    };

    return (
        <div className="space-y-6 sm:space-y-7">
            <div className="app-section mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                <div className='flex flex-row justify-between items-center max-lg:flex-col gap-5 max-lg:items-start'>
                    <div className="max-w-lg">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-sky-600/80 dark:text-sky-300/75">
                            Planning
                        </p>
                        <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50 sm:text-4xl">
                            Planned Payments
                        </h1>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
                            Track repeating payments, surface dues for today, and flag anything landing within the next 3 days.
                        </p>
                    </div>
                    <div className="app-border-soft rounded-[1.75rem] bg-white/78 p-5 shadow-[0_20px_56px_-34px_rgba(15,23,42,0.34)] backdrop-blur-2xl dark:bg-slate-900/58 w-64 max-lg:w-full h-fit">
                        <div className='flex flex-row justify-between'>
                            <div>
                                <p className="text-md font-bold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                                    Due Today
                                </p>
                                <p className={`text-3xl font-bold ${alertSummary.dueCount > 0 ?
                                    "text-red-600 dark:text-red-400"
                                    : alertSummary.upcomingCount > 0 ?
                                        "text-amber-600 dark:text-amber-400"
                                        :
                                        "text-sky-600 dark:text-sky-400"}`}>
                                    {alertSummary.dueCount > 0 ?
                                        String(alertSummary.dueCount + " / " + plannedPaymentRules.length)
                                        :
                                        String(alertSummary.upcomingCount + " / " + plannedPaymentRules.length)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={onCreate}
                                className={FreeBlueBtn}
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {!hasPlannedPayments ? (
                <div className={AppChartBtn}>
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                                No planned payments yet
                            </h2>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                Create your first planned transaction to start tracking repeats and upcoming dues.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onCreate}
                            className={`${FreeBlueBtn} whitespace-nowrap`}
                        >
                            <Plus size={18} />
                            Create Planned Transaction
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {plannedPaymentGroups.attention.length > 0 ? (
                        <section className="space-y-3" aria-label="Due and near due planned payments">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-200/70 pb-3 dark:border-red-900/55">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-red-200/80 bg-red-50 text-red-600 dark:border-red-800/70 dark:bg-red-950/45 dark:text-red-300">
                                        <BellRing size={17} />
                                    </span>
                                    <div>
                                        <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-slate-700 dark:text-slate-200">
                                            Needs attention
                                        </h2>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            Overdue and near-due payments are pinned first.
                                        </p>
                                    </div>
                                </div>
                                <span className="rounded-full border border-red-200/80 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:border-red-800/75 dark:bg-red-950/45 dark:text-red-300">
                                    {plannedPaymentGroups.attention.length} highlighted
                                </span>
                            </div>
                            <div className="app-stagger-grid grid grid-cols-1 gap-4 xl:grid-cols-2">
                                {plannedPaymentGroups.attention.map(renderPlannedPaymentCard)}
                            </div>
                        </section>
                    ) : null}

                    {plannedPaymentGroups.scheduled.length > 0 ? (
                        <section className="space-y-3" aria-label="Scheduled planned payments">
                            {plannedPaymentGroups.attention.length > 0 ? (
                                <div className="flex items-center gap-3 pt-1">
                                    <div className="h-px flex-1 bg-slate-200/80 dark:bg-slate-800/80" />
                                    <span className="rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-400">
                                        Later
                                    </span>
                                    <div className="h-px flex-1 bg-slate-200/80 dark:bg-slate-800/80" />
                                </div>
                            ) : null}
                            <div className="app-stagger-grid grid grid-cols-1 gap-4 xl:grid-cols-2">
                                {plannedPaymentGroups.scheduled.map(renderPlannedPaymentCard)}
                            </div>
                        </section>
                    ) : null}
                </div>
            )}
        </div>
    );
};
