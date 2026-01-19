import React from 'react';
import { Cloud, Zap } from 'lucide-react';

interface DataSourceModalProps {
    isOpen: boolean;
    onFetchFirebase: () => Promise<void>;
    onGetDummyData: () => void;
}

export const DataSourceModal: React.FC<DataSourceModalProps> = ({
    isOpen,
    onFetchFirebase,
    onGetDummyData,
}) => {
    const [isLoadingFirebase, setIsLoadingFirebase] = React.useState(false);

    const handleFetchFirebase = async () => {
        setIsLoadingFirebase(true);
        try {
            await onFetchFirebase();
        } finally {
            setIsLoadingFirebase(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-lg flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                {/* Header */}
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h2>
                <p className="text-gray-600 mb-6">
                    How would you like to start?
                </p>

                {/* Option 1: Firebase Data */}
                <button
                    onClick={handleFetchFirebase}
                    disabled={isLoadingFirebase}
                    className="w-full bg-linear-to-r from-blue-500 to-blue-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4 flex items-center justify-center gap-2"
                >
                    <Cloud size={20} />
                    {isLoadingFirebase ? 'Fetching...' : 'Fetch from Firebase'}
                </button>
                <p className="text-sm text-gray-600 text-center mb-4">
                    Load your previously backed up data from the cloud
                </p>

                {/* Divider */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-gray-300"></div>
                    <span className="text-gray-500 text-sm">or</span>
                    <div className="flex-1 h-px bg-gray-300"></div>
                </div>

                {/* Option 2: Dummy Data */}
                <button
                    onClick={onGetDummyData}
                    disabled={isLoadingFirebase}
                    className="w-full bg-linear-to-r from-purple-500 to-purple-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    <Zap size={20} />
                    Get Sample Data
                </button>
                <p className="text-sm text-gray-600 text-center">
                    Start with sample transactions to explore the app
                </p>

                {/* Info */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <p className="text-xs text-gray-700">
                        💡 <strong>Tip:</strong> You can always change this later in Settings. Firebase data is optional - your data is always saved locally.
                    </p>
                </div>
            </div>
        </div>
    );
};
