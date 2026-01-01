import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { FinanceData, Transaction } from '../types/finance.types';
import { CreateTransactionModal } from '../components/CreateTransactionModal';

interface AddTransactionPageProps {
    financeData: FinanceData | null;
    onSave: (transaction: Transaction) => void;
}

export const AddTransactionPage: React.FC<AddTransactionPageProps> = ({ financeData, onSave }) => {
    const navigate = useNavigate();

    const handleClose = () => {
        navigate('/');
    };

    const handleSave = (transaction: Transaction) => {
        onSave(transaction);
        handleClose();
    };

    if (!financeData) {
        return (
            <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center px-4">
                <div className="text-center">
                    <p className="text-gray-900 dark:text-gray-50">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center px-4">
            <CreateTransactionModal
                isOpen={true}
                onClose={handleClose}
                onSave={handleSave}
                accounts={financeData.accounts}
                categories={financeData.categories}
            />
        </div>
    );
};
