import { FreeBlueBtn, FreeWhiteBtn } from '../constants/TailwindClasses';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

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

            <div className="app-section-pop app-border-soft relative flex w-full max-w-md flex-col items-center rounded-[2rem] bg-white/88 p-8 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.55)] backdrop-blur-2xl dark:bg-slate-900/88 gap-10">
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

                <div className='flex flex-col gap-5 w-full mt-5'>
                    <button
                        // className="mt-20 mb-36 flex flex-row items-center justify-center w-full rounded-2xl bg-linear-to-r from-slate-900 via-blue-950 to-slate-900 px-4 py-3 font-semibold text-white transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:brightness-125 dark:bg-gray-100 dark:text-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                        // className="text-white bg-brand box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none flex flex-row items-center justify-center w-full cursor-pointer"
                        className={FreeBlueBtn}
                        onClick={handleGoogleLogin} disabled={isLoading}>
                        <svg className="w-4 h-4 me-1.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12.037 21.998a10.313 10.313 0 0 1-7.168-3.049 9.888 9.888 0 0 1-2.868-7.118 9.947 9.947 0 0 1 3.064-6.949A10.37 10.37 0 0 1 12.212 2h.176a9.935 9.935 0 0 1 6.614 2.564L16.457 6.88a6.187 6.187 0 0 0-4.131-1.566 6.9 6.9 0 0 0-4.794 1.913 6.618 6.618 0 0 0-2.045 4.657 6.608 6.608 0 0 0 1.882 4.723 6.891 6.891 0 0 0 4.725 2.07h.143c1.41.072 2.8-.354 3.917-1.2a5.77 5.77 0 0 0 2.172-3.41l.043-.117H12.22v-3.41h9.678c.075.617.109 1.238.1 1.859-.099 5.741-4.017 9.6-9.746 9.6l-.215-.002Z" clip-rule="evenodd" /></svg>
                        {isLoading ? 'Authenticating...' : 'Continue with Google'}
                    </button>

                    <button
                        // className="-mt-28 mb-8 w-full rounded-2xl bg-linear-to-r from-slate-900 via-blue-950 to-slate-900 px-4 py-3 font-semibold text-white transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:brightness-125 dark:bg-gray-100 dark:text-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                        // className="text-heading bg-neutral-primary-soft box-border border border-default-medium hover:bg-neutral-tertiary-medium focus:ring-4 focus:ring-neutral-tertiary shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none flex flex-row items-center justify-center w-full cursor-pointer"
                        className={`${FreeWhiteBtn} justify-center!`}
                        onClick={handleGuestLogin}
                        disabled={isLoading}
                    >
                        Continue as Guest
                    </button>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Sign in with Google for cloud backup and sync. <br />Guest mode stores data only on this device.
                </p>

                <Link
                    to="/about"
                    className="text-sm font-medium text-sky-700 transition-colors hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
                >
                    Learn more about Finora
                </Link>
            </div>
        </div>
    );
}
