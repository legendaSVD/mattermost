import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getRandomId} from '../../../utils';
export function searchAndValidate(query, expectedResults = []) {
    cy.uiGetSearchContainer().should('be.visible').click();
    cy.uiGetSearchBox().
        clear().
        wait(TIMEOUTS.HALF_SEC).
        type(query).
        wait(TIMEOUTS.HALF_SEC).
        type('{enter}');
    cy.get('#loadingSpinner').should('not.exist');
    cy.uiGetRHSSearchContainer().
        findAllByTestId('search-item-container').
        should('have.length', expectedResults.length).
        then((results) => {
            if (expectedResults.length > 0) {
                cy.wrap(results).each((result, index) => {
                    cy.wrap(result).find('.post-message').should('have.text', expectedResults[index]);
                });
            } else {
                cy.get('.no-results__title').should('be.visible').and('have.text', `No results for “${query}”`);
            }
        });
    cy.uiCloseRHS();
    cy.uiGetRHSSearchContainer({visible: false});
}
export function getMsAndQueryForDate(date) {
    return {
        ms: date,
        query: new Date(date).toISOString().split('T')[0],
    };
}
export function getTestMessages() {
    const commonText = getRandomId();
    const todayMessage = `1st Today's message ${commonText}`;
    const firstMessage = `5th First message ${commonText}`;
    const secondMessage = `3rd Second message ${commonText}`;
    const firstOffTopicMessage = `4th Off topic 1 ${commonText}`;
    const secondOffTopicMessage = `2nd Off topic 2 ${commonText}`;
    const allMessagesInOrder = [
        todayMessage,
        secondOffTopicMessage,
        secondMessage,
        firstOffTopicMessage,
        firstMessage,
    ];
    return {
        commonText,
        allMessagesInOrder,
        todayMessage,
        firstMessage,
        secondMessage,
        firstOffTopicMessage,
        secondOffTopicMessage,
        firstDateEarly: getMsAndQueryForDate(Date.UTC(2018, 5, 5, 9, 30)),
        firstDateLater: getMsAndQueryForDate(Date.UTC(2018, 5, 5, 9, 45)),
        secondDateEarly: getMsAndQueryForDate(Date.UTC(2018, 9, 15, 13, 15)),
        secondDateLater: getMsAndQueryForDate(Date.UTC(2018, 9, 15, 13, 25)),
    };
}
export function setupTestData(data, {team, channel, admin, anotherAdmin}) {
    const {
        todayMessage,
        firstMessage,
        secondMessage,
        firstOffTopicMessage,
        secondOffTopicMessage,
        firstDateEarly,
        secondDateEarly,
        firstDateLater,
        secondDateLater,
    } = data;
    cy.externalUpdateUserRoles(anotherAdmin.id, 'system_user system_admin');
    cy.get('#postListContent', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible');
    cy.postMessage(todayMessage).wait(TIMEOUTS.ONE_SEC);
    cy.postMessageAs({sender: anotherAdmin, message: firstMessage, channelId: channel.id, createAt: firstDateEarly.ms});
    cy.postMessageAs({sender: admin, message: secondMessage, channelId: channel.id, createAt: secondDateEarly.ms});
    cy.apiGetChannelByName(team.name, 'off-topic').then(({channel: offTopicChannel}) => {
        cy.postMessageAs({sender: admin, message: firstOffTopicMessage, channelId: offTopicChannel.id, createAt: firstDateLater.ms});
        cy.postMessageAs({sender: anotherAdmin, message: secondOffTopicMessage, channelId: offTopicChannel.id, createAt: secondDateLater.ms});
        Cypress._.times(10, () => {
            cy.apiCreateUser().then(({user}) => {
                cy.apiAddUserToTeam(team.id, user.id).then(() => {
                    cy.apiAddUserToChannel(channel.id, user.id).then(() => {
                        [channel, offTopicChannel].forEach((c) => {
                            cy.postMessageAs({sender: user, message: getRandomId(), channelId: c.id});
                        });
                    });
                });
            });
        });
    });
}