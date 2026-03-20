import React from 'react';
import { AppNavigation, type AppView } from './AppNavigation';

interface AppShellProps {
    activeView: AppView;
    children: React.ReactNode;
    contentClassName?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
    activeView,
    children,
    contentClassName = '',
}) => {
    return (
        <div className="relative min-h-screen min-h-dvh overflow-hidden bg-linear-to-br from-slate-100 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <div className="absolute left-[-8rem] top-[-7rem] h-72 w-72 rounded-full bg-sky-200/55 blur-3xl dark:bg-sky-500/10" />
                <div className="absolute bottom-[-9rem] right-[-5rem] h-80 w-80 rounded-full bg-amber-200/45 blur-3xl dark:bg-amber-500/10" />
                <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(148,163,184,0.24)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.18)_1px,transparent_1px)] [background-size:24px_24px]" />
            </div>

            <AppNavigation activeView={activeView} />

            <main className={`relative mx-auto min-h-screen min-h-dvh max-w-7xl px-3 pb-28 pt-4 sm:px-4 sm:pt-6 md:px-6 md:pb-10 md:pl-28 lg:px-8 lg:pl-32 ${contentClassName}`}>
                {children}
            </main>
        </div>
    );
};
