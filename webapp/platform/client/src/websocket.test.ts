import WebSocketClient from './websocket';
if (typeof WebSocket === 'undefined') {
    (global as any).WebSocket = {
        CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3,
    };
}
if (typeof Event === 'undefined') {
    (global as any).Event = class MockEvent {
        type: string;
        constructor(type: string) {
            this.type = type;
        }
    };
}
if (typeof CloseEvent === 'undefined') {
    (global as any).CloseEvent = class MockCloseEvent extends (global as any).Event {
        code: number;
        reason: string;
        wasClean: boolean;
        constructor(type: string, options?: {code?: number; reason?: string; wasClean?: boolean}) {
            super(type);
            this.code = options?.code || 0;
            this.reason = options?.reason || '';
            this.wasClean = options?.wasClean || false;
        }
    };
}
class MockWebSocket {
    readonly binaryType: BinaryType = 'blob';
    readonly bufferedAmount: number = 0;
    readonly extensions: string = '';
    readonly CONNECTING = WebSocket.CONNECTING;
    readonly OPEN = WebSocket.OPEN;
    readonly CLOSING = WebSocket.CLOSING;
    readonly CLOSED = WebSocket.CLOSED;
    public url: string = '';
    readonly protocol: string = '';
    public readyState: number = WebSocket.CONNECTING;
    public onopen: (() => void) | null = null;
    public onclose: (() => void) | null = null;
    public onerror: (() => void) | null = null;
    public onmessage: ((evt: any) => void) | null = null;
    open() {
        this.readyState = WebSocket.OPEN;
        if (this.onopen) {
            this.onopen();
        }
    }
    close() {
        this.readyState = WebSocket.CLOSED;
        if (this.onclose) {
            this.onclose();
        }
    }
    send(msg: any) { }
    addEventListener() { }
    removeEventListener() { }
    dispatchEvent(): boolean {
        return false;
    }
}
describe('websocketclient', () => {
    test('initialize should register connection callbacks', () => {
        const mockWebSocket = new MockWebSocket();
        const client = new WebSocketClient({
            newWebSocketFn: (url: string) => {
                mockWebSocket.url = url;
                return mockWebSocket;
            },
        });
        client.initialize('mock.url');
        expect(mockWebSocket.onopen).toBeTruthy();
        expect(mockWebSocket.onclose).toBeTruthy();
        client.close();
    });
    test('should reconnect on websocket close', () => {
        jest.useFakeTimers();
        const mockWebSocket = new MockWebSocket();
        const openSpy = jest.spyOn(mockWebSocket, 'open');
        const client = new WebSocketClient({
            newWebSocketFn: (url: string) => {
                mockWebSocket.url = url;
                mockWebSocket.open();
                return mockWebSocket;
            },
            minWebSocketRetryTime: 10,
            reconnectJitterRange: 10,
        });
        client.initialize('mock.url');
        expect(openSpy).toHaveBeenCalledTimes(1);
        mockWebSocket.close();
        jest.advanceTimersByTime(100);
        client.close();
        expect(openSpy).toHaveBeenCalledTimes(2);
        jest.useRealTimers();
    });
    test('should close during reconnection delay', () => {
        jest.useFakeTimers();
        const mockWebSocket = new MockWebSocket();
        const openSpy = jest.spyOn(mockWebSocket, 'open');
        const client = new WebSocketClient({
            newWebSocketFn: (url: string) => {
                mockWebSocket.url = url;
                setTimeout(() => {
                    if (mockWebSocket.onopen) {
                        mockWebSocket.open();
                    }
                }, 1);
                return mockWebSocket;
            },
            minWebSocketRetryTime: 50,
            reconnectJitterRange: 1,
        });
        const initializeSpy = jest.spyOn(client, 'initialize');
        client.initialize('mock.url');
        mockWebSocket.close();
        jest.advanceTimersByTime(10);
        client.close();
        jest.advanceTimersByTime(80);
        client.close();
        expect(initializeSpy).toHaveBeenCalledTimes(1);
        expect(openSpy).toHaveBeenCalledTimes(1);
        jest.useRealTimers();
    });
    test('should not re-open if initialize called during reconnection delay', () => {
        jest.useFakeTimers();
        const mockWebSocket = new MockWebSocket();
        const openSpy = jest.spyOn(mockWebSocket, 'open');
        const client = new WebSocketClient({
            newWebSocketFn: (url: string) => {
                mockWebSocket.url = url;
                setTimeout(() => {
                    if (mockWebSocket.onopen) {
                        mockWebSocket.open();
                    }
                }, 1);
                return mockWebSocket;
            },
            minWebSocketRetryTime: 50,
            reconnectJitterRange: 1,
        });
        const initializeSpy = jest.spyOn(client, 'initialize');
        client.initialize('mock.url');
        mockWebSocket.close();
        jest.advanceTimersByTime(10);
        client.initialize('mock.url');
        expect(initializeSpy).toHaveBeenCalledTimes(2);
        expect(openSpy).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(80);
        client.close();
        expect(initializeSpy).toHaveBeenCalledTimes(3);
        expect(openSpy).toHaveBeenCalledTimes(2);
        jest.useRealTimers();
    });
    test('should not register second reconnection timeout if onclose called twice', () => {
        jest.useFakeTimers();
        const mockWebSocket = new MockWebSocket();
        const openSpy = jest.spyOn(mockWebSocket, 'open');
        const client = new WebSocketClient({
            newWebSocketFn: (url: string) => {
                mockWebSocket.url = url;
                setTimeout(() => {
                    if (mockWebSocket.onopen) {
                        mockWebSocket.open();
                    }
                }, 1);
                return mockWebSocket;
            },
            minWebSocketRetryTime: 50,
            reconnectJitterRange: 1,
        });
        const initializeSpy = jest.spyOn(client, 'initialize');
        client.initialize('mock.url');
        mockWebSocket.close();
        jest.advanceTimersByTime(10);
        mockWebSocket.close();
        jest.advanceTimersByTime(80);
        client.close();
        expect(initializeSpy).toHaveBeenCalledTimes(2);
        expect(openSpy).toHaveBeenCalledTimes(2);
        jest.useRealTimers();
    });
    test('should stay connected after ping response', () => {
        jest.useFakeTimers();
        const mockWebSocket = new MockWebSocket();
        const client = new WebSocketClient({
            newWebSocketFn: (url: string) => {
                mockWebSocket.url = url;
                setTimeout(() => {
                    if (mockWebSocket.onopen) {
                        mockWebSocket.open();
                    }
                }, 1);
                return mockWebSocket;
            },
            minWebSocketRetryTime: 1,
            reconnectJitterRange: 1,
            clientPingInterval: 1,
        });
        let numPings = 0;
        let numPongs = 0;
        mockWebSocket.send = (evt) => {
            const msg = JSON.parse(evt);
            if (msg.action !== 'ping') {
                return;
            }
            numPings++;
            const rsp = {
                text: 'pong',
                seq_reply: msg.seq,
            };
            if (mockWebSocket.onmessage) {
                mockWebSocket.onmessage({data: JSON.stringify(rsp)});
                numPongs++;
            }
        };
        const openSpy = jest.spyOn(mockWebSocket, 'open');
        const closeSpy = jest.spyOn(mockWebSocket, 'close');
        client.initialize('mock.url');
        jest.advanceTimersByTime(30);
        client.close();
        expect(openSpy).toHaveBeenCalledTimes(1);
        expect(closeSpy).toHaveBeenCalledTimes(1);
        expect(numPings).toBeGreaterThan(10);
        expect(numPongs).toBeGreaterThan(10);
        jest.useRealTimers();
    });
    test('should reconnect after no ping response', () => {
        jest.useFakeTimers();
        const mockWebSocket = new MockWebSocket();
        const client = new WebSocketClient({
            newWebSocketFn: (url: string) => {
                mockWebSocket.url = url;
                setTimeout(() => {
                    if (mockWebSocket.onopen) {
                        mockWebSocket.open();
                    }
                }, 1);
                return mockWebSocket;
            },
            minWebSocketRetryTime: 1,
            reconnectJitterRange: 1,
            clientPingInterval: 10,
        });
        let numPings = 0;
        let numPongs = 0;
        mockWebSocket.send = (evt) => {
            const msg = JSON.parse(evt);
            if (msg.action !== 'ping') {
                return;
            }
            numPings++;
            if (numPings > 3) {
                return;
            }
            const rsp = {
                text: 'pong',
                seq_reply: msg.seq,
            };
            if (mockWebSocket.onmessage) {
                mockWebSocket.onmessage({data: JSON.stringify(rsp)});
                numPongs++;
            }
        };
        mockWebSocket.open = jest.fn(mockWebSocket.open);
        mockWebSocket.close = jest.fn(() => {
            mockWebSocket.readyState = WebSocket.CLOSED;
            if (mockWebSocket.onclose) {
                mockWebSocket.onclose();
            }
            if (jest.mocked(mockWebSocket.close).mock.calls.length === 3) {
                setTimeout(() => {
                    client.close();
                }, 1);
            }
        });
        client.initialize('mock.url');
        jest.advanceTimersByTime(100);
        client.close();
        expect(mockWebSocket.open).toHaveBeenCalledTimes(3);
        expect(mockWebSocket.close).toHaveBeenCalledTimes(3);
        expect(numPings).toBe(6);
        expect(numPongs).toBe(3);
        jest.useRealTimers();
    });
    test('should reset ping interval state when reconnecting during pending ping', () => {
        jest.useFakeTimers();
        const mockWebSocket = new MockWebSocket();
        const client = new WebSocketClient({
            newWebSocketFn: (url: string) => {
                mockWebSocket.url = url;
                setTimeout(() => {
                    if (mockWebSocket.onopen) {
                        mockWebSocket.open();
                    }
                }, 1);
                return mockWebSocket;
            },
            minWebSocketRetryTime: 1,
            reconnectJitterRange: 1,
            clientPingInterval: 15,
        });
        let numPings = 0;
        let numPongs = 0;
        mockWebSocket.send = (evt) => {
            const msg = JSON.parse(evt);
            if (msg.action !== 'ping') {
                return;
            }
            numPings++;
            if (numPings === 2) {
                return;
            }
            const rsp = {
                text: 'pong',
                seq_reply: msg.seq,
            };
            if (mockWebSocket.onmessage) {
                mockWebSocket.onmessage({data: JSON.stringify(rsp)});
                numPongs++;
            }
        };
        const openSpy = jest.spyOn(mockWebSocket, 'open');
        const closeSpy = jest.spyOn(mockWebSocket, 'close');
        client.initialize('mock.url');
        jest.advanceTimersByTime(10);
        expect(numPings).toBe(1);
        expect(numPongs).toBe(1);
        jest.advanceTimersByTime(10);
        expect(numPings).toBe(2);
        expect(numPongs).toBe(1);
        expect(openSpy).toHaveBeenCalledTimes(1);
        expect(closeSpy).toHaveBeenCalledTimes(0);
        mockWebSocket.close();
        jest.advanceTimersByTime(100);
        client.close();
        expect(numPings).toBe(9);
        expect(numPongs).toBe(numPings - 1);
        expect(openSpy).toHaveBeenCalledTimes(2);
        expect(closeSpy).toHaveBeenCalledTimes(2);
        jest.useRealTimers();
    });
    describe('online/offline', () => {
        const originalWindow = globalThis.window;
        beforeAll(() => {
            if (typeof window === 'undefined') {
                const eventHandlers: {[key: string]: Array<(event: Event) => void>} = {};
                (globalThis as any).window = {
                    addEventListener: jest.fn((event: string, handler: (event: Event) => void) => {
                        if (!eventHandlers[event]) {
                            eventHandlers[event] = [];
                        }
                        eventHandlers[event].push(handler);
                    }),
                    removeEventListener: jest.fn((event: string, handler: (event: Event) => void) => {
                        if (eventHandlers[event]) {
                            const index = eventHandlers[event].indexOf(handler);
                            if (index !== -1) {
                                eventHandlers[event].splice(index, 1);
                            }
                        }
                    }),
                    dispatchEvent: jest.fn((event: Event) => {
                        const handlers = eventHandlers[event.type] || [];
                        handlers.forEach((handler) => handler(event));
                        return true;
                    }),
                };
            }
        });
        afterAll(() => {
            globalThis.window = originalWindow;
        });
        test('should add network event listener on initialize', () => {
            const originalAddEventListener = window.addEventListener;
            const originalRemoveEventListener = window.removeEventListener;
            const addEventListenerMock = jest.fn();
            const removeEventListenerMock = jest.fn();
            window.addEventListener = addEventListenerMock;
            window.removeEventListener = removeEventListenerMock;
            const mockWebSocket = new MockWebSocket();
            const client = new WebSocketClient({
                newWebSocketFn: (url: string) => {
                    mockWebSocket.url = url;
                    return mockWebSocket;
                },
            });
            expect(addEventListenerMock).not.toHaveBeenCalled();
            client.initialize('mock.url');
            expect(addEventListenerMock).toHaveBeenCalledWith('online', expect.any(Function));
            client.close();
            expect(removeEventListenerMock).toHaveBeenCalledWith('online', expect.any(Function));
            window.addEventListener = originalAddEventListener;
            window.removeEventListener = originalRemoveEventListener;
        });
        test('should reconnect when network comes online', () => {
            jest.useFakeTimers();
            var connected = true;
            const mockWebSocket = new MockWebSocket();
            const newWebSocketFn = jest.fn((url: string) => {
                mockWebSocket.url = url;
                setTimeout(() => {
                    if (!connected && mockWebSocket.onclose) {
                        mockWebSocket.close();
                    }
                }, 1);
                return mockWebSocket;
            });
            const client = new WebSocketClient({
                newWebSocketFn,
                minWebSocketRetryTime: 100,
                maxWebSocketRetryTime: 1000,
            });
            client.initialize('mock.url');
            mockWebSocket.open();
            expect(newWebSocketFn).toHaveBeenCalledTimes(1);
            mockWebSocket.close();
            connected = false;
            expect(mockWebSocket.readyState).toBe(WebSocket.CLOSED);
            jest.advanceTimersByTime(10000);
            newWebSocketFn.mockClear();
            connected = true;
            const onlineEvent = new Event('online');
            window.dispatchEvent(onlineEvent);
            expect(newWebSocketFn).not.toHaveBeenCalled();
            jest.advanceTimersByTime(110);
            expect(newWebSocketFn).toHaveBeenCalledTimes(1);
            client.close();
            jest.useRealTimers();
        });
        test('should send ping when network goes offline', () => {
            jest.useFakeTimers();
            const mockWebSocket = new MockWebSocket();
            const client = new WebSocketClient({
                newWebSocketFn: (url: string) => {
                    mockWebSocket.url = url;
                    setTimeout(() => {
                        if (mockWebSocket.onopen) {
                            mockWebSocket.open();
                        }
                    }, 1);
                    return mockWebSocket;
                },
                clientPingInterval: 300,
            });
            let numPings = 0;
            mockWebSocket.send = (evt) => {
                const msg = JSON.parse(evt);
                if (msg.action !== 'ping') {
                    return;
                }
                numPings++;
            };
            const openSpy = jest.spyOn(mockWebSocket, 'open');
            const closeSpy = jest.spyOn(mockWebSocket, 'close');
            client.initialize('mock.url');
            jest.advanceTimersByTime(10);
            expect(mockWebSocket.readyState).toBe(WebSocket.OPEN);
            expect(openSpy).toHaveBeenCalledTimes(1);
            expect(closeSpy).toHaveBeenCalledTimes(0);
            expect(numPings).toBe(1);
            const offlineEvent = new Event('offline');
            window.dispatchEvent(offlineEvent);
            jest.advanceTimersByTime(10);
            client.close();
            expect(openSpy).toHaveBeenCalledTimes(1);
            expect(closeSpy).toHaveBeenCalledTimes(1);
            expect(numPings).toBe(2);
            jest.useRealTimers();
        });
    });
    test('should be able to use WebSocketClient in a non-browser environment', () => {
        const mockWebSocket = new MockWebSocket();
        const client = new WebSocketClient({
            newWebSocketFn: (url: string) => {
                mockWebSocket.url = url;
                return mockWebSocket;
            },
        });
        expect(window).not.toBeDefined();
        client.initialize('mock.url');
        expect(mockWebSocket.onopen).toBeTruthy();
        expect(mockWebSocket.onclose).toBeTruthy();
        client.close();
    });
});