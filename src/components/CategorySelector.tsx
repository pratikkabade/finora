import React, { useMemo } from 'react';
import type { Transaction, Category } from '../types/finance.types';

interface CategorySelectorProps {
    transactions: Transaction[];
    categories: Category[];
    type: 'EXPENSE' | 'INCOME';
    selectedCategory: string | null;
    onSelectCategory: (categoryId: string | null) => void;
    title: string;
    getCategoryColor: (categoryId: string) => string;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
    transactions,
    categories,
    type,
    selectedCategory,
    onSelectCategory,
    title,
    getCategoryColor,
}) => {
    const getCategoryName = (categoryId: string) => {
        return categories.find(c => c.id === categoryId)?.name || 'Uncategorized';
    };

    // Calculate amounts by category
    const categoryData = useMemo(() => {
        const amountsByCategory: Record<string, { amount: number; categoryId: string; count: number }> = {};

        transactions
            .filter(t => t.type === type)
            .forEach(transaction => {
                const categoryId = transaction.categoryId || '';
                const categoryName = getCategoryName(categoryId);
                if (!amountsByCategory[categoryName]) {
                    amountsByCategory[categoryName] = { amount: 0, categoryId, count: 0 };
                }
                amountsByCategory[categoryName].amount += transaction.amount;
                amountsByCategory[categoryName].count += 1;
            });

        return Object.entries(amountsByCategory)
            .map(([name, data]) => ({
                name,
                ...data,
                color: getCategoryColor(data.categoryId),
            }))
            .sort((a, b) => b.amount - a.amount);
    }, [transactions, categories, type]);

    const total = categoryData.reduce((sum, cat) => sum + cat.amount, 0);

    if (categoryData.length === 0) {
        return null;
    }

    return (
        <div className="glass-card p-3 sm:p-4 md:p-6 w-full">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">{title}</h3>
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => onSelectCategory(null)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${selectedCategory === null
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'glass-button text-gray-900 hover:bg-white'
                        }`}
                >
                    All ({categoryData.reduce((sum, cat) => sum + cat.count, 0)})
                </button>

                {categoryData.map((category) => (
                    <button
                        key={category.categoryId}
                        onClick={() => onSelectCategory(category.categoryId)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${selectedCategory === category.categoryId
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'glass-button text-gray-900 hover:bg-white'
                            }`}
                    >
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                        ></div>
                        <span>{category.name}</span>
                        <span className="text-xs opacity-75">({category.count})</span>
                    </button>
                ))}
            </div>

            {selectedCategory && (
                <div className="mt-4 p-3 bg-white/50 rounded-lg">
                    {categoryData
                        .filter(cat => cat.categoryId === selectedCategory)
                        .map(category => (
                            <div key={category.categoryId} className="text-sm text-gray-700">
                                <p className="font-semibold text-gray-900">
                                    {category.name}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                    Amount: <span className="font-bold">₹{category.amount.toFixed(2)}</span>
                                </p>
                                <p className="text-xs text-gray-600">
                                    Percentage: <span className="font-bold">{total > 0 ? ((category.amount / total) * 100).toFixed(2) : '0.00'}%</span>
                                </p>
                                <p className="text-xs text-gray-600">
                                    Transactions: <span className="font-bold">{category.count}</span>
                                </p>
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
};
