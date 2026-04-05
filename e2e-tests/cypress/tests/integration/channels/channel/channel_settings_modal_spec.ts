import {Team} from '@mattermost/types/teams';
import {Channel} from '@mattermost/types/channels';
import {UserProfile} from '@mattermost/types/users';
describe('Channel Settings Modal', () => {
    let testTeam: Team;
    let testUser: UserProfile;
    let testChannel: Channel;
    let originalTestChannel: Channel;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            testUser = user;
            cy.apiCreateChannel(testTeam.id, 'test-channel', 'Test Channel').then(({channel}) => {
                testChannel = channel;
                originalTestChannel = {...channel};
                cy.apiAddUserToChannel(channel.id, user.id);
            });
            cy.apiLogin(testUser);
        });
    });
    beforeEach(() => {
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
    });
    it('MM-T1: Can open and close the channel settings modal', () => {
        cy.get('#channelHeaderDropdownButton').click();
        cy.findByText('Channel Settings').click();
        cy.get('.ChannelSettingsModal').should('be.visible');
        cy.get('#genericModalLabel').should('contain', 'Channel Settings');
        cy.get('.GenericModal .modal-header button[aria-label="Close"]').click();
        cy.get('.ChannelSettingsModal').should('not.exist');
    });
    it('MM-T2: Can navigate between tabs', () => {
        cy.get('#channelHeaderDropdownButton').click();
        cy.findByText('Channel Settings').click();
        cy.get('#infoButton').should('have.class', 'active');
        cy.get('.ChannelSettingsModal__infoTab').should('be.visible');
        cy.get('#archiveButton').click();
        cy.get('#archiveButton').should('have.class', 'active');
        cy.get('.ChannelSettingsModal__archiveTab').should('be.visible');
        cy.get('#infoButton').click();
        cy.get('#infoButton').should('have.class', 'active');
        cy.get('.ChannelSettingsModal__infoTab').should('be.visible');
    });
    it('MM-T3: Can edit channel name and URL', () => {
        cy.get('#channelHeaderDropdownButton').click();
        cy.findByText('Channel Settings').click();
        cy.get('#input_channel-settings-name').invoke('val').as('originalName');
        cy.get('.url-input-label').invoke('val').as('originalUrl');
        cy.get('#input_channel-settings-name').clear().type('Updated Channel Name');
        cy.get('@originalUrl').then((originalUrl) => {
            cy.get('.url-input-label').should('contain', originalUrl);
        });
        cy.get('[data-testid="SaveChangesPanel__save-btn"]').click();
        cy.get('.SaveChangesPanel').should('contain', 'Settings saved');
        cy.get('.GenericModal .modal-header button[aria-label="Close"]').click();
        cy.get('#channelHeaderTitle').should('contain', 'Updated Channel Name');
        cy.get('#channelHeaderDropdownButton').click();
        cy.findByText('Channel Settings').click();
        cy.get('#input_channel-settings-name').clear().type(originalTestChannel.display_name);
        cy.get('.url-input-button').click();
        cy.get('.url-input-container input').clear().type(originalTestChannel.name);
        cy.get('.url-input-container button.url-input-button').click();
        cy.get('[data-testid="SaveChangesPanel__save-btn"]').click();
        cy.get('.SaveChangesPanel').should('contain', 'Settings saved');
        cy.get('.GenericModal .modal-header button[aria-label="Close"]').click();
        cy.get('#channelHeaderTitle').should('contain', originalTestChannel.display_name);
    });
    it('MM-T31: Channel name changes do not auto-update URL, URL only changes when explicitly modified', () => {
        cy.apiCreateChannel(testTeam.id, 'url-behavior-test', 'URL Behavior Test').then(({channel}) => {
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.get('#channelHeaderDropdownButton').click();
            cy.findByText('Channel Settings').click();
            cy.get('#input_channel-settings-name').invoke('val').as('originalName');
            cy.get('.url-input-label').invoke('val').as('originalUrl');
            cy.get('#input_channel-settings-name').clear().type('New Channel Name');
            cy.get('@originalUrl').then((originalUrl) => {
                cy.get('.url-input-label').should('contain', originalUrl);
            });
            cy.get('[data-testid="SaveChangesPanel__save-btn"]').click();
            cy.get('.SaveChangesPanel').should('contain', 'Settings saved');
            cy.get('@originalUrl').then((originalUrl) => {
                cy.get('.url-input-label').should('contain', originalUrl);
            });
            cy.get('.url-input-button').click();
            cy.get('.url-input-container input').clear().type('explicitly-changed-url');
            cy.get('.url-input-container button.url-input-button').click();
            cy.get('.url-input-label').should('contain', 'explicitly-changed-url');
            cy.get('[data-testid="SaveChangesPanel__save-btn"]').click();
            cy.get('.SaveChangesPanel').should('contain', 'Settings saved');
            cy.get('.GenericModal .modal-header button[aria-label="Close"]').click();
            cy.url().should('include', 'explicitly-changed-url');
            cy.get('#channelHeaderDropdownButton').click();
            cy.findByText('Channel Settings').click();
            cy.get('.url-input-label').invoke('val').as('currentUrl');
            cy.get('#input_channel-settings-name').clear().type('Another Name Change');
            cy.get('@currentUrl').then((currentUrl) => {
                cy.get('.url-input-label').should('contain', currentUrl);
            });
            cy.get('.url-input-label').should('not.contain', 'another-name-change');
            cy.get('[data-testid="SaveChangesPanel__save-btn"]').click();
            cy.get('.SaveChangesPanel').should('contain', 'Settings saved');
            cy.get('@currentUrl').then((currentUrl) => {
                cy.get('.url-input-label').should('contain', currentUrl);
            });
        });
    });
    it('MM-T4: Shows error for invalid channel name', () => {
        cy.get('#channelHeaderDropdownButton').click();
        cy.findByText('Channel Settings').click();
        cy.get('#input_channel-settings-name').clear();
        cy.get('[data-testid="SaveChangesPanel__save-btn"]').click();
        cy.get('.Input_fieldset').should('have.class', 'Input_fieldset___error');
        cy.get('.SaveChangesPanel').should('contain', 'There are errors in the form above');
    });
    it('MM-T6: Can edit channel purpose and header', () => {
        cy.get('#channelHeaderDropdownButton').click();
        cy.findByText('Channel Settings').click();
        cy.get('#channel_settings_purpose_textbox').clear().type('This is a test purpose');
        cy.get('#channel_settings_header_textbox').clear().type('This is a test header');
        cy.get('[data-testid="SaveChangesPanel__save-btn"]').click();
        cy.get('.SaveChangesPanel').should('contain', 'Settings saved');
        cy.get('.GenericModal .modal-header button[aria-label="Close"]').click();
        cy.get('#channelHeaderDescription').should('contain', 'This is a test header');
    });
    it('MM-T7: Shows error when purpose exceeds character limit', () => {
        cy.get('#channelHeaderDropdownButton').click();
        cy.findByText('Channel Settings').click();
        const longPurpose = 'a'.repeat(260);
        cy.get('#channel_settings_purpose_textbox').clear().type(longPurpose);
        cy.findAllByTestId('channel_settings_purpose_textbox').should('have.class', 'textarea--has-errors');
        cy.get('.SaveChangesPanel').should('contain', 'There are errors in the form above');
    });
    it('MM-T8: Shows error when header exceeds character limit', () => {
        cy.get('#channelHeaderDropdownButton').click();
        cy.findByText('Channel Settings').click();
        const longHeader = 'a'.repeat(1050);
        cy.findByTestId('channel_settings_header_textbox').clear().type(longHeader);
        cy.findByTestId('channel_settings_header_textbox').should('have.class', 'textarea--has-errors');
        cy.get('.SaveChangesPanel').should('contain', 'There are errors in the form above');
    });
    it('MM-T9: Can archive a channel and stay in archived channel view', () => {
        cy.apiCreateChannel(testTeam.id, 'archived-channel-test', 'Archived Channel Test').then(({channel}) => {
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.get('#channelHeaderDropdownButton').click();
            cy.findByText('Channel Settings').click();
            cy.get('#archiveButton').click();
            cy.get('#channelSettingsArchiveChannelButton').click();
            cy.get('#archiveChannelConfirmModal').should('be.visible');
            cy.findByRole('button', {name: 'Confirm'}).click();
            cy.url().should('include', channel.name);
            cy.contains('You are viewing an archived channel').should('be.visible');
            cy.get('.SidebarChannel').contains('Archived Channel Test').should('exist');
            cy.visit(`/${testTeam.name}/channels/town-square`);
            cy.get('.SidebarChannel').contains('Archived Channel Test').should('not.exist');
        });
    });
    it('MM-T10: Warns when switching tabs with unsaved changes', () => {
        cy.apiCreateChannel(testTeam.id, 'unsaved-test', 'Unsaved Test').then(({channel}) => {
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.get('#channelHeaderDropdownButton').click();
            cy.findByText('Channel Settings').click();
            cy.get('#input_channel-settings-name').clear().type('Changed Name');
            cy.get('#archiveButton').click();
            cy.get('#infoButton').should('have.class', 'active');
            cy.get('.SaveChangesPanel').should('have.class', 'error');
        });
    });
    it('MM-T11: Can reset changes without saving', () => {
        cy.apiCreateChannel(testTeam.id, 'reset-test', 'Reset Test').then(({channel}) => {
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.get('#channelHeaderDropdownButton').click();
            cy.findByText('Channel Settings').click();
            cy.get('#input_channel-settings-name').invoke('val').as('originalName');
            cy.get('#input_channel-settings-name').clear().type('Temporary Name');
            cy.get('.SaveChangesPanel button').contains('Reset').click();
            cy.get('@originalName').then((originalName) => {
                cy.get('#input_channel-settings-name').should('have.value', originalName);
            });
            cy.get('.SaveChangesPanel').should('not.exist');
        });
    });
    it('MM-T12: Can preview purpose and header with markdown', () => {
        cy.apiCreateChannel(testTeam.id, 'markdown-test', 'Markdown Test').then(({channel}) => {
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.get('#channelHeaderDropdownButton').click();
            cy.findByText('Channel Settings').click();
            cy.get('#channel_settings_purpose_textbox').clear().type('This is **bold** and _italic_ text');
            cy.get('#channel_settings_purpose_textbox').
                parents('.AdvancedTextbox').
                find('#PreviewInputTextButton').
                click();
            cy.get('.textbox-preview-area').
                should('contain', 'This is').
                find('strong').
                should('contain', 'bold');
            cy.get('.textbox-preview-area').
                find('em').
                should('contain', 'italic');
            cy.get('#channel_settings_header_textbox').clear().type('Visit [Mattermost](https://mattermost.com)');
            cy.get('#channel_settings_header_textbox').
                parents('.AdvancedTextbox').
                find('#PreviewInputTextButton').
                click();
            cy.get('.textbox-preview-area').
                should('contain', 'Visit').
                find('a').
                should('contain', 'Mattermost');
        });
    });
    it('MM-T13: Validates URL when editing channel name', () => {
        cy.apiCreateChannel(testTeam.id, 'first-channel', 'First Channel').then(({channel: channel1}) => {
            cy.apiCreateChannel(testTeam.id, 'second-channel', 'Second Channel').then(({channel}) => {
                cy.visit(`/${testTeam.name}/channels/${channel.name}`);
                cy.get('#channelHeaderDropdownButton').click();
                cy.findByText('Channel Settings').click();
                cy.get('.url-input-button').click();
                cy.get('.url-input-container input').clear().type(channel1.name);
                cy.get('.url-input-container button.url-input-button').click();
                cy.get('[data-testid="SaveChangesPanel__save-btn"]').click();
                cy.get('.SaveChangesPanel').should('contain', 'There are errors in the form above');
            });
        });
    });
});