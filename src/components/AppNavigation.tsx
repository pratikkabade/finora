import React from 'react';
import { BarChart3, BellRing, Home, Settings2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { PlannedPaymentBadgeTone } from '../utils/plannedPaymentUtils';

export type AppView = 'home' | 'planned' | 'report' | 'settings';

export interface PlannedPaymentsNavBadge {
    count: number;
    tone: PlannedPaymentBadgeTone;
}

interface AppNavigationProps {
    activeView: AppView;
    plannedPaymentsBadge?: PlannedPaymentsNavBadge;
}

const navItems = [
    {
        id: 'home' as const,
        label: 'Home',
        desktopLabel: 'Dashboard',
        path: '/',
        icon: Home,
    },
    {
        id: 'planned' as const,
        label: 'Planned',
        desktopLabel: 'Planned Payments',
        path: '/planned-payments',
        icon: BellRing,
    },
    {
        id: 'report' as const,
        label: 'Report',
        desktopLabel: 'Reports',
        path: '/report',
        icon: BarChart3,
    },
    {
        id: 'settings' as const,
        label: 'Settings',
        desktopLabel: 'Settings',
        path: '/settings',
        icon: Settings2,
    },
];

const getBadgeClassName = (tone: PlannedPaymentBadgeTone) => {
    if (tone === 'red') {
        return 'border-red-300/90 bg-red-500 text-white shadow-[0_10px_22px_-12px_rgba(239,68,68,0.9)]';
    }

    return 'border-amber-200/90 bg-amber-300 text-slate-950 shadow-[0_10px_22px_-12px_rgba(251,191,36,0.92)]';
};

const renderBadge = (badge?: PlannedPaymentsNavBadge) => {
    if (!badge || !badge.count || !badge.tone) {
        return null;
    }

    const displayCount = badge.count > 99 ? '99' : String(badge.count);

    return (
        <span
            className={`pointer-events-none absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold leading-none tabular-nums ${getBadgeClassName(badge.tone)}`}
        >
            {displayCount}
        </span>
    );
};

export const navButton = (
    { id, icon: Icon, desktopLabel, path }: Omit<typeof navItems[number], 'label'>,
    isActive: boolean,
    handleNavigate: (path: string) => void,
    badge?: PlannedPaymentsNavBadge,
) => {
    return (
        <button
            key={id}
            type="button"
            onClick={() => handleNavigate(path)}
            aria-current={isActive ? 'page' : undefined}
            className={`group relative flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-xl px-3 py-3 text-left text-sm font-semibold transition-all duration-300 active:scale-[0.98] ${isActive
                ? 'text-blue-50 bg-blue-600/95 dark:bg-blue-700'
                : 'border text-slate-600 hover:border-slate-200/85 hover:bg-white/62 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-700/70 dark:hover:bg-slate-800/55 dark:hover:text-slate-50 border-slate-100 dark:border-slate-700'
                }`}
            title={desktopLabel}
        >
            {renderBadge(badge)}
            <Icon size={18} className={`transition-transform duration-300 ${isActive ? 'scale-105' : 'group-hover:scale-105 group-active:scale-95'}`} />
            <span className="relative truncate">{desktopLabel}</span>
        </button>
    )
}

export const AppNavigation: React.FC<AppNavigationProps> = ({ activeView, plannedPaymentsBadge }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileNavCompact, setIsMobileNavCompact] = React.useState(false);
    const lastScrollYRef = React.useRef(0);
    const scrollFrameRef = React.useRef<number | null>(null);

    React.useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        lastScrollYRef.current = window.scrollY;

        const syncMobileNav = () => {
            const currentScrollY = window.scrollY;
            const scrollDelta = currentScrollY - lastScrollYRef.current;

            if (currentScrollY <= 16) {
                setIsMobileNavCompact(false);
            } else if (scrollDelta > 10 && currentScrollY > 72) {
                setIsMobileNavCompact(true);
            } else if (scrollDelta < -8) {
                setIsMobileNavCompact(false);
            }

            lastScrollYRef.current = currentScrollY;
            scrollFrameRef.current = null;
        };

        const handleScroll = () => {
            if (scrollFrameRef.current !== null) {
                return;
            }

            scrollFrameRef.current = window.requestAnimationFrame(syncMobileNav);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);

            if (scrollFrameRef.current !== null) {
                window.cancelAnimationFrame(scrollFrameRef.current);
            }
        };
    }, []);

    React.useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        setIsMobileNavCompact(false);
        lastScrollYRef.current = window.scrollY;
    }, [location.pathname]);

    const handleNavigate = (path: string) => {
        if (location.pathname === path) {
            window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            return;
        }

        const completeNavigation = () => {
            navigate(path);
            window.requestAnimationFrame(() => {
                window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            });
        };

        const documentWithViewTransition = document as Document & {
            startViewTransition?: (callback: () => void) => void;
        };

        try {
            if (documentWithViewTransition.startViewTransition) {
                documentWithViewTransition.startViewTransition(() => {
                    completeNavigation();
                });
                return;
            }
        } catch (error) {
            console.error('View transition failed, falling back to standard navigation.', error);
        }

        completeNavigation();
    };

    return (
        <>
            <aside className="fixed bottom-5 left-5 top-5 z-30 hidden w-64 md:flex">
                <div className="app-nav-shell app-border-soft flex h-full w-full flex-col overflow-hidden rounded-[2rem] bg-white/82 p-3 shadow-[0_24px_70px_-28px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:bg-slate-900/78">
                    <div className="app-border-soft mb-4 flex items-center gap-3 rounded-[1.6rem] bg-white/75 px-3 py-3 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.28)] dark:bg-slate-950/35">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-linear-to-br from-sky-500 via-blue-500 to-cyan-400 shadow-[0_18px_34px_-18px_rgba(37,99,235,0.8)]">
                            <img src="/finora-icon.svg" alt="Finora" className="h-7 w-7 rounded-md object-contain" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-sky-600/80 dark:text-sky-300/75">
                                Workspace
                            </p>
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                                Finora
                            </p>
                        </div>
                    </div>

                    <nav className="flex flex-col h-full justify-between">
                        <div className='flex flex-1 flex-col gap-3'>
                            {navItems
                                .filter((_, index) => index < navItems.length - 1)
                                .map(({ id, icon: Icon, desktopLabel, path }) => {
                                    const isActive = activeView === id;
                                    const badge = id === 'planned' ? plannedPaymentsBadge : undefined;

                                    return (
                                        <React.Fragment key={id}>
                                            {navButton({ id, icon: Icon, desktopLabel, path }, isActive, handleNavigate, badge)}
                                        </React.Fragment>
                                    );
                                })}
                        </div>
                        {/* show last item */}
                        {navItems.slice(-1).map(({ id, icon: Icon, desktopLabel, path }) => {
                            const isActive = activeView === id;
                            const badge = id === 'planned' ? plannedPaymentsBadge : undefined;

                            return (
                                <React.Fragment key={id}>
                                    {navButton({ id, icon: Icon, desktopLabel, path }, isActive, handleNavigate, badge)}
                                </React.Fragment>
                            );
                        })}
                    </nav>
                </div>
            </aside>

            <nav
                className="fixed inset-x-0 bottom-0 z-40 px-3 md:hidden"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.6rem)' }}
            >
                <div className={`app-nav-shell app-border-soft pointer-events-auto mx-auto flex w-fit items-center rounded-[2rem] bg-white/55 backdrop-blur-[26px] transition-all duration-300 ease-out dark:bg-slate-900/55 ${isMobileNavCompact
                    ? 'gap-1 p-1 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.55)]'
                    : 'gap-1.5 p-1.5 shadow-[0_24px_65px_-28px_rgba(15,23,42,0.55)]'
                    }`}>
                    {navItems.map(({ id, icon: Icon, label, path }) => {
                        const isActive = activeView === id;
                        const showMobileLabel = !isMobileNavCompact && isActive;
                        const badge = id === 'planned' ? plannedPaymentsBadge : undefined;

                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => handleNavigate(path)}
                                aria-current={isActive ? 'page' : undefined}
                                aria-label={label}
                                className={`group relative flex cursor-pointer items-center justify-center overflow-hidden rounded-[1.45rem] border text-[11px] font-semibold touch-manipulation transition-[width,height,background-color,color,box-shadow,border-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.96] ${isMobileNavCompact
                                    ? 'h-11 w-11'
                                    : isActive
                                        ? 'h-12 w-[6.4rem]'
                                        : 'h-12 w-12'
                                    } ${isActive
                                        ? 'app-border-surface bg-white/82 text-slate-950 shadow-[0_16px_30px_-18px_rgba(15,23,42,0.55)] dark:bg-slate-100 dark:text-slate-950 border-slate-300'
                                        : 'border border-slate-200/55 text-slate-500 hover:border-slate-300/80 hover:bg-white/35 hover:text-slate-900 hover:shadow-[0_16px_32px_-20px_rgba(15,23,42,0.35)] dark:border-slate-700/55 dark:text-slate-400 dark:hover:border-slate-500/75 dark:hover:bg-slate-800/50 dark:hover:text-slate-50'
                                    }`}
                            >
                                {badge && badge.count > 0 && badge.tone ? (
                                    <span
                                        className={`pointer-events-none absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold leading-none tabular-nums ${getBadgeClassName(badge.tone)}`}
                                    >
                                        {badge.count > 99 ? '99' : badge.count}
                                    </span>
                                ) : null}
                                <span
                                    className={`pointer-events-none absolute inset-0 bg-linear-to-br from-white/45 via-white/0 to-sky-100/30 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                        }`}
                                />
                                <span
                                    className={`app-nav-active-indicator pointer-events-none absolute inset-x-2 top-1 h-9 rounded-2xl bg-linear-to-r from-sky-400/20 via-blue-500/20 to-cyan-400/20 blur-xl transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'
                                        }`}
                                />
                                <span className={`grid items-center overflow-hidden transition-[grid-template-columns,gap] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${showMobileLabel ? 'grid-cols-[32px_1fr] gap-2' : 'grid-cols-[32px_0fr] gap-0'
                                    }`}>
                                    <span className="relative flex h-8 w-8 items-center justify-center justify-self-center rounded-full">
                                        <Icon size={18} className={`shrink-0 transition-transform duration-300 ${isActive ? 'scale-105' : 'group-active:scale-95'}`} />
                                    </span>
                                    <span className="overflow-hidden">
                                        <span className={`block whitespace-nowrap text-[11px] tracking-[0.02em] transition-[opacity,transform] duration-200 ease-out ${showMobileLabel ? 'translate-x-0 opacity-100' : 'translate-x-1 opacity-0'
                                            }`}>
                                            {label}
                                        </span>
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </nav>
        </>
    );
};
