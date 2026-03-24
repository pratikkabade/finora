import React, { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { X } from 'lucide-react';
import type { Transaction, Account, Category } from '../types/finance.types';
import { hexToRgba, intToHex } from '../utils/colorUtils';
import { transactionCard } from '../constants/TailwindClasses';
import { SkeletonCard2 } from './SkeletonLoader';

interface TransactionCardProps {
    transaction: Transaction;
    account: Account | undefined;
    category: Category | undefined;
    filterType?: 'account' | 'category' | 'type' | null;
    onFilterChange?: (type: 'account' | 'category' | 'type' | null, id: string | null) => void;
    onEdit?: (transaction: Transaction) => void;
}

interface FilterChipConfig {
    name: string;
    color: number;
    isActive: boolean;
    onClick: () => void;
}

const FILTER_CHIP_BASE_CLASS = 'inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full border text-xs font-semibold text-gray-900 dark:text-gray-100 transition-all duration-200 active:scale-[0.9] select-none';
const FILTER_CHIP_ACTIVE_CLASS = 'cursor-pointer shadow-sm hover:scale-[1.03]';
const FILTER_CHIP_INACTIVE_CLASS = 'cursor-pointer hover:scale-[0.97]';
// const FILTER_CHIP_DOT_CLASS = 'h-2.5 w-2.5 rounded-full shrink-0 border border-black/10 dark:border-white/20';
const FILTER_CHIP_CLEAR_ICON_CLASS = 'transition-transform duration-200 group-hover:scale-110';

const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

export const getFilterChipStyle = (hexColor: string, isActive: boolean): CSSProperties => ({
    backgroundColor: isActive ? hexToRgba(hexColor, 0.28) : hexToRgba(hexColor, 0.20),
    borderColor: isActive ? hexToRgba(hexColor, 0.95) : hexToRgba(hexColor, 0.75),
    boxShadow: isActive
        ? `0 0 0 1px ${hexToRgba(hexColor, 0.28)}`
        : `0 1px 0 ${hexToRgba(hexColor, 0.18)}`,
});

export const renderFilterChip = ({ name, color, isActive, onClick }: FilterChipConfig) => {
    const hexColor = intToHex(color);

    return (
        <button
            type="button"
            onClick={onClick}
            className={`${FILTER_CHIP_BASE_CLASS} ${isActive ? FILTER_CHIP_ACTIVE_CLASS : FILTER_CHIP_INACTIVE_CLASS} group`}
            style={getFilterChipStyle(hexColor, isActive)}
        // title={isActive ? `Clear ${name} filter` : `Filter by ${name}`}
        >
            {/* <span className={FILTER_CHIP_DOT_CLASS} style={{ backgroundColor: hexColor }} /> */}
            <span className="truncate">{name}</span>
            {isActive && <X size={12} className={FILTER_CHIP_CLEAR_ICON_CLASS} />}
        </button>
    );
};


export const TransactionCard: React.FC<TransactionCardProps> = ({
    transaction,
    account,
    category,
    filterType,
    onFilterChange,
    onEdit,
}) => {
    const [showSkeleton, setShowSkeleton] = useState(true);
    const isIncome = transaction.type === 'INCOME';

    useEffect(() => {
        setShowSkeleton(true);

        const timeoutId = window.setTimeout(() => {
            setShowSkeleton(false);
        }, 1000);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [transaction.id]);

    if (showSkeleton) {
        return <SkeletonCard2 />;
    }

    return (
        <div className={transactionCard}>
            <div
                onClick={() => onEdit?.(transaction)}
                className="group mb-4 flex cursor-pointer flex-col gap-3 xs:flex-row xs:items-start xs:justify-between"
            >
                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-gray-900 transition-colors duration-300 group-hover:text-slate-950 dark:text-gray-50 dark:group-hover:text-white sm:text-lg">
                        {transaction.title || 'No title'}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
                        {formatDate(transaction.dateTime || transaction.dueDate || 0)}
                    </p>
                </div>

                <div className="text-left xs:text-right">
                    <div className={`mt-1 text-lg font-bold transition-transform duration-300 xs:text-xl ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                        {isIncome ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs max-sm:text-sm">
                {account && (
                    renderFilterChip({
                        name: account.name,
                        color: account.color,
                        isActive: filterType === 'account',
                        onClick: () => {
                            if (filterType === 'account') {
                                onFilterChange?.(null, null);
                                return;
                            }
                            onFilterChange?.('account', transaction.accountId);
                        },
                    })
                )}
                {category && (
                    renderFilterChip({
                        name: category.name,
                        color: category.color,
                        isActive: filterType === 'category',
                        onClick: () => {
                            if (filterType === 'category') {
                                onFilterChange?.(null, null);
                                return;
                            }
                            onFilterChange?.('category', transaction.categoryId || '');
                        },
                    })
                )}
            </div>
        </div>
    );
};
