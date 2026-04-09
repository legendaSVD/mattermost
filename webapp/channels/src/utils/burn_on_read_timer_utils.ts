export function formatTimeRemaining(ms: number): string {
    const remaining = Math.max(0, ms);
    const totalSeconds = Math.ceil(remaining / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
export function calculateRemainingTime(expireAt: number): number {
    const expireAtMs = expireAt < 10000000000 ? expireAt * 1000 : expireAt;
    return expireAtMs - Date.now();
}
export function isTimerInWarningState(remainingMs: number): boolean {
    return remainingMs <= 60000;
}
export function isTimerExpired(remainingMs: number): boolean {
    return remainingMs <= 0;
}
export function getAriaAnnouncementInterval(remainingMs: number): number {
    if (remainingMs <= 60000) {
        return 10000;
    }
    return 60000;
}
export function formatAriaAnnouncement(ms: number): string {
    const remaining = Math.max(0, ms);
    const totalSeconds = Math.ceil(remaining / 1000);
    if (totalSeconds === 0) {
        return 'Message deleting now';
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0 && seconds > 0) {
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ${seconds} ${seconds === 1 ? 'second' : 'seconds'} remaining`;
    }
    if (minutes > 0) {
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} remaining`;
    }
    return `${seconds} ${seconds === 1 ? 'second' : 'seconds'} remaining`;
}