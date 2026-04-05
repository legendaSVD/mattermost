describe('Messaging', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T3014 Skin tone emoji', () => {
        const gestures = [
            ':wave',
            ':point_up',
            ':clap',
            ':+1',
        ];
        const skinTones = [
            '_light_skin_tone:',
            '_medium_light_skin_tone:',
            '_medium_skin_tone:',
            '_medium_dark_skin_tone:',
            '_dark_skin_tone:',
        ];
        gestures.forEach((gesture) => {
            skinTones.forEach((skinTone) => {
                cy.viewport('macbook-13');
                cy.postMessage(gesture + skinTone);
                cy.getLastPost().within(() => {
                    cy.get('span[data-emoticon] span').should('be.visible').should('have.attr', 'alt', gesture + skinTone);
                });
                cy.viewport('iphone-se2');
                cy.get('span[data-emoticon] span').should('be.visible');
            });
        });
    });
});