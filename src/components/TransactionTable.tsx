import React from 'react';
import type { Account, Category, Transaction } from '../types/finance.types';
import { hexToRgba, intToHex } from '../utils/colorUtils';

interface TransactionTableProps {
    transactions: Transaction[];
    accounts: Account[];
    categories: Category[];
    onEdit?: (transaction: Transaction) => void;
    isTransactionEditable?: (transaction: Transaction) => boolean;
}

const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const getTransactionTimestamp = (transaction: Transaction) => {
    return transaction.dateTime || transaction.dueDate || 0;
};

const META_CHIP_CLASS = 'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold text-gray-900 select-none dark:text-gray-100 sm:px-3 sm:py-1';

const getMetaChipStyle = (color?: number) => {
    if (typeof color !== 'number') {
        return {
            backgroundColor: 'rgba(148, 163, 184, 0.16)',
            borderColor: 'rgba(148, 163, 184, 0.42)',
            boxShadow: '0 1px 0 rgba(148, 163, 184, 0.12)',
        };
    }

    const hexColor = intToHex(color);

    return {
        backgroundColor: hexToRgba(hexColor, 0.2),
        borderColor: hexToRgba(hexColor, 0.75),
        boxShadow: `0 1px 0 ${hexToRgba(hexColor, 0.18)}`,
    };
};

const getTypeBadgeClassName = (type: Transaction['type']) => {
    if (type === 'INCOME') {
        return 'bg-green-100 text-green-700 dark:bg-green-950/45 dark:text-green-300';
    }

    if (type === 'EXPENSE') {
        return 'bg-red-100 text-red-700 dark:bg-red-950/45 dark:text-red-300';
    }

    return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
};

const getAmountClassName = (type: Transaction['type']) => {
    if (type === 'INCOME') {
        return 'text-green-600 dark:text-green-400';
    }

    if (type === 'EXPENSE') {
        return 'text-red-600 dark:text-red-400';
    }

    return 'text-slate-700 dark:text-slate-300';
};

const getSignedAmount = (transaction: Transaction) => {
    if (transaction.type === 'INCOME') {
        return `+₹${formatCurrency(transaction.amount)}`;
    }

    if (transaction.type === 'EXPENSE') {
        return `-₹${formatCurrency(transaction.amount)}`;
    }

    return `₹${formatCurrency(transaction.amount)}`;
};

export const TransactionTable: React.FC<TransactionTableProps> = ({
    transactions,
    accounts,
    categories,
    onEdit,
    isTransactionEditable = () => true,
}) => {
    if (transactions.length === 0) {
        return (
            <div className="app-border-soft overflow-hidden rounded-[1.75rem] bg-white/80 p-5 shadow-[0_20px_56px_-34px_rgba(15,23,42,0.34)] backdrop-blur-2xl dark:bg-slate-900/58 sm:p-6">
                <p className="text-sm text-gray-700 dark:text-gray-300 sm:text-base">No transactions found</p>
            </div>
        );
    }

    return (
        <div className="app-border-soft overflow-hidden rounded-[1.75rem] bg-white/80 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.34)] backdrop-blur-2xl dark:bg-slate-900/58">
            <div className="overflow-x-auto">
                <table className="min-w-[780px] w-full border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200/70 bg-slate-50/85 text-left text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:border-slate-800/80 dark:bg-slate-950/45 dark:text-slate-400">
                            <th className="px-4 py-3 font-semibold sm:px-5">Title</th>
                            <th className="px-4 py-3 font-semibold sm:px-5">Account</th>
                            <th className="px-4 py-3 font-semibold sm:px-5">Category</th>
                            <th className="px-4 py-3 font-semibold sm:px-5">Type</th>
                            <th className="px-4 py-3 text-right font-semibold sm:px-5">Amount</th>
                            <th className="px-4 py-3 font-semibold sm:px-5">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((transaction) => {
                            const account = accounts.find((item) => item.id === transaction.accountId);
                            const category = categories.find((item) => item.id === transaction.categoryId);
                            const timestamp = getTransactionTimestamp(transaction);
                            const isClickable = !!onEdit && isTransactionEditable(transaction);

                            const handleKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>) => {
                                if (!isClickable) return;

                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    onEdit?.(transaction);
                                }
                            };

                            return (
                                <tr
                                    key={transaction.id}
                                    onClick={() => {
                                        if (isClickable) {
                                            onEdit?.(transaction);
                                        }
                                    }}
                                    onKeyDown={handleKeyDown}
                                    role={isClickable ? 'button' : undefined}
                                    tabIndex={isClickable ? 0 : undefined}
                                    className={`border-b border-slate-200/70 text-sm text-slate-700 transition-colors duration-200 last:border-b-0 dark:border-slate-800/75 dark:text-slate-200 ${
                                        isClickable
                                            ? 'cursor-pointer hover:bg-slate-50/80 focus-visible:bg-slate-50/80 focus-visible:outline-none dark:hover:bg-slate-800/45 dark:focus-visible:bg-slate-800/45'
                                            : ''
                                    }`}
                                >
                                    <td className="px-4 py-3.5 align-middle sm:px-5">
                                        <span className="font-semibold text-slate-900 dark:text-slate-50">
                                            {transaction.title || 'No title'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5 align-middle sm:px-5">
                                        <span className={META_CHIP_CLASS} style={getMetaChipStyle(account?.color)}>
                                            <span className="truncate">{account?.name || 'Unknown account'}</span>
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5 align-middle sm:px-5">
                                        <span className={META_CHIP_CLASS} style={getMetaChipStyle(category?.color)}>
                                            <span className="truncate">{category?.name || 'Uncategorized'}</span>
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5 align-middle sm:px-5">
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getTypeBadgeClassName(transaction.type)}`}>
                                            {transaction.type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5 text-right align-middle sm:px-5">
                                        <span className={`font-bold ${getAmountClassName(transaction.type)}`}>
                                            {getSignedAmount(transaction)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5 align-middle text-slate-500 dark:text-slate-400 sm:px-5">
                                        {timestamp ? formatDate(timestamp) : 'No date'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
