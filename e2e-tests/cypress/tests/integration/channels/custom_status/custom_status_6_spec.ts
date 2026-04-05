describe('Custom Status - Slash Commands', () => {
    const customStatus = {
        emoji: 'laughing',
        text: 'Feeling happy',
    };
    before(() => {
        cy.apiUpdateConfig({TeamSettings: {EnableCustomUserStatuses: true}});
        cy.apiInitSetup({loginAfter: true}).then(({channelUrl}) => {
            cy.visit(channelUrl);
        });
    });
    it('MM-T3852_1 should set custom status by slash command', () => {
        cy.postMessage(`/status :${customStatus.emoji}: ${customStatus.text}`);
        cy.uiGetProfileHeader().
            find('.emoticon').
            should('have.attr', 'data-emoticon', customStatus.emoji);
        cy.get('.post.post--system').last().
            should('contain.text', 'Your status is set to “').
            and('contain.text', ` ${customStatus.text}”. You can change your status from the status popover in the channel sidebar header.`);
        cy.get('.post.post--system').last().get(`span[data-emoticon="${customStatus.emoji}"]`).should('exist');
    });
    it('MM-T3852_2 should clear custom status by slash command', () => {
        cy.postMessage('/status clear');
        cy.uiGetProfileHeader().
            find('.emoticon').
            should('not.exist');
        cy.get('.post.post--system').last().should('contain.text', 'Your status was cleared.');
    });
});