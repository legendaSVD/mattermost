import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getCustomEmoji} from './helpers';
describe('Custom emojis', () => {
    let testTeam;
    let testUser;
    let otherUser;
    let offTopicUrl;
    const tooLargeEmojiFile = 'huge-image.jpg';
    const animatedGifEmojiFile = 'animated-gif-image-file.gif';
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
    it('MM-T3668 User cant add custom emoji with the same name as a system one', () => {
        cy.uiOpenCustomEmoji();
        cy.findByText('Add Custom Emoji').should('be.visible').click();
        cy.get('#name').type('croissant');
        cy.get('.backstage-form__footer').within(($form) => {
            cy.uiSave().wait(TIMEOUTS.FIVE_SEC);
            cy.wrap($form).find('.has-error').should('be.visible').and('have.text', 'This name is already in use by a system emoji. Please choose another name.');
        });
    });
    it('MM-T2180 Custom emoji - cancel out of add', () => {
        const {customEmoji} = getCustomEmoji();
        cy.uiOpenCustomEmoji();
        cy.findByText('Add Custom Emoji').should('be.visible').click();
        cy.get('#name').type(customEmoji);
        cy.get('input#select-emoji').attachFile('mattermost-icon.png');
        cy.get('.backstage-form__footer').findByText('Cancel').click().wait(TIMEOUTS.FIVE_SEC);
        cy.visit(offTopicUrl);
        cy.uiOpenEmojiPicker();
        cy.findByPlaceholderText('Search emojis').should('be.visible').type(customEmoji, {delay: TIMEOUTS.QUARTER_SEC});
        cy.get('.no-results__title').should('be.visible').and('have.text', 'No results for “' + customEmoji + '”');
    });
    it('MM-T2182 Custom emoji - animated gif', () => {
        const {customEmojiWithColons} = getCustomEmoji();
        cy.uiOpenCustomEmoji();
        cy.findByRole('button', {name: 'Add Custom Emoji'}).should('be.visible').click();
        cy.get('#name').should('be.visible').type(customEmojiWithColons);
        cy.get('input#select-emoji').attachFile(animatedGifEmojiFile);
        cy.wait(TIMEOUTS.FIVE_SEC);
        saveCustomEmoji(testTeam.name);
        cy.visit(offTopicUrl);
        cy.postMessage(customEmojiWithColons);
        cy.uiOpenEmojiPicker();
        cy.findByPlaceholderText('Search emojis').should('be.visible').type(customEmojiWithColons, {delay: TIMEOUTS.QUARTER_SEC});
        cy.findAllByTestId('emojiItem').children().should('have.length', 1);
        cy.findAllByTestId('emojiItem').children('img').first().should('have.class', 'emoji-category--custom');
    });
    it('MM-T2183 Custom emoji - try to add too large', () => {
        const {customEmojiWithColons} = getCustomEmoji();
        cy.uiOpenCustomEmoji();
        cy.findByText('Add Custom Emoji').should('be.visible').click();
        cy.get('#name').type(customEmojiWithColons);
        cy.get('input#select-emoji').attachFile(tooLargeEmojiFile);
        cy.get('.add-emoji__filename').should('have.text', tooLargeEmojiFile);
        cy.get('.backstage-form__footer').within(($form) => {
            cy.uiSave().wait(TIMEOUTS.FIVE_SEC);
            cy.wrap($form).find('.has-error').should('be.visible').and('have.text', 'Unable to create emoji. Image must be less than 512 KiB in size.');
        });
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