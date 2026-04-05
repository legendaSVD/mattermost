import {
    runDataRetentionAndVerifyPostDeleted,
    gotoGlobalPolicy,
    editGlobalPolicyMessageRetention,
} from './helpers';
describe('Data Retention - Global and Custom Policy', () => {
    let testTeam;
    let testChannel;
    let users;
    const postText = 'This is testing';
    before(() => {
        cy.apiRequireLicenseForFeature('DataRetention');
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableUserAccessTokens: true,
            },
        });
        cy.apiInitSetup().then(({team, channel, user}) => {
            testTeam = team;
            testChannel = channel;
            users = user.id;
        });
    });
    beforeEach(() => {
        cy.apiDeleteAllCustomRetentionPolicies();
        cy.intercept({
            method: 'POST',
            url: '/api/v4/data_retention/policies',
        }).as('createCustomPolicy');
        cy.uiGoToDataRetentionPage();
    });
    it('MM-T4100 - Assign Global Policy = 5 days & Custom Policy = 10 days to channels', () => {
        let newChannel;
        let newTeam;
        gotoGlobalPolicy();
        editGlobalPolicyMessageRetention('5', '5 days');
        cy.apiCreateTeam('team', 'Team1').then(({team}) => {
            cy.apiCreateChannel(team.id, 'test_channel', 'Channel-A').then(({channel}) => {
                newChannel = channel;
                newTeam = team;
            });
        });
        cy.uiClickCreatePolicy();
        cy.uiFillOutCustomPolicyFields('MyPolicy', 'days', '10');
        cy.uiAddChannelsToCustomPolicy([testChannel.display_name]);
        cy.uiGetButton('Save').click();
        cy.wait('@createCustomPolicy').then((interception) => {
            const policyId = interception.response.body.id;
            cy.get('#custom_policy_table .DataGrid').within(() => {
                cy.uiVerifyCustomPolicyRow(policyId, 'MyPolicy', '10 days', '0 teams, 1 channel');
            });
        });
        const createDate = new Date().setDate(new Date().getDate() - 7);
        cy.apiCreateToken(users).then(({token}) => {
            cy.apiPostWithCreateDate(newChannel.id, postText, token, createDate);
            cy.apiPostWithCreateDate(testChannel.id, postText, token, createDate);
            runDataRetentionAndVerifyPostDeleted(newTeam, newChannel, postText);
            cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
            cy.findAllByTestId('postView').should('have.length', 2);
            cy.findAllByTestId('postView').should('contain', postText);
        });
    });
});