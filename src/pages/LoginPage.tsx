import { useAuth } from '../context/AuthContext';

export function LoginPage() {
    const { loginWithGoogle, continueAsGuest, isLoading } = useAuth();

    const handleGoogleLogin = async () => {
        try {
            await loginWithGoogle();
        } catch (error) {
            console.error('Failed to login:', error);
            alert('Failed to login. Please try again.');
        }
    };

    const handleGuestLogin = async () => {
        try {
            await continueAsGuest();
        } catch (error) {
            console.error('Failed to continue as guest:', error);
            alert('Failed to continue as guest. Please try again.');
        }
    };

    return (
        <div className="app-shell-ambient relative flex min-h-screen min-h-dvh items-center justify-center overflow-hidden bg-linear-to-br from-slate-100 via-white to-sky-50 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <div data-orb="one" className="absolute left-[-5rem] top-[-4rem] h-64 w-64 rounded-full bg-sky-200/55 blur-3xl dark:bg-sky-500/12" />
                <div data-orb="two" className="absolute bottom-[-6rem] right-[-3rem] h-72 w-72 rounded-full bg-amber-200/40 blur-3xl dark:bg-amber-500/10" />
                <div data-grid="mesh" className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(148,163,184,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.16)_1px,transparent_1px)] [background-size:24px_24px]" />
            </div>

            <div className="app-section-pop app-border-soft relative flex w-full max-w-md flex-col items-center rounded-[2rem] bg-white/88 p-8 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.55)] backdrop-blur-2xl dark:bg-slate-900/88">
                <div className="app-panel-stagger text-center">
                    <div className="mb-2 inline-flex items-center justify-center rounded-full border border-sky-200/70 bg-sky-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700 dark:border-sky-700/55 dark:bg-sky-950/35 dark:text-sky-300">
                        Finora
                    </div>
                    <div className="flex items-center justify-center">
                        <img src="/finora-icon.svg" alt="Finora Logo" className="h-24 w-24" />
                    </div>
                    <h1 className="mb-2 text-3xl font-bold text-gray-800 dark:text-gray-50">Finora</h1>
                    <p className="text-gray-600 dark:text-gray-400">Clear financial insights <br />for better decisions.</p>
                </div>

                <button
                    className="app-border-surface my-20 mb-36 flex flex-row items-center rounded-full bg-white px-4 py-2 font-bold text-gray-900 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.35)] transition-[box-shadow,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:brightness-95 hover:shadow-md dark:bg-slate-800 dark:text-gray-50 dark:hover:brightness-110"
                    onClick={handleGoogleLogin} disabled={isLoading}>
                    <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full border border-slate-300/80 bg-white text-sm dark:border-slate-600/70">G</span>
                    {isLoading ? 'Signing in...' : 'Continue with Google'}
                </button>

                <button
                    className="-mt-28 mb-8 w-full rounded-2xl bg-linear-to-r from-slate-900 via-blue-950 to-slate-900 px-4 py-3 font-semibold text-white shadow-[0_24px_56px_-28px_rgba(15,23,42,0.7)] transition-[box-shadow,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:brightness-110 hover:shadow-[0_28px_64px_-28px_rgba(15,23,42,0.78)] dark:bg-gray-100 dark:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={handleGuestLogin}
                    disabled={isLoading}
                >
                    Continue as Guest
                </button>

                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Sign in with Google for cloud backup and sync. <br />Guest mode stores data only on this device.
                </p>
            </div>
        </div>
    );
}
