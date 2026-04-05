import {Channel} from '@mattermost/types/channels';
import {ChainableT} from 'tests/types';
import * as TIMEOUTS from '../../../../fixtures/timeouts';
import {getAdminAccount} from '../../../../support/env';
import {SimpleUser} from '../../autocomplete/helpers';
const admin = getAdminAccount();
export function withTimestamp(prefix: string, timestamp: number) {
    return prefix + '-' + timestamp;
}
export function createEmail(name: string, timestamp: number) {
    return name + timestamp + '@sample.mattermost.com';
}
export function startAtMention(mention: string) {
    cy.get('@input').clear().type(mention);
    cy.get('#suggestionList').should('be.visible');
}
export function searchForChannel(name: string) {
    cy.typeCmdOrCtrl().type('k').wait(TIMEOUTS.ONE_SEC);
    cy.findByRole('combobox', {name: 'quick switch input'}).
        should('be.visible').
        as('input').
        clear().
        type(name);
}
function createChannel(channelType, teamId, userToAdd = null): ChainableT<Channel> {
    return cy.externalRequest({
        user: admin,
        method: 'POST',
        path: 'channels',
        data: {
            team_id: teamId,
            name: 'test-channel' + Date.now(),
            display_name: 'Test Channel ' + Date.now(),
            type: channelType,
            header: '',
            purpose: '',
        },
    }).then(({data: channel}) => {
        if (userToAdd) {
            return cy.apiGetUserByEmail(userToAdd.email).then(({user}) => {
                return cy.externalAddUserToChannel(user.id, channel.id).then(() => {
                    cy.wait(TIMEOUTS.TWO_SEC);
                    return cy.wrap<Channel>(channel);
                });
            });
        }
        cy.wait(TIMEOUTS.TWO_SEC);
        return cy.wrap<Channel>(channel);
    });
}
export function enableElasticSearch() {
    cy.apiUpdateConfig({
        ElasticsearchSettings: {
            EnableIndexing: true,
            EnableSearching: true,
        },
    });
    cy.visit('/admin_console/environment/elasticsearch');
    cy.get('#enableIndexingtrue').click();
    cy.contains('button', 'Test Connection').click();
    cy.get('.alert-success').should('have.text', 'Test successful. Configuration saved.');
    cy.contains('button', 'Index Now').click();
    cy.wait(TIMEOUTS.ONE_SEC).get('.job-table__table').find('tbody > tr').eq(0).as('firstRow');
    const checkFirstRow = () => {
        return cy.get('@firstRow').then((el) => {
            return el.find('.status-icon-success').length > 0;
        });
    };
    const options = {
        timeout: TIMEOUTS.TWO_MIN,
        interval: TIMEOUTS.TWO_SEC,
        errorMsg: 'Reindex did not succeed in time',
    };
    cy.waitUntil(checkFirstRow, options);
}
export function getTestUsers(): Record<string, SimpleUser> {
    const reverseTimeStamp = (20 * Math.pow(10, 13)) - Date.now();
    return {
        ironman: {
            username: withTimestamp('ironman', reverseTimeStamp),
            password: 'passwd',
            first_name: 'Tony',
            last_name: 'Stark',
            email: createEmail('ironman', reverseTimeStamp),
            nickname: withTimestamp('protoncannon', reverseTimeStamp),
        },
        hulk: {
            username: withTimestamp('hulk', reverseTimeStamp),
            password: 'passwd',
            first_name: 'Bruce',
            last_name: 'Banner',
            email: createEmail('hulk', reverseTimeStamp),
            nickname: withTimestamp('gammaray', reverseTimeStamp),
        },
        hawkeye: {
            username: withTimestamp('hawkeye', reverseTimeStamp),
            password: 'passwd',
            first_name: 'Clint',
            last_name: 'Barton',
            email: createEmail('hawkeye', reverseTimeStamp),
            nickname: withTimestamp('ronin', reverseTimeStamp),
        },
        deadpool: {
            username: withTimestamp('deadpool', reverseTimeStamp),
            password: 'passwd',
            first_name: 'Wade',
            last_name: 'Wilson',
            email: createEmail('deadpool', reverseTimeStamp),
            nickname: withTimestamp('merc', reverseTimeStamp),
        },
        captainamerica: {
            username: withTimestamp('captainamerica', reverseTimeStamp),
            password: 'passwd',
            first_name: 'Steve',
            last_name: 'Rogers',
            email: createEmail('captainamerica', reverseTimeStamp),
            nickname: withTimestamp('professional', reverseTimeStamp),
        },
        doctorstrange: {
            username: withTimestamp('doctorstrange', reverseTimeStamp),
            password: 'passwd',
            first_name: 'Stephen',
            last_name: 'Strange',
            email: createEmail('doctorstrange', reverseTimeStamp),
            nickname: withTimestamp('sorcerersupreme', reverseTimeStamp),
        },
        thor: {
            username: withTimestamp('thor', reverseTimeStamp),
            password: 'passwd',
            first_name: 'Thor',
            last_name: 'Odinson',
            email: createEmail('thor', reverseTimeStamp),
            nickname: withTimestamp('mjolnir', reverseTimeStamp),
        },
        loki: {
            username: withTimestamp('loki', reverseTimeStamp),
            password: 'passwd',
            first_name: 'Loki',
            last_name: 'Odinson',
            email: createEmail('loki', reverseTimeStamp),
            nickname: withTimestamp('trickster', reverseTimeStamp),
        },
        dot: {
            username: withTimestamp('dot.dot', reverseTimeStamp),
            password: 'passwd',
            first_name: 'z1First',
            last_name: 'z1Last',
            email: createEmail('dot', reverseTimeStamp),
            nickname: 'z1Nick',
        },
        dash: {
            username: withTimestamp('dash-dash', reverseTimeStamp),
            password: 'passwd',
            first_name: 'z2First',
            last_name: 'z2Last',
            email: createEmail('dash', reverseTimeStamp),
            nickname: 'z2Nick',
        },
        underscore: {
            username: withTimestamp('under_score', reverseTimeStamp),
            password: 'passwd',
            first_name: 'z3First',
            last_name: 'z3Last',
            email: createEmail('underscore', reverseTimeStamp),
            nickname: 'z3Nick',
        },
    };
}
export function createPrivateChannel(teamId: string, userToAdd = null) {
    return createChannel('P', teamId, userToAdd);
}
export function createPublicChannel(teamId, userToAdd = null) {
    return createChannel('O', teamId, userToAdd);
}
export function searchAndVerifyChannel(channel, shouldExist = true) {
    const name = channel.display_name;
    searchForChannel(name);
    if (shouldExist) {
        cy.get('#suggestionList').findByTestId(channel.name).should('be.visible');
    } else {
        cy.get('#suggestionList').should('not.exist');
        cy.findByTestId(channel.name).should('not.exist');
    }
}
export function searchAndVerifyUser(user) {
    cy.uiGetPostTextBox().
        as('input').
        clear().
        type(`@${user.username}`);
    cy.get('#suggestionList', {timeout: TIMEOUTS.FIVE_SEC}).should('be.visible');
    return cy.uiVerifyAtMentionSuggestion(user);
}