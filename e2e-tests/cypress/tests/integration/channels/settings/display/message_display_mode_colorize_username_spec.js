describe('Settings > Display > Message Display: Colorize username', () => {
    let testTeam;
    let firstUser;
    let otherUser;
    let testChannel;
    const colors = {};
    let defaultTextColor = '';
    before(() => {
        cy.apiInitSetup().then(({channel, user, team}) => {
            testTeam = team;
            firstUser = user;
            testChannel = channel;
            cy.apiCreateUser({prefix: 'other'}).then(({user: user1}) => {
                otherUser = user1;
                cy.apiAddUserToTeam(testTeam.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, otherUser.id);
                    cy.postMessageAs({
                        sender: otherUser,
                        message: 'Other message',
                        channelId: testChannel.id,
                    });
                    cy.postMessageAs({
                        sender: firstUser,
                        message: 'Test message',
                        channelId: testChannel.id,
                    });
                });
            });
        },
        );
    });
    beforeEach(() => {
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
    });
    it('MM-T4984_1 Message Display: colorize usernames option should not exist in Standard mode', () => {
        cy.uiChangeMessageDisplaySetting();
        cy.findByText(firstUser.username).then((elements) => {
            cy.window().then((win) => {
                defaultTextColor = win.getComputedStyle(elements[0]).color;
            });
        });
        goToMessageDisplaySetting();
        cy.findByRole('checkbox', {
            name: 'Colorize usernames: Use colors to distinguish users in compact mode',
        }).should('not.exist');
        cy.uiSaveAndClose();
    });
    it('MM-T4984_2 Message Display: colorize usernames option should exist in Compact mode and function as expected', () => {
        cy.uiChangeMessageDisplaySetting('COMPACT');
        goToMessageDisplaySetting();
        cy.findByRole('checkbox', {name: 'Colorize usernames: Use colors to distinguish users in compact mode'}).should('exist');
        cy.findByRole('checkbox', {name: 'Colorize usernames: Use colors to distinguish users in compact mode'}).should('be.checked');
        cy.uiSaveAndClose();
        cy.findByText(firstUser.username).then((elements) => {
            colors[firstUser.username] = elements[0].attributes.style.value;
        });
        cy.findByText(otherUser.username).then((elements) => {
            colors[otherUser.username] = elements[0].attributes.style.value;
        }).then(() => {
            expect(colors[firstUser.username]).to.not.equal(colors[otherUser.username]);
        });
        cy.reload();
        cy.findByText(firstUser.username).then((elements) => {
            cy.wrap(elements[0]).should('have.attr', 'style', colors[firstUser.username]);
        });
        cy.findByText(otherUser.username).then((elements) => {
            cy.wrap(elements[0]).should('have.attr', 'style', colors[otherUser.username]);
        });
    });
    it('MM-T4984_3 Message Display: disabling colorize should revert colors to normal color', () => {
        cy.uiChangeMessageDisplaySetting('COMPACT');
        goToMessageDisplaySetting();
        cy.findByRole('checkbox', {name: 'Colorize usernames: Use colors to distinguish users in compact mode'}).should('exist');
        cy.findByRole('checkbox', {name: 'Colorize usernames: Use colors to distinguish users in compact mode'}).uncheck().should('not.be.checked');
        cy.uiSaveAndClose();
        cy.findByText(firstUser.username).then((elements) => {
            cy.wrap(elements[0]).should('have.css', 'color', defaultTextColor);
        });
        cy.findByText(otherUser.username).then((elements) => {
            cy.wrap(elements[0]).should('have.css', 'color', defaultTextColor);
        });
    });
});
function goToMessageDisplaySetting() {
    cy.uiOpenSettingsModal('Display').within(() => {
        cy.get('#displayButton').scrollIntoView().click();
        cy.get('#message_displayEdit').scrollIntoView().should('be.visible');
        cy.get('#message_displayEdit').click();
    });
}