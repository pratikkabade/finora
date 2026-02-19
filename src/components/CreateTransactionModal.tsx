import React, { useEffect, useMemo, useState } from 'react';
import { X, Trash2, ChevronDown, Check } from 'lucide-react';
import type { Account, Category, TransactionType, Transaction } from '../types/finance.types';
import { generateUUID } from '../utils/dateUtils';
import { FreeBlueBtn, FreeRedBtn, FreeWhiteBtn, ModalHeader, ModalOut, ModalPopUp } from '../constants/TailwindClasses';
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
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-60 bg-black/35 backdrop-blur-[1px] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-xs rounded-2xl border border-white/20 dark:border-gray-700/30 bg-white dark:bg-gray-800 shadow-xl overflow-hidden"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/20 dark:border-gray-700/30">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                    <button type="button" onClick={onClose} className={FreeWhiteBtn}>
                        <X size={16} />
                    </button>
                </div>
                <div className="p-2 max-h-64 overflow-y-auto">
                    {options.length ? (
                        options.map((option) => {
                            const isSelected = selectedId === option.id;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => onSelect(option.id)}
                                    className={`w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2 transition-colors text-left ${isSelected
                                        ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200/50 dark:border-blue-700/50'
                                        : 'hover:bg-white/70 dark:hover:bg-gray-700/50 border border-transparent'
                                        }`}
                                >
                                    <span className="flex items-center gap-2 min-w-0">
                                        <span
                                            className="h-3 w-3 rounded-full border border-black/10 dark:border-white/20 shrink-0"
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

        // Reset form
        setFormData({
            accountId: '',
            type: 'EXPENSE',
            amount: '',
            title: '',
            categoryId: '',
            dateTime: formatLocalDateTime(),
        });

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

    if (!isOpen) return null;

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
        <div className={ModalOut}>
            <div className={ModalPopUp}>
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
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                    {/* Row 1: Account & Type */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-50 mb-2 uppercase tracking-wide">
                                Account
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsAccountPickerOpen(true)}
                                disabled={accounts.length === 0}
                                className={`glass-input w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-50 rounded-lg flex items-center justify-between gap-2 cursor-pointer
                                    }`}
                            >
                                <span className="flex items-center gap-2 min-w-0">
                                    {selectedAccount ? (
                                        <span
                                            className="h-3 w-3 rounded-full border border-black/10 dark:border-white/20 shrink-0"
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
                        <div>
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
                    <div>
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
                                        className="h-3 w-3 rounded-full border border-black/10 dark:border-white/20 shrink-0"
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
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
                        <div>
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
                    <div>
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

                    {/* Actions */}
                    <div className="flex flex-row justify-between gap-3 pt-4">
                        {isEditing && onDelete ? (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className={FreeRedBtn}
                                title="Delete transaction"
                            >
                                <Trash2 size={18} />
                            </button>
                        ) : (<div></div>)}
                        <div className='flex gap-3'>
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
                </form>
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
