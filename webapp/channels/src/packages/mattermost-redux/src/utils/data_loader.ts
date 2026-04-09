export type Comparator = (a: any, b: any) => boolean;
abstract class DataLoader<Identifier, Result = unknown> {
    protected readonly fetchBatch: (identifiers: Identifier[]) => Result;
    private readonly maxBatchSize: number;
    private readonly comparator?: Comparator;
    protected readonly pendingIdentifiers = new Set<Identifier>();
    constructor(args: {
        fetchBatch: (identifiers: Identifier[]) => Result;
        maxBatchSize: number;
        comparator?: Comparator;
    }) {
        this.fetchBatch = args.fetchBatch;
        this.maxBatchSize = args.maxBatchSize;
        this.comparator = args.comparator;
    }
    public queue(identifiersToLoad: Identifier[]): void {
        for (const identifier of identifiersToLoad) {
            if (!identifier) {
                continue;
            }
            if (this.comparator) {
                let exists = false;
                for (const existing of this.pendingIdentifiers) {
                    if (this.comparator(existing, identifier)) {
                        exists = true;
                        break;
                    }
                }
                if (!exists) {
                    this.pendingIdentifiers.add(identifier);
                }
            } else {
                this.pendingIdentifiers.add(identifier);
            }
        }
    }
    protected prepareBatch(): {identifiers: Identifier[]; moreToLoad: boolean} {
        let nextBatch;
        if (this.pendingIdentifiers.size >= this.maxBatchSize) {
            nextBatch = [];
            for (const identifier of this.pendingIdentifiers) {
                nextBatch.push(identifier);
                this.pendingIdentifiers.delete(identifier);
                if (nextBatch.length >= this.maxBatchSize) {
                    break;
                }
            }
        } else {
            nextBatch = Array.from(this.pendingIdentifiers);
            this.pendingIdentifiers.clear();
        }
        return {
            identifiers: nextBatch,
            moreToLoad: this.pendingIdentifiers.size > 0,
        };
    }
    public isBusy(): boolean {
        return this.pendingIdentifiers.size > 0;
    }
}
export class BackgroundDataLoader<Identifier, Result = unknown> extends DataLoader<Identifier, Result> {
    private intervalId: number = -1;
    public startIntervalIfNeeded(ms: number): void {
        if (this.intervalId !== -1) {
            return;
        }
        this.intervalId = window.setInterval(() => this.fetchBatchNow(), ms);
    }
    public stopInterval(): void {
        clearInterval(this.intervalId);
        this.intervalId = -1;
    }
    public fetchBatchNow(): void {
        const {identifiers} = this.prepareBatch();
        if (identifiers.length === 0) {
            return;
        }
        this.fetchBatch(identifiers);
    }
    public isBusy(): boolean {
        return super.isBusy() || this.intervalId !== -1;
    }
}
export class DelayedDataLoader<Identifier> extends DataLoader<Identifier, Promise<unknown>> {
    private readonly wait: number = -1;
    private timeoutId: number = -1;
    private timeoutCallbacks = new Set<{
        identifiers: Set<Identifier>;
        resolve(): void;
    }>();
    constructor(args: {
        fetchBatch: (identifiers: Identifier[]) => Promise<unknown>;
        maxBatchSize: number;
        wait: number;
        comparator?: Comparator;
    }) {
        super(args);
        this.wait = args.wait;
    }
    public queue(identifiersToLoad: Identifier[]): void {
        super.queue(identifiersToLoad);
        this.startTimeoutIfNeeded();
    }
    public queueAndWait(identifiersToLoad: Identifier[]): Promise<void> {
        return new Promise((resolve) => {
            super.queue(identifiersToLoad);
            this.timeoutCallbacks.add({
                identifiers: new Set(identifiersToLoad),
                resolve,
            });
            this.startTimeoutIfNeeded();
        });
    }
    private startTimeoutIfNeeded(): void {
        if (this.timeoutId !== -1) {
            return;
        }
        this.timeoutId = window.setTimeout(() => {
            this.timeoutId = -1;
            const {identifiers, moreToLoad} = this.prepareBatch();
            if (moreToLoad) {
                this.startTimeoutIfNeeded();
            }
            this.fetchBatch(identifiers).then(() => this.resolveCompletedCallbacks(identifiers));
        }, this.wait);
    }
    private resolveCompletedCallbacks(identifiers: Identifier[]): void {
        for (const callback of this.timeoutCallbacks) {
            for (const identifier of identifiers) {
                callback.identifiers.delete(identifier);
            }
            if (callback.identifiers.size === 0) {
                this.timeoutCallbacks.delete(callback);
                callback.resolve();
            }
        }
    }
    public isBusy(): boolean {
        return super.isBusy() || this.timeoutCallbacks.size > 0 || this.timeoutId !== -1;
    }
}