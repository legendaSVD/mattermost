import type {FormatNumberOptions} from 'react-intl';
import type {CloudUsage, Limits} from '@mattermost/types/cloud';
import {FileSizes} from './file_utils';
export function asGBString(bits: number, formatNumber: (b: number, options: FormatNumberOptions) => string): string {
    return `${formatNumber(bits / FileSizes.Gigabyte, {maximumFractionDigits: 1})}GB`;
}
export function inK(num: number): string {
    return `${Math.floor(num / 1000)}K`;
}
export function toUsagePercent(usage: number, limit: number): number {
    return Math.floor((usage / limit) * 100);
}
export const fallbackStarterLimits = {
    messages: {
        history: 10000,
    },
    files: {
        totalStorage: Number(FileSizes.Gigabyte),
    },
    teams: {
        active: 1,
    },
};
export function anyUsageDeltaExceededLimit(deltas: CloudUsage) {
    let foundAPositive = false;
    JSON.parse(JSON.stringify(deltas), (key, value) => {
        if (typeof value === 'number' && value > 0) {
            foundAPositive = true;
        }
    });
    return foundAPositive;
}
export function hasSomeLimits(limits: Limits): boolean {
    return Object.keys(limits).length > 0;
}
export const limitThresholds = Object.freeze({
    ok: 0,
    warn: 50,
    danger: 66,
    reached: 100,
    exceeded: 100.000001,
});
export const LimitTypes = {
    messageHistory: 'messageHistory',
    fileStorage: 'fileStorage',
} as const;