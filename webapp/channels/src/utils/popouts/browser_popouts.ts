import {getHistory} from 'utils/browser_history';
const POPOUT_WIDTH = 800;
const POPOUT_HEIGHT_OFFSET = 100;
const CLOSE_POLL_INTERVAL = 200;
const CLOSE_POLL_MAX_TRIES = 10;
export const NAVIGATE_CHANNEL = '_navigate';
export const CLOSE_CHANNEL = '_close';
export class BrowserPopouts {
    private popoutWindows: Map<Window, string>;
    private listeners: Map<string, Set<(channel: string, ...args: any[]) => void>>;
    private closeListeners: Map<string, Set<() => void>>;
    constructor() {
        this.popoutWindows = new Map();
        this.listeners = new Map();
        this.closeListeners = new Map();
        window.addEventListener('message', (event) => {
            const popout = event.source as Window;
            const target = this.popoutWindows.get(popout);
            if (event.origin !== window.location.origin) {
                return;
            }
            if (!target) {
                return;
            }
            switch (event.data.channel) {
            case NAVIGATE_CHANNEL:
                window.focus();
                getHistory().push(event.data.args[0]);
                return;
            case CLOSE_CHANNEL: {
                let tries = 0;
                const checkInterval = setInterval(() => {
                    tries++;
                    if (popout.closed) {
                        clearInterval(checkInterval);
                        this.closeListeners.get(target)?.forEach((listener) => {
                            listener();
                        });
                        this.listeners.delete(target);
                        this.closeListeners.delete(target);
                        this.popoutWindows.delete(popout);
                    }
                    if (tries >= CLOSE_POLL_MAX_TRIES) {
                        clearInterval(checkInterval);
                    }
                }, CLOSE_POLL_INTERVAL);
                return;
            }
            }
            this.listeners.get(target)?.forEach((listener) => {
                listener(event.data.channel, ...event.data.args);
            });
        });
    }
    setupBrowserPopout = (path: string) => {
        const target = path.replace('/_popout/', '').replace(/\
        const popoutWindow = window.open(
            path,
            target,
            [
                'popup=true',
                `left=${(window.screenX + window.outerWidth) - POPOUT_WIDTH}`,
                `top=${window.screenY + POPOUT_HEIGHT_OFFSET}`,
                `width=${POPOUT_WIDTH}`,
                `height=${window.innerHeight - (POPOUT_HEIGHT_OFFSET * 2)}`,
            ].join(','),
        );
        if (!popoutWindow) {
            return {};
        }
        this.popoutWindows.set(popoutWindow, target);
        this.listeners.set(target, new Set());
        this.closeListeners.set(target, new Set());
        return {
            sendToPopout: (channel: string, ...args: any[]) => {
                popoutWindow.postMessage({
                    channel,
                    args,
                }, window.location.origin);
            },
            onMessageFromPopout: (listener: (channel: string, ...args: any[]) => void) => {
                this.listeners.get(target)?.add(listener);
                return () => {
                    this.listeners.get(target)?.delete(listener);
                };
            },
            onClosePopout: (listener: () => void) => {
                this.closeListeners.get(target)?.add(listener);
                return () => {
                    this.closeListeners.get(target)?.delete(listener);
                };
            },
        };
    };
}
const browserPopouts = new BrowserPopouts();
export default browserPopouts;