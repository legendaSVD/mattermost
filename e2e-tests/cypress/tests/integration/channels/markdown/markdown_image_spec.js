import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Markdown', () => {
    before(() => {
        cy.apiUpdateConfig({
            ImageProxySettings: {
                Enable: true,
                ImageProxyType: 'local',
            },
        });
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    const baseUrl = Cypress.config('baseUrl');
    it('with in-line images 1', () => {
        cy.postMessageFromFile('markdown/markdown_inline_images_1.md');
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).find('div.markdown-inline-img__container').
                should('contain', 'Mattermost/platform build status:  ');
            cy.get(`#postMessageText_${postId}`).find('img').
                should('have.class', 'markdown-inline-img').
                and('have.class', 'markdown-inline-img--hover').
                and('have.class', 'markdown-inline-img--no-border').
                and('have.attr', 'alt', 'Build Status').
                and('have.attr', 'src', `${baseUrl}/api/v4/image?url=https%3A%2F%2Fdocs.mattermost.com%2F_images%2Ficon-76x76.png`).
                and((inlineImg) => {
                    expect(inlineImg.height()).to.be.closeTo(76, 76);
                }).
                and('have.css', 'width', '76px');
        });
    });
    it('with in-line images 2', () => {
        cy.postMessageFromFile('markdown/markdown_inline_images_2.md');
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).find('div').
                should('have.text', 'GitHub favicon:  ').
                and('have.class', 'markdown-inline-img__container');
            cy.get(`#postMessageText_${postId}`).find('img').
                should('have.class', 'markdown-inline-img').
                and('have.class', 'markdown-inline-img--hover').
                and('have.class', 'cursor--pointer').
                and('have.class', 'a11y--active').
                and('have.attr', 'alt', 'Github').
                and('have.attr', 'src', `${baseUrl}/api/v4/image?url=https%3A%2F%2Fgithub.githubassets.com%2Ffavicon.ico`).
                and('have.css', 'height', '34px').
                and('have.css', 'width', '34px');
        });
    });
    it('opens image preview window when image is clicked', () => {
        cy.postMessageFromFile('markdown/markdown_inline_images_6.md').wait(TIMEOUTS.TWO_SEC);
        cy.uiGetPostBody().within(() => {
            cy.get('.markdown-inline-img').
                should('be.visible').
                and((inlineImg) => {
                    expect(inlineImg.height()).to.be.closeTo(25, 2);
                    expect(inlineImg.width()).to.be.closeTo(340, 2);
                }).
                click();
        });
        cy.uiGetFilePreviewModal();
        cy.uiCloseFilePreviewModal();
    });
    it('opens file preview window when icon image is clicked', () => {
        cy.postMessageFromFile('markdown/markdown_inline_images_2.md');
        cy.uiGetPostBody().within(() => {
            cy.get('.markdown-inline-img').
                should('be.visible').
                and('have.css', 'height', '34px').
                and('have.css', 'width', '34px').
                click();
        });
        cy.uiGetFilePreviewModal();
        cy.uiCloseFilePreviewModal();
    });
    it('channel header is markdown image', () => {
        cy.updateChannelHeader('![MM Logo](https://raw.githubusercontent.com/mattermost/mattermost/master/e2e-tests/cypress/tests/fixtures/small-image.png)').wait(TIMEOUTS.TWO_SEC);
        cy.get('#channelHeaderDescription').find('span.markdown__paragraph-inline').as('imageDiv');
        cy.get('@imageDiv').find('img.markdown-inline-img').
            should('have.class', 'markdown-inline-img--hover').
            and('have.class', 'cursor--pointer').
            and('have.class', 'a11y--active').
            and('have.css', 'height', '18px');
        cy.uiGetPostBody().
            find('img.markdown-inline-img').
            should('have.class', 'markdown-inline-img--hover').
            and('have.class', 'cursor--pointer').
            and('have.class', 'a11y--active').
            and('have.class', 'markdown-inline-img--scaled-down').
            and('have.css', 'height', '18px');
    });
    it('channel header is markdown image that is also a link', () => {
        cy.updateChannelHeader('[![Build Status](https://raw.githubusercontent.com/mattermost/mattermost/master/e2e-tests/cypress/tests/fixtures/small-image.png)](https://raw.githubusercontent.com/mattermost/mattermost/master/e2e-tests/cypress/tests/fixtures/small-image.png)').wait(TIMEOUTS.TWO_SEC);
        cy.get('#channelHeaderDescription').find('span.markdown__paragraph-inline').as('imageDiv');
        cy.get('@imageDiv').find('img.markdown-inline-img').
            should('have.class', 'markdown-inline-img--hover').
            and('have.class', 'markdown-inline-img--no-border').
            and('have.css', 'height', '18px');
        cy.uiGetPostBody().
            find('img.markdown-inline-img--no-border').
            should('have.class', 'markdown-inline-img--hover').
            and('have.class', 'markdown-inline-img').
            and('have.class', 'markdown-inline-img--scaled-down').
            and('have.css', 'height', '18px');
    });
});