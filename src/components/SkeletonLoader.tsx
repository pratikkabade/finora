import React from 'react';
import { AppHeader } from '../App';
import { CalendarDays } from 'lucide-react';
import { amountCard, FreeWhiteBtn, pieChartCard, transactionCard } from '../constants/TailwindClasses';

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
        <div className="app-border-soft w-full rounded-2xl bg-white/24 p-4 backdrop-blur-xl dark:bg-slate-900/32 sm:p-5 md:p-6" style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)' }}>
            <div>
                <div className="shimmer mb-4 h-4 w-24 rounded bg-white/20 dark:bg-gray-700/30" style={{ minHeight: '1rem' }} />
                <div className="shimmer h-8 w-32 rounded bg-white/20 dark:bg-gray-700/30" style={{ minHeight: '2rem' }} />
            </div>
        </div>
    </>
);

export const SkeletonChart: React.FC = () => (
    <>
        <style>{shimmerStyle}</style>
        <div className={pieChartCard}>
            <div>
                <div className="shimmer mb-6 h-6 w-32 rounded bg-white/20 dark:bg-gray-700/30" style={{ minHeight: '1.5rem' }} />
                <div className="shimmer h-64 rounded bg-white/10 dark:bg-gray-700/20" style={{ minHeight: '16rem' }} />
            </div>
        </div>
    </>
);

export const SkeletonTable: React.FC = () => (
    <>
        <style>{shimmerStyle}</style>
        <div className={pieChartCard}>
            <div>
                <div className="shimmer mb-6 h-6 w-48 rounded bg-white/20 dark:bg-gray-700/30" style={{ minHeight: '1.5rem' }} />
                <div className="space-y-3">
                    {[...Array(5)].map((_, index) => (
                        <div key={index} className="shimmer h-10 rounded bg-white/10 dark:bg-gray-700/20" style={{ minHeight: '2.5rem', animationDelay: `${index * 0.1}s` }} />
                    ))}
                </div>
            </div>
        </div>
    </>
);

export const SkeletonCard2: React.FC = () => (
    <div className={`${transactionCard} pointer-events-none`}>
        <div className="mb-2 flex flex-col gap-2 xs:flex-row xs:items-start xs:justify-between xs:gap-3 xs:mb-3">
            <div className="min-w-0 flex-1">
                <div className="mb-2 h-7 w-3/4 animate-pulse rounded-sm bg-slate-400 dark:bg-slate-600" />
                <div className="h-4 w-2/4 animate-pulse rounded-sm bg-slate-300 dark:bg-slate-700" />
            </div>
            <div className="h-7 w-2/5 animate-pulse rounded-lg bg-slate-400 dark:bg-slate-600" />
        </div>

        <div className="flex flex-wrap justify-around gap-1.5 text-xs max-sm:text-sm sm:gap-2">
            <div className="h-6 w-1/5 animate-pulse rounded-full bg-green-100 dark:bg-green-900/30" />
            <div className="h-6 w-1/5 animate-pulse rounded-full bg-purple-100 dark:bg-purple-900/30" />
        </div>
    </div>
);

export const SkeletonLoader2: React.FC = () => (
    <div className="flex min-h-screen min-h-dvh items-center justify-center bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-indigo-600 dark:border-gray-700 dark:border-t-indigo-400" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
    </div>
);

interface SkeletonAppProps {
    variant?: 'home' | 'report';
}

export const SkeletonApp: React.FC<SkeletonAppProps> = ({ variant = 'home' }) => (
    <div className="app-panel-stagger">
        {variant === 'report' ? (
            <>
                <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                    <div>
                        <div className="mb-3 h-3 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                        <div className="mb-3 h-10 w-40 animate-pulse rounded-xl bg-slate-300 dark:bg-slate-600" />
                        <div className="h-4 w-72 max-w-full animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                    </div>

                    <div className="flex items-center gap-2 self-start">
                        <button
                            className={`${FreeWhiteBtn} w-36!`}
                            title="Select month or custom date range"
                        >
                            <CalendarDays size={16} />
                            Date Range
                        </button>
                    </div>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 md:gap-6">
                    <div className={amountCard}>
                        <div className="mb-2 h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                        <div className="h-9 w-36 animate-pulse rounded bg-slate-300 dark:bg-slate-600" />
                    </div>
                    <div className={amountCard}>
                        <div className="mb-2 h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                        <div className="h-9 w-36 animate-pulse rounded bg-slate-300 dark:bg-slate-600" />
                    </div>
                </div>

                <div className="flex flex-col gap-3 sm:gap-4 md:gap-6">
                    <SkeletonChart />
                    <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:gap-6">
                        <SkeletonChart />
                        <SkeletonChart />
                    </div>
                    <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:gap-6">
                        <SkeletonTable />
                        <SkeletonTable />
                    </div>
                </div>
            </>
        ) : (
            <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <AppHeader />
                <div className={`${amountCard} w-full sm:max-w-xs`}>
                    <div className="mb-2 h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-9 w-36 animate-pulse rounded bg-slate-300 dark:bg-slate-600" />
                </div>
            </div>
        )}

        {variant === 'home' && (
            <div>
                <div className="mb-4 flex flex-col gap-2 xs:flex-row xs:items-center xs:justify-between xs:gap-4">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 sm:text-xl md:text-2xl">
                            Recent Transactions
                        </h2>
                        <p className="mt-0.5 flex flex-row items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 sm:mt-1 sm:text-sm">
                            Showing
                            <span className="h-4 w-3 animate-pulse rounded-sm bg-slate-200 dark:bg-slate-700" />
                            transaction
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {[...Array(10)].map((_, index) => (
                        <SkeletonCard2 key={index} />
                    ))}
                </div>
            </div>
        )}
    </div>
);
