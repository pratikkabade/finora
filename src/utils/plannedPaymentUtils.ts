import type { PlannedPaymentIntervalType, PlannedPaymentRule } from '../types/finance.types';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const UPCOMING_WINDOW_DAYS = 3;

export type PlannedPaymentUrgency = 'due' | 'upcoming' | 'scheduled';
export type PlannedPaymentBadgeTone = 'red' | 'yellow' | null;

export interface PlannedPaymentStatus {
    nextDueDate: number;
    daysUntil: number;
    urgency: PlannedPaymentUrgency;
}

export interface PlannedPaymentAlertSummary {
    count: number;
    dueCount: number;
    upcomingCount: number;
    tone: PlannedPaymentBadgeTone;
}

export const PLANNED_PAYMENT_INTERVAL_OPTIONS: Array<{
    value: PlannedPaymentIntervalType;
    label: string;
}> = [
    { value: 'DAY', label: 'Day' },
    { value: 'WEEK', label: 'Week' },
    { value: 'MONTH', label: 'Month' },
    { value: 'YEAR', label: 'Year' },
];

const toStartOfDay = (value: number | Date) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
};

const addIntervalToDate = (
    date: Date,
    intervalN: number,
    intervalType: PlannedPaymentIntervalType,
) => {
    const safeInterval = Math.max(1, intervalN || 1);
    const nextDate = new Date(date);

    switch (intervalType) {
        case 'DAY':
            nextDate.setDate(nextDate.getDate() + safeInterval);
            break;
        case 'WEEK':
            nextDate.setDate(nextDate.getDate() + safeInterval * 7);
            break;
        case 'MONTH':
            nextDate.setMonth(nextDate.getMonth() + safeInterval);
            break;
        case 'YEAR':
            nextDate.setFullYear(nextDate.getFullYear() + safeInterval);
            break;
        default:
            nextDate.setMonth(nextDate.getMonth() + safeInterval);
            break;
    }

    return nextDate;
};

export const formatPlannedPaymentFrequency = (
    intervalN: number,
    intervalType: PlannedPaymentIntervalType,
) => {
    const option = PLANNED_PAYMENT_INTERVAL_OPTIONS.find((item) => item.value === intervalType);
    const label = option?.label || 'Month';
    const safeInterval = Math.max(1, intervalN || 1);
    const pluralSuffix = safeInterval === 1 ? '' : 's';

    return `Every ${safeInterval} ${label}${pluralSuffix}`;
};

export const getFollowingPlannedPaymentDate = (
    rule: PlannedPaymentRule,
    occurrenceDate: number,
) => {
    const nextDate = addIntervalToDate(new Date(occurrenceDate), rule.intervalN, rule.intervalType);
    return nextDate.getTime();
};

export const getNextPlannedPaymentDate = (
    rule: PlannedPaymentRule,
    referenceDate: Date = new Date(),
) => {
    if (typeof rule.nextDueDate === 'number') {
        return rule.nextDueDate;
    }

    const firstDueDate = new Date(rule.startDate);
    const referenceDay = toStartOfDay(referenceDate);

    if (rule.oneTime || firstDueDate >= referenceDay) {
        return firstDueDate.getTime();
    }

    if (rule.intervalType === 'DAY' || rule.intervalType === 'WEEK') {
        const intervalDays = Math.max(1, rule.intervalN || 1) * (rule.intervalType === 'WEEK' ? 7 : 1);
        const intervalInMs = intervalDays * DAY_IN_MS;
        const elapsedMs = Math.max(0, referenceDay.getTime() - firstDueDate.getTime());
        const jumps = Math.ceil(elapsedMs / intervalInMs);
        return new Date(firstDueDate.getTime() + jumps * intervalDays * DAY_IN_MS).getTime();
    }

    const nextDueDate = new Date(firstDueDate);
    while (nextDueDate < referenceDay) {
        const candidate = addIntervalToDate(nextDueDate, rule.intervalN, rule.intervalType);

        if (candidate.getTime() === nextDueDate.getTime()) {
            break;
        }

        nextDueDate.setTime(candidate.getTime());
    }

    return nextDueDate.getTime();
};

export const advancePlannedPaymentRule = (
    rule: PlannedPaymentRule,
    occurrenceDate?: number,
) => {
    const currentOccurrenceDate = occurrenceDate ?? getNextPlannedPaymentDate(rule);

    if (rule.oneTime) {
        return null;
    }

    return {
        ...rule,
        nextDueDate: getFollowingPlannedPaymentDate(rule, currentOccurrenceDate),
    };
};

export const getPlannedPaymentStatus = (
    rule: PlannedPaymentRule,
    referenceDate: Date = new Date(),
): PlannedPaymentStatus => {
    const today = toStartOfDay(referenceDate);
    const nextDueDate = getNextPlannedPaymentDate(rule, today);
    const nextDueDay = toStartOfDay(nextDueDate);
    const daysUntil = Math.round((nextDueDay.getTime() - today.getTime()) / DAY_IN_MS);

    if (daysUntil <= 0) {
        return {
            nextDueDate,
            daysUntil,
            urgency: 'due',
        };
    }

    if (daysUntil <= UPCOMING_WINDOW_DAYS) {
        return {
            nextDueDate,
            daysUntil,
            urgency: 'upcoming',
        };
    }

    return {
        nextDueDate,
        daysUntil,
        urgency: 'scheduled',
    };
};

export const getPlannedPaymentAlertSummary = (
    rules: PlannedPaymentRule[],
    referenceDate: Date = new Date(),
): PlannedPaymentAlertSummary => {
    const summary = rules.reduce(
        (accumulator, rule) => {
            const status = getPlannedPaymentStatus(rule, referenceDate);

            if (status.urgency === 'due') {
                accumulator.dueCount += 1;
            } else if (status.urgency === 'upcoming') {
                accumulator.upcomingCount += 1;
            }

            return accumulator;
        },
        { dueCount: 0, upcomingCount: 0 },
    );

    const count = summary.dueCount + summary.upcomingCount;

    return {
        count,
        dueCount: summary.dueCount,
        upcomingCount: summary.upcomingCount,
        tone: summary.dueCount > 0 ? 'red' : summary.upcomingCount > 0 ? 'yellow' : null,
    };
};

export const sortPlannedPaymentRules = (
    rules: PlannedPaymentRule[],
    referenceDate: Date = new Date(),
) => {
    return [...rules].sort((ruleA, ruleB) => {
        return getNextPlannedPaymentDate(ruleA, referenceDate) - getNextPlannedPaymentDate(ruleB, referenceDate);
    });
};
