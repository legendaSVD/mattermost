import {
    gotoGlobalPolicy,
    editGlobalPolicyMessageRetention,
    runDataRetentionAndVerifyPostDeleted,
    verifyPostNotDeleted,
} from './helpers';
describe('Data Retention - Global and Custom Policy Only', () => {
    let testTeam;
    let testChannel;
    let users;
    let channelA;
    let channelB;
    let channelC;
    let newTeam;
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
    it('MM-T4093 - Assign Global Policy = 10 Days & Custom Policy = None to channel', () => {
        gotoGlobalPolicy();
        editGlobalPolicyMessageRetention('10', '10 days');
        cy.get('#custom_policy_table .DataGrid').within(() => {
            cy.get('.DataGrid_rows .DataGrid_empty').first().should('contain.text', 'No items found');
        });
        let testChannel2;
        cy.apiCreateChannel(testTeam.id, 'test_channel', 'testChannel2').then(({channel}) => {
            testChannel2 = channel;
        });
        const createDate = new Date().setDate(new Date().getDate() - 13);
        const createDate2 = new Date().setDate(new Date().getDate() - 7);
        cy.apiCreateToken(users).then(({token}) => {
            cy.apiPostWithCreateDate(testChannel.id, postText, token, createDate);
            cy.apiPostWithCreateDate(testChannel2.id, postText, token, createDate2);
            runDataRetentionAndVerifyPostDeleted(testTeam, testChannel, postText);
            verifyPostNotDeleted(testTeam, testChannel2, postText);
        });
    });
    it('MM-T4099 - Assign Global Policy = 10 Days & Custom Policy = 5 days to Channels', () => {
        gotoGlobalPolicy();
        editGlobalPolicyMessageRetention('10', '10 days');
        cy.uiClickCreatePolicy();
        cy.uiFillOutCustomPolicyFields('MyPolicy', 'days', '5');
        cy.uiAddTeamsToCustomPolicy([testTeam.display_name]);
        cy.uiGetButton('Save').click();
        cy.apiCreateChannel(testTeam.id, 'channel-test', 'GlobalChannel-1').then(({channel}) => {
            channelA = channel;
        });
        cy.apiCreateChannel(testTeam.id, 'channel-test', 'Custom-Channel1').then(({channel}) => {
            channelB = channel;
        });
        cy.apiCreateChannel(testTeam.id, 'channel-test', 'Global-Channel-2').then(({channel}) => {
            channelC = channel;
        });
        cy.wait('@createCustomPolicy').then((interception) => {
            const policyId = interception.response.body.id;
            cy.get('#custom_policy_table .DataGrid').within(() => {
                cy.uiVerifyCustomPolicyRow(policyId, 'MyPolicy', '5 days', '1 team, 0 channels');
            });
        });
        const createDate1 = new Date().setDate(new Date().getDate() - 7);
        const createDate2 = new Date().setDate(new Date().getDate() - 3);
        const createDate3 = new Date().setDate(new Date().getDate() - 12);
        cy.apiCreateToken(users).then(({token}) => {
            cy.apiPostWithCreateDate(testChannel.id, postText, token, createDate1);
            cy.apiPostWithCreateDate(channelA.id, postText, token, createDate2);
            cy.apiPostWithCreateDate(channelB.id, postText, token, createDate2);
            cy.apiPostWithCreateDate(channelC.id, postText, token, createDate3);
            runDataRetentionAndVerifyPostDeleted(testTeam, testChannel, postText);
            verifyPostNotDeleted(testTeam, channelA, postText);
            verifyPostNotDeleted(testTeam, channelB, postText);
            verifyPostNotDeleted(testTeam, channelC, postText, 1);
        });
    });
    it('MM-T4101 - Assign Global Policy = 5 days & Custom Policy = None to Teams', () => {
        gotoGlobalPolicy();
        editGlobalPolicyMessageRetention('5', '5 days');
        cy.get('#custom_policy_table .DataGrid').within(() => {
            cy.get('.DataGrid_rows .DataGrid_empty').first().should('contain.text', 'No items found');
        });
        let testChannel2;
        cy.apiCreateChannel(testTeam.id, 'channel-test', 'OtherChannel ').then(({channel}) => {
            testChannel2 = channel;
        });
        cy.apiCreateTeam('team', 'Team1').then(({team}) => {
            cy.apiCreateChannel(team.id, 'test_channel', 'Channel-A').then(({channel}) => {
                newTeam = team;
                channelA = channel;
            });
        });
        const createDays1 = new Date().setDate(new Date().getDate() - 7);
        const createDays2 = new Date().setDate(new Date().getDate() - 3);
        cy.apiCreateToken(users).then(({token}) => {
            cy.apiPostWithCreateDate(testChannel.id, postText, token, createDays1);
            cy.apiPostWithCreateDate(testChannel2.id, postText, token, createDays1);
            cy.apiPostWithCreateDate(channelA.id, postText, token, createDays2);
            runDataRetentionAndVerifyPostDeleted(testTeam, testChannel, postText);
            runDataRetentionAndVerifyPostDeleted(testTeam, testChannel2, postText);
            verifyPostNotDeleted(newTeam, channelA, postText);
        });
    });
    it('MM-T4103 - Assign Global Policy = 10 days & Custom Policy = 5 days to Team', () => {
        gotoGlobalPolicy();
        editGlobalPolicyMessageRetention('10', '10 days');
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
        cy.apiCreateChannel(testTeam.id, 'channel-test', 'GlobalChannel-1').then(({channel}) => {
            channelA = channel;
        });
        cy.apiCreateTeam('team', 'Team1').then(({team}) => {
            newTeam = team;
            cy.apiCreateChannel(newTeam.id, 'test_channel', 'Channel-A').then(({channel}) => {
                channelB = channel;
            });
            cy.apiCreateChannel(newTeam.id, 'channel-test', 'Global-Channel-2').then(({channel}) => {
                channelC = channel;
            });
        });
        const createDate1 = new Date().setDate(new Date().getDate() - 7);
        const createDate2 = new Date().setDate(new Date().getDate() - 3);
        const createDate3 = new Date().setDate(new Date().getDate() - 12);
        cy.apiCreateToken(users).then(({token}) => {
            cy.apiPostWithCreateDate(testChannel.id, postText, token, createDate1);
            cy.apiPostWithCreateDate(channelA.id, postText, token, createDate2);
            cy.apiPostWithCreateDate(channelB.id, postText, token, createDate1);
            cy.apiPostWithCreateDate(channelC.id, postText, token, createDate3);
            runDataRetentionAndVerifyPostDeleted(testTeam, testChannel, postText);
            verifyPostNotDeleted(testTeam, channelA, postText);
            verifyPostNotDeleted(newTeam, channelB, postText);
            verifyPostNotDeleted(newTeam, channelC, postText, 1);
        });
    });
    it('MM-T4096 - Assign Global Policy = 1 Year & Custom Policy = None to channel', () => {
        gotoGlobalPolicy();
        editGlobalPolicyMessageRetention('365', '1 year');
        cy.get('#custom_policy_table .DataGrid').within(() => {
            cy.get('.DataGrid_rows .DataGrid_empty').first().should('contain.text', 'No items found');
        });
        cy.apiCreateChannel(testTeam.id, 'channel-test', 'GlobalChannel ').then(({channel}) => {
            channelA = channel;
        });
        const createDate1 = new Date().setMonth(new Date().getMonth() - 14);
        const createDate2 = new Date().setMonth(new Date().getMonth() - 10);
        cy.apiCreateToken(users).then(({token}) => {
            cy.apiPostWithCreateDate(testChannel.id, postText, token, createDate1);
            cy.apiPostWithCreateDate(channelA.id, postText, token, createDate2);
            runDataRetentionAndVerifyPostDeleted(testTeam, testChannel, postText);
            verifyPostNotDeleted(testTeam, channelA, postText);
        });
    });
});