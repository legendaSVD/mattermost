type TickCallback = (now: number) => void;
class BurnOnReadTimerTicker {
    private subscribers: Set<TickCallback> = new Set();
    private timerId: ReturnType<typeof setTimeout> | null = null;
    private started: boolean = false;
    private readonly tickInterval = 1000;
    public subscribe(callback: TickCallback): () => void {
        this.subscribers.add(callback);
        if (!this.started) {
            this.start();
            this.started = true;
        }
        return () => {
            this.unsubscribe(callback);
        };
    }
    private unsubscribe(callback: TickCallback): void {
        this.subscribers.delete(callback);
        if (this.subscribers.size === 0 && this.started) {
            this.stop();
            this.started = false;
        }
    }
    private start(): void {
        if (this.timerId) {
            return;
        }
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        this.scheduleNextTick();
    }
    private scheduleNextTick(): void {
        const now = Date.now();
        const msUntilNextSecond = this.tickInterval - (now % this.tickInterval);
        this.timerId = setTimeout(() => {
            this.tick();
            this.scheduleNextTick();
        }, msUntilNextSecond);
    }
    private tick(): void {
        if (document.hidden) {
            return;
        }
        const now = Date.now();
        this.subscribers.forEach((callback) => {
            try {
                callback(now);
            } catch (error) {
                console.error('[BurnOnRead] Timer callback error:', error);
            }
        });
    }
    private handleVisibilityChange = (): void => {
        if (!document.hidden) {
            this.tick();
        }
    };
    private stop(): void {
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    public getSubscriberCount(): number {
        return this.subscribers.size;
    }
    public cleanup(): void {
        this.stop();
        this.subscribers.clear();
        this.started = false;
    }
}
export const timerTicker = new BurnOnReadTimerTicker();