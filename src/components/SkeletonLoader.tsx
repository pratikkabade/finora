import React from 'react';
import { appHeader } from '../App';
import { Calendar1, ChartPie, Plus, Settings } from 'lucide-react';
import { AppChartBtn, AppDateBtn, BlueBtn, FreeWhiteBtn } from '../constants/TailwindClasses';
import { SettingsModal } from './SettingsModal';

const shimmerStyle = `
  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }
  .shimmer {
    animation: shimmer 5s infinite;
    background: linear-gradient(90deg, rgba(51,65,85,0) 0%, rgba(51,65,85,0.5) 50%, rgba(51,65,85,0) 100%);
    background-size: 1000px 100%;
  }
  .dark .shimmer {
    background: linear-gradient(90deg, rgba(100,116,139,0) 0%, rgba(100,116,139,0.5) 50%, rgba(100,116,139,0) 100%);
  }
`;

export const SkeletonCard: React.FC = () => (
    <>
        <style>{shimmerStyle}</style>
        <div className="bg-white/20 dark:bg-gray-800/20 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-2xl p-4 sm:p-5 md:p-6 w-full" style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)' }}>
            <div>
                <div className="h-4 bg-white/20 dark:bg-gray-700/30 rounded w-24 mb-4 shimmer" style={{ minHeight: '1rem' }}></div>
                <div className="h-8 bg-white/20 dark:bg-gray-700/30 rounded w-32 shimmer" style={{ minHeight: '2rem' }}></div>
            </div>
        </div>
    </>
);

export const SkeletonChart: React.FC = () => (
    <>
        <style>{shimmerStyle}</style>
        <div className="glass-card p-3 sm:p-4 md:p-6 w-full">
            <div>
                <div className="h-6 bg-white/20 dark:bg-gray-700/30 rounded w-32 mb-6 shimmer" style={{ minHeight: '1.5rem' }}></div>
                <div className="h-64 bg-white/10 dark:bg-gray-700/20 rounded shimmer" style={{ minHeight: '16rem' }}></div>
            </div>
        </div>
    </>
);

export const SkeletonTable: React.FC = () => (
    <>
        <style>{shimmerStyle}</style>
        <div className="glass-card p-3 sm:p-4 md:p-6 w-full">
            <div>
                <div className="h-6 bg-white/20 dark:bg-gray-700/30 rounded w-48 mb-6 shimmer" style={{ minHeight: '1.5rem' }}></div>
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-10 bg-white/10 dark:bg-gray-700/20 rounded shimmer" style={{ minHeight: '2.5rem', animationDelay: `${i * 0.1}s` }}></div>
                    ))}
                </div>
            </div>
        </div>
    </>
);

export const SkeletonTransaction: React.FC = () => (
    <>
        <style>{shimmerStyle}</style>
        <div className="glass-card p-3 sm:p-4 md:p-5 rounded-2xl">
            <div>
                <div className="flex flex-col xs:flex-row xs:justify-between gap-3 mb-3">
                    <div className="flex-1">
                        <div className="h-5 bg-white/20 dark:bg-gray-700/30 rounded w-40 mb-2 shimmer" style={{ minHeight: '1.25rem' }}></div>
                        <div className="h-3 bg-white/10 dark:bg-gray-700/20 rounded w-24 shimmer" style={{ minHeight: '0.75rem', animationDelay: '0.1s' }}></div>
                    </div>
                    <div className="h-6 bg-white/20 dark:bg-gray-700/30 rounded w-28 shimmer" style={{ minHeight: '1.5rem', animationDelay: '0.2s' }}></div>
                </div>
                <div className="flex gap-2">
                    <div className="h-8 bg-white/15 dark:bg-gray-700/25 rounded-lg w-24 shimmer" style={{ minHeight: '2rem', animationDelay: '0.3s' }}></div>
                    <div className="h-8 bg-white/15 dark:bg-gray-700/25 rounded-lg w-24 shimmer" style={{ minHeight: '2rem', animationDelay: '0.4s' }}></div>
                </div>
            </div>
        </div>
    </>
);

export const SkeletonCard2: React.FC = () => (
    <div className="glass-card hover:bg-white dark:hover:bg-gray-700/50 p-3 sm:p-2 md:p-3 transition-all duration-300 relative rounded-2xl fade-in2">
        <div className="flex flex-col xs:flex-row xs:justify-between xs:items-start gap-2 xs:gap-3 mb-2 xs:mb-3">
            <div className="flex-1 min-w-0">
                <div className='h-7 bg-slate-400 dark:bg-slate-600 rounded-sm w-3/4 animate-pulse mb-2'></div>
                <div className='h-4 bg-slate-300 dark:bg-slate-700 rounded-sm w-2/4 animate-pulse'></div>
            </div>
            <div className='h-7 bg-slate-400 dark:bg-slate-600 rounded-lg w-2/5 animate-pulse'></div>
        </div>

        <div className="flex flex-wrap justify-around gap-1.5 sm:gap-2 text-xs max-sm:text-sm">
            <div className='h-6 bg-green-100 dark:bg-green-900/30 rounded-full w-1/5 animate-pulse'></div>
            <div className='h-6 bg-purple-100 dark:bg-purple-900/30 rounded-full w-1/5 animate-pulse'></div>
        </div>
    </div>
)

export const SkeletonLoader2: React.FC = () => (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="text-center">
            <div className="w-12 h-12 border-4 border-gray-300 dark:border-gray-700 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading...</p>
        </div>
    </div>
)



interface SkeletonAppProps {
    isSettingsOpen: boolean;
    setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    handleResetData: () => void;
    handleImportData: (data: any) => void;
    financeData: any;
    user: any;
    handleBackupToFirebase: () => Promise<void>;
    handleFetchFromFirebase: () => Promise<void>;
    handleGetSampleData: () => void;
}

export const SkeletonApp: React.FC<SkeletonAppProps> = ({
    isSettingsOpen,
    setIsSettingsOpen,
    handleResetData,
    handleImportData,
    financeData,
    user,
    handleBackupToFirebase,
    handleFetchFromFirebase,
    handleGetSampleData
}) => (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 fade-in">
            <div className="flex flex-col sm:flex-row justify-between gap-3 md:gap-4 mb-6">
                {/* Header */}
                {appHeader}

                {/* Controls */}
                <div className="flex gap-2 items-center">

                    <button
                        className={AppChartBtn}>
                        <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium mb-1 sm:mb-2 flex flex-row justify-between items-center">
                            Net Balance
                            <ChartPie size={16} className='scale-100 group-hover:scale-110 transition-all duration-300 ease-in-out' />
                        </p>

                        <div className='h-9 bg-slate-300 dark:bg-slate-600 rounded-sm animate-pulse'></div>
                    </button>

                    <div className='flex flex-col gap-2'>
                        <div className='h-9 bg-slate-300 dark:bg-slate-600 rounded-lg animate-pulse' style={{ "width": "10rem" }}></div>

                        <div className='flex justify-between gap-2'>
                            <button
                                className={AppDateBtn}
                                title="Clear date range">
                                <Calendar1 size={16} className='text-red-600 dark:text-red-400' />
                            </button>
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className={FreeWhiteBtn}
                            >
                                <Settings size={18} />
                                Settings
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 xs:gap-4 mb-4">
                    <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Recent Transactions
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1 flex flex-row items-center gap-1.5">Showing <div className='h-4 bg-slate-200 dark:bg-slate-700 rounded-sm w-3 animate-pulse'></div> transaction</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {[...Array(10)].map((_, i) => (
                        <SkeletonCard2 key={i} />
                    ))
                    }
                </div>
            </div>
        </div>


        <button
            className={BlueBtn}>
            <Plus size={18} />
            <span className="text-xs sm:text-sm">Add</span>
        </button>

        <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            onReset={handleResetData}
            onImport={handleImportData}
            financeData={financeData}
            onBackupToFirebase={user ? handleBackupToFirebase : undefined}
            onSyncFromFirebase={user ? handleFetchFromFirebase : undefined}
            onGetSampleData={handleGetSampleData}
        />
    </div>
)