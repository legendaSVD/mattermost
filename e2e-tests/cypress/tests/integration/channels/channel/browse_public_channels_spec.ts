import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
function verifyNoChannelToJoinMessage(isVisible) {
    cy.findByText('No public channels').should(isVisible ? 'be.visible' : 'not.exist');
}
function ensureHideJoinedCheckboxEnabled(shouldBeChecked) {
    cy.get('#hideJoinedPreferenceCheckbox').then(($checkbox) => {
        cy.wrap($checkbox).findByText('Hide Joined').should('be.visible');
        cy.wrap($checkbox).find('div.get-app__checkbox').invoke('attr', 'class').then(($classList) => {
            if ($classList.split(' ').includes('checked') !== Boolean(shouldBeChecked)) {
                cy.wrap($checkbox).click();
                cy.wrap($checkbox).find('div.get-app__checkbox').should(`${shouldBeChecked ? '' : 'not.'}have.class`, 'checked');
            }
        });
    });
}
describe('browse public channels', () => {
    let testUser: UserProfile;
    let otherUser: UserProfile;
    let testTeam: Team;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testUser = user;
            testTeam = team;
            cy.apiCreateUser().then(({user: user1}) => {
                otherUser = user1;
                cy.apiAddUserToTeam(testTeam.id, otherUser.id);
            });
            cy.apiLogin(testUser).then(() => {
                for (let i = 0; i < 30; i++) {
                    cy.apiCreateChannel(testTeam.id, 'public-channel', 'public-channel');
                }
                cy.visit(`/${team.name}/channels/town-square`);
            });
        });
    });
    it('MM-T1664 Channels do not disappear from Browse Channels modal', () => {
        cy.apiLogin(otherUser);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiBrowseOrCreateChannel('Browse channels');
        cy.findByRole('dialog', {name: 'Browse Channels'}).should('be.visible').then(() => {
            cy.findByText('Channel Type: All').should('be.visible').click();
            cy.findByText('Public channels').should('be.visible').click();
            ensureHideJoinedCheckboxEnabled(true);
            cy.get('#moreChannelsList').should('be.visible').children().should('have.length', 31);
            cy.get('#moreChannelsList .more-modal__row').eq(15).scrollIntoView();
            verifyNoChannelToJoinMessage(false);
            cy.get('#moreChannelsList .more-modal__row').last().scrollIntoView();
            verifyNoChannelToJoinMessage(false);
            cy.get('#moreChannelsList .more-modal__row').first().scrollIntoView();
            verifyNoChannelToJoinMessage(false);
        });
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiBrowseOrCreateChannel('Browse channels');
        cy.findByRole('dialog', {name: 'Browse Channels'}).should('be.visible').then(() => {
            cy.findByText('Channel Type: All').should('be.visible').click();
            cy.findByText('Public channels').should('be.visible').click();
            ensureHideJoinedCheckboxEnabled(true);
            verifyNoChannelToJoinMessage(true);
        });
    });
});