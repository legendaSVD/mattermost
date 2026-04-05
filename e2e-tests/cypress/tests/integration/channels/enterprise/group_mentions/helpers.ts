import * as TIMEOUTS from '../../../../fixtures/timeouts';
export function enableGroupMention(groupName: string, groupID: string, userEmail?: string): void {
    cy.visit(`/admin_console/user_management/groups/${groupID}`);
    cy.get('#group_users', {timeout: TIMEOUTS.ONE_MIN}).scrollIntoView();
    if (userEmail) {
        cy.findByText(userEmail).should('be.visible');
    }
    cy.get('#group_profile').scrollIntoView().wait(TIMEOUTS.TWO_SEC);
    cy.findByTestId('allowReferenceSwitch').then((el) => {
        const button = el.find('button');
        const classAttribute = button[0].getAttribute('class');
        if (!classAttribute.includes('active')) {
            button[0].click();
        }
    });
    cy.get('#groupMention').find('input').clear().type(groupName);
    cy.uiSaveConfig();
}