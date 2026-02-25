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
        <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md w-full flex flex-col items-center">
                <div className="text-center">
                    <div className="flex items-center justify-center">
                        <img src="/finora-icon.svg" alt="Finora Logo" className="h-24 w-24" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-50 mb-2">Finora</h1>
                    <p className="text-gray-600 dark:text-gray-400">Clear financial insights <br />for better decisions.</p>
                </div>

                <button
                    className="flex flex-row items-center bg-white dark:bg-gray-700 hover:brightness-95 dark:hover:brightness-110 hover:shadow-md text-gray-900 dark:text-gray-50 font-bold py-2 px-4 rounded-full cursor-pointer my-20 mb-36"
                    onClick={handleGoogleLogin} disabled={isLoading}>
                    <span className="h-6 w-6 mr-2 rounded-full bg-white border border-gray-300 text-sm flex items-center justify-center">G</span>
                    {isLoading ? 'Signing in...' : 'Continue with Google'}
                </button>

                <button
                    className="w-full bg-gray-900 dark:bg-gray-100 hover:brightness-110 text-white dark:text-gray-900 font-semibold py-3 px-4 rounded-xl transition-all cursor-pointer -mt-28 mb-8 disabled:opacity-50 disabled:cursor-not-allowed"
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
