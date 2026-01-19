import { useAuth } from '../context/AuthContext';

export function LoginPage() {
    const { loginWithGoogle, isLoading } = useAuth();

    const handleGoogleLogin = async () => {
        try {
            await loginWithGoogle();
        } catch (error) {
            console.error('Failed to login:', error);
            alert('Failed to login. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full flex flex-col items-center">
                <div className="text-center">
                    <div className="flex items-center justify-center">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/a/a1/Wallet_App_icon_iOS_12.png" alt="Finora Logo" className="h-24 w-24" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Finora</h1>
                    <p className="text-gray-600">Clear financial insights <br/>for better decisions.</p>
                </div>

                <button
                    className="flex flex-row items-center bg-white hover:brightness-95 hover:shadow-md text-gray-900 font-bold py-2 px-4 rounded-full cursor-pointer my-20 mb-36"
                    onClick={handleGoogleLogin} disabled={isLoading}>
                    <img src="https://raw.githubusercontent.com/dependabot-pr/Static-Files/main/Assets/Logo/Google.svg"
                        className="h-6 w-6 mr-2"
                        alt="google logo" />
                    {isLoading ? 'Signing in...' : 'Sign in with Google'}
                </button>

                <p className="text-xs text-gray-500 text-center">
                    Secure login powered by Google. <br />Your data will be encrypted and stored safely.
                </p>
            </div>
        </div>
    );
}
