import {Channel} from '@mattermost/types/channels';
import {UserProfile} from '@mattermost/types/users';
import {getRandomId} from '../../../../utils';
import {
    enableElasticSearch,
    searchAndVerifyChannel,
    searchAndVerifyUser,
} from './helpers';
describe('Autocomplete with Elasticsearch - Renaming Team', () => {
    const randomId = getRandomId();
    let testUser: UserProfile;
    let testChannel: Channel;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiRequireLicenseForFeature('Elasticsearch');
        cy.apiInitSetup().then(({team, channel, user}) => {
            testUser = user;
            testChannel = channel;
            enableElasticSearch();
            cy.visit(`/${team.name}/channels/town-square`);
            searchAndVerifyUser(user);
            searchAndVerifyChannel(channel);
            cy.apiPatchTeam(team.id, {display_name: 'updatedteam' + randomId});
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('MM-T2514_1 Renaming a Team does not affect user autocomplete suggestions', () => {
        searchAndVerifyUser(testUser);
    });
    it('MM-T2514_2 Renaming a Team does not affect channel autocomplete suggestions', () => {
        cy.get('body').type('{esc}');
        searchAndVerifyChannel(testChannel);
    });
});