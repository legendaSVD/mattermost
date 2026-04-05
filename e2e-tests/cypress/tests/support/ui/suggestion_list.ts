import {SimpleUser} from 'tests/integration/channels/autocomplete/helpers';
import {ChainableT} from 'tests/types';
function uiVerifyAtMentionInSuggestionList(user: SimpleUser, isSelected = false, sectionDividerName: string = null): ChainableT {
    return cy.get('#suggestionList').should('be.visible').within(() => {
        if (sectionDividerName) {
            cy.get('.suggestion-list__divider').findByText(sectionDividerName).should('be.visible');
            cy.get('.suggestion-list__divider').next().findByTestId(`mentionSuggestion_${user.username}`).should('be.visible');
        }
        return cy.uiVerifyAtMentionSuggestion(user, isSelected);
    });
}
Cypress.Commands.add('uiVerifyAtMentionInSuggestionList', uiVerifyAtMentionInSuggestionList);
function uiVerifyAtMentionSuggestion(user: SimpleUser, isSelected = false): ChainableT {
    const {
        username,
        first_name: firstName,
        last_name: lastName,
        nickname,
    } = user;
    cy.findByTestId(`mentionSuggestion_${username}`).as('selectedMentionSuggestion').should('be.visible');
    if (isSelected) {
        cy.get('@selectedMentionSuggestion').should('have.class', 'suggestion--selected');
    }
    cy.get('@selectedMentionSuggestion').findByText(`@${username}`).should('be.visible');
    cy.get('@selectedMentionSuggestion').findByText(`${firstName} ${lastName} (${nickname})`).should('be.visible');
    return cy.findByTestId(`mentionSuggestion_${username}`);
}
Cypress.Commands.add('uiVerifyAtMentionSuggestion', uiVerifyAtMentionSuggestion);
declare global {
    namespace Cypress {
        interface Chainable {
            uiVerifyAtMentionInSuggestionList: typeof uiVerifyAtMentionInSuggestionList;
            uiVerifyAtMentionSuggestion: typeof uiVerifyAtMentionSuggestion;
        }
    }
}