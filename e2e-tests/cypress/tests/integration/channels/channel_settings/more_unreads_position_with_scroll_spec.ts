describe('Channel settings', () => {
    let mainUser: Cypress.UserProfile;
    let otherUser: Cypress.UserProfile;
    let myTeam: Cypress.Team;
    const channelNames = new Array(20).fill(1).map((value, index) => `scroll${index}`);
    before(() => {
        cy.apiInitSetup().then(({team, user: firstUser}) => {
            mainUser = firstUser;
            myTeam = team;
            cy.apiCreateUser().then(({user: secondUser}) => {
                otherUser = secondUser;
                cy.apiAddUserToTeam(team.id, secondUser.id);
            });
            cy.wrap(channelNames).each((name) => {
                const displayName = `channel-${name}`;
                cy.apiCreateChannel(team.id, name.toString(), displayName, 'O', '', '', false).then(({channel}) => {
                    cy.apiAddUserToChannel(channel.id, mainUser.id);
                    cy.apiAddUserToChannel(channel.id, otherUser.id);
                });
            });
        });
    });
    it('MM-T888 Channel sidebar: More unreads', () => {
        const firstChannelIndex = 0;
        const lastChannelIndex = channelNames.length - 1;
        cy.apiLogin(mainUser);
        cy.visit(`/${myTeam.name}/channels/off-topic`);
        cy.get(`#sidebarItem_${channelNames[firstChannelIndex]}`).should('be.visible');
        cy.get('#SidebarContainer .simplebar-content-wrapper').scrollTo(0, 1);
        cy.get('#unreadIndicatorTop').should('not.be.visible');
        cy.get('#unreadIndicatorBottom').should('be.visible');
        cy.get('#unreadIndicatorBottom').click();
        cy.get(`#sidebarItem_${channelNames[firstChannelIndex]}`).should('not.be.visible');
        cy.get(`#sidebarItem_${channelNames[lastChannelIndex]}`).should('be.visible');
        cy.get('#unreadIndicatorTop').should('be.visible');
        cy.get('#unreadIndicatorBottom').should('not.be.visible');
        cy.get('#unreadIndicatorTop').click();
        cy.get(`#sidebarItem_${channelNames[firstChannelIndex]}`).should('be.visible');
        cy.get(`#sidebarItem_${channelNames[lastChannelIndex]}`).should('not.be.visible');
        cy.get('#SidebarContainer .simplebar-content-wrapper').scrollTo(0, 200);
        cy.get('#unreadIndicatorTop').should('be.visible');
        cy.get('#unreadIndicatorBottom').should('be.visible');
    });
});