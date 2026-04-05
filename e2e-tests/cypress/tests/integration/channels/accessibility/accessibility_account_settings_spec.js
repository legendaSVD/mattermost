import * as TIMEOUTS from '../../../fixtures/timeouts';
import {isMac} from '../../../utils';
describe('Verify Accessibility Support in different sections in Settings and Profile Dialog', () => {
    const accountSettings = {
        profile: [
            {key: 'name', label: 'Full Name', type: 'text'},
            {key: 'username', label: 'Username', type: 'text'},
            {key: 'nickname', label: 'Nickname', type: 'text'},
            {key: 'position', label: 'Position', type: 'text'},
            {key: 'email', label: 'Email', type: 'text'},
            {key: 'picture', label: 'Profile Picture', type: 'image'},
        ],
        security: [
            {key: 'password', label: 'Password', type: 'text'},
            {key: 'mfa', label: 'Multi-factor Authentication', type: 'optional'},
        ],
    };
    const settings = {
        notifications: [
            {key: 'desktopAndMobile', label: 'Desktop and mobile notifications', type: 'radio'},
            {key: 'desktopNotificationSound', label: 'Desktop notification sounds', type: 'radio'},
            {key: 'email', label: 'Email notifications', type: 'radio'},
            {key: 'keywordsAndMentions', label: 'Keywords that trigger notifications', type: 'checkbox'},
            {key: 'keywordsAndHighlight', label: 'Keywords that get highlighted (without notifications)', type: 'checkbox'},
            {key: 'replyNotifications', label: 'Reply notifications', type: 'radio'},
        ],
        display: [
            {key: 'theme', label: 'Theme', type: 'radio'},
            {key: 'clock', label: 'Clock Display', type: 'radio'},
            {key: 'name_format', label: 'Teammate Name Display', type: 'none'},
            {key: 'availabilityStatus', label: 'Show online availability on profile images', type: 'radio'},
            {key: 'lastactive', label: 'Share last active time', type: 'radio'},
            {key: 'timezone', label: 'Timezone', type: 'none'},
            {key: 'collapse', label: 'Default Appearance of Image Previews', type: 'radio'},
            {key: 'message_display', label: 'Message Display', type: 'radio'},
            {key: 'click_to_reply', label: 'Click to open threads', type: 'radio'},
            {key: 'channel_display_mode', label: 'Channel Display', type: 'radio'},
            {key: 'one_click_reactions_enabled', label: 'Quick reactions on messages', type: 'radio'},
            {key: 'renderEmoticonsAsEmoji', label: 'Render emoticons as emojis', type: 'radio'},
            {key: 'languages', label: 'Language', type: 'dropdown'},
        ],
        sidebar: [
            {key: 'showUnreadsCategory', label: 'Group unread channels separately', type: 'multiple'},
            {key: 'limitVisibleGMsDMs', label: 'Number of direct messages to show', type: 'radio'},
        ],
        advanced: [
            {key: 'advancedCtrlSend', label: `Send Messages on ${isMac() ? '⌘+ENTER' : 'CTRL+ENTER'}`, type: 'radio'},
            {key: 'formatting', label: 'Enable Post Formatting', type: 'radio'},
            {key: 'joinLeave', label: 'Enable Join/Leave Messages', type: 'radio'},
        ],
    };
    let url;
    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableMultifactorAuthentication: true,
            },
            SamlSettings: {
                Enable: false,
            },
        });
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            url = offTopicUrl;
            cy.visit(offTopicUrl);
            cy.postMessage('hello');
        });
    });
    afterEach(() => {
        cy.uiClose();
    });
    it('MM-T1465_1 Verify Label & Tab behavior in section links', () => {
        cy.uiOpenProfileModal('Profile Settings');
        cy.findByRole('tab', {name: 'profile settings'}).should('be.visible').focus().should('be.focused');
        ['profile settings', 'security'].forEach((text) => {
            cy.focused().should('have.attr', 'aria-label', text).type('{downarrow}');
        });
        cy.uiClose();
        cy.uiOpenSettingsModal();
        cy.findByRole('tab', {name: 'notifications'}).should('be.visible').focus().should('be.focused');
        ['notifications', 'display', 'sidebar', 'advanced'].forEach((text) => {
            cy.focused().should('have.attr', 'aria-label', text).type('{downarrow}');
        });
    });
    it('MM-T1465_2 Verify Accessibility Support in each section in Settings and Profile Dialog', () => {
        cy.visit(url);
        cy.postMessage('hello');
        cy.uiOpenProfileModal('Profile Settings');
        cy.findByRole('tab', {name: 'profile settings'}).click().tab();
        verifySettings(accountSettings.profile);
        cy.findByRole('tab', {name: 'security'}).click().tab();
        verifySettings(accountSettings.security);
        cy.uiClose();
        cy.uiOpenSettingsModal();
        cy.findByRole('tab', {name: 'notifications'}).click().tab();
        cy.focused().should('have.text', 'Learn more about notifications').tab();
        verifySettings(settings.notifications);
        cy.findByRole('tab', {name: 'display'}).click().tab();
        verifySettings(settings.display);
        cy.findByRole('tab', {name: 'sidebar'}).click().tab();
        verifySettings(settings.sidebar);
        cy.findByRole('tab', {name: 'advanced'}).click().tab();
        verifySettings(settings.advanced);
    });
    it('MM-T1482 Input fields in Settings and Profile should read labels', () => {
        cy.visit(url);
        cy.postMessage('hello');
        cy.uiOpenProfileModal('Profile Settings');
        accountSettings.profile.forEach((section) => {
            if (section.type === 'text') {
                cy.get(`#${section.key}Edit`).click();
                cy.get('.setting-list-item .form-group').each(($el) => {
                    if ($el.find('input').length) {
                        cy.wrap($el).find('.control-label').invoke('text').then((label) => {
                            cy.wrap($el).find('input').should('have.attr', 'aria-label', label);
                        });
                    }
                });
            }
        });
    });
    it('MM-T1485 Language dropdown should read labels', () => {
        cy.visit(url);
        cy.postMessage('hello');
        cy.uiOpenSettingsModal();
        cy.get('#displayButton').click();
        cy.get('#languagesEdit').click();
        cy.findByRole('combobox', {name: 'Dropdown selector to change the interface language'}).should('have.attr', 'aria-autocomplete', 'list').and('have.attr', 'aria-labelledby', 'changeInterfaceLanguageLabel').as('inputEl');
        cy.get('#changeInterfaceLanguageLabel').should('be.visible').and('have.text', 'Change interface language');
        cy.get('@inputEl').typeWithForce(' ');
        cy.findByRole('listbox').should('have.class', 'react-select__menu-list').as('listBox');
        cy.get('@inputEl').typeWithForce('{esc}');
        cy.get('@listBox').should('not.exist');
        cy.get('@inputEl').typeWithForce(' ');
        cy.get('@inputEl').typeWithForce('{downarrow}{downarrow}');
        cy.get('#displayLanguage').within(($el) => {
            cy.wrap($el).findByRole('log').should('have.attr', 'aria-live', 'assertive').as('ariaEl');
        });
        cy.get('@ariaEl').within(($el) => {
            cy.wrap($el).get('#aria-focused').should('contain', 'option English (Australia) focused');
            cy.wrap($el).get('#aria-guidance').should('contain', 'Use Up and Down to choose options, press Enter to select the currently focused option, press Escape to exit the menu, press Tab to select the option and exit the menu.');
        });
        cy.get('@inputEl').typeWithForce(' ');
        cy.get('#displayLanguage').should('contain', 'English (Australia)');
        cy.get('@ariaEl').within(($el) => {
            cy.wrap($el).get('#aria-selection').should('contain', 'option English (Australia) selected');
        });
        cy.get('@inputEl').typeWithForce('{downarrow}{downarrow}{downarrow}{uparrow}');
        cy.get('@ariaEl').within(($el) => {
            cy.wrap($el).get('#aria-focused').should('contain', 'option English (US) focused');
        });
        cy.get('@inputEl').typeWithForce(' ');
        cy.get('#displayLanguage').should('contain', 'English (US)');
        cy.get('@ariaEl').within(($el) => {
            cy.wrap($el).get('#aria-selection').should('contain', 'option English (US) selected');
        });
    });
    it('MM-T1488 Profile Picture should read labels', () => {
        cy.visit(url);
        cy.postMessage('hello');
        cy.uiOpenProfileModal('Profile Settings');
        cy.get('#pictureEdit').click();
        cy.get('.profile-img').should('have.attr', 'alt', 'profile image');
        cy.get('#profileSettings').then((el) => {
            if (el.find('.profile-img__remove').length > 0) {
                cy.findByTestId('removeSettingPicture').click();
                cy.uiSave();
                cy.get('#pictureEdit').click();
            }
        });
        cy.findByTestId('inputSettingPictureButton').should('have.attr', 'aria-label', 'Select');
        cy.uiSaveButton().should('have.attr', 'disabled');
        cy.findByTestId('cancelSettingPicture').should('have.attr', 'aria-label', 'Cancel');
        cy.findByTestId('uploadPicture').attachFile('mattermost-icon.png');
        cy.uiSave();
        cy.get('#pictureEdit').click();
        cy.get('.profile-img').should('have.attr', 'alt', 'profile image');
        cy.findByTestId('removeSettingPicture').within(() => {
            cy.get('.sr-only').should('have.text', 'Remove Profile Picture');
        });
        cy.findByTestId('removeSettingPicture').focus().tab({shift: true}).tab();
        cy.findByTestId('removeSettingPicture').should('have.class', 'a11y--active a11y--focused').tab();
        cy.findByTestId('inputSettingPictureButton').should('have.class', 'a11y--active a11y--focused').tab();
        cy.findByTestId('cancelSettingPicture').should('have.class', 'a11y--active a11y--focused');
        cy.findByTestId('removeSettingPicture').click().wait(TIMEOUTS.HALF_SEC);
        cy.findByTestId('inputSettingPictureButton').focus().tab({shift: true}).tab();
        cy.findByTestId('inputSettingPictureButton').should('have.class', 'a11y--active a11y--focused').tab();
        cy.uiSaveButton().should('be.focused').tab();
        cy.findByTestId('cancelSettingPicture').should('have.class', 'a11y--active a11y--focused');
        cy.uiSave();
    });
    it('MM-T1496 Security Settings screen should read labels', () => {
        cy.visit(url);
        cy.postMessage('hello');
        cy.uiOpenProfileModal('Profile Settings');
        cy.get('#securityButton').click();
        cy.get('#mfaEdit').click();
        cy.get('#passwordEdit').focus().tab({shift: true}).tab().tab();
        cy.get('.setting-list a.btn').should('have.class', 'a11y--active a11y--focused').tab();
        cy.get('#cancelSetting').should('have.class', 'a11y--active a11y--focused');
        cy.get('.user-settings').then((el) => {
            if (el.find('#signinEdit').length) {
                cy.get('#signinEdit').click();
                cy.get('#mfaEdit').focus().tab({shift: true}).tab().tab();
                cy.get('.setting-list a.btn').should('have.class', 'a11y--active a11y--focused').tab();
                cy.get('#cancelSetting').should('have.class', 'a11y--active a11y--focused');
            }
        });
    });
});
function verifySettings(settings) {
    settings.forEach((setting) => {
        cy.focused().should('have.id', `${setting.key}Edit`);
        cy.findByText(setting.label);
        cy.focused().tab();
    });
}