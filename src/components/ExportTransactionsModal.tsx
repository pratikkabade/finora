import React from 'react';
import { Download, FileSpreadsheet, FileText, X } from 'lucide-react';
import { FreeGreenBtn, FreeRedBtn, FreeWhiteBtn, ModalHeader, ModalOut, ModalPopUp } from '../constants/TailwindClasses';
import { useAnimatedOpen } from '../hooks/useAnimatedOpen';

interface ExportTransactionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExportPdf: () => void;
    onExportExcel: () => void;
    transactionCount: number;
    title: string;
    subtitle?: string;
}

export const ExportTransactionsModal: React.FC<ExportTransactionsModalProps> = ({
    isOpen,
    onClose,
    onExportPdf,
    onExportExcel,
    transactionCount,
    title,
    subtitle,
}) => {
    const { shouldRender, isVisible } = useAnimatedOpen(isOpen);
    const hasTransactions = transactionCount > 0;

    if (!shouldRender) return null;

    const handleExportPdf = () => {
        if (!hasTransactions) return;
        onExportPdf();
        onClose();
    };

    const handleExportExcel = () => {
        if (!hasTransactions) return;
        onExportExcel();
        onClose();
    };

    return (
        <div className={`${ModalOut} ${isVisible ? 'app-modal-backdrop-enter' : 'app-modal-backdrop-exit'}`}>
            <div className={`${ModalPopUp} relative max-w-sm overflow-hidden sm:max-w-xl ${isVisible ? 'app-modal-panel-enter' : 'app-modal-panel-exit'}`}>
                <div className="app-modal-glow pointer-events-none absolute inset-x-10 top-12 h-24 rounded-full bg-linear-to-r from-sky-300/16 via-white/8 to-emerald-300/16 blur-3xl" />

                <div className={`${ModalHeader} relative`}>
                    <div className="flex items-center gap-2">
                        <Download size={20} className="text-gray-600 dark:text-gray-400" />
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50 sm:text-xl">Export Transactions</h2>
                            <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
                                {transactionCount} selected transaction{transactionCount !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className={FreeWhiteBtn}>
                        <X size={20} />
                    </button>
                </div>

                <div className="app-panel-stagger relative space-y-4 p-4 sm:p-6">
                    <div className="app-border-soft rounded-[1.6rem] bg-white/55 p-4 backdrop-blur-xl dark:bg-slate-900/45">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            {subtitle || 'Export the transactions currently shown in this report selection.'}
                        </p>
                    </div>

                    <div className="flex flex-row flex-wrap justify-center gap-5">
                        <button
                            type="button"
                            onClick={handleExportPdf}
                            disabled={!hasTransactions}
                            className={`${FreeRedBtn} w-fit!`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-l font-semibold">Export PDF</p>
                                </div>
                                <FileText size={22} className="shrink-0 transition-transform duration-300 group-hover:scale-105" />
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={handleExportExcel}
                            disabled={!hasTransactions}
                            className={`${FreeGreenBtn} w-fit!`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-l font-semibold">Export Excel</p>
                                </div>
                                <FileSpreadsheet size={22} className="shrink-0 transition-transform duration-300 group-hover:scale-105" />
                            </div>
                        </button>
                    </div>

                    {!hasTransactions && (
                        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                            Select at least one report transaction group before exporting.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
