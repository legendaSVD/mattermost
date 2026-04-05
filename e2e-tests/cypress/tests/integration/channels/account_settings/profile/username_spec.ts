import {getRandomId} from '../../../../utils';
describe('Settings > Sidebar > General > Edit', () => {
    let testTeam;
    let testUser;
    let testChannel;
    let otherUser;
    let offTopicUrl;
    before(() => {
        cy.apiInitSetup().then(({user, team, channel, offTopicUrl: url}) => {
            testUser = user;
            testTeam = team;
            testChannel = channel;
            offTopicUrl = url;
            cy.apiCreateUser({prefix: 'other'}).then(({user: user1}) => {
                otherUser = user1;
                cy.apiAddUserToTeam(testTeam.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, otherUser.id);
                });
            });
            cy.visit(offTopicUrl);
        });
    });
    beforeEach(() => {
        cy.uiOpenProfileModal('Profile Settings');
    });
    it('MM-T2050 Username cannot be blank', () => {
        cy.get('#usernameEdit').click();
        cy.get('#username').click().clear().blur();
        cy.get('#error_username').should('be.visible').should('contain', 'Username must begin with a letter, and contain between 3 to 22 lowercase characters made up of numbers, letters, and the symbols \'.\', \'-\', and \'_\'.');
        cy.uiClose();
    });
    it('MM-T2051 Username min 3 characters', () => {
        cy.get('#usernameEdit').click();
        cy.get('#username').clear().type('te').blur();
        cy.get('#error_username').should('be.visible').should('contain', 'Username must begin with a letter, and contain between 3 to 22 lowercase characters made up of numbers, letters, and the symbols \'.\', \'-\', and \'_\'.');
        cy.uiClose();
    });
    it('MM-T2052 Username already taken', () => {
        cy.get('#usernameEdit').click();
        cy.get('#username').clear().type(otherUser.username);
        cy.uiSave();
        cy.get('#serverError').should('be.visible').should('contain', 'An account with that username already exists.');
        cy.uiClose();
    });
    it('MM-T2053 Username w/ dot, dash, underscore still searches', () => {
        let tempUser;
        cy.apiCreateUser({prefix: 'temp'}).then(({user: user1}) => {
            tempUser = user1;
            cy.apiAddUserToTeam(testTeam.id, tempUser.id).then(() => {
                cy.apiAddUserToChannel(testChannel.id, tempUser.id);
            });
            cy.apiLogin(tempUser);
            cy.visit(offTopicUrl);
            cy.uiOpenProfileModal('Profile Settings');
            cy.get('#usernameEdit').click();
            const newTempUserName = 'a-' + tempUser.username;
            cy.get('#username').clear().type(newTempUserName);
            cy.uiSaveAndClose();
            cy.visit(offTopicUrl);
            cy.uiOpenUserMenu().findByText(`@${newTempUserName}`).should('exist');
            cy.get('body').type('{esc}');
            const text = `${newTempUserName} test message!`;
            cy.postMessage(text);
            cy.uiGetRecentMentionButton().should('be.visible').click();
            cy.get('#search-items-container').should('be.visible').within(() => {
                cy.findByText(newTempUserName);
                cy.findByText(`${newTempUserName} test message!`);
            });
            cy.uiGetRecentMentionButton().should('be.visible').click();
        });
    });
    it('MM-T2054 Username cannot start with dot, dash, or underscore', () => {
        cy.get('#usernameEdit').click();
        const prefixes = [
            '.',
            '-',
            '_',
        ];
        for (const prefix of prefixes) {
            cy.get('#username').clear().type(prefix).type('{backspace}.').type(otherUser.username).blur();
            cy.get('#error_username').should('be.visible').should('contain', 'Username must begin with a letter, and contain between 3 to 22 lowercase characters made up of numbers, letters, and the symbols \'.\', \'-\', and \'_\'.');
        }
        cy.uiClose();
    });
    it('MM-T2055 Usernames that are reserved', () => {
        cy.get('#usernameEdit').click();
        const usernames = [
            'all',
            'channel',
            'here',
            'matterbot',
        ];
        for (const username of usernames) {
            cy.get('#username').clear().type(username).blur();
            cy.get('#error_username').should('be.visible').should('contain', 'This username is reserved, please choose a new one.');
        }
        cy.uiClose();
    });
    it('MM-T2056 Username changes when viewed by other user', () => {
        cy.apiLogin(testUser);
        cy.visit(offTopicUrl);
        cy.postMessage('Testing username update');
        cy.apiLogin(otherUser);
        cy.visit(offTopicUrl);
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).within(() => {
                cy.get('.user-popover').click();
            });
            cy.get('div.user-profile-popover').within(() => {
                cy.get('#userPopoverUsername').should('be.visible').and('contain', `${testUser.username}`);
            });
        });
        cy.apiLogin(testUser);
        cy.visit(offTopicUrl);
        cy.uiOpenProfileModal('Profile Settings');
        cy.get('#usernameDesc').click();
        const randomId = getRandomId();
        cy.get('#username').clear().type(`${otherUser.username}-${randomId}`);
        cy.uiSave();
        cy.apiLogin(otherUser);
        cy.visit(offTopicUrl);
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).within(() => {
                cy.get('.user-popover').click();
            });
            cy.get('div.user-profile-popover').within(() => {
                cy.get('#userPopoverUsername').should('be.visible').and('contain', `${otherUser.username}-${randomId}`);
            });
        });
    });
});