describe('Messaging', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, channel}) => {
            cy.visit(`/${team.name}/channels/${channel.name}`);
        });
    });
    it('MM-T188 - Inline markdown image that is a link, opens the link', () => {
        const linkUrl = 'https://www.google.com';
        const imageUrl = 'https://docs.mattermost.com/_images/icon-76x76.png';
        const label = 'Build Status';
        const baseUrl = Cypress.config('baseUrl');
        cy.postMessage(`[![${label}](${imageUrl})](${linkUrl})`);
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).find('a').then(($a) => {
                cy.wrap($a).
                    should('have.attr', 'href', linkUrl).
                    and('have.attr', 'target', '_blank');
                cy.wrap($a).find('img').should('be.visible').
                    and('have.attr', 'src', `${baseUrl}/api/v4/image?url=${encodeURIComponent(imageUrl)}`).
                    and('have.attr', 'alt', label);
                const href = $a.prop('href');
                cy.request(href).its('body').should('include', '</html>');
            });
        });
    });
});