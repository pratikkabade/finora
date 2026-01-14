import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import type { Account, Category, TransactionType, Transaction } from '../types/finance.types';
import { generateUUID } from '../utils/dateUtils';
import { FreeBlueBtn, FreeWhiteBtn, ModalHeader, ModalOut, ModalPopUp } from '../constants/TailwindClasses';

interface CreateTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (transaction: any) => void;
    onDelete?: (transactionId: string) => void;
    accounts: Account[];
    categories: Category[];
    editingTransaction?: Transaction | null;
}

export const CreateTransactionModal: React.FC<CreateTransactionModalProps> = ({
    isOpen,
    onClose,
    onSave,
    onDelete,
    accounts,
    categories,
    editingTransaction,
}) => {
    const [formData, setFormData] = useState({
        accountId: '',
        type: 'EXPENSE' as TransactionType,
        amount: '',
        title: '',
        categoryId: '',
        dateTime: new Date().toISOString().slice(0, 16),
    });

    useEffect(() => {
        if (editingTransaction) {
            const dateObj = new Date(editingTransaction.dateTime || editingTransaction.dueDate || 0);
            setFormData({
                accountId: editingTransaction.accountId,
                type: editingTransaction.type,
                amount: editingTransaction.amount.toString(),
                title: editingTransaction.title || '',
                categoryId: (editingTransaction.categoryId as string) || '',
                dateTime: dateObj.toISOString().slice(0, 16),
            });
        } else {
            setFormData({
                accountId: '',
                type: 'EXPENSE',
                amount: '',
                title: '',
                categoryId: '',
                dateTime: new Date().toISOString().slice(0, 16),
            });
        }
    }, [editingTransaction, isOpen]);

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

        onSave(transaction);

        // Reset form
        setFormData({
            accountId: '',
            type: 'EXPENSE',
            amount: '',
            title: '',
            categoryId: '',
            dateTime: new Date().toISOString().slice(0, 16),
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

    return (
        <div className={ModalOut}>
            <div className={ModalPopUp}>
                {/* Header */}
                <div className={ModalHeader}>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
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
                            <label className="block text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wide">
                                Account
                            </label>
                            <select
                                value={formData.accountId}
                                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                                className="glass-input w-full px-3 py-2 text-sm text-gray-900 rounded-lg cursor-pointer"
                                required
                            >
                                <option value="">Select...</option>
                                {accounts.map((account) => (
                                    <option key={account.id} value={account.id}>
                                        {account.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wide">
                                Type
                            </label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as TransactionType })}
                                className="glass-input w-full px-3 py-2 text-sm text-gray-900 rounded-lg cursor-pointer"
                                required
                            >
                                <option value="INCOME">Income</option>
                                <option value="EXPENSE">Expense</option>
                            </select>
                        </div>
                    </div>

                    {/* Row 2: Amount & Title */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wide">
                                Amount
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="glass-input w-full px-3 py-2 text-sm text-gray-900 rounded-lg"
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wide">
                                Title
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="glass-input w-full px-3 py-2 text-sm text-gray-900 rounded-lg"
                                placeholder="Description"
                                required
                            />
                        </div>
                    </div>

                    {/* Row 3: Category */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wide">
                            Category
                        </label>
                        <select
                            value={formData.categoryId}
                            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                            className="glass-input w-full px-3 py-2 text-sm text-gray-900 rounded-lg cursor-pointer"
                            required
                        >
                            <option value="">Select...</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Row 4: Date */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wide">
                            Date & Time
                        </label>
                        <input
                            type="datetime-local"
                            value={formData.dateTime}
                            onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                            className="glass-input w-full px-3 py-2 text-sm text-gray-900 rounded-lg"
                            required
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-row justify-between gap-3 pt-4">
                        {isEditing && onDelete ? (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-600 rounded-lg transition duration-300 cursor-pointer border border-red-200/50"
                                title="Delete transaction"
                            >
                                <Trash2 size={18} />
                            </button>
                        ):(<div></div>)}
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
        </div>
    );
};