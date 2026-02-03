import React, { useState } from 'react';
import { Edit2, X } from 'lucide-react';
import type { Transaction, Account, Category } from '../types/finance.types';
import { useDarkMode } from '../context/DarkModeContext';
import { btn1Class, btn2Class, SmallBlueBtn, XClass } from '../constants/TailwindClasses';
import { SkeletonCard2 } from './SkeletonLoader';

interface TransactionCardProps {
    transaction: Transaction;
    account: Account | undefined;
    category: Category | undefined;
    filterType?: 'account' | 'category' | 'type' | null;
    filterId?: string | null;
    onFilterChange?: (type: 'account' | 'category' | 'type' | null, id: string | null) => void;
    onEdit?: (transaction: Transaction) => void;
}

const intToHex = (num: number): string => {
    const unsigned = num >>> 0; // Convert to unsigned 32-bit integer (ARGB format)
    const hex = (unsigned & 0xFFFFFF).toString(16); // Extract RGB part (last 6 digits)
    return '#' + ('000000' + hex).slice(-6).toUpperCase();
};

export const TransactionCard: React.FC<TransactionCardProps> = ({
    transaction,
    account,
    category,
    filterType,
    onFilterChange,
    onEdit,
}) => {
    const { isDarkMode } = useDarkMode();
    const [isHovered, setIsHovered] = useState(false);
    const [animation, setAnimation] = useState(true);
    const [hoveredButton, setHoveredButton] = useState<'account' | 'category' | null>(null);

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const isIncome = transaction.type === 'INCOME';

    setTimeout(() => {
        setAnimation(false);
    }, 1000);

    if (animation) return (
        <SkeletonCard2 />
    )

    return (
        <div
            className="glass-card hover:bg-white dark:hover:bg-gray-800 active:bg-white/30 dark:active:bg-gray-800 active:scale-[0.97] p-3 sm:p-2 md:p-3 transition-all duration-300 relative rounded-2xl fade-in"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Edit Button - Top Right Corner (Floating Circle) */}
            {isHovered && (
                <button
                    onClick={() => onEdit?.(transaction)}
                    className={SmallBlueBtn}
                    title="Edit transaction"
                >
                    <Edit2 size={14} />
                </button>
            )}

            <div className="flex flex-col xs:flex-row xs:justify-between xs:items-start gap-2 xs:gap-3 mb-2 xs:mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg xs:text-md text-gray-900 dark:text-gray-50 truncate">{transaction.title || 'No title'}</h3>
                    <p className="text-xs xs:text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(transaction.dateTime || transaction.dueDate || 0)}
                    </p>
                </div>
                <div className={`text-lg xs:text-md font-bold whitespace-nowrap ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                    {isIncome ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                </div>
            </div>

            <div className="flex flex-wrap justify-around gap-1.5 sm:gap-2 text-xs max-sm:text-sm">
                {account && (
                    filterType === 'account' ? (
                        <div className=''>
                            <span
                                onClick={() => onFilterChange?.(null, null)}
                                className={btn1Class}
                                style={{
                                    backgroundColor: `${intToHex(account.color)}20`,
                                    borderColor: intToHex(account.color),
                                    color: isDarkMode ? `${intToHex(account.color)}CC` : intToHex(account.color)
                                }}
                            >
                                {account.name}
                                <X size={12} className={XClass} />
                            </span>
                        </div>
                    ) : (
                        <button
                            onClick={() => onFilterChange?.('account', transaction.accountId)}
                            onMouseEnter={() => setHoveredButton('account')}
                            onMouseLeave={() => setHoveredButton(null)}
                            className={`${btn2Class} transition-colors duration-300`}
                            style={{
                                backgroundColor: `${intToHex(account.color)}10`,
                                borderColor: hoveredButton === 'account' ? intToHex(account.color) : isDarkMode ? `${intToHex(account.color)}40` : `${intToHex(account.color)}80`,
                                color: hoveredButton === 'account' ? intToHex(account.color) : isDarkMode ? `${intToHex(account.color)}CC` : intToHex(account.color),
                                transition: 'border-color 300ms ease-in-out, color 300ms ease-in-out'
                            }}
                        >
                            <div className={`flex items-center gap-1.5 ${isDarkMode ? 'brightness-125' : 'saturate-200 contrast-200'}`}>
                                {account.name}
                            </div>
                        </button>
                    )
                )}
                {category && (
                    filterType === 'category' ? (
                        <div className=''>
                            <span
                                onClick={() => onFilterChange?.(null, null)}
                                className={btn1Class}
                                style={{
                                    backgroundColor: `${intToHex(category.color)}20`,
                                    borderColor: intToHex(category.color),
                                    color: isDarkMode ? `${intToHex(category.color)}CC` : intToHex(category.color)
                                }}
                            >
                                {category.name}
                                <X size={12} className={XClass} />
                            </span>
                        </div>
                    ) : (
                        <button
                            onClick={() => onFilterChange?.('category', transaction.categoryId || '')}
                            onMouseEnter={() => setHoveredButton('category')}
                            onMouseLeave={() => setHoveredButton(null)}
                            className={`${btn2Class} transition-colors duration-300`}
                            style={{
                                backgroundColor: `${intToHex(category.color)}10`,
                                borderColor: hoveredButton === 'category' ? intToHex(category.color) : isDarkMode ? `${intToHex(category.color)}40` : `${intToHex(category.color)}80`,
                                color: hoveredButton === 'category' ? intToHex(category.color) : isDarkMode ? `${intToHex(category.color)}CC` : intToHex(category.color),
                                transition: 'border-color 300ms ease-in-out, color 300ms ease-in-out'
                            }}
                        >
                            <div className={`flex items-center gap-1.5 ${isDarkMode ? 'brightness-125' : 'saturate-200 contrast-200'}`}>
                                {category.name}
                            </div>
                        </button>
                    )
                )}
            </div>
        </div>
    );
};