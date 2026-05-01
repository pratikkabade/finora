import React, { useMemo, useState } from 'react';
import { BellRing, CalendarClock, CheckCircle2, ChevronDown, Clock3, Pencil, Plus, Repeat2, SkipForward } from 'lucide-react';
import type { Account, Category, PlannedPaymentRule } from '../types/finance.types';
import {
    AppChartBtn,
    FreeBlueBtn,
    FreeRedBtn,
    FreeWhiteBtn,
} from '../constants/TailwindClasses';
import { formatNumberWithCommas } from '../utils/numberFormatterUtils';
import {
    formatPlannedPaymentFrequency,
    getPlannedPaymentAlertSummary,
    getPlannedPaymentStatus,
    sortPlannedPaymentRules,
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

const metaChipClassName = 'inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold text-slate-900 dark:text-slate-100';
const incomeActionButtonClassName = 'px-4 py-2 rounded-2xl text-sm font-medium backdrop-blur-lg sm:flex-none flex items-center justify-center gap-2 cursor-pointer select-none transition-[transform,box-shadow,border-color,background-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] bg-linear-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-[0_18px_46px_-26px_rgba(22,163,74,0.58)]';

const getMetaChipStyle = (color: number) => {
    const hexColor = intToHex(color);

    return {
        backgroundColor: hexToRgba(hexColor, 0.18),
        borderColor: hexToRgba(hexColor, 0.6),
    };
};

const SummaryCard: React.FC<{
    label: string;
    value: string;
    helper: string;
    accentClassName: string;
}> = ({ label, value, helper, accentClassName }) => {
    return (
        <div className="app-border-soft rounded-[1.75rem] bg-white/78 p-5 shadow-[0_20px_56px_-34px_rgba(15,23,42,0.34)] backdrop-blur-2xl dark:bg-slate-900/58">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                {label}
            </p>
            <p className={`mt-3 text-3xl font-bold ${accentClassName}`}>
                {value}
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {helper}
            </p>
        </div>
    );
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

    const sortedPlannedPayments = useMemo(() => {
        return sortPlannedPaymentRules(plannedPaymentRules);
    }, [plannedPaymentRules]);

    return (
        <div className="space-y-6 sm:space-y-7">
            <div className="app-section mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                <div className="max-w-2xl">
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

                <button
                    type="button"
                    onClick={onCreate}
                    className={`${FreeBlueBtn} self-start whitespace-nowrap`}
                >
                    <Plus size={18} />
                    Create Planned Transaction
                </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <SummaryCard
                    label="Due Today"
                    value={String(alertSummary.dueCount)}
                    helper={alertSummary.dueCount > 0 ? 'Needs attention right away.' : 'Nothing is due today.'}
                    accentClassName="text-red-600 dark:text-red-400"
                />
                <SummaryCard
                    label="Next 3 Days"
                    value={String(alertSummary.upcomingCount)}
                    helper={alertSummary.upcomingCount > 0 ? 'Upcoming payments to watch.' : 'No near-term upcoming payments.'}
                    accentClassName="text-amber-500 dark:text-amber-300"
                />
                <SummaryCard
                    label="Total Rules"
                    value={String(plannedPaymentRules.length)}
                    helper="All active planned payment schedules."
                    accentClassName="text-sky-600 dark:text-sky-300"
                />
            </div>

            {sortedPlannedPayments.length === 0 ? (
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
                <div className="app-stagger-grid grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {sortedPlannedPayments.map((plannedPaymentRule) => {
                        const account = accounts.find((item) => item.id === plannedPaymentRule.accountId);
                        const category = categories.find((item) => item.id === plannedPaymentRule.categoryId);
                        const status = getPlannedPaymentStatus(plannedPaymentRule);
                        const isIncome = plannedPaymentRule.type === 'INCOME';
                        const isDetailsOpen = expandedPaymentIds.has(plannedPaymentRule.id);
                        const detailsPanelId = `planned-payment-details-${plannedPaymentRule.id}`;

                        return (
                            <article
                                key={plannedPaymentRule.id}
                                className="app-border-soft rounded-[1.9rem] bg-white/80 p-5 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.36)] backdrop-blur-2xl dark:bg-slate-900/58"
                            >
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
                                        className="mt-4 rounded-[1.3rem] border border-slate-200/80 bg-slate-50/85 p-3 dark:border-slate-800/80 dark:bg-slate-950/35"
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

                                <div className="mt-4 flex flex-wrap gap-2">
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
                                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${isIncome ? 'bg-green-100 text-green-700 dark:bg-green-950/45 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-950/45 dark:text-red-300'}`}>
                                        {plannedPaymentRule.type}
                                    </span>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
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
                                    <button
                                        type="button"
                                        onClick={() => togglePaymentDetails(plannedPaymentRule.id)}
                                        className={`${FreeWhiteBtn} whitespace-nowrap`}
                                        aria-expanded={isDetailsOpen}
                                        aria-controls={detailsPanelId}
                                    >
                                        <ChevronDown
                                            size={16}
                                            className={`transition-transform duration-300 ${isDetailsOpen ? 'rotate-180' : ''}`}
                                        />
                                        Details
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
