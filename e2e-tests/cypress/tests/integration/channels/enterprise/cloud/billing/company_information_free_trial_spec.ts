import {getRandomLetter} from '../../../../../utils/index';
describe('System Console - Company Information section', () => {
    before(() => {
        cy.apiRequireLicenseForFeature('Cloud');
        cy.visit('/admin_console/billing/company_info');
        cy.contains('.admin-console__header', 'Company Information').should('be.visible');
    });
    beforeEach(() => {
        cy.get('body').then(($body) => {
            if ($body.find('.cancel-button').length > 0) {
                cy.get('.cancel-button').click();
                cy.get('#confirmModalButton').click();
            }
        });
    });
    it('MM-T4164 Save Info button should not be enabled if any one of the mandatory field is filled with invalid data', () => {
        const companyName = getRandomLetter(30);
        cy.contains('span', 'Company Information').parent().click();
        cy.get('.CompanyInfoDisplay__companyInfo-editButton').click();
        cy.get('#input_companyName').clear().type(companyName);
        cy.get('#input_numEmployees').clear().type('10');
        cy.get('#DropdownInput_country_dropdown').click();
        cy.get("#DropdownInput_country_dropdown .DropDown__input > input[type='text']").type('India{enter}');
        cy.get('#input_address').clear().type('test address');
        cy.get('#input_address2').clear().type('test2');
        cy.get('#input_city').clear().type('testcity');
        cy.get('#input_state').clear().type('test');
        cy.get('#input_postalCode').clear().type('44455');
        cy.get('#saveSetting').should('be.enabled');
        cy.get('#input_postalCode').clear();
        cy.get('#saveSetting').should('be.disabled');
        cy.get('#input_postalCode').type('44456');
        cy.get('#saveSetting').should('be.enabled');
        cy.get('#input_city').clear();
        cy.get('#saveSetting').should('be.disabled');
        cy.get('#input_city').type('testcity');
        cy.get('#saveSetting').should('be.enabled');
        cy.get('#input_companyName').clear();
        cy.get('#saveSetting').should('be.disabled');
    });
    it('MM-T4161 Adding the Company Information', () => {
        const companyName = getRandomLetter(30);
        cy.contains('span', 'Company Information').parent().click();
        cy.get('.CompanyInfoDisplay__companyInfo-editButton').click();
        cy.get('#input_companyName').clear().type(companyName);
        cy.get('#input_numEmployees').clear().type('10');
        cy.get('#DropdownInput_country_dropdown').click();
        cy.get("#DropdownInput_country_dropdown .DropDown__input > input[type='text']").type('India{enter}');
        cy.get('#input_address').clear().type('Add test address');
        cy.get('#input_address2').clear().type('Add test address2');
        cy.get('#input_city').clear().type('Addtestcity');
        cy.get('#input_state').clear().type('Addteststate');
        cy.get('#input_postalCode').clear().type('560089');
        cy.get('#saveSetting').should('be.enabled').click();
        cy.get('.CompanyInfoDisplay__companyInfo-name').should('have.text', companyName);
        cy.get('.CompanyInfoDisplay__companyInfo-numEmployees > span').should('include.text', '10');
        cy.get('.CompanyInfoDisplay__companyInfo-address > div').eq(3).should('have.text', 'British Indian Ocean Territory');
        cy.get('.CompanyInfoDisplay__companyInfo-address > div').eq(2).should('have.text', 'Addtestcity, Addteststate, 560089');
        cy.get('.CompanyInfoDisplay__companyInfo-address > div').eq(1).should('have.text', 'Add test address2');
        cy.get('.CompanyInfoDisplay__companyInfo-address > div').eq(0).should('have.text', 'Add test address');
    });
    it('MM-T4165 Editing the Company Information', () => {
        const companyName = getRandomLetter(30);
        cy.get('.CompanyInfoDisplay__companyInfo-editButton').click();
        cy.get('#input_companyName').clear().type(companyName);
        cy.get('#input_numEmployees').clear().type('10');
        cy.get('#DropdownInput_country_dropdown').click();
        cy.get("#DropdownInput_country_dropdown .DropDown__input > input[type='text']").type('India{enter}');
        cy.get('#input_address').clear().type('test address');
        cy.get('#input_address2').clear().type('test2');
        cy.get('#input_city').clear().type('testcity');
        cy.get('#input_state').clear().type('test');
        cy.get('#input_postalCode').clear().type('44455');
        cy.get('#saveSetting').should('be.enabled').click();
        cy.get('.CompanyInfoDisplay__companyInfo-name').should('have.text', companyName);
        cy.get('.CompanyInfoDisplay__companyInfo-numEmployees > span').should('include.text', '10');
        cy.get('.CompanyInfoDisplay__companyInfo-address > div').eq(3).should('have.text', 'British Indian Ocean Territory');
        cy.get('.CompanyInfoDisplay__companyInfo-address > div').eq(2).should('have.text', 'testcity, test, 44455');
        cy.get('.CompanyInfoDisplay__companyInfo-address > div').eq(1).should('have.text', 'test2');
        cy.get('.CompanyInfoDisplay__companyInfo-address > div').eq(0).should('have.text', 'test address');
    });
    it('MM-T4166 Cancelling of editing of company information details', () => {
        cy.get('.CompanyInfoDisplay__companyInfo-editButton').click();
        cy.contains('span', 'Edit Company Information').prev().click();
        cy.get('.CompanyInfoDisplay__companyInfo-editButton').should('be.visible');
        cy.get('.CompanyInfoDisplay__companyInfo-editButton').click();
        cy.get('#input_companyName').clear().type('CancelcompanyName');
        cy.get('#input_numEmployees').clear().type('11');
        cy.get('#DropdownInput_country_dropdown').click();
        cy.get("#DropdownInput_country_dropdown .DropDown__input > input[type='text']").type('Albania{enter}');
        cy.get('#input_address').clear().type('canceltest address');
        cy.get('#input_address2').clear().type('canceltest2');
        cy.get('#input_city').clear().type('canceltestcity');
        cy.get('#input_state').clear().type('canceltest');
        cy.get('#input_postalCode').clear().type('560072');
        cy.get('.cancel-button').click();
        cy.get('.CompanyInfoDisplay__companyInfo-editButton').should('be.visible');
        cy.get('.CompanyInfoDisplay__companyInfo-name').should('not.have.text', 'CancelcompanyName');
        cy.get('.CompanyInfoDisplay__companyInfo-numEmployees > span').should('not.include.text', '11');
        cy.get('.CompanyInfoDisplay__companyInfo-address > div').eq(3).should('not.have.text', 'Albania');
        cy.get('.CompanyInfoDisplay__companyInfo-address > div').eq(2).should('not.have.text', 'canceltestcity, canceltest, 560072');
        cy.get('.CompanyInfoDisplay__companyInfo-address > div').eq(1).should('not.have.text', 'canceltest2');
        cy.get('.CompanyInfoDisplay__companyInfo-address > div').eq(0).should('not.have.text', 'canceltest address');
    });
});