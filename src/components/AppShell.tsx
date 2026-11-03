import React from 'react';
import { AppNavigation, type AppView, type PlannedPaymentsNavBadge } from './AppNavigation';

interface AppShellProps {
    activeView: AppView;
    children: React.ReactNode;
    overlayChildren?: React.ReactNode;
    contentClassName?: string;
    plannedPaymentsBadge?: PlannedPaymentsNavBadge;
}

const VIEW_ORDER: Record<AppView, number> = {
    home: 0,
    planned: 1,
    report: 2,
    settings: 3,
};

export const AppShell: React.FC<AppShellProps> = ({
    activeView,
    children,
    overlayChildren,
    contentClassName = '',
    plannedPaymentsBadge,
}) => {
    const previousViewRef = React.useRef(activeView);
    const previousView = previousViewRef.current;
    const pageDirection = VIEW_ORDER[activeView] >= VIEW_ORDER[previousView] ? 'forward' : 'backward';

    React.useEffect(() => {
        previousViewRef.current = activeView;
    }, [activeView]);

    return (
        <div
            data-view={activeView}
            className="app-shell-ambient relative min-h-screen min-h-dvh overflow-x-clip bg-linear-to-br from-slate-100 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
        >
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                <div
                    data-orb="one"
                    className="absolute left-[-8rem] top-[-7rem] h-72 w-72 rounded-full bg-sky-200/55 blur-3xl dark:bg-sky-500/10"
                />
                <div
                    data-orb="two"
                    className="absolute bottom-[-9rem] right-[-5rem] h-80 w-80 rounded-full bg-amber-200/45 blur-3xl dark:bg-amber-500/10"
                />
                <div
                    data-orb="three"
                    className="absolute left-1/2 top-20 h-64 w-64 -translate-x-1/2 rounded-full bg-cyan-200/25 blur-3xl dark:bg-cyan-400/10"
                />
                <div
                    data-grid="mesh"
                    className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(148,163,184,0.24)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.18)_1px,transparent_1px)] [background-size:24px_24px]"
                />
            </div>

            <AppNavigation activeView={activeView} plannedPaymentsBadge={plannedPaymentsBadge} />

            <main
                className={`relative mx-auto min-h-screen min-h-dvh max-w-7xl px-3 pb-28 pt-8 sm:px-5 sm:pt-10 md:px-8 md:pt-10 md:pb-12 md:pl-72 lg:px-10 lg:pt-12 lg:pl-80 ${contentClassName}`}
                style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 2rem)' }}
            >
                <div
                    key={activeView}
                    className={`app-page-enter ${pageDirection === 'forward' ? 'app-page-enter-forward' : 'app-page-enter-backward'}`}
                >
                    {children}
                </div>
            </main>

            {overlayChildren}
        </div>
    );
};
