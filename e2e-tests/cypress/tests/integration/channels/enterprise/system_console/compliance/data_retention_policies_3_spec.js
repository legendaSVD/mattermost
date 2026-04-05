import {
    runDataRetentionAndVerifyPostDeleted,
    gotoGlobalPolicy,
    editGlobalPolicyMessageRetention,
    verifyPostNotDeleted,
} from './helpers';
describe('Data Retention - Custom Policy Only', () => {
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
    it('MM-T4097 - Assign Global Policy = Forever & Custom Policy = 10 days to Channel', () => {
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
        let channelB;
        cy.apiCreateChannel(testTeam.id, 'test_channel', 'channelB').then(({channel}) => {
            channelB = channel;
        });
        const createDate = new Date().setDate(new Date().getDate() - 12);
        cy.apiCreateToken(users).then(({token}) => {
            cy.apiPostWithCreateDate(testChannel.id, postText, token, createDate);
            cy.apiPostWithCreateDate(channelB.id, postText, token, createDate);
            runDataRetentionAndVerifyPostDeleted(testTeam, testChannel, postText);
            verifyPostNotDeleted(testTeam, channelB, postText);
        });
    });
    it('MM-T4098 - Assign Global Policy = Forever & Custom Policy = 1 year to Channels', () => {
        cy.uiClickCreatePolicy();
        cy.uiFillOutCustomPolicyFields('MyPolicy', 'days', '365');
        cy.uiAddChannelsToCustomPolicy([testChannel.display_name]);
        cy.uiGetButton('Save').click();
        cy.wait('@createCustomPolicy').then((interception) => {
            const policyId = interception.response.body.id;
            cy.get('#custom_policy_table .DataGrid').within(() => {
                cy.uiVerifyCustomPolicyRow(policyId, 'MyPolicy', '1 year', '0 teams, 1 channel');
            });
        });
        let channelB;
        cy.apiCreateChannel(testTeam.id, 'test_channel', ' channelB').then(({channel}) => {
            channelB = channel;
        });
        const createDate = new Date().setMonth(new Date().getMonth() - 14);
        cy.apiCreateToken(users).then(({token}) => {
            cy.apiPostWithCreateDate(testChannel.id, postText, token, createDate);
            cy.apiPostWithCreateDate(channelB.id, postText, token, createDate);
            runDataRetentionAndVerifyPostDeleted(testTeam, testChannel, postText);
            verifyPostNotDeleted(testTeam, channelB, postText);
        });
    });
    it('MM-T4105 - Assign Global Policy = Forever & Custom Policy = 1 year to Teams', () => {
        cy.uiClickCreatePolicy();
        cy.uiFillOutCustomPolicyFields('MyPolicy', 'days', '365');
        cy.uiAddTeamsToCustomPolicy([testTeam.display_name]);
        cy.uiGetButton('Save').click();
        cy.wait('@createCustomPolicy').then((interception) => {
            const policyId = interception.response.body.id;
            cy.get('#custom_policy_table .DataGrid').within(() => {
                cy.uiVerifyCustomPolicyRow(policyId, 'MyPolicy', '1 year', '1 team, 0 channels');
            });
        });
        let newTeam;
        let channelB;
        cy.apiCreateTeam('team', 'Team1').then(({team}) => {
            cy.apiCreateChannel(team.id, 'test_channel', 'channelB').then(({channel}) => {
                newTeam = team;
                channelB = channel;
            });
        });
        const createDate = new Date().setMonth(new Date().getMonth() - 14);
        cy.apiCreateToken(users).then(({token}) => {
            cy.apiPostWithCreateDate(testChannel.id, postText, token, createDate);
            cy.apiPostWithCreateDate(channelB.id, postText, token, createDate);
            runDataRetentionAndVerifyPostDeleted(testTeam, testChannel, postText);
            verifyPostNotDeleted(newTeam, channelB, postText);
        });
    });
    it('MM-T4102 - Assign Global Policy = Forever & Custom Policy = 30 days to Teams', () => {
        cy.uiClickCreatePolicy();
        cy.uiFillOutCustomPolicyFields('MyPolicy', 'days', '30');
        cy.uiAddTeamsToCustomPolicy([testTeam.display_name]);
        cy.uiGetButton('Save').click();
        cy.wait('@createCustomPolicy').then((interception) => {
            const policyId = interception.response.body.id;
            cy.get('#custom_policy_table .DataGrid').within(() => {
                cy.uiVerifyCustomPolicyRow(policyId, 'MyPolicy', '30 days', '1 team, 0 channels');
            });
        });
        let channelB;
        let newTeam;
        cy.apiCreateTeam('team', 'Team1').then(({team}) => {
            cy.apiCreateChannel(team.id, 'test_channel', 'channelB').then(({channel}) => {
                channelB = channel;
                newTeam = team;
            });
        });
        const createDate = new Date().setDate(new Date().getDate() - 32);
        cy.apiCreateToken(users).then(({token}) => {
            cy.apiPostWithCreateDate(testChannel.id, postText, token, createDate);
            cy.apiPostWithCreateDate(channelB.id, postText, token, createDate);
            runDataRetentionAndVerifyPostDeleted(testTeam, testChannel, postText);
            verifyPostNotDeleted(newTeam, channelB, postText);
        });
    });
    it('MM-T4104 - Assign Global policy = Forever & Custom Policy = 5 and 10 days to Teams', () => {
        let testChannel2;
        cy.apiCreateChannel(testTeam.id, 'test_channel', 'TestChannel2').then(({channel}) => {
            testChannel2 = channel;
        });
        cy.uiClickCreatePolicy();
        cy.uiFillOutCustomPolicyFields('MyPolicy', 'days', '5');
        cy.uiAddTeamsToCustomPolicy([testTeam.display_name]);
        cy.uiGetButton('Save').click();
        cy.wait('@createCustomPolicy').then((interception) => {
            const policyId = interception.response.body.id;
            cy.get('#custom_policy_table .DataGrid').within(() => {
                cy.uiVerifyCustomPolicyRow(policyId, 'MyPolicy', '5 days', '1 team, 0 channels');
            });
        });
        let newTeam;
        let channelA;
        let channelB;
        cy.apiCreateTeam('team', 'Team1').then(({team}) => {
            newTeam = team;
            cy.apiCreateChannel(team.id, 'test_channel', 'test_channelC').then(({channel}) => {
                channelB = channel;
            });
            cy.apiCreateChannel(team.id, 'test_channel', 'Channel-A').then(({channel}) => {
                channelA = channel;
                cy.uiClickCreatePolicy();
                cy.uiFillOutCustomPolicyFields('MyPolicy1', 'days', '10');
                cy.uiAddTeamsToCustomPolicy([newTeam.display_name]);
                cy.uiGetButton('Save').click();
                cy.wait('@createCustomPolicy').then((interception) => {
                    const policyId = interception.response.body.id;
                    cy.get('#custom_policy_table .DataGrid').within(() => {
                        cy.uiVerifyCustomPolicyRow(policyId, 'MyPolicy1', '10 days', '1 team, 0 channels');
                    });
                });
            });
        });
        const createDate1 = new Date().setDate(new Date().getDate() - 7);
        const createDate2 = new Date().setDate(new Date().getDate() - 3);
        const createDate3 = new Date().setDate(new Date().getDate() - 12);
        cy.apiCreateToken(users).then(({token}) => {
            cy.apiPostWithCreateDate(testChannel.id, postText, token, createDate1);
            cy.apiPostWithCreateDate(testChannel2.id, postText, token, createDate2);
            cy.apiPostWithCreateDate(channelA.id, postText, token, createDate3);
            cy.apiPostWithCreateDate(channelB.id, postText, token, createDate2);
            runDataRetentionAndVerifyPostDeleted(testTeam, testChannel, postText);
            verifyPostNotDeleted(testTeam, testChannel2, postText);
            cy.visit(`/${newTeam.name}/channels/${channelA.name}`);
            cy.findAllByTestId('postView').should('have.length', 1);
            cy.findAllByTestId('postView').should('not.contain', postText);
            verifyPostNotDeleted(newTeam, channelB, postText);
        });
    });
    it('MM-T4019 - Global Data Retention policy', () => {
        [
            {input: '365', result: '1 year'},
            {input: '700', result: '700 days'},
            {input: '730', result: '2 years'},
            {input: '600', result: '600 days'},
        ].forEach(({input, result}) => {
            gotoGlobalPolicy();
            editGlobalPolicyMessageRetention(input, result);
        });
    });
});