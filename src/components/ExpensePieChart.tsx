import React, { useMemo, useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { Transaction, Category } from '../types/finance.types';
import { CategoryBreakdownTable } from './CategoryBreakdownTable';
import { intToHex } from '../utils/colorUtils';
import { pieChartCard } from '../constants/TailwindClasses';

interface ExpensePieChartProps {
    transactions: Transaction[];
    categories: Category[];
    selectedExpenseCategories?: string[];
    selectedIncomeCategory?: string | null;
    onSelectExpenseCategory: (categoryId: string) => void;
    onSelectIncomeCategory: (categoryId: string) => void;
}

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="app-border-surface rounded-lg bg-white p-2 dark:bg-slate-800">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-50">{payload[0].name}</p>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">₹{payload[0].value.toFixed(2)}</p>
            </div>
        );
    }
    return null;
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

    const getCategoryName = (categoryId: string) => {
        return categories.find(c => c.id === categoryId)?.name || 'Uncategorized';
    };

    const getCategoryColor = (categoryId: string): string => {
        const category = categories.find(c => c.id === categoryId);
        return category ? intToHex(category.color) : '#808080';
    };

    // Calculate expenses by category with categoryId mapping
    const expensesByCategory = useMemo(() => {
        const result: Record<string, { amount: number; categoryId: string }> = {};
        transactions
            .filter(t => t.type === 'EXPENSE')
            .forEach(transaction => {
                const categoryId = transaction.categoryId || '';
                const categoryName = getCategoryName(categoryId);
                if (!result[categoryName]) {
                    result[categoryName] = { amount: 0, categoryId };
                }
                result[categoryName].amount += transaction.amount;
            });
        return result;
    }, [transactions, categories]);

    // Calculate income by category with categoryId mapping
    const incomeByCategory = useMemo(() => {
        const result: Record<string, { amount: number; categoryId: string }> = {};
        transactions
            .filter(t => t.type === 'INCOME')
            .forEach(transaction => {
                const categoryId = transaction.categoryId || '';
                const categoryName = getCategoryName(categoryId);
                if (!result[categoryName]) {
                    result[categoryName] = { amount: 0, categoryId };
                }
                result[categoryName].amount += transaction.amount;
            });
        return result;
    }, [transactions, categories]);

    const expenseChartData = Object.entries(expensesByCategory).map(([name, data]) => ({
        name,
        value: Math.round(data.amount * 100) / 100,
        color: getCategoryColor(data.categoryId),
    }));

    const incomeChartData = Object.entries(incomeByCategory).map(([name, data]) => ({
        name,
        value: Math.round(data.amount * 100) / 100,
        color: getCategoryColor(data.categoryId),
    }));

    const renderLegend = (data: typeof expenseChartData) => {
        if (data.length === 0) return null;

        return (
            <div className="mt-4 grid max-h-28 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {data.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <span
                            className="app-color-chip-border h-3 w-3 shrink-0 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="truncate">{entry.name}</span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="app-stagger-list flex flex-col gap-3 sm:gap-4 md:gap-6">
            <div className="app-stagger-grid flex h-full flex-col gap-3 sm:gap-4 md:flex-row md:gap-6">
                {expenseChartData.length > 0 && (
                    <div className={pieChartCard}>
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-50 mb-3 sm:mb-4 md:mb-6">Expense Breakdown</h2>
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
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        {renderLegend(expenseChartData)}
                    </div>
                )}

                {incomeChartData.length > 0 && (
                    <div className={pieChartCard}>
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-50 mb-3 sm:mb-4 md:mb-6">Income Breakdown</h2>
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
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        {renderLegend(incomeChartData)}
                    </div>
                )}

                {expenseChartData.length === 0 && incomeChartData.length === 0 && (
                    <div className={pieChartCard}>
                        <p className="text-gray-600 dark:text-gray-400 text-center py-6 sm:py-8">No breakdown data available</p>
                    </div>
                )}
            </div>

            <div className="app-stagger-grid flex flex-col gap-3 sm:gap-4 md:flex-row md:gap-6">
                <div className="w-full md:flex-1">
                    <CategoryBreakdownTable
                        transactions={transactions}
                        categories={categories}
                        type="EXPENSE"
                        title="Expenses by Category"
                        getCategoryColor={getCategoryColor}
                        selectedCategories={selectedExpenseCategories}
                        onToggleCategory={onSelectExpenseCategory}
                        allowMultiSelect
                    />
                </div>
                <div className="w-full md:flex-1">
                    <CategoryBreakdownTable
                        transactions={transactions}
                        categories={categories}
                        type="INCOME"
                        title="Income by Category"
                        getCategoryColor={getCategoryColor}
                        selectedCategories={selectedIncomeCategory ? [selectedIncomeCategory] : []}
                        onToggleCategory={onSelectIncomeCategory}
                    />
                </div>
            </div>
        </div>
    );
};
