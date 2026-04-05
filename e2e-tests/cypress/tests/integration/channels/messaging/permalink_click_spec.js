import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getAdminAccount} from '../../../support/env';
describe('Permalink message edit', () => {
    let testTeam;
    let testChannel;
    before(() => {
        cy.apiInitSetup().then(({team, channel}) => {
            testTeam = team;
            testChannel = channel;
        });
    });
    it('MM-T3830 System admins prompted before joining private channel via permalink', () => {
        gotoChannel(testTeam, testChannel);
        cy.uiCreateChannel({isPrivate: true}).then((channel1) => {
            cy.uiCreateChannel({isPrivate: true}).then((channel2) => {
                cy.postMessage(Date.now().toString());
                cy.getLastPostId().then((postId) => {
                    gotoChannel(testTeam, testChannel);
                    const message1 = `${Cypress.config('baseUrl')}/${testTeam.name}/channels/${channel1.name}`;
                    cy.postMessage(message1);
                    const message2 = `${Cypress.config('baseUrl')}/${testTeam.name}/pl/${postId}`;
                    cy.postMessage(message2);
                    cy.apiLogout().wait(TIMEOUTS.ONE_SEC).then(() => {
                        cy.apiLogin(getAdminAccount());
                        gotoChannel(testTeam, channel1);
                        cy.leaveTeam();
                        cy.visit(`/${testTeam.name}/channels/${channel1.name}`);
                        verifyPrivateChannelJoinPromptIsVisible(channel1);
                        cy.get('#cancelModalButton').should('be.visible').click();
                        cy.uiGetLHSHeader().findByText(testTeam.display_name);
                        gotoChannel(testTeam, testChannel);
                        cy.get(`a[href="${message1}"]`).should('be.visible').click();
                        verifyPrivateChannelJoinPromptIsVisible(channel1);
                        cy.get('#cancelModalButton').should('be.visible').click();
                        cy.get('#channelHeaderTitle').should('be.visible').should('contain', testChannel.display_name);
                        cy.get(`a[href="${message2}"]`).should('be.visible').click();
                        verifyPrivateChannelJoinPromptIsVisible(channel2);
                        joinPrivateChannel(channel2);
                        cy.uiLeaveChannel(true);
                        cy.go('back').wait(TIMEOUTS.THREE_SEC);
                        verifyPrivateChannelJoinPromptIsVisible(channel2);
                    });
                });
            });
        });
    });
});
function gotoChannel(team, channel) {
    cy.visit(`/${team.name}/channels/${channel.name}`);
    cy.get('#channelHeaderTitle').should('be.visible').should('contain', channel.display_name || channel.name);
}
function joinPrivateChannel(channel) {
    cy.get('#confirmModalButton').should('be.visible').click();
    cy.get('#channelHeaderTitle').should('be.visible').should('contain', channel.name);
}
function verifyPrivateChannelJoinPromptIsVisible(channel) {
    cy.get('#confirmModal').should('be.visible');
    cy.get('#genericModalLabel').should('be.visible').and('have.text', 'Join private channel');
    cy.get('#confirmModalBody').should('be.visible').and('have.text', `You are about to join ${channel.name} without explicitly being added by the channel admin. Are you sure you wish to join this private channel?`);
}