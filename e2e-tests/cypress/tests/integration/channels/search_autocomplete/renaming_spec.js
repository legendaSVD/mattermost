import * as TIMEOUTS from '../../../fixtures/timeouts';
import {withTimestamp, createEmail} from '../enterprise/elasticsearch_autocomplete/helpers';
describe('Autocomplete without Elasticsearch - Renaming', () => {
    const timestamp = Date.now();
    let testTeam;
    before(() => {
        cy.apiGetClientLicense().then(({isCloudLicensed}) => {
            if (!isCloudLicensed) {
                cy.shouldHaveElasticsearchDisabled();
            }
        });
        cy.apiCreateTeam(`search-${timestamp}`, `search-${timestamp}`).then(({team}) => {
            testTeam = team;
        });
    });
    it('renamed user appears in message input box', () => {
        const spiderman = {
            username: withTimestamp('spiderman', timestamp),
            password: 'passwd',
            first_name: 'Peter',
            last_name: 'Parker',
            email: createEmail('spiderman', timestamp),
            nickname: withTimestamp('friendlyneighborhood', timestamp),
        };
        cy.apiCreateUser({user: spiderman}).then(({user}) => {
            cy.apiAddUserToTeam(testTeam.id, user.id).then(() => {
                cy.visit(`/${testTeam.name}/channels/off-topic`);
                searchAndVerifyUser(user);
                const newName = withTimestamp('webslinger', timestamp);
                cy.apiPatchUser(user.id, {username: newName}).then(() => {
                    user.username = newName;
                    searchAndVerifyUser(user);
                });
            });
        });
    });
    it('renamed channel appears in channel switcher', () => {
        const channelName = 'newchannel' + Date.now();
        const newChannelName = 'updatedchannel' + Date.now();
        cy.apiCreateChannel(testTeam.id, channelName, channelName).then(({channel}) => {
            searchAndVerifyChannel(channel);
            cy.apiPatchChannel(channel.id, {name: newChannelName});
            channel.name = newChannelName;
            cy.reload();
            searchAndVerifyChannel(channel);
        });
    });
    describe('renamed team', () => {
        let testUser;
        let testChannel;
        before(() => {
            const punisher = {
                username: withTimestamp('punisher', timestamp),
                password: 'passwd',
                first_name: 'Frank',
                last_name: 'Castle',
                email: createEmail('punisher', timestamp),
                nickname: withTimestamp('lockednloaded', timestamp),
            };
            cy.apiCreateUser({user: punisher}).then(({user}) => {
                testUser = user;
                cy.apiAddUserToTeam(testTeam.id, testUser.id).then(() => {
                    cy.visit(`/${testTeam.name}/channels/off-topic`);
                    cy.get('body').type('{esc}');
                    searchAndVerifyUser(user);
                });
            });
            const channelName = 'another-channel' + Date.now();
            cy.apiCreateChannel(testTeam.id, channelName, channelName).then(({channel}) => {
                testChannel = channel;
                searchAndVerifyChannel(testChannel);
                cy.get('body').type('{esc}');
            });
            cy.apiPatchTeam(testTeam.id, {display_name: 'updatedteam' + timestamp});
        });
        it('correctly searches for user', () => {
            cy.get('body').type('{esc}');
            searchAndVerifyUser(testUser);
        });
        it('correctly searches for channel', () => {
            cy.get('body').type('{esc}');
            searchAndVerifyChannel(testChannel);
        });
    });
});
function searchAndVerifyChannel(channel) {
    cy.typeCmdOrCtrl().type('k');
    cy.findByRole('combobox', {name: 'quick switch input'}).
        should('be.visible').
        as('input').
        clear().
        type(channel.display_name);
    cy.get('#suggestionList', {timeout: TIMEOUTS.FIVE_SEC}).should('be.visible');
    cy.findByTestId(channel.name).
        should('be.visible');
}
function searchAndVerifyUser(user) {
    cy.uiGetPostTextBox().
        as('input').
        clear().
        type(`@${user.username}`);
    cy.get('#suggestionList', {timeout: TIMEOUTS.FIVE_SEC}).should('be.visible');
    return cy.uiVerifyAtMentionSuggestion(user);
}