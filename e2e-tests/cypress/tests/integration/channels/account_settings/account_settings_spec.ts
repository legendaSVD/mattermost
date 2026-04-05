describe('Account Settings', () => {
    let testUser: Cypress.UserProfile;
    let testTeam: Cypress.Team;
    let offTopic: string;
    before(() => {
        cy.apiInitSetup({userPrefix: 'other', loginAfter: true}).then(({offTopicUrl, user, team}) => {
            cy.visit(offTopicUrl);
            offTopic = offTopicUrl;
            testUser = user;
            testTeam = team;
            cy.postMessage('hello');
        });
    });
    it('MM-T2049 Account Settings link in own popover', () => {
        cy.uiOpenProfileModal('Profile Settings');
        cy.get('#accountSettingsModal').should('be.visible');
        cy.uiClose();
    });
    it('MM-T2081 Password: Save should be disabled on blank', () => {
        cy.uiOpenProfileModal('Security');
        cy.get('#securityButton').should('be.visible');
        cy.get('#securityButton').click();
        cy.get('#passwordEdit').should('be.visible').click();
        cy.get('button[type="submit"]').should('be.disabled');
        cy.uiClose();
    });
    it('MM-T2074 New email not visible to other users until it has been confirmed', () => {
        cy.apiAdminLogin();
        cy.apiCreateUser({prefix: 'test'}).then(({user: newUser}) => {
            cy.apiAddUserToTeam(testTeam.id, newUser.id).then(() => {
                cy.apiCreateDirectChannel([testUser.id, newUser.id]).then(({channel}) => {
                    cy.apiLogin(testUser);
                    cy.visit(offTopic);
                    cy.postMessage('hello');
                    const oldEMail = testUser.email;
                    const newEMail = 'test@example.com';
                    cy.uiOpenProfileModal('Profile Settings');
                    cy.get('#emailEdit').should('be.visible').click();
                    cy.get('#primaryEmail').should('be.visible').type(newEMail);
                    cy.get('#confirmEmail').should('be.visible').type(newEMail);
                    cy.get('#currentPassword').should('be.visible').type(testUser.password);
                    cy.uiSaveAndClose();
                    cy.postMessageAs({sender: testUser, message: `@${newUser.username}`, channelId: channel.id});
                    cy.apiLogin(newUser);
                    cy.visit(`/${testTeam.name}/messages/@${testUser.username}`);
                    cy.get('#channelIntro .user-popover').should('be.visible').click();
                    cy.get('#user-profile-popover').should('be.visible').should('contain', oldEMail);
                });
            });
        });
    });
});