import * as TIMEOUTS from '../../../fixtures/timeouts';
import {stubClipboard} from '../../../utils';
import {downloadAttachmentAndVerifyItsProperties} from './helpers';
describe('Upload Files', () => {
    let testTeam;
    let testChannel;
    let otherUser;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiInitSetup().then(({team, channel, channelUrl}) => {
            testTeam = team;
            testChannel = channel;
            cy.apiCreateUser().then(({user: user2}) => {
                otherUser = user2;
                cy.apiAddUserToTeam(testTeam.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, otherUser.id);
                });
            });
            cy.visit(channelUrl);
        });
    });
    it('MM-T346 Public link related to a deleted post should no longer open the file', () => {
        cy.apiUpdateConfig({
            FileSettings: {
                EnablePublicLink: true,
            },
        }).then(({config}) => {
            expect(config.FileSettings.EnablePublicLink).to.be.true;
            cy.reload();
            stubClipboard().as('clipboard');
            const filename = 'jpg-image-file.jpg';
            cy.get('#fileUploadInput').attachFile(filename);
            cy.postMessage('Post with attachment to be deleted');
            cy.uiGetFileThumbnail(filename).click();
            cy.uiGetFilePreviewModal();
            cy.uiGetDownloadLinkFilePreviewModal().trigger('mouseenter');
            cy.findByText('Get a public link').should('exist');
            cy.uiGetDownloadLinkFilePreviewModal().click();
            cy.get('@clipboard').its('wasCalled').should('eq', true);
            cy.get('@clipboard').
                its('contents').
                as('publicLinkOfAttachment').
                then((url) => {
                    cy.request({url}).then((response) => {
                        expect(response.status).to.be.equal(200);
                    });
                });
            cy.wait(TIMEOUTS.ONE_SEC);
            cy.uiCloseFilePreviewModal();
            cy.getLastPostId().then((lastPostId) => {
                cy.clickPostDotMenu(lastPostId);
                cy.get(`#CENTER_dropdown_${lastPostId}`).
                    should('exist').
                    within(() => {
                        cy.findByText('Delete').click();
                    });
            });
            cy.get('.modal-dialog').
                should('be.visible').
                within(() => {
                    cy.findByText('Delete').click();
                });
            cy.get('@publicLinkOfAttachment').then((url) => {
                cy.request({url, failOnStatusCode: false}).then((response) => {
                    expect(response.status).to.be.equal(404);
                });
                cy.visit(url, {failOnStatusCode: false});
            });
            cy.findByText('Error');
            cy.findByText('Unable to get the file info.');
            cy.findByText('Back to Mattermost').
                parent().
                should('have.attr', 'href', '/').
                click();
        });
    });
    it('MM-T345 Public links for common file types should open in a new browser tab', () => {
        cy.apiUpdateConfig({
            FileSettings: {
                EnablePublicLink: true,
            },
        });
        cy.reload();
        stubClipboard().as('clipboard');
        cy.apiSaveLinkPreviewsPreference('true');
        cy.apiSaveCollapsePreviewsPreference('false');
        const commonTypeFiles = [
            'jpg-image-file.jpg',
            'gif-image-file.gif',
            'png-image-file.png',
            'tiff-image-file.tif',
            'mp3-audio-file.mp3',
            'mp4-video-file.mp4',
            'mpeg-video-file.mpg',
        ];
        commonTypeFiles.forEach((filename) => {
            cy.get('#fileUploadInput').attachFile(filename);
            cy.wait(TIMEOUTS.ONE_SEC);
            cy.postMessage(filename);
            cy.uiGetFileThumbnail(filename).click();
            cy.uiGetFilePreviewModal();
            cy.uiGetDownloadLinkFilePreviewModal().trigger('mouseenter');
            cy.findByText('Get a public link').should('exist');
            cy.uiGetDownloadLinkFilePreviewModal().click({force: true});
            cy.wait(TIMEOUTS.ONE_SEC);
            cy.get('@clipboard').its('wasCalled').should('eq', true);
            cy.get('@clipboard').
                its('contents').
                as('link').
                then((publicLinkOfAttachment) => {
                    cy.uiCloseFilePreviewModal();
                    cy.uiPostMessageQuickly(publicLinkOfAttachment);
                    downloadAttachmentAndVerifyItsProperties(publicLinkOfAttachment, filename, 'inline');
                });
        });
    });
});