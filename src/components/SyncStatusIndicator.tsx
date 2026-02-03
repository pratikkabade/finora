import React, { useEffect, useState } from 'react';
import { CloudOff, Check } from 'lucide-react';
import { updateTime } from '../utils/dateUtils';
import { settingBtnDetailTextClass } from '../constants/TailwindClasses';

interface SyncStatusIndicatorProps {
    isSynced: boolean;
    lastSyncTime?: number;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
    isSynced,
    lastSyncTime,
}) => {
    const [displayTime, setDisplayTime] = useState('');
    const [needSync, setNeedSync] = useState(false);

    useEffect(() => {
        if (!lastSyncTime) return;

        updateTime(lastSyncTime, setDisplayTime, setNeedSync);
        const interval = setInterval(() => updateTime(lastSyncTime, setDisplayTime, setNeedSync), 30000); // Update every 30 seconds

        return () => clearInterval(interval);
    }, [lastSyncTime]);

    return (
        <div
            // className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors w-40 slide-up2 ${isSynced && !needSync && displayTime
            //     ? 'bg-green-50/50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border border-green-200/50 dark:border-green-800/50'
            //     : 'bg-yellow-50/50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200/50 dark:border-yellow-800/50'
            //     }`}
            className={settingBtnDetailTextClass}
        >
            {isSynced ? (
                <div className={`flex flex-row gap-2 ${(isSynced && !needSync && displayTime) ? 'text-green-700 dark:text-green-300': 'text-yellow-700 dark:text-yellow-300'}`}>
                    <Check size={14} />
                    <div className='flex flex-row gap-1'>
                        <span>Synced</span>
                        <span className='text-xs'>
                            {displayTime}
                        </span>
                    </div>
                </div>
            ) : (
                <div className='flex flex-row gap-2 text-yellow-700 dark:text-yellow-300'>
                    <CloudOff size={14} />
                    <span>Local only</span>
                </div>
            )}
        </div>
    );
};
