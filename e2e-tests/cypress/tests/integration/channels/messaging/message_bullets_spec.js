describe('Message', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T87 Text in bullet points is the same size as text above and below it', () => {
        cy.uiGetPostTextBox().clear().
            type('This is a normal sentence.').
            type('{shift}{enter}{enter}').
            type('1. this is point 1').
            type('{shift}{enter}').
            type(' - this is a bullet under 1').
            type('{shift}{enter}{enter}').
            type('This is more normal text.').
            type('{enter}');
        cy.getLastPostId().then((postId) => {
            const postMessageTextId = `#postMessageText_${postId}`;
            cy.get(postMessageTextId).within(() => {
                const expectedSize = '13.5px';
                cy.get('p').first().should('have.text', 'This is a normal sentence.').and('have.css', 'font-size', expectedSize);
                cy.get('ol li').first().should('have.text', 'this is point 1this is a bullet under 1').and('have.css', 'font-size', expectedSize);
                cy.get('ol li ul li').should('have.text', 'this is a bullet under 1').and('have.css', 'font-size', expectedSize);
                cy.get('p').last().should('have.text', 'This is more normal text.').and('have.css', 'font-size', expectedSize);
            });
        });
    });
    it('MM-T1321 WebApp: Truncated Numbered List on Chat History Panel', () => {
        const bulletMessages = [
            {
                text:
                    '9. firstBullet{shift}{enter}10. secondBullet{shift}{enter}11. thirdBullet',
                counter: 9,
            },
            {
                text:
                    '9999. firstBullet{shift}{enter}10000. secondBullet{shift}{enter}10001. thirdBullet',
                counter: 9999,
            },
            {
                text:
                    '999999. firstBullet{shift}{enter}1000000. secondBullet{shift}{enter}1000001. thirdBullet',
                counter: 999999,
            },
        ];
        bulletMessages.forEach((bulletMessage) => {
            cy.uiGetPostTextBox().
                clear().
                type(bulletMessage.text).
                type('{enter}');
            cy.getLastPost().within(() => {
                cy.findByText('firstBullet').
                    should('be.visible').
                    parents('li').
                    should('exist');
                cy.findByText('secondBullet').
                    should('be.visible').
                    parents('li').
                    should('exist');
                cy.findByText('thirdBullet').
                    should('be.visible').
                    parents('li').
                    should('exist');
                cy.findByText('firstBullet').
                    parents('ol').
                    should('exist').
                    as('olParent');
                cy.get('@olParent').
                    should(
                        'have.css',
                        'counter-reset',
                        `list ${bulletMessage.counter - 1}`,
                    ).
                    and('have.class', 'markdown__list');
            });
        });
    });
});