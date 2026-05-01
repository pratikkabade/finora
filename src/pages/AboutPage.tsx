import { useEffect } from 'react';
import {
    ArrowRight,
    BarChart3,
    BellRing,
    CalendarClock,
    CheckCircle2,
    Cloud,
    CreditCard,
    Download,
    Fingerprint,
    LayoutDashboard,
    PieChart,
    Repeat2,
    ShieldCheck,
    Sparkles,
    WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FreeBlueBtn, FreeWhiteBtn } from '../constants/TailwindClasses';
import './AboutPage.css';

interface HighlightCard {
    title: string;
    copy: string;
    icon: LucideIcon;
}

interface StorySection {
    eyebrow: string;
    title: string;
    copy: string;
    points: string[];
    icon: LucideIcon;
}

const heroHighlights: HighlightCard[] = [
    {
        title: 'Transaction management that stays light',
        copy: 'Add income, expenses, and transfers with the account, category, amount, and context already attached.',
        icon: LayoutDashboard,
    },
    {
        title: 'Planned payments that keep moving',
        copy: 'Surface what is due, what is coming next, and turn a recurring plan into a real transaction when it gets paid.',
        icon: BellRing,
    },
    {
        title: 'Reports that stay useful',
        copy: 'Read month trends, inspect category splits, and export the exact slice you need to PDF or Excel.',
        icon: BarChart3,
    },
];

const platformStats = [
    { value: '3', label: 'transaction types', copy: 'Income, expense, and transfer stay in one flow.' },
    { value: '2', label: 'export formats', copy: 'Share polished PDFs or keep a spreadsheet-ready Excel copy.' },
    { value: '24/7', label: 'payment visibility', copy: 'Due, upcoming, and scheduled states keep recurring money in view.' },
    { value: '1', label: 'calm workspace', copy: 'Accounts, categories, sync, PIN, and reports live together.' },
];

const storySections: StorySection[] = [
    {
        eyebrow: 'Capture clearly',
        title: 'Every movement of money gets a proper place.',
        copy: 'Finora keeps day-to-day entry simple without flattening important detail. You can tag each transaction with the right account, category, title, date, and time, then come back later to edit or remove it cleanly.',
        points: [
            'Income, expenses, and transfers all use the same grounded workflow.',
            'Multiple accounts and custom categories keep records structured.',
            'Net balance can include only the accounts you actually want to count.',
        ],
        icon: CreditCard,
    },
    {
        eyebrow: 'Plan ahead',
        title: 'Recurring payments are tracked like work, not reminders.',
        copy: 'Planned payments stay visible before they become problems. Finora shows whether an item is due today, overdue, or still scheduled later, and lets you pay, skip, edit, or advance it as life changes.',
        points: [
            'Monthly bills, subscriptions, salaries, and custom intervals are supported.',
            'Marking a planned payment as paid creates a real transaction automatically.',
            'Status badges make urgent items easy to spot without scanning every row.',
        ],
        icon: CalendarClock,
    },
    {
        eyebrow: 'Review with context',
        title: 'Reports stay visual, drillable, and export-ready.',
        copy: 'The reporting view turns stored activity into answers. Trend charts, category breakdowns, date-range filters, and transaction tables all stay connected, so you can move from summary to detail without losing the thread.',
        points: [
            'Category-based report drill-downs show the exact matching transactions.',
            'Card and table views cover both quick scans and deeper review.',
            'Exports work on the selected slice instead of forcing all-or-nothing output.',
        ],
        icon: PieChart,
    },
];

const trustCards: HighlightCard[] = [
    {
        title: 'Private by default',
        copy: 'Guest mode keeps data on the device when local-only is the right choice.',
        icon: ShieldCheck,
    },
    {
        title: 'Ready to sync',
        copy: 'Google sign-in unlocks backup and cross-device continuity through Firebase.',
        icon: Cloud,
    },
    {
        title: 'Protected access',
        copy: 'Optional PIN protection adds a simple second layer before someone can open the app.',
        icon: Fingerprint,
    },
    {
        title: 'Shareable output',
        copy: 'PDF and Excel export give you a clean handoff for review, record-keeping, or analysis.',
        icon: Download,
    },
];

export function AboutPage() {
    const navigate = useNavigate();

    useEffect(() => {
        const previousTitle = document.title;
        document.title = 'About Finora';

        return () => {
            document.title = previousTitle;
        };
    }, []);

    return (
        <div className="about-page relative min-h-screen overflow-x-hidden bg-[#f5f5f7] text-slate-950">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute left-[-8rem] top-[-8rem] h-72 w-72 rounded-full bg-sky-200/65 blur-3xl" />
                <div className="absolute right-[-6rem] top-20 h-80 w-80 rounded-full bg-cyan-200/55 blur-3xl" />
                <div className="absolute bottom-[-10rem] left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-200/45 blur-3xl" />
                <div className="about-mesh absolute inset-0 opacity-[0.22]" />
            </div>

            <header className="sticky top-0 z-30 border-b border-slate-200/75 bg-white/72 backdrop-blur-2xl">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="flex cursor-pointer items-center gap-3 rounded-full px-1 py-1 text-left transition-transform duration-300 hover:scale-[1.01] active:scale-[0.99]"
                        aria-label="Open Finora"
                    >
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-linear-to-br from-sky-500 via-blue-500 to-cyan-400 shadow-[0_20px_42px_-24px_rgba(37,99,235,0.7)]">
                            <img src="/finora-icon.svg" alt="Finora" className="h-6 w-6 object-contain" />
                        </span>
                        <span>
                            <span className="block text-sm font-semibold text-slate-900">Finora</span>
                            <span className="block text-xs text-slate-500">About the product</span>
                        </span>
                    </button>

                    <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 lg:flex">
                        <a href="#overview" className="transition-colors hover:text-slate-950">Overview</a>
                        <a href="#workflow" className="transition-colors hover:text-slate-950">Workflow</a>
                        <a href="#trust" className="transition-colors hover:text-slate-950">Privacy</a>
                    </nav>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="hidden sm:flex px-4 py-2 rounded-2xl text-sm font-medium cursor-pointer items-center justify-center gap-2 border border-slate-200/85 bg-white/85 text-slate-900 shadow-[0_16px_34px_-26px_rgba(15,23,42,0.3)] transition-all duration-300 hover:bg-slate-50"
                        >
                            Open app
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className={`${FreeBlueBtn} justify-center! whitespace-nowrap`}
                        >
                            Get started
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="relative mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 sm:pb-24 sm:pt-12 lg:px-10">
                <section className="pt-6 sm:pt-10">
                    <div className="mx-auto max-w-5xl text-center">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-sky-700">
                            About Finora
                        </p>
                        <h1 className="about-display mt-5 text-5xl leading-[0.96] font-semibold text-slate-950 sm:text-6xl lg:text-7xl">
                            Money management that feels composed from the first transaction to the final report.
                        </h1>
                        <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
                            Finora brings together fast transaction entry, planned payment management, visual reporting,
                            category control, exports, sync, and PIN protection in one calm workspace built for personal finance.
                        </p>

                        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => navigate('/')}
                                className={`${FreeBlueBtn} justify-center! min-w-44`}
                            >
                                Open Finora
                                <ArrowRight size={16} />
                            </button>
                            <a
                                href="#workflow"
                                className="inline-flex min-w-44 items-center justify-center gap-2 rounded-2xl border border-slate-200/85 bg-white/82 px-4 py-2 text-sm font-medium text-slate-900 shadow-[0_16px_34px_-26px_rgba(15,23,42,0.3)] transition-all duration-300 hover:bg-slate-50"
                            >
                                See the workflow
                            </a>
                        </div>
                    </div>

                    <div className="mt-14 grid gap-4 lg:grid-cols-[1.35fr,0.65fr]">
                        <div className="about-panel about-hero-glow rounded-[2.4rem] p-6 sm:p-8">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                                        Unified workspace
                                    </p>
                                    <h2 className="mt-3 text-2xl font-semibold text-slate-950 sm:text-3xl">
                                        One surface for what happened, what is next, and what needs attention.
                                    </h2>
                                </div>

                                <div className="about-pill about-float-card inline-flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-semibold text-slate-900">
                                    <Sparkles size={16} className="text-sky-600" />
                                    Built around the features already in Finora
                                </div>
                            </div>

                            <div className="mt-8 grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
                                <div className="about-shimmer rounded-[2rem] border border-slate-200/80 bg-slate-950 px-5 py-5 text-white shadow-[0_34px_90px_-46px_rgba(15,23,42,0.8)]">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                                                Dashboard
                                            </p>
                                            <p className="mt-2 text-3xl font-semibold">Calm visibility</p>
                                        </div>
                                        <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-sky-100">
                                            Live overview
                                        </div>
                                    </div>

                                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                        <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-4">
                                            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Net balance</p>
                                            <p className="mt-3 text-3xl font-semibold">Rs 4,82,500</p>
                                            <p className="mt-2 text-sm text-slate-300">Built from the accounts you choose to include.</p>
                                        </div>
                                        <div className="rounded-[1.6rem] border border-sky-400/20 bg-sky-400/10 p-4">
                                            <p className="text-xs uppercase tracking-[0.22em] text-sky-100/75">Upcoming dues</p>
                                            <div className="mt-3 space-y-3 text-sm">
                                                <div className="flex items-center justify-between">
                                                    <span>Rent</span>
                                                    <span className="rounded-full bg-red-400/18 px-2 py-1 text-xs text-red-100">Due today</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span>Internet</span>
                                                    <span className="rounded-full bg-amber-300/16 px-2 py-1 text-xs text-amber-100">In 2 days</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span>Salary</span>
                                                    <span className="rounded-full bg-emerald-300/16 px-2 py-1 text-xs text-emerald-100">Scheduled</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 rounded-[1.6rem] border border-white/10 bg-white/6 p-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Recent transactions</p>
                                                <p className="mt-2 text-sm text-slate-300">Transactions remain searchable, editable, and grouped by context.</p>
                                            </div>
                                            <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
                                                Cards + table
                                            </div>
                                        </div>
                                        <div className="mt-4 space-y-3">
                                            {[
                                                ['Salary', '+ Rs 82,000', 'Income'],
                                                ['Metro recharge', '- Rs 1,200', 'Expense'],
                                                ['Main to savings', 'Rs 10,000', 'Transfer'],
                                            ].map(([title, amount, kind]) => (
                                                <div
                                                    key={title}
                                                    className="flex items-center justify-between rounded-[1.2rem] border border-white/8 bg-slate-900/70 px-4 py-3"
                                                >
                                                    <div>
                                                        <p className="font-medium text-white">{title}</p>
                                                        <p className="text-xs text-slate-400">{kind}</p>
                                                    </div>
                                                    <p className="text-sm font-semibold text-slate-100">{amount}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-4">
                                    <div className="about-panel rounded-[2rem] p-5">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                                                <WalletCards size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-950">Accounts and categories</p>
                                                <p className="text-sm text-slate-600">Keep the structure right before the charts ever start.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="about-panel about-float-card-delay rounded-[2rem] p-5">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                                                <Repeat2 size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-950">Planned payments</p>
                                                <p className="text-sm text-slate-600">Recurring work stays visible instead of becoming a surprise.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="about-panel rounded-[2rem] p-5">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                                                <Download size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-950">Export and backup</p>
                                                <p className="text-sm text-slate-600">Move from active tracking to records, review, or sharing in a moment.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            {heroHighlights.map(({ title, copy, icon: Icon }) => (
                                <article key={title} className="about-panel rounded-[2rem] p-5 sm:p-6">
                                    <div className="rounded-2xl bg-slate-900 text-white inline-flex p-3">
                                        <Icon size={20} />
                                    </div>
                                    <h2 className="mt-5 text-xl font-semibold text-slate-950">
                                        {title}
                                    </h2>
                                    <p className="mt-3 text-sm leading-6 text-slate-600">
                                        {copy}
                                    </p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="overview" className="mt-16 sm:mt-20">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {platformStats.map(({ value, label, copy }) => (
                            <article key={label} className="about-panel rounded-[2rem] p-6">
                                <p className="about-display text-4xl font-semibold text-slate-950">
                                    {value}
                                </p>
                                <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    {label}
                                </p>
                                <p className="mt-4 text-sm leading-6 text-slate-600">
                                    {copy}
                                </p>
                            </article>
                        ))}
                    </div>
                </section>

                <section id="workflow" className="mt-20 grid gap-6 lg:grid-cols-[0.8fr,1.2fr]">
                    <div className="lg:sticky lg:top-24 lg:self-start">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-sky-700">
                            Workflow
                        </p>
                        <h2 className="about-display mt-4 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
                            Built to support the full rhythm of personal finance.
                        </h2>
                        <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
                            The app already covers the cycle people actually repeat: record money, manage what is coming,
                            study the result, and protect the data behind it.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {storySections.map(({ eyebrow, title, copy, points, icon: Icon }) => (
                            <article key={title} className="about-panel rounded-[2.2rem] p-6 sm:p-8">
                                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="max-w-2xl">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                                            {eyebrow}
                                        </p>
                                        <h3 className="mt-3 text-2xl font-semibold text-slate-950 sm:text-3xl">
                                            {title}
                                        </h3>
                                        <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                                            {copy}
                                        </p>
                                    </div>
                                    <div className="about-float-card-soft inline-flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-slate-950 text-white shadow-[0_22px_52px_-30px_rgba(15,23,42,0.6)]">
                                        <Icon size={24} />
                                    </div>
                                </div>

                                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                                    {points.map((point) => (
                                        <div
                                            key={point}
                                            className="rounded-[1.5rem] border border-slate-200/80 bg-white/82 p-4 text-sm leading-6 text-slate-700"
                                        >
                                            <div className="mb-3 inline-flex rounded-full bg-sky-100 p-2 text-sky-700">
                                                <CheckCircle2 size={16} />
                                            </div>
                                            {point}
                                        </div>
                                    ))}
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="mt-20">
                    <div className="about-panel-dark rounded-[2.5rem] p-6 text-white sm:p-8 lg:p-10">
                        <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr] lg:items-center">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-sky-200/75">
                                    Planned payments
                                </p>
                                <h2 className="about-display mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
                                    A better way to stay ahead of repeating money.
                                </h2>
                                <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
                                    Finora treats recurring items like an active part of the product. What is overdue,
                                    what is due soon, and what is scheduled later are all separated clearly, so action can happen fast.
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-3">
                                {[
                                    ['Overdue', 'Highlighted for quick action', 'bg-red-400/15 text-red-100 border-red-300/20'],
                                    ['Due soon', 'Visible before the deadline', 'bg-amber-300/15 text-amber-50 border-amber-200/20'],
                                    ['Scheduled', 'Still mapped for later', 'bg-slate-200/10 text-slate-100 border-white/10'],
                                ].map(([title, copy, tone]) => (
                                    <div key={title} className={`rounded-[1.8rem] border p-5 ${tone}`}>
                                        <p className="text-lg font-semibold">{title}</p>
                                        <p className="mt-3 text-sm leading-6">{copy}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section id="trust" className="mt-20">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="max-w-2xl">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-sky-700">
                                Privacy and control
                            </p>
                            <h2 className="about-display mt-4 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
                                Flexible enough for private local use, ready enough for cloud continuity.
                            </h2>
                        </div>
                        <p className="max-w-md text-sm leading-7 text-slate-600 sm:text-base">
                            Some people want everything on-device. Some want backup and sync. Finora already supports both paths,
                            while still giving the app its own PIN-based front door when needed.
                        </p>
                    </div>

                    <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {trustCards.map(({ title, copy, icon: Icon }) => (
                            <article key={title} className="about-panel rounded-[2rem] p-6">
                                <div className="inline-flex rounded-[1.2rem] bg-slate-950 p-3 text-white">
                                    <Icon size={20} />
                                </div>
                                <h3 className="mt-5 text-xl font-semibold text-slate-950">
                                    {title}
                                </h3>
                                <p className="mt-3 text-sm leading-6 text-slate-600">
                                    {copy}
                                </p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="mt-20">
                    <div className="about-panel rounded-[2.7rem] px-6 py-8 sm:px-8 sm:py-10">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                            <div className="max-w-3xl">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-sky-700">
                                    Finora today
                                </p>
                                <h2 className="about-display mt-4 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
                                    A focused finance product with room to keep growing.
                                </h2>
                                <p className="mt-5 text-base leading-7 text-slate-600">
                                    The current build already covers the core cycle well: transaction management, planned payments,
                                    reports, exports, categories, sync, and secure access. This new `/about` page simply tells that story with more intention.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={() => navigate('/')}
                                    className={`${FreeBlueBtn} justify-center! min-w-44`}
                                >
                                    Open the app
                                    <ArrowRight size={16} />
                                </button>
                                <a
                                    href="#overview"
                                    className={`${FreeWhiteBtn} justify-center! min-w-44`}
                                >
                                    Review highlights
                                </a>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
