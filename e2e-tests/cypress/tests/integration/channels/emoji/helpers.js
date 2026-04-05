import {getRandomId} from '../../../utils';
export function getCustomEmoji() {
    const customEmoji = `emoji${getRandomId()}`;
    return {
        customEmoji,
        customEmojiWithColons: `:${customEmoji}:`,
    };
}
export function verifyLastPostedEmoji(emojiName, emojiImageFile) {
    cy.getLastPost().find('p').find('span > span').then((imageSpan) => {
        cy.expect(imageSpan.attr('title')).to.equal(emojiName);
        const url = imageSpan.css('background-image').split('"')[1];
        cy.fixture(emojiImageFile).then((overrideImage) => {
            cy.request({url, encoding: 'base64'}).then((response) => {
                expect(response.status).to.equal(200);
                expect(response.body).to.eq(overrideImage);
            });
        });
    });
}