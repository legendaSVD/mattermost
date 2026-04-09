import {WebSocketEvents} from './websocket_events';
import type {WebSocketMessage} from './websocket_message';
export type MessageListener = (msg: WebSocketMessage) => void;
export type FirstConnectListener = () => void;
export type ReconnectListener = () => void;
export type MissedMessageListener = () => void;
export type ErrorListener = (event: Event) => void;
export type CloseListener = (connectFailCount: number) => void;
export type WebSocketClientConfig = {
    maxWebSocketFails: number;
    minWebSocketRetryTime: number;
    maxWebSocketRetryTime: number;
    reconnectJitterRange: number;
    newWebSocketFn: (url: string) => WebSocket;
    clientPingInterval: number;
}
const clientPingTimeoutErrCode = 4000;
const clientSequenceMismatchErrCode = 4001;
const defaultWebSocketClientConfig: WebSocketClientConfig = {
    maxWebSocketFails: 7,
    minWebSocketRetryTime: 3000,
    maxWebSocketRetryTime: 300000,
    reconnectJitterRange: 2000,
    newWebSocketFn: (url: string) => {
        return new WebSocket(url);
    },
    clientPingInterval: 30000,
};
export default class WebSocketClient {
    private config: WebSocketClientConfig;
    private conn: WebSocket | null;
    private responseSequence: number;
    private serverSequence: number;
    private connectFailCount: number;
    private responseCallbacks: {[x: number]: ((msg: any) => void)};
    private lastErrCode: string | null;
    private eventCallback: MessageListener | null = null;
    private firstConnectCallback: FirstConnectListener | null = null;
    private reconnectCallback: ReconnectListener | null = null;
    private missedEventCallback: MissedMessageListener | null = null;
    private errorCallback: ErrorListener | null = null;
    private closeCallback: CloseListener | null = null;
    private messageListeners = new Set<MessageListener>();
    private firstConnectListeners = new Set<FirstConnectListener>();
    private reconnectListeners = new Set<ReconnectListener>();
    private missedMessageListeners = new Set<MissedMessageListener>();
    private errorListeners = new Set<ErrorListener>();
    private closeListeners = new Set<CloseListener>();
    private connectionId: string | null;
    private serverHostname: string | null;
    private postedAck: boolean;
    private pingInterval: ReturnType<typeof setInterval> | null;
    private waitingForPong: boolean;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null;
    private onlineHandler: (() => void) | null = null;
    private offlineHandler: (() => void) | null = null;
    constructor(config?: Partial<WebSocketClientConfig>) {
        this.conn = null;
        this.responseSequence = 1;
        this.serverSequence = 0;
        this.connectFailCount = 0;
        this.responseCallbacks = {};
        this.connectionId = '';
        this.serverHostname = '';
        this.postedAck = false;
        this.reconnectTimeout = null;
        this.config = {...defaultWebSocketClientConfig, ...config};
        this.pingInterval = null;
        this.waitingForPong = false;
        this.lastErrCode = null;
    }
    initialize(connectionUrl: string, token?: string, postedAck?: boolean) {
        if (this.conn) {
            return;
        }
        if (this.reconnectTimeout) {
            return;
        }
        if (connectionUrl == null) {
            console.log('websocket must have connection url');
            return;
        }
        if (this.connectFailCount === 0) {
            console.log('websocket connecting to ' + connectionUrl);
        }
        if (typeof postedAck != 'undefined') {
            this.postedAck = postedAck;
        }
        if (this.onlineHandler) {
            globalThis.window?.removeEventListener('online', this.onlineHandler);
        }
        if (this.offlineHandler) {
            globalThis.window?.removeEventListener('offline', this.offlineHandler);
        }
        this.onlineHandler = () => {
            if (this.conn && this.conn.readyState === WebSocket.OPEN) {
                return;
            }
            console.log('network online event received, scheduling reconnect');
            this.clearReconnectTimeout();
            this.reconnectTimeout = setTimeout(
                () => {
                    this.reconnectTimeout = null;
                    this.initialize(connectionUrl, token, this.postedAck);
                },
                this.config.minWebSocketRetryTime,
            );
        };
        this.offlineHandler = () => {
            if (this.conn && this.conn.readyState !== WebSocket.OPEN) {
                return;
            }
            console.log('network offline event received, checking connection');
            this.waitingForPong = true;
            this.ping(() => {
                this.waitingForPong = false;
            });
        };
        globalThis.window?.addEventListener('online', this.onlineHandler);
        globalThis.window?.addEventListener('offline', this.offlineHandler);
        let websocketUrl = `${connectionUrl}?connection_id=${this.connectionId}&sequence_number=${this.serverSequence}`;
        if (this.postedAck) {
            websocketUrl += '&posted_ack=true';
        }
        if (this.lastErrCode) {
            websocketUrl += `&disconnect_err_code=${encodeURIComponent(this.lastErrCode)}`;
        }
        if (this.config.newWebSocketFn) {
            this.conn = this.config.newWebSocketFn(websocketUrl);
        } else {
            this.conn = new WebSocket(websocketUrl);
        }
        const onclose = (event: CloseEvent) => {
            this.conn = null;
            this.responseSequence = 1;
            if (!this.lastErrCode && event && event.code) {
                this.lastErrCode = `${event.code}`;
            }
            if (this.connectFailCount === 0) {
                console.log(`websocket closed: ${this.lastErrCode}`);
            }
            this.connectFailCount++;
            this.closeCallback?.(this.connectFailCount);
            this.closeListeners.forEach((listener) => listener(this.connectFailCount));
            this.stopPingInterval();
            let retryTime = this.config.minWebSocketRetryTime;
            if (this.connectFailCount > this.config.maxWebSocketFails) {
                retryTime = retryTime * this.connectFailCount * this.connectFailCount;
                if (retryTime > this.config.maxWebSocketRetryTime) {
                    retryTime = this.config.maxWebSocketRetryTime;
                }
            }
            retryTime += Math.random() * this.config.reconnectJitterRange;
            if (this.reconnectTimeout) {
                return;
            }
            this.reconnectTimeout = setTimeout(
                () => {
                    this.reconnectTimeout = null;
                    this.initialize(connectionUrl, token, this.postedAck);
                },
                retryTime,
            );
        };
        this.conn.onclose = onclose;
        this.conn.onopen = () => {
            if (token) {
                this.sendMessage('authentication_challenge', {token});
            }
            this.lastErrCode = null;
            if (this.connectFailCount > 0) {
                console.log('websocket re-established connection');
                this.reconnectCallback?.();
                this.reconnectListeners.forEach((listener) => listener());
            } else if (this.firstConnectCallback || this.firstConnectListeners.size > 0) {
                this.firstConnectCallback?.();
                this.firstConnectListeners.forEach((listener) => listener());
            }
            this.stopPingInterval();
            this.waitingForPong = true;
            this.ping(() => {
                this.waitingForPong = false;
            });
            this.pingInterval = setInterval(
                () => {
                    if (!this.waitingForPong) {
                        this.waitingForPong = true;
                        this.ping(() => {
                            this.waitingForPong = false;
                        });
                        return;
                    }
                    this.stopPingInterval();
                    if (!this.conn || this.conn.readyState !== WebSocket.OPEN) {
                        return;
                    }
                    console.log('ping received no response within time limit: re-establishing websocket');
                    const closeEvent = new CloseEvent('close', {
                        code: clientPingTimeoutErrCode,
                        wasClean: false,
                    });
                    this.connectFailCount = 0;
                    this.responseSequence = 1;
                    this.conn.onclose = () => {};
                    this.conn.close();
                    onclose(closeEvent);
                },
                this.config.clientPingInterval);
            this.connectFailCount = 0;
        };
        this.conn.onerror = (evt) => {
            if (this.connectFailCount <= 1) {
                console.log('websocket error');
                console.log(evt);
            }
            this.errorCallback?.(evt);
            this.errorListeners.forEach((listener) => listener(evt));
        };
        this.conn.onmessage = (evt) => {
            const msg = JSON.parse(evt.data);
            if (msg.seq_reply) {
                if (msg.error) {
                    console.log(msg);
                }
                if (this.responseCallbacks[msg.seq_reply]) {
                    this.responseCallbacks[msg.seq_reply](msg);
                    Reflect.deleteProperty(this.responseCallbacks, msg.seq_reply);
                }
            } else if (this.eventCallback || this.messageListeners.size > 0) {
                if (msg.event === WebSocketEvents.Hello && (this.missedEventCallback || this.missedMessageListeners.size > 0)) {
                    console.log('got connection id ', msg.data.connection_id);
                    if (this.connectionId !== '' && this.connectionId !== msg.data.connection_id) {
                        console.log('long timeout, or server restart, or sequence number is not found.');
                        this.missedEventCallback?.();
                        for (const listener of this.missedMessageListeners) {
                            try {
                                listener();
                            } catch (e) {
                                console.log(`missed message listener "${listener.name}" failed: ${e}`);
                            }
                        }
                        this.serverSequence = 0;
                    }
                    this.connectionId = msg.data.connection_id;
                    this.serverHostname = msg.data.server_hostname;
                }
                if (msg.seq !== this.serverSequence) {
                    console.log('missed websocket event, act_seq=' + msg.seq + ' exp_seq=' + this.serverSequence);
                    const closeEvent = new CloseEvent('close', {
                        code: clientSequenceMismatchErrCode,
                        wasClean: false,
                    });
                    this.connectFailCount = 0;
                    this.responseSequence = 1;
                    if (this.conn) {
                        this.conn.onclose = () => {};
                        this.conn.close();
                        onclose(closeEvent);
                    }
                    return;
                }
                this.serverSequence = msg.seq + 1;
                this.eventCallback?.(msg);
                this.messageListeners.forEach((listener) => listener(msg));
            }
        };
    }
    setEventCallback(callback: MessageListener) {
        this.eventCallback = callback;
    }
    addMessageListener(listener: MessageListener) {
        this.messageListeners.add(listener);
        if (this.messageListeners.size > 5) {
            console.warn(`WebSocketClient has ${this.messageListeners.size} message listeners registered`);
        }
    }
    removeMessageListener(listener: MessageListener) {
        this.messageListeners.delete(listener);
    }
    setFirstConnectCallback(callback: FirstConnectListener) {
        this.firstConnectCallback = callback;
    }
    addFirstConnectListener(listener: FirstConnectListener) {
        this.firstConnectListeners.add(listener);
        if (this.firstConnectListeners.size > 5) {
            console.warn(`WebSocketClient has ${this.firstConnectListeners.size} first connect listeners registered`);
        }
    }
    removeFirstConnectListener(listener: FirstConnectListener) {
        this.firstConnectListeners.delete(listener);
    }
    setReconnectCallback(callback: ReconnectListener) {
        this.reconnectCallback = callback;
    }
    addReconnectListener(listener: ReconnectListener) {
        this.reconnectListeners.add(listener);
        if (this.reconnectListeners.size > 5) {
            console.warn(`WebSocketClient has ${this.reconnectListeners.size} reconnect listeners registered`);
        }
    }
    removeReconnectListener(listener: ReconnectListener) {
        this.reconnectListeners.delete(listener);
    }
    setMissedEventCallback(callback: MissedMessageListener) {
        this.missedEventCallback = callback;
    }
    addMissedMessageListener(listener: MissedMessageListener) {
        this.missedMessageListeners.add(listener);
        if (this.missedMessageListeners.size > 5) {
            console.warn(`WebSocketClient has ${this.missedMessageListeners.size} missed message listeners registered`);
        }
    }
    removeMissedMessageListener(listener: MissedMessageListener) {
        this.missedMessageListeners.delete(listener);
    }
    setErrorCallback(callback: ErrorListener) {
        this.errorCallback = callback;
    }
    addErrorListener(listener: ErrorListener) {
        this.errorListeners.add(listener);
        if (this.errorListeners.size > 5) {
            console.warn(`WebSocketClient has ${this.errorListeners.size} error listeners registered`);
        }
    }
    removeErrorListener(listener: ErrorListener) {
        this.errorListeners.delete(listener);
    }
    setCloseCallback(callback: CloseListener) {
        this.closeCallback = callback;
    }
    addCloseListener(listener: CloseListener) {
        this.closeListeners.add(listener);
        if (this.closeListeners.size > 5) {
            console.warn(`WebSocketClient has ${this.closeListeners.size} close listeners registered`);
        }
    }
    removeCloseListener(listener: CloseListener) {
        this.closeListeners.delete(listener);
    }
    close() {
        this.connectFailCount = 0;
        this.responseSequence = 1;
        this.clearReconnectTimeout();
        this.lastErrCode = null;
        this.stopPingInterval();
        if (this.conn && this.conn.readyState === WebSocket.OPEN) {
            this.conn.onclose = () => {};
            this.conn.close();
            this.conn = null;
            console.log('websocket closed manually');
        }
        if (this.onlineHandler) {
            globalThis.window?.removeEventListener('online', this.onlineHandler);
            this.onlineHandler = null;
        }
        if (this.offlineHandler) {
            globalThis.window?.removeEventListener('offline', this.offlineHandler);
            this.offlineHandler = null;
        }
    }
    clearReconnectTimeout() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }
    stopPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    ping(responseCallback?: (msg: any) => void) {
        const msg = {
            action: 'ping',
            seq: this.responseSequence++,
        };
        if (responseCallback) {
            this.responseCallbacks[msg.seq] = responseCallback;
        }
        if (this.conn && this.conn.readyState === WebSocket.OPEN) {
            this.conn.send(JSON.stringify(msg));
        }
    }
    sendMessage(action: string, data: any, responseCallback?: (msg: any) => void) {
        const msg = {
            action,
            seq: this.responseSequence++,
            data,
        };
        if (responseCallback) {
            this.responseCallbacks[msg.seq] = responseCallback;
        }
        if (this.conn && this.conn.readyState === WebSocket.OPEN) {
            this.conn.send(JSON.stringify(msg));
        }
    }
    userTyping(channelId: string, parentId: string, callback?: () => void) {
        const data = {
            channel_id: channelId,
            parent_id: parentId,
        };
        this.sendMessage('user_typing', data, callback);
    }
    updateActiveChannel(channelId: string, callback?: (msg: any) => void) {
        const data = {
            channel_id: channelId,
        };
        this.sendMessage('presence', data, callback);
    }
    updateActiveTeam(teamId: string, callback?: (msg: any) => void) {
        const data = {
            team_id: teamId,
        };
        this.sendMessage('presence', data, callback);
    }
    updateActiveThread(isThreadView: boolean, channelId: string, callback?: (msg: any) => void) {
        const data = {
            thread_channel_id: channelId,
            is_thread_view: isThreadView,
        };
        this.sendMessage('presence', data, callback);
    }
    userUpdateActiveStatus(userIsActive: boolean, manual: boolean, callback?: () => void) {
        const data = {
            user_is_active: userIsActive,
            manual,
        };
        this.sendMessage('user_update_active_status', data, callback);
    }
    acknowledgePostedNotification(postId: string, status: string, reason?: string, postedData?: string) {
        const data = {
            post_id: postId,
            user_agent: globalThis.window?.navigator?.userAgent ?? '',
            status,
            reason,
            data: postedData,
        };
        this.sendMessage('posted_notify_ack', data);
    }
    getStatuses(callback?: () => void) {
        this.sendMessage('get_statuses', null, callback);
    }
    getStatusesByIds(userIds: string[], callback?: () => void) {
        const data = {
            user_ids: userIds,
        };
        this.sendMessage('get_statuses_by_ids', data, callback);
    }
}