import {handlePostExpired} from 'actions/burn_on_read_deletion';
import type {DispatchFunc} from 'types/store';
class BurnOnReadExpirationScheduler {
    private nextTimerId: ReturnType<typeof setTimeout> | null = null;
    private pollingIntervalId: ReturnType<typeof setInterval> | null = null;
    private postExpirations: Map<string, number> = new Map();
    private dispatch: DispatchFunc | null = null;
    private initialized = false;
    private readonly gracePeriodMs = 2000;
    private readonly shortDelayThreshold = 15 * 60 * 1000;
    private readonly pollingInterval = 60 * 1000;
    public initialize(dispatch: DispatchFunc): void {
        this.dispatch = dispatch;
        if (!this.initialized) {
            document.addEventListener('visibilitychange', this.handleVisibilityChange);
            this.initialized = true;
        }
    }
    public registerPost(postId: string, expireAt: number | null, maxExpireAt: number | null): void {
        const activeExpiration = this.getActiveExpiration(expireAt, maxExpireAt);
        if (!activeExpiration) {
            this.unregisterPost(postId);
            return;
        }
        const now = Date.now();
        const timeSinceExpiration = now - activeExpiration;
        if (timeSinceExpiration > this.gracePeriodMs) {
            this.handleExpiration(postId);
            return;
        }
        const previousExpiration = this.postExpirations.get(postId);
        this.postExpirations.set(postId, activeExpiration);
        if (previousExpiration !== activeExpiration) {
            this.recomputeSchedule();
        }
    }
    public unregisterPost(postId: string): void {
        if (this.postExpirations.delete(postId)) {
            this.recomputeSchedule();
        }
    }
    private recomputeSchedule(): void {
        if (this.nextTimerId) {
            clearTimeout(this.nextTimerId);
            this.nextTimerId = null;
        }
        if (this.pollingIntervalId) {
            clearInterval(this.pollingIntervalId);
            this.pollingIntervalId = null;
        }
        if (this.postExpirations.size === 0) {
            return;
        }
        const {postId: nextPostId, expireAt: nextExpiration} = this.getNextExpiring();
        if (!nextPostId) {
            return;
        }
        const delay = Math.max(0, (nextExpiration + this.gracePeriodMs) - Date.now());
        if (delay < this.shortDelayThreshold) {
            this.nextTimerId = setTimeout(() => {
                this.checkAndExpirePosts();
            }, delay);
        } else {
            this.checkAndExpirePosts();
            this.pollingIntervalId = setInterval(() => {
                this.checkAndExpirePosts();
            }, this.pollingInterval);
        }
    }
    private getNextExpiring(): {postId: string | null; expireAt: number} {
        let nextPostId: string | null = null;
        let nextExpiration = Infinity;
        for (const [postId, expireAt] of this.postExpirations.entries()) {
            if (expireAt < nextExpiration) {
                nextExpiration = expireAt;
                nextPostId = postId;
            }
        }
        return {postId: nextPostId, expireAt: nextExpiration};
    }
    public checkAndExpirePosts(): void {
        const now = Date.now();
        const expiredPosts: string[] = [];
        for (const [postId, expireAt] of this.postExpirations.entries()) {
            if (expireAt + this.gracePeriodMs <= now) {
                expiredPosts.push(postId);
            }
        }
        for (const postId of expiredPosts) {
            this.postExpirations.delete(postId);
        }
        if (expiredPosts.length > 0 && this.dispatch) {
            for (const postId of expiredPosts) {
                try {
                    this.dispatch(handlePostExpired(postId));
                } catch (error) {
                    console.error('[BurnOnRead] Failed to handle post expiration:', postId, error);
                }
            }
        }
        if (expiredPosts.length > 0) {
            this.recomputeSchedule();
        }
    }
    private handleVisibilityChange = (): void => {
        if (!document.hidden) {
            this.checkAndExpirePosts();
            if (this.postExpirations.size > 0) {
                this.recomputeSchedule();
            }
        }
    };
    private handleExpiration(postId: string): void {
        this.postExpirations.delete(postId);
        if (this.dispatch) {
            try {
                this.dispatch(handlePostExpired(postId));
            } catch (error) {
                console.error('[BurnOnRead] Failed to handle post expiration:', postId, error);
            }
        }
    }
    private getActiveExpiration(expireAt: number | null, maxExpireAt: number | null): number | null {
        if (!expireAt && !maxExpireAt) {
            return null;
        }
        if (!expireAt) {
            return maxExpireAt;
        }
        if (!maxExpireAt) {
            return expireAt;
        }
        return Math.min(expireAt, maxExpireAt);
    }
    public cleanup(): void {
        if (this.nextTimerId) {
            clearTimeout(this.nextTimerId);
            this.nextTimerId = null;
        }
        if (this.pollingIntervalId) {
            clearInterval(this.pollingIntervalId);
            this.pollingIntervalId = null;
        }
        if (typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        }
        this.postExpirations.clear();
        this.dispatch = null;
        this.initialized = false;
    }
    public getState(): {activeTimers: number; nextExpiration: number | null} {
        if (this.postExpirations.size === 0) {
            return {activeTimers: 0, nextExpiration: null};
        }
        let nextExpiration = Infinity;
        for (const expireAt of this.postExpirations.values()) {
            if (expireAt < nextExpiration) {
                nextExpiration = expireAt;
            }
        }
        return {
            activeTimers: this.postExpirations.size,
            nextExpiration: nextExpiration === Infinity ? null : nextExpiration,
        };
    }
}
export const expirationScheduler = new BurnOnReadExpirationScheduler();