import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { X, Trash2, ChevronDown, Check } from 'lucide-react';
import type {
    Account,
    Category,
    PlannedPaymentIntervalType,
    PlannedPaymentRule,
    Transaction,
    TransactionType,
} from '../types/finance.types';
import { generateUUID, getCurrentOrPastTransactions } from '../utils/dateUtils';
import { normalizePlannedPaymentIntervalType, PLANNED_PAYMENT_INTERVAL_OPTIONS } from '../utils/plannedPaymentUtils';
import { FreeBlueBtn, FreeRedBtn, FreeWhiteBtn, ModalHeader, ModalOut, ModalPopUp, SegmentedToggleItemSelected, SegmentedToggleItemUnselected, SegmentedToggleShell, SegmentedToggleThumb, SegmentedToggleTrack, transactionFieldClasses } from '../constants/TailwindClasses';
import { useAnimatedOpen } from '../hooks/useAnimatedOpen';
import { intToHex } from '../utils/colorUtils';
import { sortCategoriesByOrder } from '../utils/categoryUtils';

interface CreateTransactionModalBaseProps {
    isOpen: boolean;
    onClose: () => void;
    accounts: Account[];
    categories: Category[];
    transactions: Transaction[];
    defaultAccountId?: string;
}

interface CreateTransactionModeProps extends CreateTransactionModalBaseProps {
    mode?: 'transaction';
    onSave: (transaction: Transaction) => void;
    onDelete?: (transactionId: string) => void;
    editingTransaction?: Transaction | null;
    editingPlannedPayment?: never;
}

interface CreatePlannedPaymentModeProps extends CreateTransactionModalBaseProps {
    mode: 'planned-payment';
    onSave: (plannedPaymentRule: PlannedPaymentRule) => void;
    onDelete?: (plannedPaymentRuleId: string) => void;
    editingTransaction?: never;
    editingPlannedPayment?: PlannedPaymentRule | null;
}

type CreateTransactionModalProps = CreateTransactionModeProps | CreatePlannedPaymentModeProps;

type FilterMode = 'income' | 'expense';

interface ColorOption {
    id: string;
    name: string;
    color: number;
}

interface OptionPickerModalProps {
    isOpen: boolean;
    title: string;
    options: ColorOption[];
    selectedId: string;
    onSelect: (optionId: string) => void;
    onClose: () => void;
}

interface TitleSuggestion {
    value: string;
    count: number;
    lastUsedAt: number;
}

type TransactionModalFormData = {
    accountId: string;
    type: TransactionType;
    amount: string;
    title: string;
    categoryId: string;
    dateTime: string;
    intervalN: string;
    intervalType: PlannedPaymentIntervalType;
};

const OptionPickerModal: React.FC<OptionPickerModalProps> = ({
    isOpen,
    title,
    options,
    selectedId,
    onSelect,
    onClose,
}) => {
    const { shouldRender, isVisible } = useAnimatedOpen(isOpen);

    if (!shouldRender) return null;

    return (
        <div
            className={`app-modal-backdrop fixed inset-0 z-60 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm ${isVisible ? 'app-modal-backdrop-enter' : 'app-modal-backdrop-exit'}`}
            onClick={onClose}
        >
            <div
                className={`app-modal-panel app-border-soft w-full max-w-xs overflow-hidden rounded-[1.75rem] bg-white/92 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.55)] dark:bg-slate-900/92 ${isVisible ? 'app-modal-panel-enter' : 'app-modal-panel-exit'}`}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="app-divider-border flex items-center justify-between px-4 py-3">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                    <button type="button" onClick={onClose} className={FreeWhiteBtn}>
                        <X size={16} />
                    </button>
                </div>
                <div className="app-stagger-list max-h-64 overflow-y-auto p-2">
                    {options.length ? (
                        options.map((option) => {
                            const isSelected = selectedId === option.id;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => onSelect(option.id)}
                                    className={`w-full flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left transition-[box-shadow,border-color,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] my-1 ${isSelected
                                        ? 'border border-blue-200/60 bg-blue-50/90 dark:border-blue-700/60 dark:bg-blue-900/30'
                                        : 'app-border-subtle border border-slate-200 bg-white/48 hover:border-slate-300 hover:bg-white/72 hover:shadow-[0_16px_34px_-24px_rgba(15,23,42,0.2)] dark:bg-slate-900/34 dark:border-slate-700 dark:hover:border-slate-500/70 dark:hover:bg-slate-800/46'
                                        }`}
                                >
                                    <span className="flex items-center gap-2 min-w-0">
                                        <span
                                            className="app-color-chip-border h-3 w-3 rounded-full shrink-0"
                                            style={{ backgroundColor: intToHex(option.color) }}
                                        />
                                        <span className="text-sm text-gray-900 dark:text-gray-100 truncate">{option.name}</span>
                                    </span>
                                    {isSelected && <Check size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                                </button>
                            );
                        })
                    ) : (
                        <div className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">No options available.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper function to format local datetime for datetime-local input
const formatLocalDateTime = (date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const normalizeTitle = (title: string): string => title.trim().replace(/\s+/g, ' ');

const getNormalizedTitleKey = (title: string): string => normalizeTitle(title).toLocaleLowerCase();

const getSuggestionMatchPriority = (suggestion: string, query: string): number => {
    if (!query) return 0;

    const normalizedSuggestion = suggestion.toLocaleLowerCase();

    if (normalizedSuggestion.startsWith(query)) return 0;
    if (normalizedSuggestion.split(/\s+/).some((word) => word.startsWith(query))) return 1;
    if (normalizedSuggestion.includes(query)) return 2;

    return Number.POSITIVE_INFINITY;
};

export const CreateTransactionModal: React.FC<CreateTransactionModalProps> = ({
    isOpen,
    onClose,
    onSave,
    onDelete,
    accounts,
    categories,
    transactions,
    editingTransaction,
    editingPlannedPayment,
    defaultAccountId,
    mode = 'transaction',
}) => {
    const initialFormDataRef = useRef<TransactionModalFormData | null>(null);
    const isPlannedPaymentMode = mode === 'planned-payment';
    const titleInputRef = useRef<HTMLInputElement>(null);
    const amountInputRef = useRef<HTMLInputElement>(null);
    const amountInputRefDesktop = useRef<HTMLInputElement>(null);
    const titleSuggestionsListId = `${useId().replace(/:/g, '')}-title-suggestions`;
    const amountSuggestionsListId = `${useId().replace(/:/g, '')}-amount-suggestions`;
    const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);
    const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
    const [selectionMode, setSelectionMode] = useState<FilterMode>('expense');
    const [formData, setFormData] = useState<TransactionModalFormData>({
        accountId: '',
        type: 'EXPENSE' as TransactionType,
        amount: '',
        title: '',
        categoryId: '',
        dateTime: formatLocalDateTime(),
        intervalN: '1',
        intervalType: 'MONTH' as PlannedPaymentIntervalType,
    });

    const resolvedDefaultAccountId = useMemo(() => {
        if (defaultAccountId && accounts.some((account) => account.id === defaultAccountId)) {
            return defaultAccountId;
        }
        return accounts[0]?.id || '';
    }, [accounts, defaultAccountId]);

    useEffect(() => {
        if (!isOpen) return;

        let nextFormData: TransactionModalFormData;

        if (isPlannedPaymentMode && editingPlannedPayment) {
            const dueDate = new Date(editingPlannedPayment.nextDueDate || editingPlannedPayment.startDate);
            nextFormData = {
                accountId: editingPlannedPayment.accountId,
                type: editingPlannedPayment.type,
                amount: editingPlannedPayment.amount.toString(),
                title: editingPlannedPayment.title || '',
                categoryId: editingPlannedPayment.categoryId || '',
                dateTime: formatLocalDateTime(dueDate),
                intervalN: editingPlannedPayment.intervalN.toString(),
                intervalType: normalizePlannedPaymentIntervalType(editingPlannedPayment.intervalType),
            };
        } else if (!isPlannedPaymentMode && editingTransaction) {
            const dateObj = new Date(editingTransaction.dateTime || editingTransaction.dueDate || 0);
            nextFormData = {
                accountId: editingTransaction.accountId,
                type: editingTransaction.type,
                amount: editingTransaction.amount.toString(),
                title: editingTransaction.title || '',
                categoryId: (editingTransaction.categoryId as string) || '',
                dateTime: formatLocalDateTime(dateObj),
                intervalN: '1',
                intervalType: 'MONTH',
            };
        } else {
            nextFormData = {
                accountId: resolvedDefaultAccountId,
                type: 'EXPENSE',
                amount: '',
                title: '',
                categoryId: '',
                dateTime: formatLocalDateTime(),
                intervalN: '1',
                intervalType: 'MONTH',
            };
        }

        setFormData(nextFormData);
        setSelectionMode(nextFormData.type === 'INCOME' ? 'income' : 'expense');
        setIsAccountPickerOpen(false);
        setIsCategoryPickerOpen(false);

        initialFormDataRef.current = nextFormData;

    }, [editingTransaction, editingPlannedPayment, isOpen, isPlannedPaymentMode, resolvedDefaultAccountId]);

    // useEffect(()=>{
    //     setSelectionMode(activeDateRange ? 'range' : 'month');
    // },[])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.accountId || !formData.amount || !formData.title || !formData.categoryId) {
            alert('Please fill in all required fields');
            return;
        }

        if (isPlannedPaymentMode) {
            const safeInterval = Math.max(1, parseInt(formData.intervalN, 10) || 1);
            const nextDueDate = new Date(formData.dateTime).getTime();
            const plannedPaymentRule: PlannedPaymentRule = {
                id: editingPlannedPayment?.id || generateUUID(),
                startDate: nextDueDate,
                nextDueDate,
                intervalN: safeInterval,
                intervalType: normalizePlannedPaymentIntervalType(formData.intervalType),
                oneTime: false,
                type: formData.type,
                accountId: formData.accountId,
                amount: parseFloat(formData.amount),
                categoryId: formData.categoryId,
                title: formData.title.trim(),
            };

            (onSave as (plannedPaymentRule: PlannedPaymentRule) => void)(plannedPaymentRule);
            onClose();
            return;
        }

        const transaction: Transaction = {
            id: editingTransaction?.id || generateUUID(),
            accountId: formData.accountId,
            type: formData.type,
            amount: parseFloat(formData.amount),
            title: formData.title.trim(),
            categoryId: formData.categoryId,
            dateTime: new Date(formData.dateTime).getTime(),
            isSynced: false,
        };

        (onSave as (transaction: Transaction) => void)(transaction);
        onClose();
    };

    const handleDelete = () => {
        if (isPlannedPaymentMode && editingPlannedPayment && onDelete) {
            if (confirm('Are you sure you want to delete this planned payment?')) {
                onDelete(editingPlannedPayment.id);
                onClose();
            }
            return;
        }

        if (!isPlannedPaymentMode && editingTransaction && onDelete) {
            if (confirm('Are you sure you want to delete this transaction?')) {
                onDelete(editingTransaction.id);
                onClose();
            }
        }
    };

    const isFormDirty = () => {
        if (!initialFormDataRef.current) return false;
        return JSON.stringify(initialFormDataRef.current) !== JSON.stringify(formData);
    };

    const handleCloseWithConfirm = () => {
        if (isFormDirty()) {
            const confirmClose = window.confirm(
                "You have unsaved changes.\n\nIf you close this, all entered data will be lost.\n\nDo you want to discard your changes?"
            );
            if (!confirmClose) return;
        }
        onClose();
    };

    const { shouldRender, isVisible } = useAnimatedOpen(isOpen);
    const formId = isPlannedPaymentMode ? 'create-planned-payment-form' : 'create-transaction-form';
    const isEditing = isPlannedPaymentMode ? !!editingPlannedPayment : !!editingTransaction;
    const selectedAccount = accounts.find((account) => account.id === formData.accountId);
    const selectedCategory = categories.find((category) => category.id === formData.categoryId);
    const orderedCategories = useMemo(() => sortCategoriesByOrder(categories), [categories]);
    const accountOptions: ColorOption[] = accounts.map((account) => ({
        id: account.id,
        name: account.name,
        color: account.color,
    }));
    const categoryOptions: ColorOption[] = orderedCategories.map((category) => ({
        id: category.id,
        name: category.name,
        color: category.color,
    }));
    const isAccountButtonDisabled = accounts.length === 0;
    const categoryTitleSuggestions = useMemo<TitleSuggestion[]>(() => {
        if (!formData.categoryId) return [];

        const rankedSuggestions = new Map<string, TitleSuggestion>();

        getCurrentOrPastTransactions(transactions).forEach((transaction) => {
            if (transaction.categoryId !== formData.categoryId || transaction.type !== formData.type) {
                return;
            }

            if (!isPlannedPaymentMode && editingTransaction?.id === transaction.id) {
                return;
            }

            const normalizedValue = normalizeTitle(transaction.title || '');
            if (!normalizedValue) return;

            const normalizedKey = getNormalizedTitleKey(normalizedValue);
            const timestamp = transaction.dateTime || transaction.dueDate || 0;
            const existingSuggestion = rankedSuggestions.get(normalizedKey);

            if (!existingSuggestion) {
                rankedSuggestions.set(normalizedKey, {
                    value: normalizedValue,
                    count: 1,
                    lastUsedAt: timestamp,
                });
                return;
            }

            existingSuggestion.count += 1;
            if (timestamp >= existingSuggestion.lastUsedAt) {
                existingSuggestion.value = normalizedValue;
                existingSuggestion.lastUsedAt = timestamp;
            }
        });

        return [...rankedSuggestions.values()].sort((suggestionA, suggestionB) => {
            if (suggestionB.count !== suggestionA.count) {
                return suggestionB.count - suggestionA.count;
            }

            if (suggestionB.lastUsedAt !== suggestionA.lastUsedAt) {
                return suggestionB.lastUsedAt - suggestionA.lastUsedAt;
            }

            return suggestionA.value.localeCompare(suggestionB.value);
        });
    }, [editingTransaction?.id, formData.categoryId, formData.type, isPlannedPaymentMode, transactions]);
    const normalizedTitleQuery = getNormalizedTitleKey(formData.title);
    const matchedTitleSuggestions = useMemo(() => {
        return [...categoryTitleSuggestions]
            .sort((suggestionA, suggestionB) => {
                const suggestionAMatchPriority = getSuggestionMatchPriority(suggestionA.value, normalizedTitleQuery);
                const suggestionBMatchPriority = getSuggestionMatchPriority(suggestionB.value, normalizedTitleQuery);

                if (suggestionAMatchPriority !== suggestionBMatchPriority) {
                    return suggestionAMatchPriority - suggestionBMatchPriority;
                }

                if (suggestionB.count !== suggestionA.count) {
                    return suggestionB.count - suggestionA.count;
                }

                if (suggestionB.lastUsedAt !== suggestionA.lastUsedAt) {
                    return suggestionB.lastUsedAt - suggestionA.lastUsedAt;
                }

                return suggestionA.value.localeCompare(suggestionB.value);
            })
            .filter((suggestion) => getSuggestionMatchPriority(suggestion.value, normalizedTitleQuery) !== Number.POSITIVE_INFINITY)
            .slice(0, 8);
    }, [categoryTitleSuggestions, normalizedTitleQuery]);
    const titlePreviewSuggestions = matchedTitleSuggestions.slice(0, 4);
    const formFieldCardClassName = 'app-border-soft p-4';
    const amountStepButtonClassName = `app-border-soft flex items-center justify-center rounded-xl bg-white/75 px-3 py-2 text-sm font-semibold text-slate-700 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.38)] transition-[transform,box-shadow,border-color,background-color,color] duration-200 active:scale-[0.98] dark:bg-slate-900/55 dark:text-slate-200 ${transactionFieldClasses}`;

    const formatAmountInputValue = (amount: number) => {
        const roundedAmount = Math.round(amount * 100) / 100;
        if (Number.isInteger(roundedAmount)) {
            return roundedAmount.toString();
        }

        return roundedAmount.toFixed(2).replace(/\.?0+$/, '');
    };

    const handleAdjustAmount = (delta: number) => {
        setFormData((currentFormData) => {
            const parsedAmount = Number.parseFloat(currentFormData.amount);
            const safeAmount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
            const nextAmount = Math.max(0, safeAmount + delta);

            return {
                ...currentFormData,
                amount: formatAmountInputValue(nextAmount),
            };
        });
    };

    if (!shouldRender) return null;

    const amountSuggestions = [50, 100, 250, 500, 1000, 1500, 2000]

    const amountSetter = (h: boolean) => {
        return (
            <>
                {h ?
                    <div className={`${formFieldCardClassName} ${h ? 'max-md:hidden' : 'md:hidden'}`}>
                        <label className="block text-xs font-semibold text-gray-900 dark:text-gray-50 mb-2 uppercase tracking-wide">
                            Amount
                        </label>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => handleAdjustAmount(-50)}
                                className={amountStepButtonClassName}
                            >
                                -50
                            </button>
                            <input
                                ref={amountInputRef}
                                list={amountSuggestionsListId}
                                inputMode="decimal"
                                type="number"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className={`min-w-0 ${transactionFieldClasses}`}
                                placeholder="0.00"
                                onFocus={(e) => e.currentTarget.select()}
                                required
                            />
                            <datalist id={amountSuggestionsListId}>
                                {amountSuggestions.map((suggestion) => (
                                    <option
                                        key={suggestion}
                                        value={suggestion}
                                        label={suggestion.toString()}
                                    />
                                ))}
                            </datalist>
                            <button
                                type="button"
                                onClick={() => handleAdjustAmount(50)}
                                className={amountStepButtonClassName}
                            >
                                +50
                            </button>
                        </div>
                    </div>
                    :
                    <div className={`${formFieldCardClassName} ${h ? 'max-md:hidden' : 'md:hidden'}`}>
                        <label className="block text-xs font-semibold text-gray-900 dark:text-gray-50 mb-2 uppercase tracking-wide">
                            Amount
                        </label>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => handleAdjustAmount(-50)}
                                className={amountStepButtonClassName}
                            >
                                -50
                            </button>
                            <input
                                ref={amountInputRefDesktop}
                                list={amountSuggestionsListId}
                                inputMode="decimal"
                                type="number"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className={`min-w-0 ${transactionFieldClasses}`}
                                placeholder="0.00"
                                onFocus={(e) => e.currentTarget.select()}
                                required
                            />
                            <datalist id={amountSuggestionsListId}>
                                {amountSuggestions.map((suggestion) => (
                                    <option
                                        key={suggestion}
                                        value={suggestion}
                                        label={suggestion.toString()}
                                    />
                                ))}
                            </datalist>
                            <button
                                type="button"
                                onClick={() => handleAdjustAmount(50)}
                                className={amountStepButtonClassName}
                            >
                                +50
                            </button>
                        </div>
                    </div>
                }
            </>
        )
    }

    return (
        <div className={`${ModalOut} ${isVisible ? 'app-modal-backdrop-enter' : 'app-modal-backdrop-exit'}`}>
            <div className={`${ModalPopUp} max-w-sm sm:max-w-xl ${isVisible ? 'app-modal-panel-enter' : 'app-modal-panel-exit'}`}>
                {/* Header */}
                <div className={ModalHeader}>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-50">
                        {isPlannedPaymentMode
                            ? isEditing
                                ? 'Edit Planned Payment'
                                : 'New Planned Payment'
                            : isEditing
                                ? 'Edit Transaction'
                                : 'New Transaction'}
                    </h2>
                    <button
                        onClick={handleCloseWithConfirm}
                        className={FreeWhiteBtn}
                    >
                        <X size={20} />
                    </button>
                </div>


                <div className="p-2 bg-white dark:bg-slate-900">
                    <div className={SegmentedToggleShell}>
                        <div className={SegmentedToggleTrack}>
                            <div
                                className={`${SegmentedToggleThumb} ${selectionMode === 'expense' ? 'translate-x-full' : 'translate-x-0'}`}
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectionMode('income');
                                    setFormData({ ...formData, type: "INCOME" as TransactionType })
                                }}
                                className={selectionMode === 'income' ? SegmentedToggleItemSelected : SegmentedToggleItemUnselected}
                            >
                                Income
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectionMode('expense');
                                    setFormData({ ...formData, type: "EXPENSE" as TransactionType })
                                }}
                                className={selectionMode === 'expense' ? SegmentedToggleItemSelected : SegmentedToggleItemUnselected}
                            >
                                Expense
                            </button>
                        </div>
                    </div>
                </div>


                {/* Form */}
                <form
                    id={formId}
                    onSubmit={handleSubmit}
                    className="app-panel-stagger max-h-[50vh] overflow-y-auto bg-slate-50 px-3 py-6 dark:bg-slate-800/20"
                >
                    {/* Row 1: Category & (Amount)*/}
                    <div className="grid grid-cols-1 md:grid-cols-2">
                        <div className={formFieldCardClassName}>
                            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-50 mb-2 uppercase tracking-wide">
                                Category
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsCategoryPickerOpen(true)}
                                disabled={categories.length === 0}
                                className={`w-full disabled:cursor-not-allowed disabled:opacity-70 ${transactionFieldClasses}`}
                            >
                                <span className="flex items-center gap-2 min-w-0">
                                    {selectedCategory ? (
                                        <span
                                            className="app-color-chip-border h-3 w-3 rounded-full shrink-0"
                                            style={{ backgroundColor: intToHex(selectedCategory.color) }}
                                        />
                                    ) : null}
                                    <span className={`truncate ${selectedCategory ? '' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {selectedCategory?.name || (categories.length ? 'Select category' : 'No categories available')}
                                    </span>
                                </span>
                                <ChevronDown size={16} className="text-gray-500 dark:text-gray-400 shrink-0" />
                            </button>
                        </div>

                        {amountSetter(true)}
                    </div>

                    {/* Row 2: Title & (Amount)*/}
                    <div className="grid grid-cols-1 md:grid-cols-1">
                        <div className={formFieldCardClassName}>
                            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-50 mb-2 uppercase tracking-wide">
                                Title
                            </label>
                            <input
                                ref={titleInputRef}
                                type="text"
                                list={selectedCategory ? titleSuggestionsListId : undefined}
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className={`w-full ${transactionFieldClasses}`}
                                placeholder="Description"
                                autoComplete="off"
                                onKeyDown={(event) => {
                                    if (event.key !== 'Enter') {
                                        return;
                                    }

                                    event.preventDefault();

                                    const el =
                                        amountInputRef.current && amountInputRef.current.offsetWidth > 0
                                            ? amountInputRef.current
                                            : amountInputRefDesktop.current;

                                    if (el) {
                                        el.focus();
                                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }
                                }}
                                required
                            />
                            {/* <datalist id={titleSuggestionsListId}>
                                {matchedTitleSuggestions.map((suggestion) => (
                                    <option
                                        key={suggestion.value}
                                        value={suggestion.value}
                                        label={`Used ${suggestion.count} time${suggestion.count === 1 ? '' : 's'}`}
                                    />
                                ))}
                            </datalist> */}
                            {titlePreviewSuggestions.length > 0 ? (
                                <div className="mt-3 flex gap-2 w-full overflow-x-auto scrollbar-none -mx-4 px-4">
                                    {titlePreviewSuggestions.map((suggestion) => {
                                        const isActiveSuggestion = getNormalizedTitleKey(formData.title) === getNormalizedTitleKey(suggestion.value);

                                        return (
                                            <button
                                                key={suggestion.value}
                                                type="button"
                                                onMouseDown={(e) => {
                                                    e.preventDefault(); // prevents blur on iOS

                                                    setFormData({ ...formData, title: suggestion.value });

                                                    const el =
                                                        amountInputRef.current && amountInputRef.current.offsetParent !== null
                                                            ? amountInputRef.current
                                                            : amountInputRefDesktop.current;

                                                    if (el) {
                                                        el.focus();
                                                        el.click();
                                                        el.scrollIntoView({
                                                            behavior: 'smooth',
                                                            block: 'center',
                                                        });
                                                    }
                                                }}
                                                onTouchStart={(e) => {
                                                    e.preventDefault(); // critical for iOS

                                                    setFormData({ ...formData, title: suggestion.value });

                                                    const el =
                                                        amountInputRef.current && amountInputRef.current.offsetParent !== null
                                                            ? amountInputRef.current
                                                            : amountInputRefDesktop.current;

                                                    if (el) {
                                                        el.focus();
                                                        el.click();
                                                        el.scrollIntoView({
                                                            behavior: 'smooth',
                                                            block: 'center',
                                                        });
                                                    }
                                                }}
                                                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-[border-color,background-color,transform,box-shadow] duration-200 whitespace-nowrap shrink-0 ${isActiveSuggestion
                                                    ? 'border-sky-300 bg-sky-100/90 text-sky-900 shadow-[0_10px_24px_-18px_rgba(14,116,144,0.55)] dark:border-sky-400/50 dark:bg-sky-500/18 dark:text-sky-100'
                                                    : 'border-slate-200/80 bg-white/80 text-slate-700 hover:border-sky-200 hover:bg-sky-50/80 hover:text-sky-800 dark:border-slate-700/70 dark:bg-slate-900/55 dark:text-slate-200 dark:hover:border-sky-500/35 dark:hover:bg-sky-500/10 dark:hover:text-sky-100'
                                                    }`}
                                            >
                                                {suggestion.value}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </div>

                        {amountSetter(false)}
                    </div>

                    {/* Row 3: Account & Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2">
                        <div className={formFieldCardClassName}>
                            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-50 mb-2 uppercase tracking-wide">
                                {formData.type} Account
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsAccountPickerOpen(true)}
                                disabled={isAccountButtonDisabled}
                                className={`w-full disabled:cursor-not-allowed disabled:opacity-70 ${transactionFieldClasses}`}
                            >
                                <span className="flex items-center gap-2 min-w-0">
                                    {selectedAccount ? (
                                        <span
                                            className="app-color-chip-border h-3 w-3 rounded-full shrink-0"
                                            style={{ backgroundColor: intToHex(selectedAccount.color) }}
                                        />
                                    ) : null}
                                    <span className={`truncate ${selectedAccount ? '' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {selectedAccount?.name || (accounts.length ? 'Select account' : 'No accounts available')}
                                    </span>
                                </span>
                                <ChevronDown size={16} className="text-gray-500 dark:text-gray-400 shrink-0" />
                            </button>
                        </div>

                        <div className={formFieldCardClassName}>
                            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-50 mb-2 uppercase tracking-wide">
                                {isPlannedPaymentMode ? 'Next Due Date' : 'Date & Time'}
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.dateTime}
                                onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                                className={`w-full ${transactionFieldClasses}`}
                                required
                            />
                        </div>
                    </div>


                    {isPlannedPaymentMode && (
                        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_12rem]">
                            <div className={formFieldCardClassName}>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-900 dark:text-gray-50">
                                    Repeat Every
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={formData.intervalN}
                                    onChange={(e) => setFormData({ ...formData, intervalN: e.target.value })}
                                    className={transactionFieldClasses}
                                    placeholder="1"
                                    required
                                />
                            </div>
                            <div className={formFieldCardClassName}>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-900 dark:text-gray-50">
                                    Unit
                                </label>
                                <select
                                    value={formData.intervalType}
                                    onChange={(e) => setFormData({ ...formData, intervalType: e.target.value as PlannedPaymentIntervalType })}
                                    className={`w-full ${transactionFieldClasses}`}
                                    required
                                >
                                    {PLANNED_PAYMENT_INTERVAL_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </form>

                {/* Actions */}
                <div className={ModalHeader}>
                    {isEditing && onDelete ? (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className={FreeRedBtn}
                            title={isPlannedPaymentMode ? 'Delete planned payment' : 'Delete transaction'}
                        >
                            <Trash2 size={18} />
                        </button>
                    ) : <div />}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleCloseWithConfirm}
                            className={FreeWhiteBtn}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form={formId}
                            className={FreeBlueBtn}
                        >
                            {isPlannedPaymentMode
                                ? isEditing
                                    ? 'Update'
                                    : 'Create'
                                : isEditing
                                    ? 'Update'
                                    : 'Create'}
                        </button>
                    </div>
                </div>
            </div>

            <OptionPickerModal
                isOpen={isAccountPickerOpen}
                title="Select Account"
                options={accountOptions}
                selectedId={formData.accountId}
                onSelect={(accountId) => {
                    setFormData({ ...formData, accountId });
                    setIsAccountPickerOpen(false);
                }}
                onClose={() => setIsAccountPickerOpen(false)}
            />

            <OptionPickerModal
                isOpen={isCategoryPickerOpen}
                title="Select Category"
                options={categoryOptions}
                selectedId={formData.categoryId}
                onSelect={(categoryId) => {
                    setFormData({ ...formData, categoryId });
                    setIsCategoryPickerOpen(false);
                    window.requestAnimationFrame(() => {
                        titleInputRef.current?.focus();
                        titleInputRef.current?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                        });
                    });
                }}
                onClose={() => setIsCategoryPickerOpen(false)}
            />
        </div>
    );
};
