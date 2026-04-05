import {Channel} from '@mattermost/types/channels';
import {UserProfile} from '@mattermost/types/users';
import {getRandomId} from '../../../../utils';
import {
    enableElasticSearch,
    searchAndVerifyChannel,
    searchAndVerifyUser,
} from './helpers';
describe('Autocomplete with Elasticsearch - Renaming', () => {
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
        });
    });
    it('MM-T2512 Change is reflected in the search when renaming a user', () => {
        searchAndVerifyUser(testUser);
        cy.apiPatchUser(testUser.id, {username: `newusername-${getRandomId()}`} as UserProfile).then(({user}) => {
            searchAndVerifyUser(user);
        });
    });
    it('MM-T2513 Change is reflected in the search when renaming a channel', () => {
        searchAndVerifyChannel(testChannel);
        cy.apiPatchChannel(testChannel.id, {name: `newname-${getRandomId()}`}).then(({channel}) => {
            cy.reload();
            searchAndVerifyChannel(channel);
        });
    });
});