import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getCustomEmoji, verifyLastPostedEmoji} from './helpers';
describe('Custom emojis', () => {
    let testTeam;
    let testUser;
    let otherUser;
    let offTopicUrl;
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
            offTopicUrl = `/${team.name}/channels/off-topic`;
        });
        cy.apiCreateUser().then(({user: user1}) => {
            otherUser = user1;
            cy.apiAddUserToTeam(testTeam.id, otherUser.id);
        }).then(() => {
            cy.apiLogin(testUser);
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T2181 Custom emoji - add large -- KNOWN ISSUE: MM-44768', () => {
        const {customEmojiWithColons} = getCustomEmoji();
        cy.uiOpenCustomEmoji();
        cy.findByRole('button', {name: 'Add Custom Emoji'}).should('be.visible').click();
        cy.get('#name').type(customEmojiWithColons);
        cy.get('input#select-emoji').attachFile(largeEmojiFile);
        cy.wait(TIMEOUTS.FIVE_SEC);
        saveCustomEmoji(testTeam.name);
        cy.visit(offTopicUrl);
        cy.uiOpenEmojiPicker();
        cy.findByPlaceholderText('Search emojis').should('be.visible').type(customEmojiWithColons, {delay: TIMEOUTS.QUARTER_SEC});
        cy.findAllByTestId('emojiItem').children().should('have.length', 1);
        cy.findAllByTestId('emojiItem').children('img').first().should('have.class', 'emoji-category--custom');
        cy.uiGetPostTextBox().clear({force: true}).type(customEmojiWithColons.substring(0, 10));
        cy.get('#suggestionList').should('be.visible');
        cy.findByText(customEmojiWithColons).should('be.visible');
        cy.uiGetPostTextBox().type('{enter}').type('{enter}');
        verifyLastPostedEmoji(customEmojiWithColons, largeEmojiFileResized);
        cy.reload();
        verifyLastPostedEmoji(customEmojiWithColons, largeEmojiFileResized);
    });
});
function saveCustomEmoji(teamName) {
    cy.findByText('Save').click();
    const checkFn = () => {
        return cy.url().then((url) => {
            return !url.includes('/emoji/add');
        });
    };
    const options = {
        timeout: TIMEOUTS.ONE_MIN,
        interval: TIMEOUTS.FIVE_SEC,
        errorMsg: 'Timeout error waiting for custom emoji to be saved',
    };
    cy.waitUntil(checkFn, options);
    cy.url().should('include', `${teamName}/emoji`);
    cy.findByRole('button', {name: 'Add Custom Emoji'}).should('be.visible');
}