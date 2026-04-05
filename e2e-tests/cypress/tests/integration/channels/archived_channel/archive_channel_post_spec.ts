import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Archived channels', () => {
    let testTeam;
    let testUser;
    let otherUser;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testUser = user;
            testTeam = team;
            cy.apiCreateUser({prefix: 'second'}).then(({user: second}) => {
                cy.apiAddUserToTeam(testTeam.id, second.id);
                otherUser = second;
                cy.apiLogin(testUser);
                cy.apiCreateChannel(testTeam.id, 'channel', 'channel').then(({channel}) => {
                    cy.visit(`/${testTeam.name}/channels/${channel.name}`);
                });
            });
        });
    });
    it('MM-T1716 Text box in center channel and in RHS should not be visible', () => {
        cy.postMessage('Test archive reply');
        cy.getLastPostId().then((id) => {
            cy.clickPostCommentIcon(id);
            cy.get('#rhsContainer').should('be.visible');
            cy.uiGetReplyTextBox();
            cy.uiArchiveChannel();
            cy.uiGetPostTextBox({exist: false});
            cy.get('#rhsContainer').should('not.exist');
            cy.clickPostCommentIcon(id);
            cy.get('#rhsContainer').should('be.visible');
            cy.uiGetReplyTextBox({exist: false});
        });
    });
    it('MM-T1722 Can click reply arrow on a post from archived channel, from saved posts list', () => {
        cy.apiCreateChannel(testTeam.id, 'archived-channel', 'Archived Channel').then(({channel}) => {
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.postMessage('Test');
            cy.getLastPostId().then((id) => {
                const permalink = `${Cypress.config('baseUrl')}/${testTeam.name}/pl/${id}`;
                cy.clickPostDotMenu(id);
                cy.uiClickCopyLink(permalink, id);
                cy.get('#sidebarItem_off-topic').click();
                cy.postMessage(permalink).wait(TIMEOUTS.ONE_SEC);
            });
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.uiArchiveChannel();
        });
        cy.apiLogout();
        cy.reload();
        cy.apiLogin(otherUser);
        cy.visit(`/${testTeam.name}/channels/off-topic`);
        cy.get('a.markdown__link').click();
        cy.getNthPostId(1).then((postId) => {
            cy.clickPostSaveIcon(postId);
        });
        cy.uiGetSavedPostButton().click();
        cy.wait(TIMEOUTS.HALF_SEC);
        cy.get('#searchContainer').should('be.visible');
        cy.get('#search-items-container div.post-message__text-container > div').last().should('have.attr', 'id').and('not.include', ':').
            invoke('replace', 'rhsPostMessageText_', '').then((rhsPostId) => {
                cy.clickPostCommentIcon(rhsPostId, 'SEARCH');
                cy.uiGetReplyTextBox({exist: false});
            });
    });
});