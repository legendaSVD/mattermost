import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import * as MESSAGES from '../../../fixtures/messages';
import {waitUntilUploadComplete, interceptFileUpload} from '../files_and_attachments/helpers';
describe('Collapsed Reply Threads', () => {
    let testTeam: Team;
    let testChannel: Channel;
    let user1: UserProfile;
    const files = [
        {
            testCase: 'MM-T4777_2',
            filename: 'word-file.doc',
            extensions: 'DOC',
            icon: 'icon-file-word-outline',
        },
        {
            testCase: 'MM-T4777_3',
            filename: 'wordx-file.docx',
            extensions: 'DOCX',
            icon: 'icon-file-word-outline',
        },
        {
            testCase: 'MM-T4777_4',
            filename: 'powerpoint-file.ppt',
            extensions: 'PPT',
            icon: 'icon-file-powerpoint-outline',
        },
        {
            testCase: 'MM-T4777_5',
            filename: 'powerpointx-file.pptx',
            extensions: 'PPTX',
            icon: 'icon-file-powerpoint-outline',
        },
        {
            testCase: 'MM-T4777_6',
            filename: 'mp3-audio-file.mp3',
            extensions: 'MP3',
            icon: 'icon-file-audio-outline',
        },
        {
            testCase: 'MM-T4777_7',
            filename: 'mp4-video-file.mp4',
            extensions: 'MP4',
            icon: 'icon-file-video-outline',
        },
        {
            testCase: 'MM-T4777_8',
            filename: 'theme.json',
            extensions: 'JSON',
            icon: 'icon-file-code-outline',
        },
    ];
    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                ThreadAutoFollow: true,
                CollapsedThreads: 'default_off',
            },
        });
        cy.apiInitSetup({loginAfter: true, promoteNewUserAsAdmin: true}).then(({team, channel, user}) => {
            testTeam = team;
            user1 = user;
            testChannel = channel;
            cy.apiSaveCRTPreference(user1.id, 'on');
        });
    });
    beforeEach(() => {
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        interceptFileUpload();
    });
    it('MM-T4777_1 should show image thumbnail in thread list item', () => {
        const image = 'jpg-image-file.jpg';
        cy.get('#advancedTextEditorCell').find('#fileUploadInput').attachFile(image);
        waitUntilUploadComplete();
        cy.get('.post-image__thumbnail').should('be.visible');
        cy.uiGetPostTextBox().clear().type('{enter}');
        cy.getLastPostId().then((rootId) => {
            cy.postMessageAs({sender: user1, message: MESSAGES.SMALL, channelId: testChannel.id, rootId});
            cy.uiClickSidebarItem('threads');
            cy.get('.file_card__name').should('have.text', image);
            cy.get('.file_card__image.post-image.small').should('be.visible');
            cy.apiDeletePost(rootId);
        });
    });
    files.forEach((file) => {
        it(`${file.testCase} should display correct icon for ${file.extensions} on threads list`, () => {
            cy.get('#advancedTextEditorCell').find('#fileUploadInput').attachFile(file.filename);
            waitUntilUploadComplete();
            cy.get('.post-image__thumbnail').should('be.visible');
            cy.uiGetPostTextBox().clear().type('{enter}');
            cy.getLastPostId().then((rootId) => {
                cy.postMessageAs({sender: user1, message: MESSAGES.SMALL, channelId: testChannel.id, rootId});
                cy.uiClickSidebarItem('threads');
                cy.get('.file_card__attachment').should('have.class', file.icon);
                cy.get('.file_card__name').should('have.text', file.filename);
                cy.apiDeletePost(rootId);
            });
        });
    });
});