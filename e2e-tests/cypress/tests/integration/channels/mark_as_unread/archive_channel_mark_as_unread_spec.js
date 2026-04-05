import {markAsUnreadShouldBeAbsent} from './helpers';
describe('Channels', () => {
    let testUser;
    let testChannel;
    let testTeam;
    let post1;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testUser = user;
            testTeam = team;
            cy.apiCreateChannel(team.id, 'channel-test', 'Channel').then(({channel}) => {
                testChannel = channel;
                cy.apiCreateUser().then(({user: user2}) => {
                    const otherUser = user2;
                    cy.apiAddUserToTeam(team.id, otherUser.id).then(() => {
                        cy.apiAddUserToChannel(testChannel.id, otherUser.id);
                        cy.postMessageAs({sender: otherUser, message: 'post1', channelId: testChannel.id}).then((p1) => {
                            post1 = p1;
                        });
                    });
                });
            });
        });
    });
    it('MM-T263 Mark as Unread post menu option should not be available for archived channels', () => {
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.get('#channelHeaderTitle').should('contain', testChannel.display_name).click();
        cy.get('#channelHeaderDropdownMenu').should('be.visible').within(() => {
            cy.findByText('Archive Channel').should('be.visible').click();
        });
        cy.get('#deleteChannelModal').should('be.visible').within(() => {
            cy.findByText('Archive').should('be.visible').click();
        });
        markAsUnreadShouldBeAbsent(post1.id);
        cy.get('.NotificationSeparator').should('not.exist');
    });
});