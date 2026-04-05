import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import {getAdminAccount} from '../../../../support/env';
import {
    createPrivateChannel,
    createPublicChannel,
    enableElasticSearch,
    searchAndVerifyChannel,
} from './helpers';
describe('Autocomplete with Elasticsearch - Channel', () => {
    let testTeam: Team;
    let testUser: UserProfile;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiRequireLicenseForFeature('Elasticsearch');
        enableElasticSearch();
        cy.apiInitSetup({loginAfter: true}).then(({team, user}) => {
            testUser = user;
            testTeam = team;
        });
    });
    beforeEach(() => {
        cy.visit(`/${testTeam.name}/channels/town-square`);
    });
    it('MM-T2510_1 Private channel I do belong to appears', () => {
        createPrivateChannel(testTeam.id, testUser).then((channel) => {
            cy.uiGetLhsSection('CHANNELS').findByText('Off-Topic').click();
            searchAndVerifyChannel(channel);
        });
    });
    it("MM-T2510_2 Private channel I don't belong to does not appear", () => {
        createPrivateChannel(testTeam.id).then((channel) => {
            cy.uiGetLhsSection('CHANNELS').findByText('Off-Topic').click();
            searchAndVerifyChannel(channel, false);
        });
    });
    it('MM-T2510_3 Private channel left does not appear', () => {
        createPrivateChannel(testTeam.id, testUser).then((channel) => {
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.uiOpenChannelMenu('Leave Channel');
            cy.findByRoleExtended('button', {name: 'Yes, leave channel'}).should('be.visible').click();
            cy.uiGetLhsSection('CHANNELS').findByText('Off-Topic').click();
            searchAndVerifyChannel(channel, false);
        });
    });
    it('MM-T2510_4 Channel outside of team does not appear', () => {
        const teamName = 'elastic-private-' + Date.now();
        cy.externalRequest({
            user: getAdminAccount(),
            path: 'teams',
            method: 'post',
            data: {
                name: teamName,
                display_name: teamName,
                type: 'O',
            },
        }).then(({data: team}) => {
            createPrivateChannel(team.id).then((channel) => {
                cy.uiGetLhsSection('CHANNELS').findByText('Off-Topic').click();
                searchAndVerifyChannel(channel, false);
                cy.uiClose();
            });
            return cy.wrap({team});
        }).then(({team}) => {
            createPublicChannel(team.id).then((publicChannel) => {
                cy.uiGetLhsSection('CHANNELS').findByText('Off-Topic').click();
                searchAndVerifyChannel(publicChannel, false);
            });
        });
    });
});