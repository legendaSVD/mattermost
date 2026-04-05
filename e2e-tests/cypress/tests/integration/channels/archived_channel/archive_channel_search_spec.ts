import {getRandomId} from '../../../utils';
import {createArchivedChannel} from './helpers';
describe('archive channel search tests', () => {
    let testTeam;
    let testChannel;
    let testUser;
    const testArchivedMessage = `this is an archived post ${getRandomId()}`;
    before(() => {
        cy.apiInitSetup().then(({team, channel, user}) => {
            testTeam = team;
            testChannel = channel;
            testUser = user;
            cy.apiCreateUser({prefix: 'second'}).then(({user: second}) => {
                cy.apiAddUserToTeam(testTeam.id, second.id);
            });
            cy.visit(`/${team.name}/channels/${testChannel.name}`);
        });
    });
    it('MM-T1707 Unarchived channels can be searched the same as before they where archived', () => {
        const messageText = `pineapple ${getRandomId()}`;
        createArchivedChannel({prefix: 'pineapple-'}, [messageText]).then(() => {
            cy.uiUnarchiveChannel().then(() => {
                cy.visit(`/${testTeam.name}/channels/off-topic`);
                cy.contains('#channelHeaderTitle', 'Off-Topic');
                cy.postMessage(getRandomId());
                cy.uiGetSearchContainer().click();
                cy.uiGetSearchBox().clear().type(`${messageText}{enter}`);
                cy.get('#searchContainer').should('be.visible');
                cy.get('.search-item-snippet').first().contains(messageText);
            });
        });
    });
    it('MM-T1708 An archived channel can be searched since archived channels are always viewable', () => {
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/off-topic`);
        cy.contains('#channelHeaderTitle', 'Off-Topic');
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.get('#channelHeaderTitle').should('be.visible');
        cy.postMessageAs({sender: testUser, message: testArchivedMessage, channelId: testChannel.id});
        cy.uiArchiveChannel();
        cy.uiGetSearchContainer().click();
        cy.uiGetSearchBox().clear().type(`${testArchivedMessage}{enter}`);
        cy.get('#searchContainer').should('be.visible');
        cy.get('.search-item-snippet').first().contains(testArchivedMessage);
    });
    it('MM-T1709 Archive a channel while search results are displayed in RHS', () => {
        const messageText = `search ${getRandomId()} pineapples`;
        cy.uiCreateChannel({prefix: 'archive-while-searching'}).then(() => {
            cy.postMessage(messageText);
            cy.uiGetSearchContainer().click();
            cy.uiGetSearchBox().clear().type(`${messageText}{enter}`);
            cy.get('#searchContainer').should('be.visible');
            cy.get('.search-item-snippet').first().should('contain.text', messageText);
            cy.uiArchiveChannel();
            cy.get('#searchContainer').should('be.visible');
            cy.get('.search-item-snippet').first().should('contain.text', messageText);
        });
    });
    it('MM-T1710 archived channels are not listed on the "in:" autocomplete', () => {
        cy.uiGetSearchContainer().click();
        cy.uiGetSearchBox().clear().type(`in:${testChannel.name}`);
        cy.findByTestId(testChannel.name).should('not.exist');
    });
});