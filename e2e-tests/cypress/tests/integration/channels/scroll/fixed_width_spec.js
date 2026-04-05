const timeouts = require('../../../fixtures/timeouts');
describe('Scroll', () => {
    let testTeam;
    let testChannel;
    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableLinkPreviews: true,
            },
        });
        cy.apiInitSetup().then(({team, channel}) => {
            testTeam = team;
            testChannel = channel;
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
        });
    });
    it('MM-T2368 Fixed width', () => {
        const link = 'https://www.bbc.com/news/uk-wales-45142614';
        const gifLink = '![gif](http://i.giphy.com/xNrM4cGJ8u3ao.gif)';
        const firstMessage = 'This is the first post';
        const lastMessage = 'This is the last post';
        cy.postMessage(firstMessage);
        cy.getLastPostId().as('firstPostId');
        cy.postMessage(link);
        cy.getLastPostId().as('linkPreviewPostId');
        cy.postMessage(gifLink);
        cy.getLastPostId().as('gifLinkPostId');
        const commonTypeFiles = [
            'jpg-image-file.jpg',
            'gif-image-file.gif',
            'mp3-audio-file.mp3',
            'mpeg-video-file.mpg',
        ];
        commonTypeFiles.forEach((file) => {
            cy.get('#fileUploadInput').selectFile(`tests/fixtures/${file}`, {force: true}).wait(timeouts.HALF_SEC);
            cy.postMessage(`Attached with ${file}`);
            cy.getLastPostId().as(`${file}PostId`);
        });
        cy.postMessage(lastMessage);
        cy.getLastPostId().as('lastPostId');
        cy.get('button.user-popover.style--none').eq(0).invoke('height').then((height) => {
            cy.wrap(height).as('initialUserNameHeight');
        });
        getComponentByText('@firstPostId', firstMessage).invoke('height').then((height) => {
            cy.wrap(height).as('initialFirstPostHeight');
        });
        getFileThumbnail('mp3-audio-file.mp3').invoke('height').then((height) => {
            cy.wrap(height).as('initialMp3Height');
        });
        getFileThumbnail('mpeg-video-file.mpg').invoke('height').then((height) => {
            cy.wrap(height).as('initialMpgHeight');
        });
        getImageThumbnail('gif-image-file.gif').invoke('height').then((height) => {
            cy.wrap(height).as('initialGifHeight');
        });
        getImageThumbnail('jpg-image-file.jpg').invoke('height').then((height) => {
            cy.wrap(height).as('initialJpgHeight');
        });
        getComponentBySelector('@linkPreviewPostId', '.PostAttachmentOpenGraph__image').invoke('height').then((height) => {
            cy.wrap(height).as('initialAttachmentHeight');
        });
        getComponentBySelector('@gifLinkPostId', 'img[aria-label="file thumbnail"]').invoke('height').then((height) => {
            cy.wrap(height).as('initialInlineImgHeight');
        });
        getComponentByText('@lastPostId', lastMessage).invoke('height').then((height) => {
            cy.wrap(height).as('initialLastPostHeight');
        });
        cy.uiOpenSettingsModal('Display').within(() => {
            cy.findByText('Display', {timeout: timeouts.ONE_MIN}).click();
            cy.findByText('Channel Display').click();
            cy.findByLabelText('Fixed width, centered').click();
            cy.uiSaveAndClose();
        });
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.findAllByTestId('postContent').should('have.length', '9').and('have.class', 'post__content center');
        cy.get('#post-list').should('exist').within(() => {
            cy.get('@initialUserNameHeight').then((originalHeight) => {
                cy.get('button.user-popover.style--none').eq(0).invoke('height').should('be.equal', originalHeight);
            });
            cy.get('@initialFirstPostHeight').then((originalHeight) => {
                getComponentByText('@firstPostId', firstMessage).invoke('height').should('be.equal', originalHeight);
            });
            cy.get('@initialLastPostHeight').then((originalHeight) => {
                getComponentByText('@lastPostId', lastMessage).invoke('height').should('be.equal', originalHeight);
            });
            cy.get('@initialMp3Height').then((originalHeight) => {
                getFileThumbnail('mp3-audio-file.mp3').invoke('height').should('be.equal', originalHeight);
            });
            cy.get('@initialMpgHeight').then((originalHeight) => {
                getFileThumbnail('mpeg-video-file.mpg').invoke('height').should('be.equal', originalHeight);
            });
            cy.get('@initialGifHeight').then((originalHeight) => {
                getImageThumbnail('gif-image-file.gif').invoke('height').should('be.equal', originalHeight);
            });
            cy.get('@initialJpgHeight').then((originalHeight) => {
                getImageThumbnail('jpg-image-file.jpg').invoke('height').should('be.equal', originalHeight);
            });
            cy.get('@initialInlineImgHeight').then((originalHeight) => {
                getComponentBySelector('@gifLinkPostId', 'img[aria-label="file thumbnail"]').invoke('height').should('be.equal', originalHeight);
            });
            cy.get('@initialAttachmentHeight').then((originalHeight) => {
                getComponentBySelector('@linkPreviewPostId', '.PostAttachmentOpenGraph__image').invoke('height').should('be.equal', originalHeight);
            });
        });
    });
    const getFileThumbnail = (filename) => {
        return cy.get(`@${filename}PostId`).then((postId) => {
            cy.get(`#${postId}_message a.post-image__name`);
        });
    };
    const getImageThumbnail = (filename) => {
        return cy.get(`@${filename}PostId`).then((postId) => {
            cy.get(`#${postId}_message`).findByLabelText(`file thumbnail ${filename}`);
        });
    };
    const getComponentBySelector = (alias, selector) => {
        return cy.get(alias).then((postId) => {
            cy.get(`#${postId}_message`).find(selector);
        });
    };
    const getComponentByText = (alias, text) => {
        return cy.get(alias).then((postId) => {
            cy.get(`#${postId}_message`).findByText(text);
        });
    };
});