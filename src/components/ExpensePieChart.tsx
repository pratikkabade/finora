import React, { useMemo, useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { Transaction, Category } from '../types/finance.types';
import { CategoryBreakdownTable } from './CategoryBreakdownTable';

interface ExpensePieChartProps {
    transactions: Transaction[];
    categories: Category[];
    selectedExpenseCategory?: string | null;
    selectedIncomeCategory?: string | null;
    onSelectExpenseCategory: (categoryId: string | null) => void;
    onSelectIncomeCategory: (categoryId: string | null) => void;
    onSetShowPieChart: (show: boolean) => void;
    onFilterChange: (type: 'account' | 'category' | 'type' | null, id: string | null) => void;
}

const intToHex = (num: number): string => {
    const unsigned = num >>> 0; // Convert to unsigned 32-bit integer (ARGB format)
    const hex = (unsigned & 0xFFFFFF).toString(16); // Extract RGB part (last 6 digits)
    return '#' + ('000000' + hex).slice(-6).toUpperCase();
};

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
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
    selectedExpenseCategory = null,
    selectedIncomeCategory = null,
    onSelectExpenseCategory,
    onSelectIncomeCategory,
    onSetShowPieChart,
    onFilterChange,
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

    return (
        <div className="flex flex-col gap-3 sm:gap-4 md:gap-6">
            <div className="flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-6 h-full">
                {expenseChartData.length > 0 && (
                    <div className="glass-card p-3 sm:p-4 md:p-6 w-full md:flex-1">
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-50 mb-3 sm:mb-4 md:mb-6">Expense Breakdown</h2>
                        <ResponsiveContainer width="100%" height={chartHeight}>
                            <PieChart>
                                <Pie
                                    data={expenseChartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={65}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {expenseChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {incomeChartData.length > 0 && (
                    <div className="glass-card p-3 sm:p-4 md:p-6 w-full md:flex-1">
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-50 mb-3 sm:mb-4 md:mb-6">Income Breakdown</h2>
                        <ResponsiveContainer width="100%" height={chartHeight}>
                            <PieChart>
                                <Pie
                                    data={incomeChartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={65}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {incomeChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {expenseChartData.length === 0 && incomeChartData.length === 0 && (
                    <div className="glass-card p-6 w-full">
                        <p className="text-gray-600 dark:text-gray-400 text-center py-6 sm:py-8">No breakdown data available</p>
                    </div>
                )}
            </div>

            <div className="flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-6">
                <div className="w-full md:flex-1">
                    <CategoryBreakdownTable
                        transactions={transactions}
                        categories={categories}
                        type="EXPENSE"
                        title="Expenses by Category"
                        getCategoryColor={getCategoryColor}
                        selectedCategory={selectedExpenseCategory}
                        onSelectCategory={onSelectExpenseCategory}
                        onSetShowPieChart={onSetShowPieChart}
                        onFilterChange={onFilterChange}
                    />
                </div>
                <div className="w-full md:flex-1">
                    <CategoryBreakdownTable
                        transactions={transactions}
                        categories={categories}
                        type="INCOME"
                        title="Income by Category"
                        getCategoryColor={getCategoryColor}
                        selectedCategory={selectedIncomeCategory}
                        onSelectCategory={onSelectIncomeCategory}
                        onSetShowPieChart={onSetShowPieChart}
                        onFilterChange={onFilterChange}
                    />
                </div>
            </div>
        </div>
    );
};
