import {getRandomId} from '../../../utils';
describe('System message', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, channel}) => {
            cy.visit(`/${team.name}/channels/${channel.name}`);
            cy.postMessage('Test for no status of a system message');
            const newHeader = `Update header with ${getRandomId()}`;
            cy.apiPatchChannel(channel.id, {header: newHeader});
            cy.uiWaitUntilMessagePostedIncludes(newHeader);
        });
    });
    it('MM-T427_1 No status on system message in standard view', () => {
        verifySystemMessage('clean');
    });
    it('MM-T427_2 No status on system message in compact view', () => {
        verifySystemMessage('clean');
    });
});
function verifySystemMessage(type, statusExist) {
    cy.apiSaveMessageDisplayPreference(type);
    cy.getLastPostId().then((postId) => {
        cy.get(`#post_${postId}`).invoke('attr', 'class').
            should('contain', 'post--system').
            and('not.contain', 'same--root').
            and('not.contain', 'other--root').
            and('not.contain', 'current--user').
            and('not.contain', 'post--comment').
            and('not.contain', 'post--root');
        cy.get(`#post_${postId}`).find('.status-wrapper .status svg').
            should(statusExist ? 'not.be.visible' : 'not.exist');
    });
}