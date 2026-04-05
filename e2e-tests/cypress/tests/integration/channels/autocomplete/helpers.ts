import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getAdminAccount} from '../../../support/env';
export type SimpleUser = Pick<Cypress.UserProfile, 'username' | 'first_name' | 'last_name' | 'nickname' | 'password' | 'email'>;
function createPrivateChannel(teamId: string, userToAdd: Cypress.UserProfile = null) {
    return createChannel('P', teamId, userToAdd);
}
function createPublicChannel(teamId: string, userToAdd: Cypress.UserProfile = null) {
    return createChannel('O', teamId, userToAdd);
}
function createSearchData(prefix: string) {
    return cy.apiCreateCustomAdmin({loginAfter: true, hideAdminTrialModal: true}).then(({sysadmin}) => {
        const users = getTestUsers(prefix);
        cy.apiLogin(sysadmin);
        return cy.apiCreateTeam('search', 'Search').then(({team}) => {
            Cypress._.forEach(users, (testUser) => {
                cy.apiCreateUser({user: testUser}).then(({user}) => {
                    cy.apiAddUserToTeam(team.id, user.id);
                });
            });
            return cy.wrap({sysadmin, team, users});
        });
    });
}
function getTestUsers(prefix = ''): Record<string, SimpleUser> {
    if (Cypress.env('searchTestUsers')) {
        return JSON.parse(Cypress.env('searchTestUsers'));
    }
    return {
        ironman: generatePrefixedUser({
            username: 'ironman',
            first_name: 'Tony',
            last_name: 'Stark',
            nickname: 'protoncannon',
        }, prefix),
        hulk: generatePrefixedUser({
            username: 'hulk',
            first_name: 'Bruce',
            last_name: 'Banner',
            nickname: 'gammaray',
        }, prefix),
        hawkeye: generatePrefixedUser({
            username: 'hawkeye',
            first_name: 'Clint',
            last_name: 'Barton',
            nickname: 'ronin',
        }, prefix),
        deadpool: generatePrefixedUser({
            username: 'deadpool',
            first_name: 'Wade',
            last_name: 'Wilson',
            nickname: 'merc',
        }, prefix),
        captainamerica: generatePrefixedUser({
            username: 'captainamerica',
            first_name: 'Steve',
            last_name: 'Rogers',
            nickname: 'professional',
        }, prefix),
        doctorstrange: generatePrefixedUser({
            username: 'doctorstrange',
            first_name: 'Stephen',
            last_name: 'Strange',
            nickname: 'sorcerersupreme',
        }, prefix),
        thor: generatePrefixedUser({
            username: 'thor',
            first_name: 'Thor',
            last_name: 'Odinson',
            nickname: 'mjolnir',
        }, prefix),
        loki: generatePrefixedUser({
            username: 'loki',
            first_name: 'Loki',
            last_name: 'Odinson',
            nickname: 'trickster',
        }, prefix),
        dot: generatePrefixedUser({
            username: 'dot.dot',
            first_name: 'z1First',
            last_name: 'z1Last',
            nickname: 'z1Nick',
        }, prefix),
        dash: generatePrefixedUser({
            username: 'dash-dash',
            first_name: 'z2First',
            last_name: 'z2Last',
            nickname: 'z2Nick',
        }, prefix),
        underscore: generatePrefixedUser({
            username: 'under_score',
            first_name: 'z3First',
            last_name: 'z3Last',
            nickname: 'z3Nick',
        }, prefix),
    };
}
function getPostTextboxInput() {
    cy.wait(TIMEOUTS.HALF_SEC);
    cy.uiGetPostTextBox().
        as('input').
        clear();
}
function getQuickChannelSwitcherInput() {
    cy.findByRole('combobox', {name: 'quick switch input'}).
        should('be.visible').
        as('input').
        clear();
}
function searchAndVerifyChannel(channel: Cypress.Channel, shouldExist = true) {
    const name = channel.display_name;
    searchForChannel(name);
    if (shouldExist) {
        cy.get('#suggestionList').findByTestId(channel.name).should('be.visible');
    } else {
        cy.get('#suggestionList').should('not.exist');
        cy.findByTestId(channel.name).should('not.exist');
    }
}
function searchAndVerifyUser(user: Cypress.UserProfile) {
    cy.uiGetPostTextBox().
        as('input').
        clear().
        type(`@${user.username}`);
    cy.get('#suggestionList', {timeout: TIMEOUTS.FIVE_SEC}).should('be.visible');
    return cy.uiVerifyAtMentionSuggestion(user);
}
function searchForChannel(name: string) {
    cy.typeCmdOrCtrl().type('k').wait(TIMEOUTS.ONE_SEC);
    cy.findByRole('combobox', {name: 'quick switch input'}).
        should('be.visible').
        as('input').
        clear().
        type(name);
}
function startAtMention(string: string) {
    cy.get('@input').clear().type(string);
    cy.get('#suggestionList').should('be.visible');
}
function verifySuggestionAtPostTextbox(...expectedUsers: SimpleUser[]) {
    expectedUsers.forEach((user) => {
        cy.wait(TIMEOUTS.HALF_SEC);
        cy.uiVerifyAtMentionSuggestion(user);
    });
}
function verifySuggestionAtChannelSwitcher(...expectedUsers: SimpleUser[]) {
    expectedUsers.forEach((user) => {
        cy.findByTestId(user.username).
            should('be.visible').
            and('have.text', `${user.first_name} ${user.last_name} (${user.nickname})@${user.username}`);
    });
}
function createChannel(channelType: string, teamId: string, userToAdd: Cypress.UserProfile = null) {
    return cy.externalRequest({
        user: getAdminAccount(),
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
                cy.externalAddUserToChannel(user.id, channel.id).then(() => {
                    cy.wait(TIMEOUTS.TWO_SEC);
                    return cy.wrap(channel);
                });
            });
        }
        cy.wait(TIMEOUTS.TWO_SEC);
        return cy.wrap(channel);
    });
}
function generatePrefixedUser(user: Omit<SimpleUser, 'password' | 'email'>, prefix: string) {
    return {
        username: withPrefix(user.username, prefix),
        password: 'passwd',
        first_name: withPrefix(user.first_name, prefix),
        last_name: withPrefix(user.last_name, prefix),
        email: createEmail(user.username, prefix),
        nickname: withPrefix(user.nickname, prefix),
    };
}
function withPrefix(name: string, prefix: string) {
    return prefix + name;
}
function createEmail(name: string, prefix: string) {
    return `${prefix}${name}@sample.mattermost.com`;
}
export {
    createPrivateChannel,
    createPublicChannel,
    createSearchData,
    getTestUsers,
    getPostTextboxInput,
    getQuickChannelSwitcherInput,
    searchAndVerifyChannel,
    searchAndVerifyUser,
    searchForChannel,
    startAtMention,
    verifySuggestionAtChannelSwitcher,
    verifySuggestionAtPostTextbox,
};