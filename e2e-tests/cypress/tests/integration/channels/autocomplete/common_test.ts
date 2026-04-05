import {
    getPostTextboxInput,
    getQuickChannelSwitcherInput,
    SimpleUser,
    startAtMention,
    verifySuggestionAtChannelSwitcher,
    verifySuggestionAtPostTextbox,
} from './helpers';
export function doTestPostextbox(mention: string, ...suggestion: SimpleUser[]) {
    getPostTextboxInput();
    startAtMention(mention);
    verifySuggestionAtPostTextbox(...suggestion);
}
export function doTestQuickChannelSwitcher(mention: string, ...suggestion: SimpleUser[]) {
    getQuickChannelSwitcherInput();
    startAtMention(mention);
    verifySuggestionAtChannelSwitcher(...suggestion);
}
export function doTestUserChannelSection(prefix: string, testTeam: Cypress.Team, testUsers: Record<string, SimpleUser>) {
    const thor = testUsers.thor;
    const loki = testUsers.loki;
    const channelName = 'new-channel';
    cy.apiCreateChannel(testTeam.id, channelName, channelName).then(({channel}) => {
        cy.apiGetUserByEmail(thor.email).then(({user}) => {
            cy.apiAddUserToChannel(channel.id, user.id);
        });
        cy.visit(`/${testTeam.name}/channels/${channel.name}`);
    });
    cy.uiGetPostTextBox().
        as('input').
        clear().
        type(`@${prefix}odinson`);
    cy.uiVerifyAtMentionInSuggestionList(thor, true);
    cy.uiVerifyAtMentionInSuggestionList(loki, false);
}
export function doTestDMChannelSidebar(testUsers: Record<string, SimpleUser>) {
    const thor = testUsers.thor;
    cy.uiAddDirectMessage().click({force: true});
    cy.get('.more-direct-channels').
        find('input').
        should('exist').
        type(thor.username, {force: true});
    cy.intercept({
        method: 'POST',
        url: '/api/v4/users/search',
    }).as('searchUsers');
    cy.wait('@searchUsers').then((interception) => {
        expect(interception.response.body.length === 1);
    });
    cy.get('#moreDmModal').find('.more-modal__row').
        as('result').
        its('length').
        should('equal', 1);
    cy.get('@result').
        find('.more-modal__name').
        should('have.text', `@${thor.username} - ${thor.first_name} ${thor.last_name} (${thor.nickname})`);
    cy.get('@result').
        find('.more-modal__description').
        should('have.text', thor.email);
    cy.get('@result').click({force: true});
    cy.uiGetButton('Go').click();
    cy.get('#channelHeaderTitle').should('have.text', thor.username + ' ');
}