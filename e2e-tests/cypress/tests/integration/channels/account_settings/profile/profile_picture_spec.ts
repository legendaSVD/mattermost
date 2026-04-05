import 'cypress-file-upload';
import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Profile > Profile Settings > Profile Picture', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T2080 Can remove profile pic', () => {
        const customImageMatch = 'image?_=';
        cy.uiGetProfileHeader().
            find('.Avatar').
            should('have.attr', 'src').
            and('not.include', customImageMatch);
        cy.uiOpenProfileModal('Profile Settings');
        cy.get('#pictureEdit').should('be.visible').click();
        cy.findByTestId('uploadPicture').attachFile('mattermost-icon.png');
        cy.uiSave().wait(TIMEOUTS.HALF_SEC);
        cy.get('body').type('{esc}');
        cy.uiGetProfileHeader().
            find('.Avatar').
            should('have.attr', 'src').
            and('include', customImageMatch);
        cy.uiOpenProfileModal('Profile Settings');
        cy.get('#pictureEdit').should('be.visible').click();
        cy.findByTestId('removeSettingPicture').click();
        cy.uiSave().wait(TIMEOUTS.HALF_SEC);
        cy.get('#pictureEdit').should('be.visible');
        cy.get('body').type('{esc}');
        cy.uiGetProfileHeader().
            find('.Avatar').
            should('have.attr', 'src').
            and('not.include', customImageMatch);
    });
    it('MM-T2077 Profile picture: non image file shows error', () => {
        cy.uiOpenProfileModal('Profile Settings');
        cy.get('#pictureEdit').should('be.visible').click();
        cy.findByTestId('uploadPicture').attachFile('txt-changed-as-png.png');
        cy.uiSave().wait(TIMEOUTS.HALF_SEC);
        cy.get('.has-error').
            should('be.visible').
            and('contain', 'Image limits check failed. Resolution is too high.');
    });
});