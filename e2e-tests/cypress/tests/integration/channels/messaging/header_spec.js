import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Header', () => {
    let otherUser;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            cy.apiCreateUser().then(({user: user1}) => {
                otherUser = user1;
                cy.apiAddUserToTeam(team.id, otherUser.id);
            });
            cy.apiLogin(user);
            cy.visit(`/${team.name}/channels/off-topic`);
        });
    });
    it('MM-T88 An ellipsis indicates the channel header is too long - public or private channel Quote icon displays at beginning of channel header', () => {
        updateAndVerifyChannelHeader(false, '>', 'newheader');
        updateAndVerifyChannelHeader(false, '>', 'newheader'.repeat(20));
    });
    it('MM-T881_1 - Header: Markdown quote', () => {
        const header = 'This is a quote in the header';
        updateAndVerifyChannelHeader(false, '>', header);
    });
    it('MM-T89 An ellipsis indicates the channel header is too long - DM', () => {
        cy.uiChangeMessageDisplaySetting('COMPACT');
        cy.uiAddDirectMessage().click().wait(TIMEOUTS.HALF_SEC);
        cy.focused().
            type(otherUser.username, {force: true}).wait(TIMEOUTS.HALF_SEC).
            type('{enter}', {force: true}).wait(TIMEOUTS.HALF_SEC);
        cy.get('#saveItems').click().wait(TIMEOUTS.HALF_SEC);
        const header = `quote ${'newheader'.repeat(15)}`;
        updateAndVerifyChannelHeader(true, '>', header);
        cy.get('#channelHeaderDescription .header-description__text').trigger('mouseenter');
        cy.get('.channel-header-text-popover').should(($el) => {
            expect($el.get(0).innerText).to.eq(header);
        });
        cy.apiSaveMessageDisplayPreference('clean');
    });
});
function updateAndVerifyChannelHeader(isDM, prefix, header) {
    if (isDM) {
        cy.updateDMGMChannelHeader(prefix + header);
    } else {
        cy.updateChannelHeader(prefix + header);
    }
    if (prefix === '>') {
        cy.get('.header-description__text').within(() => {
            cy.get('blockquote').should('be.visible');
        });
    }
    cy.get('.header-description__text').
        should('include.text', header).
        and('have.css', 'overflow', 'hidden').
        and('have.css', 'text-overflow', 'ellipsis');
}