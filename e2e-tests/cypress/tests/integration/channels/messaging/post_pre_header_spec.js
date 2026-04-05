import {verifySavedPost} from '../../../support/ui/post';
describe('Post PreHeader', () => {
    let testTeam;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            testTeam = team;
            cy.visit(`/${testTeam.name}/channels/off-topic`);
        });
    });
    it('MM-T3352 Properly handle Saved Posts', () => {
        const message = 'test for saved post';
        cy.postMessage(message);
        cy.getLastPostId().then((postId) => {
            cy.get('div.post-pre-header').should('not.exist');
            cy.clickPostSaveIcon(postId);
            verifySavedPost(postId, message);
            cy.get('@savedLink').click();
            cy.findByTestId('search-item-container').within(() => {
                cy.get('span.search-channel__name').
                    should('be.visible').
                    and('have.text', 'Off-Topic');
            });
            cy.get('#searchResultsCloseButton').should('be.visible').click();
            cy.clickPostSaveIcon(postId);
            cy.get('div.post-pre-header').should('not.exist');
            cy.get(`#post_${postId}`).should('not.have.class', 'post--pinned-or-flagged');
        });
    });
    it('MM-T3353 Unpinning and pinning a post removes and adds badge', () => {
        cy.postMessage('test for pinning/unpinning a post');
        cy.getLastPostId().then((postId) => {
            cy.get('div.post-pre-header').should('not.exist');
            cy.uiClickPostDropdownMenu(postId, 'Pin to Channel');
            cy.get(`#post_${postId}`).
                should('have.class', 'post--pinned-or-flagged').
                within(() => {
                    cy.get('div.post-pre-header').should('be.visible');
                    cy.get('span.icon--post-pre-header.icon-pin').should('be.visible');
                    cy.get('div.post-pre-header__text-container').
                        should('be.visible').
                        and('have.text', 'Pinned').
                        within(() => {
                            cy.get('a').as('pinnedLink').should('be.visible');
                        });
                });
            cy.get('#searchContainer').should('not.exist');
            cy.get('@pinnedLink').click();
            cy.get('#searchContainer').should('be.visible').within(() => {
                cy.get('.sidebar--right__title').
                    should('be.visible').
                    and('contain', 'Pinned messages').
                    and('contain', 'Off-Topic');
                cy.findByTestId('search-item-container').within(() => {
                    cy.get('div.post__content').should('be.visible');
                    cy.get(`#rhsPostMessageText_${postId}`).contains('test for pinning/unpinning a post');
                    cy.get('div.post-pre-header').should('not.exist');
                });
            });
            cy.get('#searchResultsCloseButton').should('be.visible').click();
            cy.uiClickPostDropdownMenu(postId, 'Unpin from Channel');
            cy.get('div.post-pre-header').should('not.exist');
            cy.get(`#post_${postId}`).should('not.have.class', 'post--pinned-or-flagged');
        });
    });
    it('MM-T3354 Handle posts that are both pinned and saved', () => {
        cy.postMessage('test both pinned and saved');
        cy.getLastPostId().then((postId) => {
            cy.uiClickPostDropdownMenu(postId, 'Pin to Channel');
            cy.clickPostSaveIcon(postId);
            cy.get(`#post_${postId}`).
                should('have.class', 'post--pinned-or-flagged').
                within(() => {
                    cy.get('div.post-pre-header').should('be.visible');
                    cy.get('span.icon--post-pre-header').should('be.visible').
                        find('svg').should('have.attr', 'aria-label', 'Saved Icon');
                    cy.get('span.icon--post-pre-header.icon-pin').should('be.visible');
                    cy.get('div.post-pre-header__text-container').
                        should('be.visible').
                        and('have.text', `Pinned${'\u2B24'}Saved`).
                        within(() => {
                            cy.get('a').should('have.length', 2);
                            cy.get('a').first().as('pinnedLink').should('be.visible');
                            cy.get('a').last().as('savedLink').should('be.visible');
                        });
                });
            cy.get('@savedLink').click();
            cy.findByTestId('search-item-container').within(() => {
                cy.get('div.post-pre-header__text-container').
                    should('be.visible').
                    and('have.text', 'Pinned');
            });
            cy.get('@pinnedLink').click();
            cy.findByTestId('search-item-container').within(() => {
                cy.get('div.post-pre-header__text-container').
                    should('be.visible').
                    and('have.text', 'Saved');
            });
            cy.uiGetSearchContainer().click();
            cy.uiGetSearchBox().type('test both pinned and saved {enter}');
            cy.get('#searchContainer').should('be.visible').within(() => {
                cy.get('.sidebar--right__title').
                    should('be.visible').
                    and('have.text', 'Search Results');
                cy.findByTestId('search-item-container').within(() => {
                    cy.get('div.post-pre-header__text-container').
                        should('be.visible').
                        and('have.text', `Pinned${'\u2B24'}Saved`);
                });
            });
        });
    });
});