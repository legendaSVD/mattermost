import {fileSizeToString} from '../../../utils';
import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Unsaved Changes', () => {
    let defaultMaxFileSize;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiGetConfig(true).then(({config}) => {
            defaultMaxFileSize = config.MaxFileSize;
        });
    });
    it('MM-T955 Warning leaving changed page without saving: Leave page, discard changes', () => {
        cy.visit('/admin_console/environment/file_storage');
        cy.findByTestId('FileSettings.MaxFileSizenumber', {timeout: TIMEOUTS.FIVE_SEC}).clear().type('150');
        cy.findByText('Database').click();
        cy.get('#confirmModal').should('be.visible');
        cy.get('#confirmModalButton').click();
        cy.url().should('include', '/environment/database');
        cy.visit('/admin_console/environment/file_storage');
        cy.findByTestId('FileSettings.MaxFileSizenumber', {timeout: TIMEOUTS.FIVE_SEC}).should('have.value', fileSizeToString(defaultMaxFileSize).replace('MB', ''));
    });
    it('MM-T956 Warning leaving changed page without saving: Cancel leaving page', () => {
        const draftValue = '150';
        cy.visit('/admin_console/environment/file_storage');
        cy.findByTestId('FileSettings.MaxFileSizenumber', {timeout: TIMEOUTS.FIVE_SEC}).clear().type(draftValue);
        cy.findByText('Database').click();
        cy.get('#confirmModal').should('be.visible');
        cy.get('#cancelModalButton').click();
        cy.url().should('include', '/environment/file_storage');
        cy.findByTestId('FileSettings.MaxFileSizenumber', {timeout: TIMEOUTS.FIVE_SEC}).should('have.value', draftValue);
    });
});