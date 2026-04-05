import {ChainableT} from 'tests/types';
declare global {
    interface Window {
        mockWebsockets: any[];
    }
}
function delayRequestToRoutes(routes: string[] = [], delay = 0) {
    cy.on('window:before:load', (win) => addDelay(win, routes, delay));
}
Cypress.Commands.add('delayRequestToRoutes', delayRequestToRoutes);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const addDelay = (win, routes: string[], delay: number) => {
    const fetch = win.fetch;
    cy.stub(win, 'fetch').callsFake((...args) => {
        for (let i = 0; i < routes.length; i++) {
            if (args[0].includes(routes[i])) {
                return wait(delay).then(() => fetch(...args));
            }
        }
        return fetch(...args);
    });
};
window.mockWebsockets = [];
function mockWebsockets() {
    cy.on('window:before:load', (win) => mockWebsocketsFn(win));
}
Cypress.Commands.add('mockWebsockets', mockWebsockets);
const mockWebsocketsFn = (win) => {
    const RealWebSocket = WebSocket;
    cy.stub(win, 'WebSocket').callsFake((...args) => {
        const mockWebSocket = {
            wrappedSocket: null,
            onopen: null,
            onmessage: null,
            onerror: null,
            onclose: null,
            send(data) {
                if (this.wrappedSocket) {
                    this.wrappedSocket.send(data);
                } else if (this.onerror) {
                    this.onerror(new Event('error'));
                }
            },
            close() {
                if (this.wrappedSocket) {
                    this.wrappedSocket.close(1000);
                }
            },
            connect() {
                const [param1, restOfParams] = args;
                this.wrappedSocket = new RealWebSocket(param1, restOfParams);
                this.wrappedSocket.onopen = this.onopen;
                this.wrappedSocket.onmessage = this.onmessage;
                this.wrappedSocket.onerror = this.onerror;
                this.wrappedSocket.onclose = this.onclose;
            },
        };
        window.mockWebsockets.push(mockWebSocket);
        return mockWebSocket;
    });
};
declare global {
    namespace Cypress {
        interface Chainable {
            delayRequestToRoutes(routes: string[], delay: number): ChainableT<void>;
            mockWebsockets: typeof mockWebsockets;
        }
    }
}