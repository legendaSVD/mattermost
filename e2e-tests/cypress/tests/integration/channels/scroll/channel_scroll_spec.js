import * as MESSAGES from '../../../fixtures/messages';
import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Scroll', () => {
    let testTeam;
    let testChannel;
    let otherUser;
    beforeEach(() => {
        cy.apiInitSetup().then(({team, channel}) => {
            testTeam = team;
            testChannel = channel;
            cy.apiCreateUser().then(({user: user2}) => {
                otherUser = user2;
                cy.apiAddUserToTeam(testTeam.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, otherUser.id);
                });
            });
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
        });
    });
    it('MM-T2378 Channel with only a few posts opens at the bottom', () => {
        cy.postMessage('This is the first post');
        Cypress._.times(20, (postIndex) => {
            cy.postMessage(`p-${postIndex + 1}`);
        });
        cy.postMessage('This is the last post');
        cy.reload();
        cy.findByText(`Beginning of ${testChannel.display_name}`).should('exist').and('not.be.visible');
        cy.findByText('This is the last post').should('exist').and('be.visible');
    });
    it('MM-T2382 Center channel scroll', () => {
        cy.postMessage('This is the first post');
        Cypress._.times(30, (postIndex) => {
            cy.postMessage(`p-${postIndex + 1}`);
        });
        cy.findByText('This is the first post').should('exist').and('not.be.visible');
        Cypress._.times(3, (postIndex) => {
            postMessageAndcheckIfTopMessagesAreScrolled(postIndex + 1, otherUser, testChannel.id);
        });
    });
    it('MM-T2367 Compact view', () => {
        const message = 'This is the first post';
        cy.apiSaveMessageDisplayPreference('clean');
        Cypress._.times(2, () => {
            cy.postMessage(message);
        });
        cy.getLastPostId().then((parentMessageId) => {
            cy.get(`#${parentMessageId}_message`).invoke('text').then((text) => {
                expect(text).to.equal(message);
                expect(text).to.not.have.string('sysadmin');
            });
        });
        cy.apiSaveMessageDisplayPreference('compact');
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.getLastPostId().then((parentMessageId) => {
            cy.get(`#${parentMessageId}_message`).parent().invoke('text').then((text) => {
                expect(text).to.contain('sysadmin');
                expect(text).to.contain(message);
            });
        });
    });
    it('MM-T2374 System Messages', () => {
        const firstPost = '<< This is the first post><';
        const lastPost = '<< This is the last post><';
        cy.postMessage(firstPost);
        Cypress._.times(6, () => {
            cy.uiPostMessageQuickly(MESSAGES.LARGE);
            cy.uiPostMessageQuickly(MESSAGES.MEDIUM);
        });
        cy.postMessage(lastPost);
        cy.get('div.post-list__dynamic').should('be.visible').scrollTo('top', {duration: TIMEOUTS.ONE_SEC}).wait(TIMEOUTS.ONE_SEC);
        cy.findByText(firstPost).should('exist').and('be.visible');
        cy.findByText(lastPost).should('exist').and('not.be.visible');
        cy.apiCreateUser().then(({user: userAddRemove1}) => {
            cy.apiAddUserToTeam(testTeam.id, userAddRemove1.id).then(() => {
                cy.apiAddUserToChannel(testChannel.id, userAddRemove1.id);
                cy.wait(TIMEOUTS.THREE_SEC);
                cy.apiCreateUser().then(({user: userAddRemove2}) => {
                    cy.apiAddUserToTeam(testTeam.id, userAddRemove2.id).then(() => {
                        cy.apiAddUserToChannel(testChannel.id, userAddRemove2.id);
                        cy.wait(TIMEOUTS.THREE_SEC);
                        cy.apiCreateUser().then(({user: userAddRemove3}) => {
                            cy.apiAddUserToTeam(testTeam.id, userAddRemove3.id).then(() => {
                                cy.apiAddUserToChannel(testChannel.id, userAddRemove3.id);
                                cy.wait(TIMEOUTS.FIVE_SEC);
                                cy.removeUserFromChannel(testChannel.id, userAddRemove1.id);
                                cy.wait(TIMEOUTS.THREE_SEC);
                                cy.removeUserFromChannel(testChannel.id, userAddRemove2.id);
                                cy.wait(TIMEOUTS.FIVE_SEC);
                            });
                        });
                    });
                });
            });
        });
        cy.findByText(firstPost).should('exist').and('be.visible');
        cy.findByText(lastPost).should('exist').and('not.be.visible');
    });
});
function postMessageAndcheckIfTopMessagesAreScrolled(postIndex, sender, channelId) {
    cy.postMessageAs({sender, message: `Other users p-${postIndex}`, channelId});
    cy.get('#post-list').should('exist').within(() => {
        cy.findByText(`p-${postIndex}`).should('exist').and('not.be.visible');
        cy.findByText(`p-${postIndex + 1}`).should('exist').and('not.be.visible');
        cy.findByText(`Other users p-${postIndex}`).should('exist').and('be.visible');
    });
}