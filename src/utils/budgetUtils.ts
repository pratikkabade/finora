import type { Category, CategoryBudgetStatus, TotalBudgetSummary, Transaction } from '../types/finance.types';

export interface CategoryExpenseInfo {
    total: number;
    count: number;
}

export interface MonthWeekInfo {
    weekIndex: number;
    label: string;
    shortLabel: string;
    startDay: number;
    endDay: number;
    daysCount: number;
    startDate: Date;
    endDate: Date;
    isCurrent: boolean;
}

/**
 * Returns clean week partitions for a month (Days 1-7, 8-14, 15-21, 22-28, 29-End).
 */
export function getWeeksForMonth(year: number, month: number): MonthWeekInfo[] {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const now = new Date();
    const isThisMonth = now.getFullYear() === year && now.getMonth() === month;
    const todayDate = now.getDate();

    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthShort = shortMonths[month] || '';

    const weeks: MonthWeekInfo[] = [];
    const ranges = [
        { start: 1, end: 7 },
        { start: 8, end: 14 },
        { start: 15, end: 21 },
        { start: 22, end: 28 },
        { start: 29, end: daysInMonth },
    ].filter((r) => r.start <= daysInMonth);

    ranges.forEach((r, idx) => {
        const actualEnd = Math.min(r.end, daysInMonth);
        const daysCount = actualEnd - r.start + 1;
        const startDate = new Date(year, month, r.start, 0, 0, 0, 0);
        const endDate = new Date(year, month, actualEnd, 23, 59, 59, 999);
        const isCurrent = isThisMonth && todayDate >= r.start && todayDate <= actualEnd;

        weeks.push({
            weekIndex: idx,
            label: `Week ${idx + 1}: ${monthShort} ${r.start} – ${actualEnd}`,
            shortLabel: `Week ${idx + 1}`,
            startDay: r.start,
            endDay: actualEnd,
            daysCount,
            startDate,
            endDate,
            isCurrent,
        });
    });

    return weeks;
}

/**
 * Aggregates monthly expenses by category ID for a specific month and year.
 */
export function getCategoryMonthlyExpenses(
    transactions: Transaction[],
    month: number,
    year: number,
): Map<string, CategoryExpenseInfo> {
    const expenseMap = new Map<string, CategoryExpenseInfo>();

    for (const transaction of transactions) {
        if (transaction.type !== 'EXPENSE') continue;
        if (!transaction.categoryId) continue;

        const timestamp = transaction.dateTime || transaction.dueDate || 0;
        if (!timestamp) continue;

        const date = new Date(timestamp);
        if (date.getMonth() !== month || date.getFullYear() !== year) continue;

        const existing = expenseMap.get(transaction.categoryId) || { total: 0, count: 0 };
        expenseMap.set(transaction.categoryId, {
            total: existing.total + (transaction.amount || 0),
            count: existing.count + 1,
        });
    }

    return expenseMap;
}

/**
 * Aggregates expenses by category ID for a specific date range (e.g. a specific week).
 */
export function getCategoryDateRangeExpenses(
    transactions: Transaction[],
    startDate: Date,
    endDate: Date,
): Map<string, CategoryExpenseInfo> {
    const expenseMap = new Map<string, CategoryExpenseInfo>();
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    for (const transaction of transactions) {
        if (transaction.type !== 'EXPENSE') continue;
        if (!transaction.categoryId) continue;

        const timestamp = transaction.dateTime || transaction.dueDate || 0;
        if (!timestamp) continue;

        if (timestamp >= startMs && timestamp <= endMs) {
            const existing = expenseMap.get(transaction.categoryId) || { total: 0, count: 0 };
            expenseMap.set(transaction.categoryId, {
                total: existing.total + (transaction.amount || 0),
                count: existing.count + 1,
            });
        }
    }

    return expenseMap;
}

/**
 * Calculates budget summaries and statuses for all budgeted categories for a given month/year.
 */
export function calculateCategoryBudgetSummaries(
    categories: Category[],
    budgets: Record<string, number>,
    transactions: Transaction[],
    month: number,
    year: number,
): {
    items: CategoryBudgetStatus[];
    summary: TotalBudgetSummary;
    expensesByCategory: Map<string, CategoryExpenseInfo>;
} {
    const expensesByCategory = getCategoryMonthlyExpenses(transactions, month, year);
    const categoryMap = new Map(categories.map((cat) => [cat.id, cat]));

    const items: CategoryBudgetStatus[] = [];
    let totalBudget = 0;
    let totalSpent = 0;
    let totalOverspent = 0;
    let overBudgetCount = 0;

    for (const [categoryId, budgetAmount] of Object.entries(budgets)) {
        const category = categoryMap.get(categoryId);
        if (!category || budgetAmount <= 0) continue;

        const expenseInfo = expensesByCategory.get(categoryId) || { total: 0, count: 0 };
        const spent = expenseInfo.total;
        const remaining = Math.max(0, budgetAmount - spent);
        const overspent = Math.max(0, spent - budgetAmount);
        const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
        const isOverBudget = spent > budgetAmount;

        let status: 'good' | 'warning' | 'danger' = 'good';
        if (isOverBudget) {
            status = 'danger';
            overBudgetCount += 1;
            totalOverspent += overspent;
        } else if (percentage >= 80) {
            status = 'warning';
        }

        totalBudget += budgetAmount;
        totalSpent += spent;

        items.push({
            categoryId,
            category,
            budget: budgetAmount,
            spent,
            remaining,
            overspent,
            percentage,
            isOverBudget,
            status,
            transactionCount: expenseInfo.count,
        });
    }

    // Sort items: over-budget items first (descending by overspent), then highest percentage used
    items.sort((a, b) => {
        if (a.isOverBudget && !b.isOverBudget) return -1;
        if (!a.isOverBudget && b.isOverBudget) return 1;
        if (a.isOverBudget && b.isOverBudget) {
            return b.overspent - a.overspent;
        }
        return b.percentage - a.percentage;
    });

    const totalRemaining = Math.max(0, totalBudget - totalSpent);
    const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    const summary: TotalBudgetSummary = {
        totalBudget,
        totalSpent,
        totalRemaining,
        totalOverspent,
        overallPercentage,
        overBudgetCount,
        trackedCategoriesCount: items.length,
    };

    return {
        items,
        summary,
        expensesByCategory,
    };
}

/**
 * Calculates budget summaries and statuses for a specific week of the month.
 * The monthly budget is proportionally divided: (monthlyBudget * daysInWeek) / daysInMonth.
 */
export function calculateWeeklyCategoryBudgetSummaries(
    categories: Category[],
    monthlyBudgets: Record<string, number>,
    transactions: Transaction[],
    week: MonthWeekInfo,
    daysInMonth: number,
): {
    items: CategoryBudgetStatus[];
    summary: TotalBudgetSummary;
    expensesByCategory: Map<string, CategoryExpenseInfo>;
} {
    const expensesByCategory = getCategoryDateRangeExpenses(transactions, week.startDate, week.endDate);
    const categoryMap = new Map(categories.map((cat) => [cat.id, cat]));

    const items: CategoryBudgetStatus[] = [];
    let totalBudget = 0;
    let totalSpent = 0;
    let totalOverspent = 0;
    let overBudgetCount = 0;

    for (const [categoryId, monthlyBudgetAmount] of Object.entries(monthlyBudgets)) {
        const category = categoryMap.get(categoryId);
        if (!category || monthlyBudgetAmount <= 0) continue;

        // Proportionally divide monthly budget for this week
        const weeklyBudget = Math.round((monthlyBudgetAmount * week.daysCount) / daysInMonth);
        if (weeklyBudget <= 0) continue;

        const expenseInfo = expensesByCategory.get(categoryId) || { total: 0, count: 0 };
        const spent = expenseInfo.total;
        const remaining = Math.max(0, weeklyBudget - spent);
        const overspent = Math.max(0, spent - weeklyBudget);
        const percentage = weeklyBudget > 0 ? (spent / weeklyBudget) * 100 : 0;
        const isOverBudget = spent > weeklyBudget;

        let status: 'good' | 'warning' | 'danger' = 'good';
        if (isOverBudget) {
            status = 'danger';
            overBudgetCount += 1;
            totalOverspent += overspent;
        } else if (percentage >= 80) {
            status = 'warning';
        }

        totalBudget += weeklyBudget;
        totalSpent += spent;

        items.push({
            categoryId,
            category,
            budget: weeklyBudget,
            spent,
            remaining,
            overspent,
            percentage,
            isOverBudget,
            status,
            transactionCount: expenseInfo.count,
        });
    }

    items.sort((a, b) => {
        if (a.isOverBudget && !b.isOverBudget) return -1;
        if (!a.isOverBudget && b.isOverBudget) return 1;
        if (a.isOverBudget && b.isOverBudget) {
            return b.overspent - a.overspent;
        }
        return b.percentage - a.percentage;
    });

    const totalRemaining = Math.max(0, totalBudget - totalSpent);
    const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    const summary: TotalBudgetSummary = {
        totalBudget,
        totalSpent,
        totalRemaining,
        totalOverspent,
        overallPercentage,
        overBudgetCount,
        trackedCategoriesCount: items.length,
    };

    return {
        items,
        summary,
        expensesByCategory,
    };
}
