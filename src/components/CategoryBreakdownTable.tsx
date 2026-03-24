import React, { useMemo } from 'react';
import type { Transaction, Category } from '../types/finance.types';
import { pieChartCard } from '../constants/TailwindClasses';
import { hexToRgba } from '../utils/colorUtils';

interface CategoryBreakdownTableProps {
    transactions: Transaction[];
    categories: Category[];
    type: 'EXPENSE' | 'INCOME';
    title: string;
    getCategoryColor: (categoryId: string) => string;
    selectedCategories?: string[];
    onToggleCategory: (categoryId: string) => void;
    allowMultiSelect?: boolean;
}

export const CategoryBreakdownTable: React.FC<CategoryBreakdownTableProps> = ({
    transactions,
    categories,
    type,
    title,
    getCategoryColor,
    selectedCategories = [],
    onToggleCategory,
    allowMultiSelect = false,
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
    }, [transactions, categories, type, getCategoryColor]);

    if (categoryData.length === 0) return null;

    const total = categoryData[0]?.total ?? 0;
    const totalCount = categoryData.reduce((sum, cat) => sum + cat.count, 0);
    const hasSelectedCategories = selectedCategories.length > 0;
    const selectedCategoryData = categoryData.filter((row) => selectedCategories.includes(row.categoryId));
    const selectedTotal = selectedCategoryData.reduce((sum, row) => sum + row.amount, 0);
    const selectedPercentage = total > 0 ? ((selectedTotal / total) * 100).toFixed(2) : '0.00';
    const totalLabel = hasSelectedCategories
        ? `Selected Total${selectedCategoryData.length > 1 ? ` (${selectedCategoryData.length})` : ''}`
        : 'Total';

    const handleCategoryClick = (categoryId: string) => {
        onToggleCategory(categoryId);
    };

    return (
        <div className={pieChartCard}>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-50 mb-4">
                {title} ({totalCount})
            </h3>
            {allowMultiSelect && (
                <p className="mb-3 text-xs text-gray-600 dark:text-gray-400">
                    Tap more than one category to combine them.
                </p>
            )}
            <div className="flex flex-col gap-2">
                {/* Header */}
                <div className="app-divider-border grid grid-cols-[1fr_auto_auto] gap-4 border-b px-3 pb-2">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">Category</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200 text-right">Amount</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200 text-right">Percentage</span>
                </div>

                {/* Rows */}
                <div className="app-stagger-list flex flex-col gap-2">
                    {categoryData.map((row) => {
                        const isSelected = selectedCategories.includes(row.categoryId);

                        return (
                            <button
                                key={row.name}
                                type="button"
                                onClick={() => handleCategoryClick(row.categoryId)}
                                aria-pressed={isSelected}
                                className={`grid grid-cols-[1fr_auto_auto] gap-4 rounded-2xl border px-3 py-3 text-left transition-[transform,border-color,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer ${
                                    isSelected
                                        ? 'shadow-sm'
                                        : 'border-slate-200/80 bg-white/35 hover:border-slate-300/85 hover:bg-white/55 hover:shadow-[0_16px_36px_-26px_rgba(15,23,42,0.28)] dark:border-slate-700/65 dark:bg-slate-900/15 dark:hover:border-slate-500/70 dark:hover:bg-gray-800/30'
                                }`}
                                style={isSelected
                                    ? {
                                        backgroundColor: hexToRgba(row.color, 0.14),
                                        borderColor: hexToRgba(row.color, 0.7),
                                        boxShadow: `0 0 0 1px ${hexToRgba(row.color, 0.18)}, 0 18px 40px -26px ${hexToRgba(row.color, 0.38)}`,
                                    }
                                    : undefined}
                            >
                                <div className="flex flex-row gap-2 items-center text-gray-900 dark:text-gray-50 font-medium">
                                    <div
                                        className={`app-color-chip-border h-3.5 w-3.5 shrink-0 rounded-full transition-transform ${
                                            isSelected ? 'scale-110' : ''
                                        }`}
                                        style={{ backgroundColor: row.color }}
                                    />
                                    {row.name}
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">({row.count})</span>
                                </div>
                                <span className="text-right text-gray-800 dark:text-gray-200 font-semibold min-w-20">₹{row.amount.toFixed(2)}</span>
                                <span className="text-right text-gray-800 dark:text-gray-200 font-semibold min-w-20">{row.percentage}%</span>
                            </button>
                        );
                    })}
                </div>

                <div className="app-border-soft mt-1 grid grid-cols-[1fr_auto_auto] gap-4 rounded-2xl bg-white/55 px-3 py-3 font-bold text-gray-900 dark:bg-slate-900/32 dark:text-gray-50">
                    <span>{totalLabel}</span>
                    <span className="text-right">₹{(hasSelectedCategories ? selectedTotal : total).toFixed(2)}</span>
                    <span className="text-right">{hasSelectedCategories ? selectedPercentage : '100.00'}%</span>
                </div>
            </div>
        </div>
    );
};
