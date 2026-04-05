describe('Message Draft with attachment and Switch Channels', () => {
    let testChannel1;
    let testChannel2;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, channel}) => {
            testChannel1 = channel;
            cy.apiCreateChannel(team.id, 'channel', 'Channel').then((out) => {
                testChannel2 = out.channel;
            });
            cy.visit(`/${team.name}/channels/town-square`);
            cy.get('#channelHeaderTitle').should('be.visible').should('contain', 'Town Square');
        });
    });
    it('MM-T129 Message Draft Pencil Icon - No text, only file attachment', () => {
        cy.get(`#sidebarItem_${testChannel1.name}`).click({force: true});
        cy.url().should('include', '/channels/' + testChannel1.name);
        cy.get(`#sidebarItem_${testChannel1.name}`).findByTestId('draftIcon').should('not.exist');
        cy.get('#fileUploadInput').attachFile('mattermost-icon.png');
        cy.get(`#sidebarItem_${testChannel2.name}`).click({force: true});
        cy.url().should('include', '/channels/' + testChannel2.name);
        cy.get(`#sidebarItem_${testChannel1.name}`).findByTestId('draftIcon').should('be.visible');
    });
});