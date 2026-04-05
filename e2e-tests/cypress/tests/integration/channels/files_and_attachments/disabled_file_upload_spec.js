import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Upload Files - Settings', () => {
    let channelUrl;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.visit('/admin_console/site_config/file_sharing_downloads');
        cy.url().should('include', '/admin_console/site_config/file_sharing_downloads');
        cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).
            should('be.visible').
            and('have.text', 'File Sharing and Downloads');
        cy.findByTestId('FileSettings.EnableFileAttachmentsfalse').click();
        cy.get('#saveSetting').click();
        cy.apiInitSetup({loginAfter: true}).then(({channelUrl: url}) => {
            channelUrl = url;
        });
    });
    beforeEach(() => {
        cy.visit(channelUrl);
    });
    it('MM-T1147_1 Disallow file sharing in the channel', () => {
        cy.get('.post-create__container .AdvancedTextEditor').should('be.visible').within(() => {
            cy.get('#fileUploadInput').should('not.exist');
            cy.get('#fileUploadButton').should('not.exist');
        });
        cy.get('#channel-header').find('#channelHeaderFilesButton').should('not.exist');
        cy.postMessage('sample');
        cy.getLastPost().click();
        cy.get('.post-right-comments-container .AdvancedTextEditor').should('be.visible').within(() => {
            cy.get('#fileUploadInput').should('not.exist');
            cy.get('#fileUploadButton').should('not.exist');
        });
        cy.uiGetSearchContainer().click();
        cy.get('#searchHints').find('.search-hint__search-type-selector button > .icon-file-text-outline').should('not.exist');
        cy.uiGetSearchBox().type('sample').type('{enter}');
        cy.get('.files-tab').should('not.exist');
        cy.getLastPostId().then(cy.apiDeletePost);
    });
    it('MM-T1147_2 drag and drop a file on center and RHS should produce an error', () => {
        const filename = 'mattermost-icon.png';
        cy.get('.row.main').trigger('dragenter');
        cy.fixture(filename).then((img) => {
            const blob = Cypress.Blob.base64StringToBlob(img, 'image/png');
            cy.window().then((win) => {
                const file = new win.File([blob], filename);
                const dataTransfer = new win.DataTransfer();
                dataTransfer.items.add(file);
                cy.get('.row.main').trigger('drop', {dataTransfer});
                cy.get('#create_post #postCreateFooter').find('.has-error').should('contain.text', 'File attachments are disabled.');
            });
        });
        cy.postMessage('sample');
        cy.getLastPost().click();
        cy.get('.ThreadViewer').trigger('dragenter');
        cy.fixture(filename).then((img) => {
            const blob = Cypress.Blob.base64StringToBlob(img, 'image/png');
            cy.window().then((win) => {
                const file = new win.File([blob], filename);
                const dataTransfer = new win.DataTransfer();
                dataTransfer.items.add(file);
                cy.get('.ThreadViewer').trigger('drop', {dataTransfer});
                cy.get('.ThreadViewer #postCreateFooter').find('.has-error').should('contain.text', 'File attachments are disabled.');
            });
        });
        cy.getLastPostId().then(cy.apiDeletePost);
    });
    it('MM-T1147_3 copy a file and paste in message box and reply box should produce an error', () => {
        const filename = 'mattermost-icon.png';
        cy.fixture(filename).then((img) => {
            const blob = Cypress.Blob.base64StringToBlob(img, 'image/png');
            cy.uiGetPostTextBox().trigger('paste', {clipboardData: {
                items: [{
                    name: filename,
                    kind: 'file',
                    type: 'image/png',
                    getAsFile: () => {
                        return blob;
                    },
                }],
                types: [],
                getData: () => {},
            }});
            cy.get('#postCreateFooter').find('.has-error').should('contain.text', 'File attachments are disabled.');
        });
        cy.postMessage('sample');
        cy.getLastPost().click();
        cy.fixture(filename).then((img) => {
            const blob = Cypress.Blob.base64StringToBlob(img, 'image/png');
            cy.uiGetReplyTextBox().trigger('paste', {clipboardData: {
                items: [{
                    name: filename,
                    kind: 'file',
                    type: 'image/png',
                    getAsFile: () => {
                        return blob;
                    },
                }],
                types: [],
                getData: () => {},
            }});
            cy.get('.ThreadViewer #postCreateFooter').find('.has-error').should('contain.text', 'File attachments are disabled.');
        });
        cy.getLastPostId().then(cy.apiDeletePost);
    });
    it('MM-T1147_4 keyboard shortcut CMD/CTRL+U should produce an error', () => {
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('{U}');
        cy.get('#postCreateFooter').find('.has-error').should('contain.text', 'File attachments are disabled.');
    });
});