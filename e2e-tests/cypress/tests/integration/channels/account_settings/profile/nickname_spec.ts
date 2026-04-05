import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Settings > Sidebar > General', () => {
    let testUser;
    let testTeam;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, user, offTopicUrl}) => {
            testUser = user;
            testTeam = team;
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T3848 No nickname is present', () => {
        cy.uiOpenProfileModal('Profile Settings').within(() => {
            cy.uiGetHeading('Nickname').click();
            cy.uiGetTextbox('Nickname').should('be.visible').clear();
            cy.uiSaveAndClose();
        });
        cy.uiOpenTeamMenu('View members');
        cy.get('.modal-title').should('be.visible');
        cy.get('#searchUsersInput').should('be.visible').type(testUser.first_name).wait(TIMEOUTS.ONE_SEC);
        cy.findByTestId('userListItemDetails').find('.more-modal__name').should('be.visible').then((el) => {
            expect(getInnerText(el)).equal(`@${testUser.username} - ${testUser.first_name} ${testUser.last_name}`);
        });
        cy.uiClose();
    });
    it('MM-T268 Profile > Profile Settings > Add Nickname', () => {
        const newNickname = 'victor_nick';
        cy.uiOpenProfileModal('Profile Settings').within(() => {
            cy.uiGetHeading('Nickname').click();
            cy.uiGetTextbox('Nickname').should('be.visible').clear().type('victor_nick');
            cy.uiSaveAndClose();
        });
        cy.uiOpenTeamMenu('View members');
        cy.get('.modal-title').should('be.visible');
        cy.get('#searchUsersInput').should('be.visible').type(testUser.first_name).wait(TIMEOUTS.ONE_SEC);
        cy.findByTestId('userListItemDetails').find('.more-modal__name').should('be.visible').then((el) => {
            expect(getInnerText(el)).equal(`@${testUser.username} - ${testUser.first_name} ${testUser.last_name} (${newNickname})`);
        });
        cy.uiClose();
    });
    it('MM-T2060 Nickname and username styles', () => {
        cy.apiCreateChannel(testTeam.id, 'channel-test', 'Channel').then(({channel}) => {
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.uiOpenSettingsModal('Display');
            cy.get('#name_formatEdit').click();
            cy.get('#name_formatFormatC').check();
            cy.uiSave();
            cy.uiClose();
            cy.uiOpenChannelMenu('Members');
            cy.uiGetButton('Add').click();
            cy.get('#addUsersToChannelModal').should('be.visible').findByText(`Add people to ${channel.display_name}`);
            cy.get('#selectItems input').typeWithForce('sys').wait(TIMEOUTS.ONE_SEC);
            cy.get('#multiSelectList > div > .more-modal__details > .more-modal__name > span').should('contain', '@').and('have.css', 'color', 'rgb(63, 67, 80)');
            cy.get('body').type('{esc}');
            cy.uiAddDirectMessage().click();
            cy.get('.more-modal').should('be.visible').within(() => {
                cy.findByText('Direct Messages').click();
                cy.get('#selectItems input').typeWithForce('@');
                cy.get('.more-modal__details > .more-modal__name').should('contain', '@').and('have.css', 'color', 'rgb(63, 67, 80)');
            });
            cy.get('body').type('{esc}');
        });
    });
    it('MM-T2061 Nickname should reset on cancel of edit', () => {
        cy.uiOpenProfileModal('Profile Settings').within(() => {
            cy.uiGetHeading('Nickname').click();
            cy.uiGetTextbox('Nickname').should('be.visible').clear().type('nickname_edit');
            cy.uiCancelButton().click();
        });
        cy.uiGetHeading('Nickname').click();
        cy.uiGetTextbox('Nickname').should('be.visible').should('contain', '');
        cy.uiClose();
    });
    it('MM-T2062 Clear nickname and save', () => {
        cy.uiOpenProfileModal('Profile Settings').within(() => {
            cy.uiGetHeading('Nickname').click();
            cy.uiGetTextbox('Nickname').clear();
            cy.uiGetTextbox('Nickname').should('contain', '');
            cy.uiSaveButton().click();
        });
        cy.get('#nicknameDesc').should('be.visible').should('contain', "Click 'Edit' to add a nickname");
        cy.uiClose();
    });
    function getInnerText(el) {
        return el[0].innerText.replace(/\n/g, '').replace(/\s/g, ' ');
    }
});