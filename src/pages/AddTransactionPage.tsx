import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { FinanceData, Transaction } from '../types/finance.types';
import { CreateTransactionModal } from '../components/CreateTransactionModal';

interface AddTransactionPageProps {
    financeData: FinanceData | null;
    onSave: (transaction: Transaction) => void;
    defaultAccountId?: string;
    lockAccountSelection?: boolean;
}

export const AddTransactionPage: React.FC<AddTransactionPageProps> = ({
    financeData,
    onSave,
    defaultAccountId,
    lockAccountSelection,
}) => {
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
            <div className="app-shell-ambient relative flex min-h-screen min-h-dvh items-center justify-center overflow-hidden bg-linear-to-br from-slate-100 via-white to-sky-50 px-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
                <div className="text-center">
                    <p className="text-gray-900 dark:text-gray-50">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="app-shell-ambient relative flex min-h-screen min-h-dvh items-center justify-center overflow-hidden bg-linear-to-br from-slate-100 via-white to-sky-50 px-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <div data-orb="one" className="absolute left-[-6rem] top-[-5rem] h-64 w-64 rounded-full bg-sky-200/55 blur-3xl dark:bg-sky-500/10" />
                <div data-orb="two" className="absolute bottom-[-6rem] right-[-4rem] h-72 w-72 rounded-full bg-amber-200/40 blur-3xl dark:bg-amber-500/10" />
            </div>
            <CreateTransactionModal
                isOpen={true}
                onClose={handleClose}
                onSave={handleSave}
                accounts={financeData.accounts}
                categories={financeData.categories}
                transactions={financeData.transactions}
                defaultAccountId={defaultAccountId}
                lockAccountSelection={lockAccountSelection}
            />
        </div>
    );
};
