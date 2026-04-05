import {getRandomId} from '../../../../utils';
import * as TIMEOUTS from '../../../../fixtures/timeouts';
const permissions = ['create_private_channel', 'edit_post', 'delete_post', 'reactions', 'use_channel_mentions', 'use_group_mentions'];
const getButtonId = (permission) => {
    return 'guests-guest_' + permission + '-checkbox';
};
const disableAllGuestPermissions = () => {
    permissions.forEach((permission) => {
        cy.findByTestId(getButtonId(permission)).then((btn) => {
            if (btn.hasClass('checked')) {
                btn.click();
            }
        });
    });
};
const enableAllGuestPermissions = () => {
    permissions.forEach((permission) => {
        cy.findByTestId(getButtonId(permission)).then((btn) => {
            if (!btn.hasClass('checked')) {
                btn.click();
            }
        });
    });
};
const verifyAllGuestPermissions = (selected) => {
    permissions.forEach((permission) => {
        if (selected) {
            cy.findByTestId(getButtonId(permission)).should('have.class', 'checked');
        } else {
            cy.findByTestId(getButtonId(permission)).should('not.have.class', 'checked');
        }
    });
};
describe('Team Scheme Guest Permissions Test', () => {
    before(() => {
        cy.apiRequireLicense();
    });
    it('MM- - Enable and Disable all guest permission', () => {
        cy.visit('/admin_console/user_management/permissions/team_override_scheme');
        const randomId = getRandomId();
        cy.get('#scheme-name').type(`TestScheme-${randomId}{enter}`);
        cy.wait(TIMEOUTS.HALF_SEC);
        enableAllGuestPermissions();
        cy.get('#saveSetting').click().wait(TIMEOUTS.HALF_SEC);
        cy.findByText(`TestScheme-${randomId}`).siblings('.actions').children('.edit-button').click().wait(TIMEOUTS.HALF_SEC);
        verifyAllGuestPermissions(true);
        disableAllGuestPermissions();
        cy.get('#saveSetting').click().wait(TIMEOUTS.HALF_SEC);
        cy.findByText(`TestScheme-${randomId}`).siblings('.actions').children('.edit-button').click().wait(TIMEOUTS.HALF_SEC);
        verifyAllGuestPermissions(false);
        cy.findByTestId('permission-scheme-cancel-button').should('be.visible').click();
        cy.findByText(`TestScheme-${randomId}`).siblings('.actions').children('.delete-button').click().wait(TIMEOUTS.HALF_SEC);
        cy.get('#confirmModalButton').click();
    });
});