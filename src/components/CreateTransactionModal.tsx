import React, { useEffect, useMemo, useState } from 'react';
import { X, Trash2, ChevronDown, Check } from 'lucide-react';
import type { Account, Category, TransactionType, Transaction } from '../types/finance.types';
import { generateUUID } from '../utils/dateUtils';
import { FreeBlueBtn, FreeRedBtn, FreeWhiteBtn, ModalHeader, ModalOut, ModalPopUp } from '../constants/TailwindClasses';
import { useAnimatedOpen } from '../hooks/useAnimatedOpen';
import { intToHex } from '../utils/colorUtils';

interface CreateTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (transaction: Transaction) => void;
    onDelete?: (transactionId: string) => void;
    accounts: Account[];
    categories: Category[];
    editingTransaction?: Transaction | null;
    defaultAccountId?: string;
    lockAccountSelection?: boolean;
}

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
                                        : 'app-border-subtle border border-slate-200 bg-white/48 hover:border-slate-300 hover:bg-white/72 hover:shadow-[0_16px_34px_-24px_rgba(15,23,42,0.2)] dark:bg-slate-900/34 dark:hover:border-slate-500/70 dark:hover:bg-slate-800/46'
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

export const CreateTransactionModal: React.FC<CreateTransactionModalProps> = ({
    isOpen,
    onClose,
    onSave,
    onDelete,
    accounts,
    categories,
    editingTransaction,
    defaultAccountId,
    lockAccountSelection,
}) => {
    const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);
    const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
    const [formData, setFormData] = useState({
        accountId: '',
        type: 'EXPENSE' as TransactionType,
        amount: '',
        title: '',
        categoryId: '',
        dateTime: formatLocalDateTime(),
    });

    const resolvedDefaultAccountId = useMemo(() => {
        if (defaultAccountId && accounts.some((account) => account.id === defaultAccountId)) {
            return defaultAccountId;
        }
        return accounts[0]?.id || '';
    }, [accounts, defaultAccountId]);

    useEffect(() => {
        if (!isOpen) return;

        if (editingTransaction) {
            const dateObj = new Date(editingTransaction.dateTime || editingTransaction.dueDate || 0);
            setFormData({
                accountId: editingTransaction.accountId,
                type: editingTransaction.type,
                amount: editingTransaction.amount.toString(),
                title: editingTransaction.title || '',
                categoryId: (editingTransaction.categoryId as string) || '',
                dateTime: formatLocalDateTime(dateObj),
            });
        } else {
            setFormData({
                accountId: resolvedDefaultAccountId,
                type: 'EXPENSE',
                amount: '',
                title: '',
                categoryId: '',
                dateTime: formatLocalDateTime(),
            });
        }

        setIsAccountPickerOpen(false);
        setIsCategoryPickerOpen(false);
    }, [editingTransaction, isOpen, resolvedDefaultAccountId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.accountId || !formData.amount || !formData.title || !formData.categoryId) {
            alert('Please fill in all required fields');
            return;
        }

        const transaction = {
            id: editingTransaction?.id || generateUUID(),
            accountId: formData.accountId,
            type: formData.type,
            amount: parseFloat(formData.amount),
            title: formData.title,
            categoryId: formData.categoryId,
            dateTime: new Date(formData.dateTime).getTime(),
            isSynced: false,
        };

        localStorage.setItem('outOfSync', 'true')

        onSave(transaction);

        onClose();
    };

    const handleDelete = () => {
        if (editingTransaction && onDelete) {
            if (confirm('Are you sure you want to delete this transaction?')) {
                onDelete(editingTransaction.id);
                onClose();
            }
        }
    };

    const { shouldRender, isVisible } = useAnimatedOpen(isOpen);

    if (!shouldRender) return null;

    const isEditing = !!editingTransaction;
    const selectedAccount = accounts.find((account) => account.id === formData.accountId);
    const selectedCategory = categories.find((category) => category.id === formData.categoryId);
    const accountOptions: ColorOption[] = accounts.map((account) => ({
        id: account.id,
        name: account.name,
        color: account.color,
    }));
    const categoryOptions: ColorOption[] = categories.map((category) => ({
        id: category.id,
        name: category.name,
        color: category.color,
    }));
    const shouldLockAccountSelection = !isEditing && !!lockAccountSelection && !!selectedAccount;

    return (
        <div className={`${ModalOut} ${isVisible ? 'app-modal-backdrop-enter' : 'app-modal-backdrop-exit'}`}>
            <div className={`${ModalPopUp} max-w-sm sm:max-w-xl ${isVisible ? 'app-modal-panel-enter' : 'app-modal-panel-exit'}`}>
                {/* Header */}
                <div className={ModalHeader}>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-50">
                        {isEditing ? 'Edit Transaction' : 'New Transaction'}
                    </h2>
                    <button
                        onClick={onClose}
                        className={FreeWhiteBtn}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="app-panel-stagger max-h-[65vh] space-y-4 overflow-y-auto px-3 py-6 bg-slate-50 dark:bg-slate-800/20">
                    {/* Row 1: Account & Type */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="app-border-soft rounded-[1.4rem] bg-white/30 p-4 backdrop-blur-md dark:bg-slate-900/25">
                            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-50 mb-2 uppercase tracking-wide">
                                Account
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsAccountPickerOpen(true)}
                                disabled={accounts.length === 0}
                                className="glass-input flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-gray-50"
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
                                {!shouldLockAccountSelection && <ChevronDown size={16} className="text-gray-500 dark:text-gray-400 shrink-0" />}
                            </button>
                            {shouldLockAccountSelection && (
                                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                    Defaulted from your net balance account setting.
                                </p>
                            )}
                        </div>
                        <div className="app-border-soft rounded-[1.4rem] bg-white/30 p-4 backdrop-blur-md dark:bg-slate-900/25">
                            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-50 mb-2 uppercase tracking-wide">
                                Type
                            </label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as TransactionType })}
                                className="glass-input w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-50 rounded-lg cursor-pointer"
                                required
                            >
                                <option value="INCOME">Income</option>
                                <option value="EXPENSE">Expense</option>
                            </select>
                        </div>
                    </div>

                    {/* Row 2: Category */}
                    <div className="app-border-soft rounded-[1.4rem] bg-white/30 p-4 backdrop-blur-md dark:bg-slate-900/25">
                        <label className="block text-xs font-semibold text-gray-900 dark:text-gray-50 mb-2 uppercase tracking-wide">
                            Category
                        </label>
                        <button
                            type="button"
                            onClick={() => setIsCategoryPickerOpen(true)}
                            disabled={categories.length === 0}
                            className="glass-input w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-50 rounded-lg flex items-center justify-between gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
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

                    {/* Row 3: Amount & Title */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="app-border-soft rounded-[1.4rem] bg-white/30 p-4 backdrop-blur-md dark:bg-slate-900/25">
                            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-50 mb-2 uppercase tracking-wide">
                                Amount
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="glass-input w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-50 rounded-lg cursor-pointer"
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div className="app-border-soft rounded-[1.4rem] bg-white/30 p-4 backdrop-blur-md dark:bg-slate-900/25">
                            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-50 mb-2 uppercase tracking-wide">
                                Title
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="glass-input w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-50 rounded-lg cursor-pointer"
                                placeholder="Description"
                                required
                            />
                        </div>
                    </div>

                    {/* Row 4: Date */}
                    <div className="app-border-soft rounded-[1.4rem] bg-white/30 p-4 backdrop-blur-md dark:bg-slate-900/25">
                        <label className="block text-xs font-semibold text-gray-900 dark:text-gray-50 mb-2 uppercase tracking-wide">
                            Date & Time
                        </label>
                        <input
                            type="datetime-local"
                            value={formData.dateTime}
                            onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                            className="glass-input w-fit px-3 py-2 text-sm text-gray-900 dark:text-gray-50 rounded-lg"
                            required
                        />
                    </div>
                </form>

                {/* Actions */}
                <div className={ModalHeader}>
                    {isEditing && onDelete ? (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className={FreeRedBtn}
                            title="Delete transaction"
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
                            type="submit"
                            className={FreeBlueBtn}
                        >
                            {isEditing ? 'Update' : 'Create'}
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
                }}
                onClose={() => setIsCategoryPickerOpen(false)}
            />
        </div>
    );
};
