import React, { useEffect, useState } from 'react';
import { updateTime } from '../utils/dateUtils';
import { settingBtnDetailTextClass } from '../constants/TailwindClasses';
import type { SyncStatusSnapshot } from '../App';

interface SyncStatusIndicatorProps {
    status: SyncStatusSnapshot;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
    status,
}) => {
    const [displayTime, setDisplayTime] = useState('');
    const [needSync, setNeedSync] = useState(false);
    const lastSyncTime = status.lastBackupDate ? new Date(status.lastBackupDate).getTime() : 0;

    useEffect(() => {
        if (!lastSyncTime) return;

        updateTime(lastSyncTime, setDisplayTime, setNeedSync);
        const interval = setInterval(() => updateTime(lastSyncTime, setDisplayTime, setNeedSync), 30000); // Update every 30 seconds

        return () => clearInterval(interval);
    }, [lastSyncTime]);

    return (
        <div className={settingBtnDetailTextClass}>
            {status.state === 'outOfSync' ? (
                <div className='flex flex-row gap-1 text-red-700 dark:text-red-400'>
                    <span>Out of sync, Please restore from cloud</span>
                </div>
            ) : status.state === 'upToDate' ? (
                <div className={`flex flex-row gap-1 ${!needSync ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'}`}>
                    <div className='flex flex-row gap-1'>
                        <span>Synced</span>
                        <span className='text-xs'>
                            {displayTime}
                        </span>
                    </div>
                </div>
            ) : status.state === 'pending' ? (
                <div className='flex flex-row gap-1 text-yellow-700 dark:text-yellow-400'>
                    <span>Sync pending</span>
                </div>
            ) : status.state === 'unknown' ? (
                <div className='flex flex-row gap-1 text-yellow-700 dark:text-yellow-400'>
                    <span>Cloud status unknown</span>
                </div>
            ) : (
                <div className='flex flex-row gap-1 text-yellow-700 dark:text-yellow-400'>
                    <span>Local only</span>
                </div>
            )}
        </div>
    );
};
