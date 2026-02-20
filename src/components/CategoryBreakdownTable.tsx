import React, { useMemo } from 'react';
import type { Transaction, Category } from '../types/finance.types';
import { Check } from 'lucide-react';
import { pieChartCard } from '../constants/TailwindClasses';

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
    const getCategoryName = (categoryId: string) =>
        categories.find(c => c.id === categoryId)?.name || 'Uncategorized';

    const categoryData = useMemo(() => {
        const acc: Record<string, { amount: number; categoryId: string; count: number }> = {};

        transactions
            .filter(t => t.type === type)
            .forEach(t => {
                const categoryId = t.categoryId || '';
                const name = getCategoryName(categoryId);
                if (!acc[name]) acc[name] = { amount: 0, categoryId, count: 0 };
                acc[name].amount += t.amount;
                acc[name].count += 1;
            });

        const total = Object.values(acc).reduce((sum, v) => sum + v.amount, 0);

        return Object.entries(acc)
            .map(([name, data]) => ({
                name,
                ...data,
                amount: Math.round(data.amount * 100) / 100,
                percentage: total > 0 ? ((data.amount / total) * 100).toFixed(2) : '0.00',
                color: getCategoryColor(data.categoryId),
                total,
            }))
            .sort((a, b) => b.amount - a.amount);
    }, [transactions, categories, type]);

    if (categoryData.length === 0) return null;

    const total = categoryData[0]?.total ?? 0;
    const totalCount = categoryData.reduce((sum, cat) => sum + cat.count, 0);

    const handleCategoryClick = (categoryId: string) => {
        onSelectCategory(categoryId);
        onFilterChange?.('category', categoryId);
        onSetShowPieChart(false);
    };

    return (
        <div className={pieChartCard}>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-50 mb-4">
                {title} ({totalCount})
            </h3>
            <div className="flex flex-col gap-2">
                {/* Header */}
                <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-3 pb-2 border-b border-white/20 dark:border-gray-700/30">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">Category</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200 text-right">Amount</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200 text-right">Percentage</span>
                </div>

                {/* Rows */}
                {categoryData.map((row) => (
                    <div
                        key={row.name}
                        onClick={() => handleCategoryClick(row.categoryId)}
                        className="grid grid-cols-[1fr_auto_auto] gap-4 px-3 py-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-slate-500 dark:hover:border-slate-500 hover:bg-white/10 dark:hover:bg-gray-800/30 active:opacity-70 transition-all cursor-pointer"
                    >
                        <div className="flex flex-row gap-2 items-center text-gray-900 dark:text-gray-50 font-medium">
                            <div className="w-4 h-4 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: row.color }}>
                                {selectedCategory === row.categoryId && <Check size={12} className="text-white" />}
                            </div>
                            {row.name}
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">({row.count})</span>
                        </div>
                        <span className="text-right text-gray-800 dark:text-gray-200 font-semibold min-w-20">₹{row.amount.toFixed(2)}</span>
                        <span className="text-right text-gray-800 dark:text-gray-200 font-semibold min-w-20">{row.percentage}%</span>
                    </div>
                ))}

                {/* Total */}
                {selectedCategory === null && (
                    <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-3 py-3 rounded-xl bg-white/10 dark:bg-gray-800/20 font-bold text-gray-900 dark:text-gray-50 mt-1">
                        <span>Total</span>
                        <span className="text-right">₹{total.toFixed(2)}</span>
                        <span className="text-right">100.00%</span>
                    </div>
                )}
            </div>
        </div>
    );
};