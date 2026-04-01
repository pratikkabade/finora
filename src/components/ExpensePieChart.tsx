import React, { useEffect, useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { TooltipContentProps } from 'recharts';
import type { Transaction, Category } from '../types/finance.types';
import { hexToRgba, intToHex } from '../utils/colorUtils';
import { pieChartCard } from '../constants/TailwindClasses';
import { formatNumberWithCommas } from '../utils/numberFormatterUtils';

interface ExpensePieChartProps {
    transactions: Transaction[];
    categories: Category[];
    selectedExpenseCategories?: string[];
    selectedIncomeCategory?: string | null;
    onSelectExpenseCategory: (categoryId: string) => void;
    onSelectIncomeCategory: (categoryId: string) => void;
}

interface CategoryBreakdownRow {
    name: string;
    amount: number;
    categoryId: string;
    count: number;
    percentage: string;
    color: string;
    total: number;
}

interface CategoryBreakdownSectionProps {
    rows: CategoryBreakdownRow[];
    title: string;
    selectedCategories: string[];
    onToggleCategory: (categoryId: string) => void;
    allowMultiSelect?: boolean;
    showAll: boolean;
    onToggleShowAll: () => void;
}

const DEFAULT_VISIBLE_CATEGORY_COUNT = 5;

const getCategoryName = (categories: Category[], categoryId: string) => {
    return categories.find((category) => category.id === categoryId)?.name || 'Uncategorized';
};

const getCategoryColor = (categories: Category[], categoryId: string) => {
    const category = categories.find((item) => item.id === categoryId);
    return category ? intToHex(category.color) : '#808080';
};

const buildCategoryData = (
    transactions: Transaction[],
    categories: Category[],
    type: 'EXPENSE' | 'INCOME',
): CategoryBreakdownRow[] => {
    const groupedCategories: Record<string, { name: string; amount: number; categoryId: string; count: number }> = {};

    transactions
        .filter((transaction) => transaction.type === type)
        .forEach((transaction) => {
            const categoryId = transaction.categoryId || '';
            const categoryKey = categoryId || '__uncategorized__';

            if (!groupedCategories[categoryKey]) {
                groupedCategories[categoryKey] = {
                    name: getCategoryName(categories, categoryId),
                    amount: 0,
                    categoryId,
                    count: 0,
                };
            }

            groupedCategories[categoryKey].amount += transaction.amount;
            groupedCategories[categoryKey].count += 1;
        });

    const total = Object.values(groupedCategories).reduce((sum, category) => sum + category.amount, 0);

    return Object.values(groupedCategories)
        .map((category) => ({
            ...category,
            amount: Math.round(category.amount * 100) / 100,
            percentage: total > 0 ? ((category.amount / total) * 100).toFixed(2) : '0.00',
            color: getCategoryColor(categories, category.categoryId),
            total,
        }))
        .sort((categoryA, categoryB) => categoryB.amount - categoryA.amount);
};

const CustomTooltip = ({ active, payload }: Partial<TooltipContentProps<number, string>>) => {
    if (active && payload && payload.length) {
        const [firstItem] = payload;
        const tooltipValue = firstItem?.value;
        const formattedValue = typeof tooltipValue === 'number' ? tooltipValue.toFixed(2) : tooltipValue;

        return (
            <div className="app-border-surface rounded-lg bg-white p-2 dark:bg-slate-800">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-50">{firstItem?.name}</p>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">₹{formattedValue}</p>
            </div>
        );
    }
    return null;
};

const CategoryBreakdownSection: React.FC<CategoryBreakdownSectionProps> = ({
    rows,
    // title,
    selectedCategories,
    onToggleCategory,
    // allowMultiSelect = false,
    showAll,
    onToggleShowAll,
}) => {
    if (rows.length === 0) return null;

    const total = rows[0]?.total ?? 0;
    const hasSelectedCategories = selectedCategories.length > 0;
    const selectedCategoryData = rows.filter((row) => selectedCategories.includes(row.categoryId));
    const selectedTotal = selectedCategoryData.reduce((sum, row) => sum + row.amount, 0);
    const selectedPercentage = total > 0 ? ((selectedTotal / total) * 100).toFixed(2) : '0.00';
    // const totalLabel = hasSelectedCategories
    //     ? `Selected Total${selectedCategoryData.length > 1 ? ` (${selectedCategoryData.length})` : ''}`
    //     : 'Total';
    const canToggleAll = rows.length > DEFAULT_VISIBLE_CATEGORY_COUNT;
    const visibleRows = showAll || !canToggleAll
        ? rows
        : rows.filter((row, index) => {
            return index < DEFAULT_VISIBLE_CATEGORY_COUNT || selectedCategories.includes(row.categoryId);
        });

    return (
        <div className="mt-4 flex flex-col gap-2 pt-4">
            <div className="flex flex-col gap-2">

                <div className="app-stagger-list flex flex-row flex-wrap gap-2">
                    {visibleRows.map((row) => {
                        const isSelected = selectedCategories.includes(row.categoryId);

                        return (
                            <button
                                key={row.categoryId || row.name}
                                type="button"
                                onClick={() => onToggleCategory(row.categoryId)}
                                aria-pressed={isSelected}
                                className={`relative overflow-hidden cursor-pointer gap-4 rounded-2xl border px-3 py-1 text-left transition-[transform,border-color,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] w-fit ${isSelected
                                    ? 'shadow-sm'
                                    : 'border-slate-200/80 hover:border-slate-300/85 hover:shadow-[0_16px_36px_-26px_rgba(15,23,42,0.28)] dark:border-slate-700/65 dark:hover:border-slate-500/70'
                                    }`}
                                style={
                                    isSelected
                                        ? {
                                            borderColor: hexToRgba(row.color, 0.7)
                                        }
                                        : undefined
                                }
                                title={`${row.percentage} %`}
                            >
                                {/* percentage fill layer */}
                                <span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-y-0 left-0 rounded- transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                                    style={{
                                        width: `${row.percentage}%`,
                                        backgroundColor: hexToRgba(row.color, isSelected ? 0.30 : 0.10),
                                    }}
                                />

                                {/* content sits above the fill */}
                                <div className="relative z-10 flex flex-row items-center gap-1 font-medium text-gray-900 dark:text-gray-50">
                                    <div
                                        className={`h-3.5 w-3.5 shrink-0 rounded-full transition-transform ${isSelected ? 'scale-110' : ''}`}
                                        style={{ backgroundColor: row.color }}
                                    />
                                    {row.name}
                                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(x{row.count})</span>
                                </div>
                                <div className="relative z-10 flex flex-row items-center gap-2 text-right text-sm font-semibold text-gray-800 dark:text-gray-200">
                                    ₹{row.amount.toFixed(2)}
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="app-border-soft mt-1 flex flex-row bg-white/55 px-3 py-3 font-bold text-gray-900 dark:bg-slate-900/32 dark:text-gray-50 justify-between items-center rounded-lg">
                    {hasSelectedCategories && selectedPercentage !== '100.00' &&
                        <div className='flex flex-row items-center gap-1' title={`${hasSelectedCategories ? selectedPercentage : '100.00'}% of total ${total.toFixed(2)}`}>
                            <span className="text-right">₹{(hasSelectedCategories ? selectedTotal : total).toFixed(2)}</span>
                            {/* <span className="text-right text-xs font-normal text-gray-500 dark:text-gray-400"></span> */}
                        </div>
                    }
                    <div></div>
                    {canToggleAll && (
                        <button
                            type="button"
                            onClick={onToggleShowAll}
                            className="rounded-full border border-slate-200/80 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800/60 cursor-pointer"
                        >
                            {showAll ? 'Show Less' : `Show All (${rows.length})`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export const ExpensePieChart: React.FC<ExpensePieChartProps> = ({
    transactions,
    categories,
    selectedExpenseCategories = [],
    selectedIncomeCategory = null,
    onSelectExpenseCategory,
    onSelectIncomeCategory,
}) => {
    const [chartHeight, setChartHeight] = useState(250);
    const [showAllExpenseCategories, setShowAllExpenseCategories] = useState(false);
    const [showAllIncomeCategories, setShowAllIncomeCategories] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setChartHeight(300);
            } else {
                setChartHeight(250);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const expensesByCategory = useMemo(() => {
        return buildCategoryData(transactions, categories, 'EXPENSE');
    }, [transactions, categories]);

    const incomeByCategory = useMemo(() => {
        return buildCategoryData(transactions, categories, 'INCOME');
    }, [transactions, categories]);

    const reportTotalExpense = useMemo(() => {
        return expensesByCategory.reduce((sum, category) => sum + category.amount, 0);
    }, [expensesByCategory]);

    const reportTotalIncome = useMemo(() => {
        return incomeByCategory.reduce((sum, category) => sum + category.amount, 0);
    }, [incomeByCategory]);

    const expenseChartData = expensesByCategory.map((category) => ({
        name: category.name,
        value: category.amount,
        color: category.color,
    }));

    const incomeChartData = incomeByCategory.map((category) => ({
        name: category.name,
        value: category.amount,
        color: category.color,
    }));

    const totalCount = expensesByCategory.reduce((sum, row) => sum + row.count, 0);
    const totalIncomeCount = incomeByCategory.reduce((sum, row) => sum + row.count, 0);

    return (
        <div className="app-stagger-grid flex h-full flex-col gap-3 sm:gap-4 md:flex-row md:gap-6">
            {expenseChartData.length > 0 && (
                <div className={pieChartCard}>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50 sm:text-xl md:text-2xl">
                        Expense Breakdown
                        <span className='text-sm text-gray-600 dark:text-gray-400 ml-2'>
                            {totalCount > 0 && `(${totalCount} categories)`}
                        </span>
                    </h2>
                    <p className="text-xl font-bold text-red-600 sm:text-2xl md:text-3xl">₹ {formatNumberWithCommas(reportTotalExpense)}</p>
                    <div className=''>
                        <ResponsiveContainer width="100%" height={chartHeight}>
                            <PieChart>
                                <Pie
                                    data={expenseChartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={70}
                                    innerRadius={38}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {expenseChartData.map((entry, index) => (
                                        <Cell key={`expense-cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <CategoryBreakdownSection
                            rows={expensesByCategory}
                            title="Expenses by Category"
                            selectedCategories={selectedExpenseCategories}
                            onToggleCategory={onSelectExpenseCategory}
                            allowMultiSelect
                            showAll={showAllExpenseCategories}
                            onToggleShowAll={() => setShowAllExpenseCategories((currentValue) => !currentValue)}
                        />
                    </div>
                </div>
            )}

            {incomeChartData.length > 0 && (
                <div className={pieChartCard}>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50 sm:text-xl md:text-2xl">
                        Revenue Sources
                        <span className='text-sm text-gray-600 dark:text-gray-400 ml-2'>
                            {totalIncomeCount > 0 && `(${totalIncomeCount} categories)`}
                        </span>
                    </h2>

                    <p className="text-xl font-bold text-green-600 sm:text-2xl md:text-3xl">₹ {formatNumberWithCommas(reportTotalIncome)}</p>
                    <div className=''>
                        <ResponsiveContainer width="100%" height={chartHeight}>
                            <PieChart>
                                <Pie
                                    data={incomeChartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={70}
                                    innerRadius={38}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {incomeChartData.map((entry, index) => (
                                        <Cell key={`income-cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <CategoryBreakdownSection
                            rows={incomeByCategory}
                            title="Income by Category"
                            selectedCategories={selectedIncomeCategory ? [selectedIncomeCategory] : []}
                            onToggleCategory={onSelectIncomeCategory}
                            showAll={showAllIncomeCategories}
                            onToggleShowAll={() => setShowAllIncomeCategories((currentValue) => !currentValue)}
                        />
                    </div>
                </div>
            )}

            {expenseChartData.length === 0 && incomeChartData.length === 0 && (
                <div className={pieChartCard}>
                    <p className="py-6 text-center text-gray-600 dark:text-gray-400 sm:py-8">No breakdown data available</p>
                </div>
            )}
        </div>
    );
};
