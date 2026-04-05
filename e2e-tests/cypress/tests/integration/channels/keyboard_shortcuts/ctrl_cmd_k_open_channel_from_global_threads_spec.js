import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Keyboard Shortcuts', () => {
    let testTeam;
    let testUser;
    let otherUser;
    let testChannel;
    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                ThreadAutoFollow: true,
                CollapsedThreads: 'default_off',
            },
        });
        cy.apiInitSetup({loginAfter: true, promoteNewUserAsAdmin: true}).then(({team, channel, user}) => {
            testTeam = team;
            testUser = user;
            testChannel = channel;
            cy.apiSaveCRTPreference(testUser.id, 'on');
            cy.apiCreateUser({prefix: 'other'}).then(({user: user1}) => {
                otherUser = user1;
                cy.apiAddUserToTeam(testTeam.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, otherUser.id);
                });
            });
        });
    });
    beforeEach(() => {
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
    });
    it('MM-T4648 CTRL/CMD+K - Create thread, Open global threads and then from find channels switch channel using arrow keys and Enter', () => {
        cy.postMessageAs({
            sender: otherUser,
            message: 'First post',
            channelId: testChannel.id,
        }).then(({id: rootId}) => {
            cy.get(`#post_${rootId}`).click();
            cy.postMessageReplyInRHS('Reply!');
            cy.uiCloseRHS();
        });
        cy.postMessageAs({
            sender: otherUser,
            message: 'Second post',
            channelId: testChannel.id,
        }).then(({id: rootId}) => {
            cy.get(`#post_${rootId}`).click();
            cy.postMessageReplyInRHS('Reply!');
            cy.uiClickSidebarItem('threads');
            cy.get('div.ThreadItem').should('have.have.lengthOf', 2);
        });
        cy.get('body').cmdOrCtrlShortcut('K');
        cy.get('#quickSwitchInput').type('T');
        cy.wait(TIMEOUTS.HALF_SEC);
        cy.get('body').type('{downarrow}');
        cy.get('body').type('{downarrow}');
        cy.get('body').type('{downarrow}');
        cy.url().should('equal', `${Cypress.config('baseUrl')}/${testTeam.name}/threads`);
        cy.get('#suggestionList').findByTestId('off-topic').should('be.visible').and('have.class', 'suggestion--selected');
        cy.wait(TIMEOUTS.HALF_SEC);
        cy.get('body').type('{uparrow}');
        cy.url().should('equal', `${Cypress.config('baseUrl')}/${testTeam.name}/threads`);
        cy.get('#suggestionList').findByTestId('town-square').should('be.visible').and('have.class', 'suggestion--selected');
        cy.wait(TIMEOUTS.HALF_SEC);
        cy.get('body').type('{downarrow}');
        cy.url().should('equal', `${Cypress.config('baseUrl')}/${testTeam.name}/threads`);
        cy.get('#suggestionList').findByTestId('off-topic').should('be.visible').and('have.class', 'suggestion--selected');
        cy.get('body').type('{enter}');
        cy.contains('#channelHeaderTitle', 'Off-Topic');
        cy.url().should('include', '/channels/off-topic');
    });
});