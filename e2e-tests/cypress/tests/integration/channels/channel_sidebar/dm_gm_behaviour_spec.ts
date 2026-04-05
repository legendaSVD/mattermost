import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('DM category', () => {
    let testUser;
    before(() => {
        cy.apiInitSetup({loginAfter: true, promoteNewUserAsAdmin: true}).then(({team, user}) => {
            testUser = user;
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('MM-T2016_1 Opening a new DM should make sure the DM appears in the sidebar', () => {
        cy.apiCreateUser().then(({user}) => {
            cy.uiGetLHSHeader();
            clickOnNewDMButton();
            cy.get('#selectItems input').
                typeWithForce(user.username).
                wait(TIMEOUTS.HALF_SEC);
            cy.get(`#displayedUserName${user.username}`).click().wait(TIMEOUTS.HALF_SEC);
            cy.findByTestId('saveSetting').should('be.visible').click();
            cy.get(`.SidebarLink:contains(${user.username})`).should('be.visible');
        });
    });
    it('MM-T2016_2 Opening a new DM with a bot should make sure the DM appears in the sidebar, and the bot icon should be present', () => {
        cy.apiCreateBot().then(({bot}) => {
            cy.uiGetLHSHeader();
            cy.get(`.SidebarLink:contains(${bot.username})`).should('be.visible');
            cy.get(`.SidebarLink:contains(${bot.username})`).find('.Avatar').should('exist').
                and('have.attr', 'src').
                then((avatar) => cy.request({url: avatar.attr('src'), encoding: 'binary'})).
                should(({body}) => {
                    cy.fixture('bot-default-avatar.png', 'binary').should('deep.equal', body);
                });
        });
    });
    it('MM-T2016_3 Receiving a DM from a user should show the DM in the sidebar', () => {
        cy.apiCreateUser().then(({user}) => {
            cy.apiCreateDirectChannel([testUser.id, user.id]).then(({channel}) => {
                cy.uiGetLHSHeader();
                cy.postMessageAs({
                    sender: user,
                    message: `Hey ${testUser.username}`,
                    channelId: channel.id,
                });
                cy.get(`.SidebarLink:contains(${user.username})`).should('be.visible').click();
                cy.uiOpenChannelMenu('Close Direct Message');
                cy.get(`.SidebarLink:contains(${user.username})`).should('not.exist');
                cy.postMessageAs({
                    sender: user,
                    message: `Hello ${testUser.username}`,
                    channelId: channel.id,
                });
                cy.get(`.SidebarLink:contains(${user.username})`).should('be.visible');
            });
        });
    });
    it('MM-T2017_1 Opening a new GM should make sure the GM appears in the sidebar', () => {
        cy.apiCreateUser().then(({user}) => {
            cy.apiCreateUser().then(({user: user2}) => {
                cy.uiGetLHSHeader();
                clickOnNewDMButton();
                cy.get('#selectItems input').
                    typeWithForce(user.username).
                    wait(TIMEOUTS.HALF_SEC);
                cy.get(`#displayedUserName${user.username}`).click().wait(TIMEOUTS.HALF_SEC);
                cy.get('#selectItems input').
                    typeWithForce(user2.username).
                    wait(TIMEOUTS.HALF_SEC);
                cy.get(`#displayedUserName${user2.username}`).click().wait(TIMEOUTS.HALF_SEC);
                cy.findByTestId('saveSetting').should('be.visible').click();
                cy.get(`.SidebarLink:contains(${user.username})`).should('contain', user2.username).should('be.visible');
            });
        });
    });
    it('MM-T2017_2 Receiving a DM from a user should show the DM in the sidebar', () => {
        cy.apiCreateUser().then(({user}) => {
            cy.apiCreateUser().then(({user: user2}) => {
                cy.apiCreateGroupChannel([testUser.id, user.id, user2.id]).then(({channel}) => {
                    cy.uiGetLHSHeader();
                    cy.postMessageAs({
                        sender: user,
                        message: `Hey ${testUser.username}`,
                        channelId: channel.id,
                    });
                    cy.get(`#sidebarItem_${channel.name}`).should('be.visible').click();
                    cy.uiOpenChannelMenu('Close Group Message');
                    cy.get(`.SidebarLink:contains(${user.username})`).should('not.exist');
                    cy.postMessageAs({
                        sender: user,
                        message: `Hello ${testUser.username}`,
                        channelId: channel.id,
                    });
                    cy.get(`#sidebarItem_${channel.name}`).should('be.visible');
                });
            });
        });
    });
    it('MM-T2017_3 Should not double already open GMs in a custom category', () => {
        cy.apiCreateUser().then(({user}) => {
            cy.apiCreateUser().then(({user: user2}) => {
                cy.apiCreateGroupChannel([testUser.id, user.id, user2.id]).then(({channel}) => {
                    cy.uiGetLHSHeader();
                    cy.postMessageAs({
                        sender: user,
                        message: `Hey ${testUser.username}`,
                        channelId: channel.id,
                    });
                    cy.get(`#sidebarItem_${channel.name}`).should('be.visible').click();
                    cy.uiMoveChannelToCategory(channel.name, `Category ${user.username}`, true, true);
                    cy.get(`.SidebarChannelGroup:contains(Category ${user.username})`).find(`#sidebarItem_${channel.name}`).should('be.visible');
                    cy.get('#sidebarItem_town-square').should('be.visible').click();
                    cy.url().should('include', '/channels/town-square');
                    clickOnNewDMButton();
                    cy.get('#selectItems input').
                        typeWithForce(user.username).
                        wait(TIMEOUTS.HALF_SEC);
                    cy.get(`#displayedUserName${user.username}`).click().wait(TIMEOUTS.HALF_SEC);
                    cy.get('#selectItems input').
                        typeWithForce(user2.username).
                        wait(TIMEOUTS.HALF_SEC);
                    cy.get(`#displayedUserName${user2.username}`).click().wait(TIMEOUTS.HALF_SEC);
                    cy.findByTestId('saveSetting').should('be.visible').click();
                    cy.get(`.SidebarChannelGroup:contains(Category ${user.username})`).find(`#sidebarItem_${channel.name}`).should('be.visible');
                    cy.get('.SidebarChannelGroup:contains(DIRECT MESSAGES)').find(`#sidebarItem_${channel.name}`).should('not.exist');
                    cy.url().should('include', `/messages/${channel.name}`);
                });
            });
        });
    });
});
function clickOnNewDMButton() {
    cy.uiGetLHS().within(() => {
        cy.findByText('DIRECT MESSAGES').should('be.visible').parents('.SidebarChannelGroupHeader').within(() => {
            cy.findByLabelText('Write a direct message').should('be.visible').click();
        });
    });
}