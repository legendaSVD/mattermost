import {useMemo} from 'react';
import type {CloudUsage} from '@mattermost/types/cloud';
import useGetLimits from './useGetLimits';
import useGetUsage from './useGetUsage';
export const withBackupValue = (maybeLimit: number | undefined, limitsLoaded: boolean) => (limitsLoaded ? (maybeLimit ?? Number.MAX_VALUE) : Number.MAX_VALUE);
export default function useGetUsageDeltas(): CloudUsage {
    const usage = useGetUsage();
    const [limits, limitsLoaded] = useGetLimits();
    const usageDelta = useMemo(() => {
        return (
            {
                files: {
                    totalStorage: usage.files.totalStorage - withBackupValue(limits.files?.total_storage, limitsLoaded),
                    totalStorageLoaded: usage.files.totalStorageLoaded,
                },
                messages: {
                    history: usage.messages.history - withBackupValue(limits.messages?.history, limitsLoaded),
                    historyLoaded: usage.messages.historyLoaded,
                },
                teams: {
                    active: usage.teams.active - withBackupValue(limits.teams?.active, limitsLoaded),
                    cloudArchived: usage.teams.cloudArchived,
                    teamsLoaded: usage.teams.teamsLoaded,
                },
            }
        );
    }, [usage, limits, limitsLoaded]);
    return usageDelta;
}