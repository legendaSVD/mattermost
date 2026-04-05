import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Messaging', () => {
    let otherChannelName;
    let otherChannelUrl;
    let initialHeight = 0;
    before(() => {
        cy.viewport(1000, 660);
        cy.apiInitSetup({loginAfter: true}).then((out) => {
            otherChannelName = out.channel.name;
            otherChannelUrl = out.channelUrl;
            cy.visit(out.offTopicUrl);
            cy.postMessage('hello');
            cy.uiGetPostTextBox().invoke('height').then((height) => {
                initialHeight = height;
                cy.wrap(initialHeight).as('initialHeight');
                cy.wrap(initialHeight).as('previousHeight');
            });
        });
    });
    it('MM-T211 Leave a long draft in the main input box', () => {
        const lines = [
            'Lorem ipsum dolor sit amet,',
            'consectetur adipiscing elit.',
            'Nulla ac consectetur quam.',
            'Phasellus libero lorem,',
            'facilisis in purus sed, auctor.',
        ];
        writeLinesToPostTextBox(lines);
        cy.get(`#sidebarItem_${otherChannelName}`).click({force: true}).wait(TIMEOUTS.THREE_SEC);
        verifyPostTextbox('@initialHeight', '');
        cy.get('#sidebarItem_off-topic').click({force: true}).wait(TIMEOUTS.THREE_SEC);
        verifyPostTextbox('@previousHeight', lines.join('\n'));
        cy.uiGetPostTextBox().clear();
        cy.postMessage('World!');
        cy.wrap(initialHeight).as('previousHeight');
        writeLinesToPostTextBox(lines);
        cy.visit(otherChannelUrl).wait(TIMEOUTS.THREE_SEC);
        verifyPostTextbox('@initialHeight', '');
        cy.get('#sidebarItem_off-topic').click({force: true}).wait(TIMEOUTS.THREE_SEC);
        verifyPostTextbox('@previousHeight', lines.join('\n'));
    });
});
function writeLinesToPostTextBox(lines) {
    let previousHeight;
    cy.get('@previousHeight').then((height) => {
        previousHeight = height;
    });
    Cypress._.forEach(lines, (line, i) => {
        cy.uiGetPostTextBox().type(line, {delay: TIMEOUTS.ONE_HUNDRED_MILLIS}).wait(TIMEOUTS.HALF_SEC);
        if (i < lines.length - 1) {
            cy.uiGetPostTextBox().type('{shift}{enter}').wait(TIMEOUTS.HALF_SEC);
            cy.uiGetPostTextBox().invoke('height').then((height) => {
                const currentHeight = parseInt(height, 10);
                expect(previousHeight).to.be.lessThan(currentHeight);
                previousHeight = currentHeight;
                cy.wrap(currentHeight).as('previousHeight');
            });
        }
    });
    cy.wait(TIMEOUTS.THREE_SEC);
}
function verifyPostTextbox(heightSelector, text) {
    cy.uiGetPostTextBox().and('have.text', text).invoke('height').then((currentHeight) => {
        cy.get(heightSelector).should('be.gte', currentHeight);
    });
}