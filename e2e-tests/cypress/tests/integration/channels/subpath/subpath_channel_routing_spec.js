import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Subpath Channel routing', () => {
    let testUser;
    let testTeam;
    let otherUser;
    before(() => {
        cy.shouldRunWithSubpath();
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            testUser = user;
            cy.apiCreateUser({prefix: 'otherUser'}).then(({user: newUser}) => {
                otherUser = newUser;
                cy.apiAddUserToTeam(team.id, newUser.id);
            });
            cy.apiLogin(testUser);
        });
    });
    it('MM-T986 - Should go to town square channel view', () => {
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').should('contain', 'Town Square');
    });
    it('MM-T987 - Rejoin channel with permalink', () => {
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.apiCreateChannel(testTeam.id, 'subpath-channel', 'subpath-channel', 'O', 'subpath-ch').then(({channel}) => {
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.postMessage('Subpath Test Message');
            cy.getLastPostId().then((id) => {
                const permalink = `${Cypress.config('baseUrl')}/${testTeam.name}/pl/${id}`;
                cy.clickPostDotMenu(id);
                cy.uiClickCopyLink(permalink, id);
                cy.uiLeaveChannel();
                cy.visit(permalink);
                cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').should('contain', 'subpath-channel');
                cy.get(`#postMessageText_${id}`).should('contain', 'Subpath Test Message');
            });
        });
    });
    it('MM-T988 - Should redirect to DM on login', () => {
        cy.apiCreateDirectChannel([testUser.id, otherUser.id]).then(() => {
            const dmChannelURL = `/${testTeam.name}/messages/@${otherUser.username}`;
            cy.apiLogout();
            cy.visit(dmChannelURL);
            cy.findByPlaceholderText('Email or Username').clear().type(testUser.username);
            cy.findByPlaceholderText('Password').clear().type(testUser.password);
            cy.get('#saveSetting').should('not.be.disabled').click();
            cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').should('contain', otherUser.username);
        });
    });
});