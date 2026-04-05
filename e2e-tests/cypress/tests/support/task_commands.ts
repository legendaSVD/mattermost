import {type AxiosResponse} from 'axios';
import {ChainableT} from '../types';
export interface PostMessageResp {
    id: string;
    status: number;
    data: any;
}
interface PostMessageArg {
    sender: {
        username: string;
        password: string;
    };
    message: string;
    channelId: string;
    rootId?: string;
    createAt?: number;
}
interface PostMessageRequest {
    token: string;
    message: string;
    props?;
    channelId: string;
    rootId?;
    createAt?;
    failOnStatus?: boolean;
}
function postMessageAs(arg: PostMessageArg): ChainableT<PostMessageResp> {
    const {sender, message, channelId, rootId, createAt} = arg;
    const baseUrl = Cypress.config('baseUrl');
    return cy.task('postMessageAs', {sender, message, channelId, rootId, createAt, baseUrl}).then((response: AxiosResponse<{id: string}>) => {
        const {status, data} = response;
        expect(status).to.equal(201);
        return cy.wrap({id: data.id, status, data});
    });
}
Cypress.Commands.add('postMessageAs', postMessageAs);
function postListOfMessages({numberOfMessages = 30, ...rest}): ChainableT<any> {
    const baseUrl = Cypress.config('baseUrl');
    return (cy as any).
        task('postListOfMessages', {numberOfMessages, baseUrl, ...rest}, {timeout: numberOfMessages * 200}).
        each((message) => expect(message.status).to.equal(201));
}
Cypress.Commands.add('postListOfMessages', postListOfMessages);
Cypress.Commands.add('reactToMessageAs', ({sender, postId, reaction}) => {
    const baseUrl = Cypress.config('baseUrl');
    return cy.task('reactToMessageAs', {sender, postId, reaction, baseUrl}).then(({status, data}) => {
        expect(status).to.equal(200);
        return cy.wrap({status, data});
    });
});
function postIncomingWebhook({url, data, waitFor}: {
    url: string;
    data: Record<string, any>;
    waitFor?: string;
}): ChainableT {
    cy.task('postIncomingWebhook', {url, data}).its('status').should('be.equal', 200);
    if (!waitFor) {
        return;
    }
    cy.waitUntil(() => cy.getLastPost().then((el) => {
        switch (waitFor) {
        case 'text': {
            const textEl = el.find('.post-message__text > p')[0];
            return Boolean(textEl && textEl.textContent.includes(data.text));
        }
        case 'attachment-pretext': {
            const attachmentPretextEl = el.find('.attachment__thumb-pretext > p')[0];
            return Boolean(attachmentPretextEl && attachmentPretextEl.textContent.includes(data.attachments[0].pretext));
        }
        default:
            return false;
        }
    }));
}
Cypress.Commands.add('postIncomingWebhook', postIncomingWebhook);
interface ExternalRequestArg<T> {
    user: Record<string, unknown>;
    method: string;
    path: string;
    data?: T;
    failOnStatusCode?: boolean;
}
function externalRequest<T=any, U=any>(arg: ExternalRequestArg<U>): ChainableT<Pick<AxiosResponse<T>, 'data' | 'status'>> {
    const {user, method, path, data, failOnStatusCode = true} = arg;
    const baseUrl = Cypress.config('baseUrl');
    return cy.task('externalRequest', {baseUrl, user, method, path, data}).then((response: Pick<AxiosResponse<T & {id: string}>, 'data' | 'status'>) => {
        const cloudErrorId = [
            'ent.cloud.request_error',
            'api.cloud.get_subscription.error',
        ];
        if (response.data && !cloudErrorId.includes(response.data.id) && failOnStatusCode) {
            expect(response.status).to.be.oneOf([200, 201, 204]);
        }
        return cy.wrap(response);
    });
}
Cypress.Commands.add('externalRequest', externalRequest);
function postBotMessage({token, message, props, channelId, rootId, createAt, failOnStatus = true}: PostMessageRequest): ChainableT<PostMessageResp> {
    const baseUrl = Cypress.config('baseUrl');
    return cy.task('postBotMessage', {token, message, props, channelId, rootId, createAt, baseUrl}).then(({status, data}) => {
        if (failOnStatus) {
            expect(status).to.equal(201);
        }
        return cy.wrap({id: data.id, status, data});
    });
}
Cypress.Commands.add('postBotMessage', postBotMessage);
function urlHealthCheck({name, url, helperMessage, method, httpStatus}): ChainableT {
    Cypress.log({name, message: `Checking URL health at ${url}`});
    return cy.task('urlHealthCheck', {url, method}).then(({data, errorCode, status, success}) => {
        const urlService = `__${name}__ at ${url}`;
        const successMessage = success ?
            `${urlService}: reachable` :
            `${errorCode}: The test you're running requires ${urlService} to be reachable. \n${helperMessage}`;
        expect(success, successMessage).to.equal(true);
        const statusMessage = status === httpStatus ?
            `${urlService}: responded with ${status} HTTP status` :
            `${urlService}: expected to respond with ${httpStatus} but got ${status} HTTP status`;
        expect(status, statusMessage).to.equal(httpStatus);
        return cy.wrap({data, status});
    });
}
Cypress.Commands.add('urlHealthCheck', urlHealthCheck);
Cypress.Commands.add('requireWebhookServer', () => {
    const baseUrl = Cypress.config('baseUrl');
    const webhookBaseUrl = Cypress.env('webhookBaseUrl');
    const adminUsername = Cypress.env('adminUsername');
    const adminPassword = Cypress.env('adminPassword');
    const helperMessage = `
__Tips:__
    1. In local development, you may run "__npm run start:webhook__" at "/e2e" folder.
    2. If reachable from remote host, you may export it as env variable, like "__CYPRESS_webhookBaseUrl=[url] npm run cypress:open__".
`;
    cy.urlHealthCheck({
        name: 'Webhook Server',
        url: webhookBaseUrl,
        helperMessage,
        method: 'get',
        httpStatus: 200,
    });
    cy.task('postIncomingWebhook', {
        url: `${webhookBaseUrl}/setup`,
        data: {
            baseUrl,
            webhookBaseUrl,
            adminUsername,
            adminPassword,
        }}).
        its('status').should('be.equal', 201);
});
Cypress.Commands.overwrite('log', (subject, message) => cy.task('log', message));
declare global {
    namespace Cypress {
        interface Chainable {
            externalRequest(options?: {
                user: Pick<UserProfile, 'username' | 'password'>;
                method: string;
                path: string;
                data?: Record<string, any>;
                failOnStatusCode?: boolean;
            }): Chainable<any>;
            reactToMessageAs({sender, postId, reaction}: {sender: Record<string, unknown>; postId: string; reaction: string}): Chainable<any>;
            requireWebhookServer(): Chainable;
            postMessageAs: typeof postMessageAs;
            postListOfMessages: typeof postListOfMessages;
            postIncomingWebhook: typeof postIncomingWebhook;
            postBotMessage: typeof postBotMessage;
            urlHealthCheck: typeof urlHealthCheck;
        }
    }
}