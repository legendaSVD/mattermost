import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getCustomEmoji} from './helpers';
describe('Custom emojis', () => {
    let testTeam;
    let testUser;
    let otherUser;
    let townsquareLink;
    const largeEmojiFile = 'gif-image-file.gif';
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
    it('MM-T2184 Custom emoji - filter list', () => {
        const {customEmojiWithColons} = getCustomEmoji();
        const emojiNameForSearch1 = 'alabala';
        const emojiNameForSearch2 = customEmojiWithColons;
        cy.uiOpenCustomEmoji();
        cy.findByText('Add Custom Emoji').should('be.visible').click();
        cy.get('#name').type(customEmojiWithColons);
        cy.get('input#select-emoji').attachFile(largeEmojiFile).wait(TIMEOUTS.THREE_SEC);
        cy.uiSave().wait(TIMEOUTS.THREE_SEC);
        cy.visit(townsquareLink);
        cy.uiOpenEmojiPicker();
        cy.findByPlaceholderText('Search emojis').should('be.visible').type(emojiNameForSearch1, {delay: TIMEOUTS.QUARTER_SEC});
        cy.get('.no-results__title').should('be.visible').and('have.text', 'No results for “' + emojiNameForSearch1 + '”');
        cy.findByPlaceholderText('Search emojis').should('be.visible').clear().type(emojiNameForSearch2, {delay: TIMEOUTS.QUARTER_SEC});
        cy.findAllByTestId('emojiItem').children().should('have.length', 1);
        cy.findAllByTestId('emojiItem').children('img').first().should('have.class', 'emoji-category--custom');
    });
    it('MM-T4436 Emoji picker should show all custom emojis without overlaps', () => {
        const {customEmojiWithColons: firstEmojiWithColon} = getCustomEmoji();
        const {customEmojiWithColons: secondEmojiWithColon} = getCustomEmoji();
        cy.uiOpenCustomEmoji();
        [firstEmojiWithColon, secondEmojiWithColon].forEach((emojiWithColon) => {
            cy.findByText('Add Custom Emoji').should('be.visible').click();
            cy.get('#name').type(emojiWithColon);
            cy.get('input#select-emoji').attachFile(largeEmojiFile).wait(TIMEOUTS.THREE_SEC);
            cy.uiSave().wait(TIMEOUTS.THREE_SEC);
        });
        cy.visit(townsquareLink);
        cy.reload().wait(TIMEOUTS.FIVE_SEC);
        cy.uiOpenEmojiPicker();
        cy.get('#emojiPicker').should('be.visible').within(() => {
            cy.get('i.icon-emoticon-custom-outline').as('customSection');
            cy.get('@customSection').click().wait(TIMEOUTS.FIVE_SEC);
            cy.get('@customSection').click().wait(TIMEOUTS.FIVE_SEC);
            cy.findByText('Custom').should('exist').and('is.visible');
            cy.findAllByAltText('custom emoji').should('exist').eq(0).and('is.visible');
            cy.findAllByAltText('custom emoji').should('exist').eq(1).and('is.visible');
        });
    });
});