import React, { useEffect, useMemo, useState } from 'react';
import { X, Trash2, Sparkles } from 'lucide-react';
import type { Category } from '../types/finance.types';
import {
    FreeBlueBtn,
    FreeRedBtn,
    FreeWhiteBtn,
    ModalHeader,
    ModalOut,
    ModalPopUp,
    transactionFieldClasses,
} from '../constants/TailwindClasses';
import { useAnimatedOpen } from '../hooks/useAnimatedOpen';
import { intToHex } from '../utils/colorUtils';
import { formatNumberWithCommas } from '../utils/numberFormatterUtils';
import { sortCategoriesByOrder } from '../utils/categoryUtils';
import type { CategoryExpenseInfo } from '../utils/budgetUtils';

interface CategoryBudgetModalProps {
    isOpen: boolean;
    onClose: () => void;
    categories: Category[];
    budgets: Record<string, number>;
    onSaveBudgets: (nextBudgets: Record<string, number>) => void;
    expensesByCategory?: Map<string, CategoryExpenseInfo>;
    initialSelectedCategoryId?: string | null;
}

export const CategoryBudgetModal: React.FC<CategoryBudgetModalProps> = ({
    isOpen,
    onClose,
    categories,
    budgets,
    onSaveBudgets,
    expensesByCategory,
    initialSelectedCategoryId,
}) => {
    const { shouldRender, isVisible } = useAnimatedOpen(isOpen);
    const [draftBudgets, setDraftBudgets] = useState<Record<string, string>>({});
    const [searchQuery, setSearchQuery] = useState('');

    const formFieldCardClassName = 'app-border-soft p-4';

    // Synchronize draft budgets when opening modal
    useEffect(() => {
        if (isOpen) {
            const initialDraft: Record<string, string> = {};
            for (const category of categories) {
                const currentBudget = budgets[category.id];
                initialDraft[category.id] = currentBudget ? String(currentBudget) : '';
            }
            setDraftBudgets(initialDraft);
            setSearchQuery('');
        }
    }, [isOpen, budgets, categories]);

    const orderedCategories = useMemo(() => {
        return sortCategoriesByOrder(categories);
    }, [categories]);

    const filteredCategories = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return orderedCategories;
        return orderedCategories.filter((cat) => cat.name.toLowerCase().includes(query));
    }, [orderedCategories, searchQuery]);

    const activeBudgetsCount = useMemo(() => {
        return Object.values(draftBudgets).filter((val) => {
            const num = parseFloat(val);
            return Number.isFinite(num) && num > 0;
        }).length;
    }, [draftBudgets]);

    if (!shouldRender) return null;

    const handleBudgetChange = (categoryId: string, value: string) => {
        const cleanValue = value.replace(/[^0-9.]/g, '');
        setDraftBudgets((prev) => ({
            ...prev,
            [categoryId]: cleanValue,
        }));
    };

    const handleClearCategoryBudget = (categoryId: string) => {
        setDraftBudgets((prev) => ({
            ...prev,
            [categoryId]: '',
        }));
    };

    const handleQuickSetFromSpend = (categoryId: string) => {
        const spend = expensesByCategory?.get(categoryId)?.total || 0;
        if (spend > 0) {
            const rounded = Math.ceil(spend / 500) * 500;
            setDraftBudgets((prev) => ({
                ...prev,
                [categoryId]: String(rounded),
            }));
        }
    };

    const handleClearAllBudgets = () => {
        if (window.confirm('Are you sure you want to clear all category budgets?')) {
            const emptyDraft: Record<string, string> = {};
            for (const category of categories) {
                emptyDraft[category.id] = '';
            }
            setDraftBudgets(emptyDraft);
        }
    };

    const handleSave = () => {
        const finalBudgets: Record<string, number> = {};
        for (const [catId, val] of Object.entries(draftBudgets)) {
            const parsed = parseFloat(val);
            if (Number.isFinite(parsed) && parsed > 0) {
                finalBudgets[catId] = Math.round(parsed);
            }
        }
        onSaveBudgets(finalBudgets);
        onClose();
    };

    return (
        <div className={`${ModalOut} ${isVisible ? 'app-modal-backdrop-enter' : 'app-modal-backdrop-exit'}`}>
            <div className={`${ModalPopUp} max-w-sm sm:max-w-xl ${isVisible ? 'app-modal-panel-enter' : 'app-modal-panel-exit'}`}>
                {/* Header */}
                <div className={ModalHeader}>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-50">
                        Manage Category Budgets
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className={FreeWhiteBtn}
                        aria-label="Close budget modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Content matching CreateTransactionModal */}
                <div className="app-panel-stagger max-h-[50vh] overflow-y-auto bg-slate-50 px-3 py-6 dark:bg-slate-800/20">
                    {/* Search Field Card */}
                    <div className="grid grid-cols-1">
                        <div className={formFieldCardClassName}>
                            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-50 mb-2 uppercase tracking-wide">
                                Search Categories
                            </label>
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Filter by category name..."
                                    className={`w-full ${transactionFieldClasses}`}
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Category Budget Field Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2">
                        {filteredCategories.map((category) => {
                            const currentSpent = expensesByCategory?.get(category.id)?.total || 0;
                            const isHighlighted = initialSelectedCategoryId === category.id;
                            const budgetValue = draftBudgets[category.id] ?? '';
                            const hasBudget = Boolean(budgetValue && parseFloat(budgetValue) > 0);

                            return (
                                <div
                                    key={category.id}
                                    className={`${formFieldCardClassName} ${
                                        isHighlighted
                                            ? 'border-blue-400/80 bg-blue-50/50 dark:border-blue-500/60 dark:bg-blue-950/20'
                                            : ''
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <label className="block text-xs font-semibold text-gray-900 dark:text-gray-50 uppercase tracking-wide truncate">
                                            <span className="flex items-center gap-2 min-w-0">
                                                <span
                                                    className="app-color-chip-border h-3 w-3 rounded-full shrink-0"
                                                    style={{ backgroundColor: intToHex(category.color) }}
                                                />
                                                <span className="truncate">{category.name}</span>
                                            </span>
                                        </label>
                                        {currentSpent > 0 && (
                                            <span className="text-[11px] text-gray-500 dark:text-gray-400 shrink-0">
                                                Spent: ₹{formatNumberWithCommas(currentSpent)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                min="0"
                                                step="100"
                                                value={budgetValue}
                                                onChange={(e) => handleBudgetChange(category.id, e.target.value)}
                                                placeholder="0.00"
                                                className={`w-full ${transactionFieldClasses}`}
                                            />
                                        </div>

                                        {currentSpent > 0 && !hasBudget && (
                                            <button
                                                type="button"
                                                onClick={() => handleQuickSetFromSpend(category.id)}
                                                className={FreeWhiteBtn}
                                                title="Suggest budget based on current spend"
                                            >
                                                <Sparkles size={14} />
                                            </button>
                                        )}

                                        {hasBudget && (
                                            <button
                                                type="button"
                                                onClick={() => handleClearCategoryBudget(category.id)}
                                                className={FreeWhiteBtn}
                                                title="Clear budget for this category"
                                                aria-label={`Clear budget for ${category.name}`}
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {filteredCategories.length === 0 && (
                        <div className="app-border-soft p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                            No categories match "{searchQuery}"
                        </div>
                    )}
                </div>

                {/* Actions Footer matching CreateTransactionModal */}
                <div className={ModalHeader}>
                    {activeBudgetsCount > 0 ? (
                        <button
                            type="button"
                            onClick={handleClearAllBudgets}
                            className={FreeRedBtn}
                            title="Clear all category budgets"
                        >
                            <Trash2 size={18} />
                        </button>
                    ) : <div />}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className={FreeWhiteBtn}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className={FreeBlueBtn}
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
