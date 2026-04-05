import {beRead, beUnread} from '../../../support/assertions';
import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Multi-user group header', () => {
    let testUser;
    let testTeam;
    const userIds = [];
    const userList = [];
    let groupChannel;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testUser = user;
            testTeam = team;
            ['charlie', 'diana', 'eddie'].forEach((name) => {
                cy.apiCreateUser({prefix: name, bypassTutorial: true}).then(({user: groupUser}) => {
                    cy.apiAddUserToTeam(testTeam.id, groupUser.id);
                    userIds.push(groupUser.id);
                    userList.push(groupUser);
                });
            });
            userIds.push(testUser.id);
            cy.apiCreateGroupChannel(userIds).then(({channel}) => {
                groupChannel = channel;
            });
        });
    });
    it('MM-T472 Add a channel header to a GM', () => {
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/${groupChannel.name}`);
        const header = 'peace and progress';
        cy.get('#channel-header').within(() => {
            cy.findByText('Add a channel header').should('not.be.visible');
        });
        cy.findByText('Add a channel header').click({force: true});
        cy.get('#editChannelHeaderModalLabel').should('be.visible').wait(TIMEOUTS.ONE_SEC);
        cy.findByPlaceholderText('Enter the Channel Header').should('be.visible').type(`${header}{enter}`);
        cy.waitUntil(() => cy.get('#editChannelHeaderModalLabel').should('not.be.visible'));
        cy.get('#channel-header').within(() => {
            cy.findByText(header).should('be.visible');
        });
        checkSystemMessage('updated the channel header');
        cy.get(`#sidebarItem_${groupChannel.name}`).should(beRead);
        cy.apiLogout();
        cy.apiLogin(userList[0]);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.get(`#sidebarItem_${groupChannel.name}`).should(beUnread);
        cy.apiLogout();
    });
    it('MM-T473_1 Edit GM channel header', () => {
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/${groupChannel.name}`);
        cy.get('#channel-header').within(() => {
            cy.findByText('Add a channel header').should('not.exist');
        });
        const header = 'In pursuit of peace and progress';
        editHeader(header);
        cy.get('#channel-header').within(() => {
            cy.findByText(header).should('be.visible');
        });
        checkSystemMessage('updated the channel header');
        cy.apiLogout();
        cy.apiLogin(userList[0]);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.get(`#sidebarItem_${groupChannel.name}`).should(beUnread);
        cy.apiLogout();
    });
    it('MM-T473_2 Edit GM channel header', () => {
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/${groupChannel.name}`);
        cy.get('#channel-header').within(() => {
            cy.findByText('Add a channel header').should('not.exist');
        });
        const header = `In pursuit of peace and progress by @${testUser.username}`;
        editHeader(header);
        cy.get('#channel-header').within(() => {
            cy.get('.mention-link').should('be.visible').and('have.text', `@${testUser.username}`);
            cy.get('.mention--highlight').should('not.exist');
        });
    });
    function editHeader(header) {
        cy.uiOpenChannelMenu('');
        cy.findByRole('menuitem', {name: 'Settings'}).trigger('mouseover');
        cy.findByText('Edit Header').click();
        cy.get('#editChannelHeaderModalLabel').should('be.visible').wait(TIMEOUTS.ONE_SEC);
        cy.get('textarea#edit_textbox').should('be.visible').clear().type(`${header}{enter}`);
        cy.waitUntil(() => cy.get('#editChannelHeaderModalLabel').should('not.be.visible'));
    }
    function checkSystemMessage(message) {
        cy.getLastPostId().then((id) => {
            cy.get(`#postMessageText_${id}`).should('contain', message);
            cy.clickPostDotMenu(id).then(() => {
                cy.get(`#delete_post_${id}`);
            });
        });
    }
});