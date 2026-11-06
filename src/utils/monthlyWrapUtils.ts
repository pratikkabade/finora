import type { Category, PlannedPaymentRule, Transaction } from '../types/finance.types';

export interface MonthlyWrapData {
    monthName: string;
    year: number;
    totalIncome: number;
    totalExpense: number;
    netSavings: number;
    savingsRate: number;
    transactionCount: number;
    avgExpenseAmount: number;
    topCategories: Array<{
        category: Category;
        total: number;
        percentage: number;
    }>;
    biggestExpense: {
        title: string;
        amount: number;
        categoryName: string;
        date: string;
    } | null;
    budgetScorecard: {
        totalBudgets: number;
        budgetsKept: number;
        budgetsExceeded: number;
        bestCategory: {
            name: string;
            savedUnder: number;
        } | null;
        totalBudgeted: number;
        totalBudgetSpent: number;
    };
    recurringSummary: {
        monthlyCommitment: number;
        activeCount: number;
        annualCommitment: number;
    };
    vibe: {
        title: string;
        subtitle: string;
        emoji: string;
        quote: string;
        badgeColor: string;
    };
    busiestDay: {
        dayName: string;
        amount: number;
        count: number;
    } | null;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function calculateMonthlyWrapData(
    transactions: Transaction[],
    categories: Category[],
    budgets: Record<string, number>,
    plannedPaymentRules: PlannedPaymentRule[],
    month: number,
    year: number,
): MonthlyWrapData {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const monthName = monthNames[month] || 'Month';

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    // Filter transactions for target month & year
    const monthTransactions = transactions.filter((tx) => {
        const timestamp = tx.dateTime || tx.dueDate || 0;
        if (!timestamp) return false;
        const d = new Date(timestamp);
        return d.getMonth() === month && d.getFullYear() === year;
    });

    let totalIncome = 0;
    let totalExpense = 0;
    let expenseCount = 0;
    const categoryExpenseMap = new Map<string, number>();
    const dayTotals = new Array(7).fill(0);
    const dayCounts = new Array(7).fill(0);

    let maxExpenseTx: Transaction | null = null;

    for (const tx of monthTransactions) {
        const amount = tx.amount || 0;
        const timestamp = tx.dateTime || tx.dueDate || 0;
        const d = new Date(timestamp);
        const dayOfWeek = d.getDay();

        if (tx.type === 'INCOME') {
            totalIncome += amount;
        } else if (tx.type === 'EXPENSE') {
            totalExpense += amount;
            expenseCount += 1;

            dayTotals[dayOfWeek] += amount;
            dayCounts[dayOfWeek] += 1;

            if (tx.categoryId) {
                categoryExpenseMap.set(
                    tx.categoryId,
                    (categoryExpenseMap.get(tx.categoryId) || 0) + amount,
                );
            }

            if (!maxExpenseTx || amount > (maxExpenseTx.amount || 0)) {
                maxExpenseTx = tx;
            }
        }
    }

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;
    const avgExpenseAmount = expenseCount > 0 ? Math.round(totalExpense / expenseCount) : 0;

    // Top categories
    const topCategories = Array.from(categoryExpenseMap.entries())
        .map(([catId, total]) => {
            const cat = categoryMap.get(catId) || {
                id: catId,
                name: 'Other',
                color: -12196229,
                icon: 'tag',
                orderNum: 99,
                isSynced: false,
            };
            const percentage = totalExpense > 0 ? Math.round((total / totalExpense) * 100) : 0;
            return { category: cat, total, percentage };
        })
        .sort((a, b) => b.total - a.total)
        .slice(0, 4);

    // Biggest expense
    let biggestExpense = null;
    if (maxExpenseTx) {
        const cat = maxExpenseTx.categoryId ? categoryMap.get(maxExpenseTx.categoryId) : undefined;
        const d = new Date(maxExpenseTx.dateTime || maxExpenseTx.dueDate || 0);
        biggestExpense = {
            title: maxExpenseTx.title || 'Splurge',
            amount: maxExpenseTx.amount,
            categoryName: cat?.name || 'Expense',
            date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        };
    }

    // Budget Scorecard
    let totalBudgets = 0;
    let budgetsKept = 0;
    let budgetsExceeded = 0;
    let totalBudgeted = 0;
    let totalBudgetSpent = 0;
    let bestSavings = -1;
    let bestCategoryName = '';

    for (const [catId, budgetAmount] of Object.entries(budgets)) {
        if (budgetAmount <= 0) continue;
        totalBudgets += 1;
        totalBudgeted += budgetAmount;

        const spent = categoryExpenseMap.get(catId) || 0;
        totalBudgetSpent += spent;

        if (spent <= budgetAmount) {
            budgetsKept += 1;
            const diff = budgetAmount - spent;
            if (diff > bestSavings) {
                bestSavings = diff;
                bestCategoryName = categoryMap.get(catId)?.name || 'Category';
            }
        } else {
            budgetsExceeded += 1;
        }
    }

    const budgetScorecard = {
        totalBudgets,
        budgetsKept,
        budgetsExceeded,
        bestCategory: bestSavings > 0 ? { name: bestCategoryName, savedUnder: bestSavings } : null,
        totalBudgeted,
        totalBudgetSpent,
    };

    // Recurring Summary (from planned payment rules)
    let monthlyRecurring = 0;
    const activeRules = plannedPaymentRules.filter((rule) => rule.type === 'EXPENSE');
    for (const rule of activeRules) {
        // Approximate monthly equivalent
        if (rule.intervalType === 'MONTH') {
            monthlyRecurring += (rule.amount || 0) / (rule.intervalN || 1);
        } else if (rule.intervalType === 'YEAR') {
            monthlyRecurring += ((rule.amount || 0) / (rule.intervalN || 1)) / 12;
        } else if (rule.intervalType === 'WEEK') {
            monthlyRecurring += (((rule.amount || 0) / (rule.intervalN || 1)) * 52) / 12;
        } else if (rule.intervalType === 'DAY') {
            monthlyRecurring += ((rule.amount || 0) / (rule.intervalN || 1)) * 30;
        }
    }

    const recurringSummary = {
        monthlyCommitment: Math.round(monthlyRecurring),
        activeCount: activeRules.length,
        annualCommitment: Math.round(monthlyRecurring * 12),
    };

    // Busiest Day
    let busiestDayIdx = -1;
    let maxDaySpend = 0;
    for (let i = 0; i < 7; i++) {
        if (dayTotals[i] > maxDaySpend) {
            maxDaySpend = dayTotals[i];
            busiestDayIdx = i;
        }
    }

    const busiestDay = busiestDayIdx >= 0 ? {
        dayName: DAYS_OF_WEEK[busiestDayIdx],
        amount: maxDaySpend,
        count: dayCounts[busiestDayIdx],
    } : null;

    // Financial Vibe
    let vibe = {
        title: 'Balanced Navigator',
        subtitle: 'Steady, measured, and in control',
        emoji: '⚖️',
        quote: 'You kept a steady pulse on your finances and maintained healthy balance throughout the month.',
        badgeColor: 'from-blue-600 via-indigo-500 to-purple-600',
    };

    if (savingsRate >= 35) {
        vibe = {
            title: 'Grandmaster Saver',
            subtitle: `Saved an incredible ${savingsRate}% of income!`,
            emoji: '👑',
            quote: 'You crushed your savings goals this month, setting aside wealth for your future freedom.',
            badgeColor: 'from-emerald-500 via-teal-500 to-green-600',
        };
    } else if (savingsRate >= 15) {
        vibe = {
            title: 'Smart Accumulator',
            subtitle: `Clean ${savingsRate}% savings rate`,
            emoji: '🌱',
            quote: 'Disciplined choices allowed you to comfortably grow your net worth without missing a beat.',
            badgeColor: 'from-sky-500 via-blue-600 to-cyan-500',
        };
    } else if (netSavings < 0) {
        vibe = {
            title: 'Life-Enjoyer & Investor',
            subtitle: 'High energy, high activity month',
            emoji: '🎉',
            quote: 'A month of memorable moments and investments! Time to balance the sails in the next chapter.',
            badgeColor: 'from-amber-500 via-rose-500 to-orange-600',
        };
    }

    return {
        monthName,
        year,
        totalIncome,
        totalExpense,
        netSavings,
        savingsRate,
        transactionCount: monthTransactions.length,
        avgExpenseAmount,
        topCategories,
        biggestExpense,
        budgetScorecard,
        recurringSummary,
        vibe,
        busiestDay,
    };
}
