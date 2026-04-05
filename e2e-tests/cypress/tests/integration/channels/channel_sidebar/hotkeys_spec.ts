import {getAdminAccount} from '../../../support/env';
describe('Channel switching', () => {
    const sysadmin = getAdminAccount();
    const cmdOrCtrl = Cypress.platform === 'darwin' ? '{cmd}' : '{ctrl}';
    let testTeam;
    let testChannel;
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiInitSetup({
            loginAfter: true,
            channelPrefix: {name: 'c1', displayName: 'C1'},
        }).then(({team, channel, offTopicUrl}) => {
            testTeam = team;
            testChannel = channel;
            cy.visit(offTopicUrl);
        });
    });
    it('should switch channels when pressing the alt + arrow hotkeys', () => {
        cy.uiGetLHSHeader().findByText(testTeam.display_name);
        cy.postMessage('hello');
        cy.get('body').type('{alt}', {release: false}).type('{uparrow}').type('{alt}', {release: true});
        cy.url().should('include', `/${testTeam.name}/channels/${testChannel.name}`);
        cy.get('#channelHeaderTitle').should('contain', testChannel.display_name);
        cy.get('body').type('{alt}', {release: false}).type('{downarrow}').type('{alt}', {release: true});
        cy.url().should('include', `/${testTeam.name}/channels/off-topic`);
        cy.get('#channelHeaderTitle').should('contain', 'Off-Topic');
    });
    it('should switch to unread channels when pressing the alt + shift + arrow hotkeys', () => {
        cy.apiCreateChannel(testTeam.id, 'c2', 'C2');
        cy.postMessageAs({sender: sysadmin, message: 'Test', channelId: testChannel.id});
        cy.uiGetLHSHeader().findByText(testTeam.display_name);
        cy.postMessage('hello');
        cy.getCurrentChannelId().as('offTopicId');
        cy.get('body').type('{alt}{shift}', {release: false}).type('{uparrow}').type('{alt}{shift}', {release: true});
        cy.url().should('include', `/${testTeam.name}/channels/${testChannel.name}`);
        cy.get('#channelHeaderTitle').should('contain', testChannel.display_name);
        cy.get('@offTopicId').then((offTopicId) => cy.postMessageAs({sender: sysadmin, message: 'Test', channelId: offTopicId.text()}));
        cy.get('body').type('{alt}{shift}', {release: false}).type('{downarrow}').type('{alt}{shift}', {release: true});
        cy.url().should('include', `/${testTeam.name}/channels/off-topic`);
        cy.get('#channelHeaderTitle').should('contain', 'Off-Topic');
    });
    it('should open and close channel switcher on ctrl/cmd + k', () => {
        cy.get('#channelHeaderTitle').should('be.visible');
        cy.get('body').type(cmdOrCtrl, {release: false}).type('k').type(cmdOrCtrl, {release: true});
        cy.get('.channel-switcher').should('be.visible');
        cy.get('body').type(cmdOrCtrl, {release: false}).type('k').type(cmdOrCtrl, {release: true});
        cy.get('.channel-switcher').should('not.exist');
    });
});