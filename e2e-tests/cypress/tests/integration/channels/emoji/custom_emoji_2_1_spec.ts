import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getCustomEmoji, verifyLastPostedEmoji} from './helpers';
describe('Custom emojis', () => {
    let testTeam;
    let testUser;
    let otherUser;
    let townsquareLink;
    const largeEmojiFile = 'gif-image-file.gif';
    const largeEmojiFileResized = 'gif-image-file-resized.gif';
    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableCustomEmoji: true,
            },
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            testUser = user;
            townsquareLink = `/${team.name}/channels/town-square`;
        });
        cy.apiCreateUser().then(({user: user1}) => {
            otherUser = user1;
            cy.apiAddUserToTeam(testTeam.id, otherUser.id);
        }).then(() => {
            cy.apiLogin(testUser);
            cy.visit(townsquareLink);
        });
    });
    it('MM-T2185 Custom emoji - renders immediately for other user Custom emoji - renders after logging out and back in -- KNOWN ISSUE: MM-44768', () => {
        const {customEmojiWithColons} = getCustomEmoji();
        cy.uiOpenCustomEmoji();
        cy.findByText('Add Custom Emoji').should('be.visible').click();
        cy.get('#name').type(customEmojiWithColons);
        cy.get('input#select-emoji').attachFile(largeEmojiFile).wait(TIMEOUTS.THREE_SEC);
        cy.uiSave().wait(TIMEOUTS.THREE_SEC);
        cy.visit(townsquareLink);
        cy.postMessage(customEmojiWithColons);
        cy.apiLogin(otherUser);
        cy.visit(townsquareLink);
        verifyLastPostedEmoji(customEmojiWithColons, largeEmojiFileResized);
        cy.apiLogin(testUser);
        cy.visit(townsquareLink);
        verifyLastPostedEmoji(customEmojiWithColons, largeEmojiFileResized);
    });
});