import React from 'react';
import type { Transaction, Category } from '../types/finance.types';
import { ArrowLeft, Check } from 'lucide-react';

interface CategoryBreakdownTableProps {
    transactions: Transaction[];
    categories: Category[];
    type: 'EXPENSE' | 'INCOME';
    title: string;
    getCategoryColor: (categoryId: string) => string;
    selectedCategory?: string | null;
    onSelectCategory: (categoryId: string | null) => void;
    onSetShowPieChart: (show: boolean) => void;
    onFilterChange?: (type: 'account' | 'category' | 'type' | null, id: string | null) => void;
}

export const CategoryBreakdownTable: React.FC<CategoryBreakdownTableProps> = ({
    transactions,
    categories,
    type,
    title,
    getCategoryColor,
    selectedCategory = null,
    onSelectCategory,
    onSetShowPieChart,
    onFilterChange,
}) => {
    const getCategoryName = (categoryId: string) => {
        return categories.find(c => c.id === categoryId)?.name || 'Uncategorized';
    };

    // Calculate amounts by category
    const amountsByCategory = transactions
        .filter(t => t.type === type)
        .reduce((acc, transaction) => {
            const categoryId = transaction.categoryId || '';
            const categoryName = getCategoryName(categoryId);
            if (!acc[categoryName]) {
                acc[categoryName] = { amount: 0, categoryId };
            }
            acc[categoryName].amount += transaction.amount;
            return acc;
        }, {} as Record<string, { amount: number; categoryId: string }>);

    const total = Object.values(amountsByCategory).reduce((sum, val) => sum + val.amount, 0);

    const tableData = Object.entries(amountsByCategory)
        .map(([name, data]) => ({
            name,
            amount: Math.round(data.amount * 100) / 100,
            percentage: total > 0 ? ((data.amount / total) * 100).toFixed(2) : '0.00',
            color: getCategoryColor(data.categoryId),
            categoryId: data.categoryId,
        }))
        .sort((a, b) => b.amount - a.amount);

    if (tableData.length === 0) {
        return null;
    }

    return (
        <div className="glass-card p-3 sm:p-4 md:p-6 w-full">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-50 mb-4">{title}</h3>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/20 dark:border-gray-700/30">
                            <th className="text-left py-3 px-3 sm:px-4 font-semibold text-gray-800 dark:text-gray-200">Category</th>
                            <th className="text-right py-3 px-3 sm:px-4 font-semibold text-gray-800 dark:text-gray-200">Amount</th>
                            <th className="text-right py-3 px-3 sm:px-4 font-semibold text-gray-800 dark:text-gray-200">Percentage</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.map((row, index) => (
                            <tr
                                key={row.name}
                                className={`border-b border-white/10 dark:border-gray-700/20 hover:bg-white/10 dark:hover:bg-gray-800/30 transition-colors ${index % 2 === 0 ? 'bg-white/5 dark:bg-gray-900/10' : 'bg-transparent'
                                    }`}
                            >
                                <td className="py-3 px-3 sm:px-4 text-gray-900 dark:text-gray-50 font-medium flex flex-col items-start gap-2">
                                    <button
                                        onClick={() => {
                                            if (onSelectCategory) {
                                                onSelectCategory(
                                                    selectedCategory === row.categoryId ? null : row.categoryId
                                                );
                                                onFilterChange && onFilterChange('category', selectedCategory === row.categoryId ? null : row.categoryId);
                                            }
                                        }}
                                        className='flex flex-row gap-2 items-center'
                                    >
                                        <div className="w-4 h-4 rounded flex items-center" style={{ backgroundColor: row.color }}>
                                            {selectedCategory === row.categoryId && (
                                                <Check className="text-white" />
                                            )}
                                        </div>
                                        {row.name}
                                    </button>
                                    {selectedCategory !== null && (
                                        <button
                                            onClick={() => {
                                                onSelectCategory(selectedCategory ? null : null);
                                                onSetShowPieChart(false);
                                            }}
                                            className={`px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs transition duration-300 font-medium cursor-pointer hover:shadow-md bottom-3 right-3 sm:flex-none flex items-center justify-center`}
                                        >
                                            <ArrowLeft size={14} className="inline-block" />
                                            Transactions
                                        </button>
                                    )}
                                </td>
                                <td className="py-3 px-3 sm:px-4 text-right text-gray-800 dark:text-gray-200 font-semibold">
                                    ₹{row.amount.toFixed(2)}
                                </td>
                                <td className="py-3 px-3 sm:px-4 text-right text-gray-800 dark:text-gray-200 font-semibold">
                                    {row.percentage}%
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        {selectedCategory === null && <tr className="font-bold text-gray-900 dark:text-gray-50 bg-white/10 dark:bg-gray-800/20">
                            <td className="py-3 px-3 sm:px-4">Total</td>
                            <td className="py-3 px-3 sm:px-4 text-right">₹{total.toFixed(2)}</td>
                            <td className="py-3 px-3 sm:px-4 text-right">100.00%</td>
                        </tr>}
                    </tfoot>
                </table>
            </div>
        </div>
    );
};
