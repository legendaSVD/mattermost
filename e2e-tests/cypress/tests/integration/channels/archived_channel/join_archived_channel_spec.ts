import {getAdminAccount} from '../../../support/env';
import {getRandomId} from '../../../utils';
describe('Archived channels', () => {
    let testTeam;
    let testUser;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            testUser = user;
        });
    });
    it('MM-T1682 Join an archived public channel by selecting a permalink to one of its posts', () => {
        cy.apiAdminLogin();
        cy.apiCreateChannel(testTeam.id, 'channel', 'channel').then(({channel}) => {
            cy.postMessageAs({
                sender: getAdminAccount(),
                message: 'post',
                channelId: channel.id,
            }).then((post) => {
                const permalink = `/${testTeam.name}/pl/${post.id}`;
                cy.visit(`/${testTeam.name}/channels/${channel.name}`);
                cy.uiArchiveChannel();
                cy.apiLogin(testUser);
                cy.visit(permalink);
                verifyUsername(testUser.username);
                verifyViewingArchivedChannel(channel);
            });
        });
    });
    it('MM-T1683 Join an archived channel by selecting a link to channel', () => {
        cy.apiAdminLogin();
        cy.apiCreateChannel(testTeam.id, 'channel', 'channel').then(({channel}) => {
            const channelLink = `/${testTeam.name}/channels/${channel.name}`;
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.uiArchiveChannel();
            cy.visit(`/${testTeam.name}/channels/off-topic`);
            const linkText = `link ${getRandomId()}`;
            cy.getCurrentChannelId().then((currentChannelId) => {
                cy.postMessageAs({
                    sender: getAdminAccount(),
                    message: `This is a link: [${linkText}](${channelLink})`,
                    channelId: currentChannelId,
                });
            });
            cy.apiLogin(testUser);
            cy.visit(`/${testTeam.name}/channels/off-topic`);
            verifyUsername(testUser.username);
            cy.contains('a', linkText).should('be.visible').click();
            verifyViewingArchivedChannel(channel);
        });
    });
});
function verifyViewingArchivedChannel(channel) {
    cy.get('#channelHeaderTitle').should('contain', channel.display_name);
    cy.findByTestId('channel-header-archive-icon').should('be.visible');
    cy.get(`#sidebarItem_${channel.name}`).should('be.visible').
        find('.icon-archive-outline').should('be.visible');
    cy.get('#channelArchivedMessage').should('be.visible');
}
function verifyUsername(username) {
    cy.uiOpenUserMenu().findByText(`@${username}`);
    cy.get('body').type('{esc}');
}