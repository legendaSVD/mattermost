import {useEffect, useState, useMemo} from 'react';
import {timerTicker} from 'utils/burn_on_read_timer_ticker';
import {
    calculateRemainingTime,
    formatTimeRemaining,
    isTimerExpired,
    isTimerInWarningState,
} from 'utils/burn_on_read_timer_utils';
interface TimerState {
    remainingMs: number;
    displayText: string;
    isExpired: boolean;
    isWarning: boolean;
}
interface UseBurnOnReadTimerOptions {
    expireAt: number | null;
}
export function useBurnOnReadTimer({expireAt}: UseBurnOnReadTimerOptions): TimerState {
    const [remainingMs, setRemainingMs] = useState<number>(() => {
        if (!expireAt) {
            return 0;
        }
        return calculateRemainingTime(expireAt);
    });
    useEffect(() => {
        if (!expireAt) {
            return undefined;
        }
        const initialRemaining = calculateRemainingTime(expireAt);
        setRemainingMs(initialRemaining);
        if (isTimerExpired(initialRemaining)) {
            return undefined;
        }
        let hasExpired = false;
        const unsubscribe = timerTicker.subscribe((now) => {
            if (hasExpired) {
                return;
            }
            const expireAtMs = expireAt < 10000000000 ? expireAt * 1000 : expireAt;
            const newRemaining = expireAtMs - now;
            setRemainingMs(newRemaining);
            if (isTimerExpired(newRemaining)) {
                hasExpired = true;
            }
        });
        return unsubscribe;
    }, [expireAt]);
    const displayText = useMemo(() => formatTimeRemaining(remainingMs), [remainingMs]);
    const isExpired = useMemo(() => isTimerExpired(remainingMs), [remainingMs]);
    const isWarning = useMemo(() => isTimerInWarningState(remainingMs), [remainingMs]);
    return {
        remainingMs,
        displayText,
        isExpired,
        isWarning,
    };
}