import {Channel} from '@mattermost/types/channels';
import {
    enableElasticSearch,
    searchAndVerifyChannel,
} from './helpers';
describe('Autocomplete with Elasticsearch - Channel', () => {
    let testChannel: Channel;
    let teamName: string;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiRequireLicenseForFeature('Elasticsearch');
        enableElasticSearch();
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            teamName = team.name;
            const name = 'hellothere';
            cy.apiCreateChannel(team.id, name, name).then(({channel}) => {
                testChannel = channel;
            });
        });
    });
    beforeEach(() => {
        cy.visit(`/${teamName}/channels/off-topic`);
    });
    it('MM-T2517_1 Channels with dot returned in autocomplete suggestions', () => {
        const name = 'hello.there';
        cy.apiPatchChannel(testChannel.id, {display_name: name});
        searchAndVerifyChannel({...testChannel, display_name: name});
    });
    it('MM-T2517_2 Channels with dash returned in autocomplete suggestions', () => {
        const name = 'hello-there';
        cy.apiPatchChannel(testChannel.id, {display_name: name});
        searchAndVerifyChannel({...testChannel, display_name: name});
    });
    it('MM-T2517_3 Channels with underscore returned in autocomplete suggestions', () => {
        const name = 'hello_there';
        cy.apiPatchChannel(testChannel.id, {display_name: name});
        searchAndVerifyChannel({...testChannel, display_name: name});
    });
    it('MM-T2517_4 Channels with dot, dash and underscore returned in autocomplete suggestions', () => {
        const name = 'he.llo-the_re';
        cy.apiPatchChannel(testChannel.id, {display_name: name});
        searchAndVerifyChannel({...testChannel, display_name: name});
    });
});