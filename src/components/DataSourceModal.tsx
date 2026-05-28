import React from 'react';
import { Cloud, Sparkles, Zap } from 'lucide-react';
import { ModalOut, ModalPopUp } from '../constants/TailwindClasses';
import { useAnimatedOpen } from '../hooks/useAnimatedOpen';

interface DataSourceModalProps {
    isOpen: boolean;
    onFetchFirebase?: () => Promise<void>;
    onGetDummyData: () => void;
    showCloudOption?: boolean;
}

export const DataSourceModal: React.FC<DataSourceModalProps> = ({
    isOpen,
    onFetchFirebase,
    onGetDummyData,
    showCloudOption = true,
}) => {
    const [isLoadingFirebase, setIsLoadingFirebase] = React.useState(false);
    const { shouldRender, isVisible } = useAnimatedOpen(isOpen);

    const handleFetchFirebase = async () => {
        if (!onFetchFirebase) return;
        setIsLoadingFirebase(true);
        try {
            await onFetchFirebase();
        } finally {
            setIsLoadingFirebase(false);
        }
    };

    if (!shouldRender) return null;

    return (
        <div className={`${ModalOut} ${isVisible ? 'app-modal-backdrop-enter' : 'app-modal-backdrop-exit'}`}>
            <div className={`${ModalPopUp} relative max-w-sm overflow-hidden sm:max-w-lg ${isVisible ? 'app-modal-panel-enter' : 'app-modal-panel-exit'}`}>
                <div className="app-modal-glow pointer-events-none absolute inset-x-8 top-8 h-28 rounded-full bg-linear-to-r from-sky-300/20 via-white/10 to-amber-300/20 blur-3xl" />

                <div className="app-panel-stagger relative p-6 sm:p-8">
                    <div>
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-200/70 bg-sky-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/35 dark:text-sky-300">
                            <Sparkles size={14} />
                            Welcome
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 sm:text-3xl">Pick your starting point</h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 sm:text-base">
                            Jump back into synced data or spin up a polished sample workspace in one tap.
                        </p>
                    </div>

                    <div className="app-stagger-list mt-6 space-y-4">
                        {showCloudOption && (
                            <button
                                onClick={handleFetchFirebase}
                                disabled={isLoadingFirebase}
                                className="group w-full rounded-[1.6rem] border border-sky-200/70 bg-linear-to-r from-sky-500 via-blue-600 to-cyan-500 px-5 py-4 text-left text-white shadow-[0_24px_60px_-26px_rgba(37,99,235,0.72)] transition-[box-shadow,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:brightness-105 hover:shadow-[0_28px_68px_-26px_rgba(37,99,235,0.82)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-lg font-semibold">{isLoadingFirebase ? 'Fetching your backup...' : 'Restore from cloud'}</p>
                                        <p className="mt-1 text-sm text-white/85">
                                            Load the last Firebase backup tied to this account.
                                        </p>
                                    </div>
                                    <Cloud size={22} className="shrink-0 transition-transform duration-300 group-hover:scale-105" />
                                </div>
                            </button>
                        )}

                        <button
                            onClick={onGetDummyData}
                            disabled={isLoadingFirebase}
                            className="group w-full rounded-[1.6rem] border border-amber-200/70 bg-linear-to-r from-amber-400 via-orange-500 to-rose-500 px-5 py-4 text-left text-white shadow-[0_24px_60px_-30px_rgba(249,115,22,0.72)] transition-[box-shadow,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:brightness-105 hover:shadow-[0_28px_68px_-28px_rgba(249,115,22,0.82)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-lg font-semibold">Launch sample data</p>
                                    <p className="mt-1 text-sm text-white/85">
                                        Explore charts, balances, and flows without importing anything first.
                                    </p>
                                </div>
                                <Zap size={22} className="shrink-0 transition-transform duration-300 group-hover:scale-105" />
                            </div>
                        </button>
                    </div>

                    <div className="app-border-soft mt-6 rounded-[1.45rem] bg-white/70 p-4 text-sm text-slate-600 dark:bg-slate-900/45 dark:text-slate-300">
                        You can switch data sources later from Settings. Your workspace still saves locally even if you never use cloud sync.
                    </div>
                </div>
            </div>
        </div>
    );
};
