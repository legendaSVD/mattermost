import {
    createPrivateChannel,
    searchForChannel,
} from '../enterprise/elasticsearch_autocomplete/helpers';
import {getAdminAccount} from '../../../support/env';
describe('Autocomplete without Elasticsearch - Channel', () => {
    const admin = getAdminAccount();
    let testTeam;
    let testUser;
    let offTopicUrl;
    before(() => {
        cy.apiGetClientLicense().then(({isCloudLicensed}) => {
            if (!isCloudLicensed) {
                cy.shouldHaveElasticsearchDisabled();
            }
        });
        cy.apiInitSetup({loginAfter: true}).then((out) => {
            testUser = out.user;
            testTeam = out.team;
            offTopicUrl = out.offTopicUrl;
            cy.visit(offTopicUrl);
        });
    });
    afterEach(() => {
        cy.reload();
    });
    it("private channel I don't belong to does not appear", () => {
        createPrivateChannel(testTeam.id).then((channel) => {
            cy.uiGetLhsSection('CHANNELS').findAllByText('Off-Topic').click();
            searchForChannel(channel.name);
            cy.findByTestId(channel.name).
                should('not.exist');
        });
    });
    it('private channel I do belong to appears', () => {
        cy.uiGetLhsSection('CHANNELS').findAllByText('Off-Topic').click();
        createPrivateChannel(testTeam.id, testUser).then((channel) => {
            searchForChannel(channel.name);
            cy.get('#suggestionList').should('be.visible');
            cy.findByTestId(channel.name).
                should('be.visible');
        });
    });
    it('channel outside of team does not appear', () => {
        const teamName = 'elastic-private-' + Date.now();
        const baseUrl = Cypress.config('baseUrl');
        cy.task('externalRequest', {
            user: admin,
            path: 'teams',
            baseUrl,
            method: 'post',
            data: {
                name: teamName,
                display_name: teamName,
                type: 'O',
            },
        }).then((teamResponse) => {
            expect(teamResponse.status).to.equal(201);
            createPrivateChannel(teamResponse.data.id).then((channel) => {
                cy.uiGetLhsSection('CHANNELS').findAllByText('Off-Topic').click();
                searchForChannel(channel.name);
                cy.findByTestId(channel.name).
                    should('not.exist');
            });
        });
    });
    describe('channel with', () => {
        let channelId;
        before(() => {
            cy.visit(offTopicUrl);
            const name = 'hellothere';
            cy.apiCreateChannel(testTeam.id, name, name).then(({channel}) => {
                channelId = channel.id;
            });
            searchForChannel(name);
            cy.reload();
        });
        it('dots appears', () => {
            const name = 'hello.there';
            cy.apiPatchChannel(channelId, {display_name: name});
            searchForChannel(name);
        });
        it('dashes appears', () => {
            const name = 'hello-there';
            cy.apiPatchChannel(channelId, {display_name: name});
            searchForChannel(name);
        });
        it('underscores appears', () => {
            const name = 'hello_there';
            cy.apiPatchChannel(channelId, {display_name: name});
            searchForChannel(name);
        });
        it('dots, dashes, and underscores appears', () => {
            const name = 'he.llo-the_re';
            cy.apiPatchChannel(channelId, {display_name: name});
            searchForChannel(name);
        });
    });
});