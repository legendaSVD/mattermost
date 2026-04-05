import localForage from 'localforage';
import {verifyDraftIcon} from './helpers';
describe('Message Draft Persistance', () => {
    let testChannel;
    let offTopicUrl;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then((out) => {
            testChannel = out.channel;
            offTopicUrl = out.offTopicUrl;
        });
    });
    beforeEach(() => {
        localForage.clear();
    });
    it('MM-T4639 Persisting a draft in the current channel', () => {
        const testText = 'this is a test';
        cy.visit(offTopicUrl);
        cy.uiGetPostTextBox().type(testText);
        cy.wait(500).reload();
        cy.uiGetPostTextBox().should('have.text', testText);
    });
    it('MM-T4640 Persisting a draft in another channel', () => {
        const testText = 'this is another test';
        cy.visit(offTopicUrl);
        cy.uiGetPostTextBox().clear().type(testText);
        cy.get(`#sidebarItem_${testChannel.name}`).click();
        cy.uiGetPostTextBox().should('be.empty');
        verifyDraftIcon('off-topic', true);
        cy.wait(500).reload();
        cy.uiGetPostTextBox().should('be.empty');
        cy.get('#sidebarItem_off-topic').
            should('be.visible').
            findByTestId('draftIcon').
            should('be.visible');
        cy.get('#sidebarItem_off-topic').click();
        cy.uiGetPostTextBox().should('have.text', testText);
    });
    it('MM-T4641 Migration of drafts from redux-persist@4.0.0', () => {
        const testText = 'this is a migration test';
        cy.visit(offTopicUrl);
        cy.then(() => {
            localForage.setItem(`reduxPersist:storage:draft_${testChannel.id}`, JSON.stringify({
                timestamp: new Date(),
                value: {
                    message: testText,
                    fileInfos: [],
                    uploadsInProgress: [],
                },
            }));
        });
        cy.wait(500).reload();
        verifyDraftIcon(testChannel.name, true);
        cy.get(`#sidebarItem_${testChannel.name}`).click();
        cy.uiGetPostTextBox().should('have.text', testText);
    });
});