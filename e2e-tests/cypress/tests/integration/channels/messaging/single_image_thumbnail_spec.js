import * as MESSAGES from '../../../fixtures/messages';
describe('Message', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('MM-T1796 Standard view: Show single image thumbnail', () => {
        verifySingleImageThumbnail({mode: 'Standard'});
    });
    it('MM-T1797 Compact view: Show single image thumbnail', () => {
        verifySingleImageThumbnail({mode: 'Compact'});
    });
});
function verifySingleImageThumbnail({mode = null} = {}) {
    const displayMode = {
        Compact: 'compact',
        Standard: 'clean',
    };
    const filename = 'image-small-height.png';
    cy.apiSaveMessageDisplayPreference(displayMode[mode]);
    cy.get('#advancedTextEditorCell').find('#fileUploadInput').attachFile(filename);
    cy.get('.post-image__thumbnail').should('be.visible');
    cy.postMessage(MESSAGES.MEDIUM);
    cy.get('div.file__image').last().within(() => {
        cy.contains('div', filename).should('not.exist');
        cy.get('img[src*="preview"]').should('be.visible');
        cy.findByLabelText('Toggle Embed Visibility').should('exist').and('have.attr', 'data-expanded', 'true').click({force: true});
        cy.findByLabelText('Toggle Embed Visibility').should('exist').and('have.attr', 'data-expanded', 'false');
        cy.get('img[src*="preview"]').should('not.exist');
    });
}