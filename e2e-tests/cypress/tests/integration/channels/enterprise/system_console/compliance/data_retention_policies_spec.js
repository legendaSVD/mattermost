import * as TIMEOUTS from '../../../../../fixtures/timeouts';
describe('Data Retention', () => {
    let testTeam;
    let testChannel;
    before(() => {
        cy.apiRequireLicenseForFeature('DataRetention');
        cy.apiInitSetup().then(({team, channel}) => {
            testTeam = team;
            testChannel = channel;
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
    describe('Custom policy creation', () => {
        it('MM-T4005 - Create custom policy', () => {
            cy.uiClickCreatePolicy();
            cy.uiFillOutCustomPolicyFields('Policy 1', 'days', '60');
            cy.uiAddTeamsToCustomPolicy([testTeam.display_name]);
            cy.uiAddRandomChannelToCustomPolicy(1);
            cy.uiGetButton('Save').click();
            cy.get('#custom_policy_table .DataGrid').should('be.visible');
            cy.wait('@createCustomPolicy').then((interception) => {
                cy.uiVerifyPolicyResponse(interception.response.body, 1, 1, 60, 'Policy 1');
                cy.get('#custom_policy_table .DataGrid').within(() => {
                    cy.uiVerifyCustomPolicyRow(interception.response.body.id, 'Policy 1', '60 days', '1 team, 1 channel');
                });
            });
        });
        it('MM-T4006 - Policies count', () => {
            cy.uiClickCreatePolicy();
            cy.uiFillOutCustomPolicyFields('Policy 1', 'days', '60');
            cy.uiAddRandomChannelToCustomPolicy();
            cy.uiGetButton('Save').click();
            cy.uiClickCreatePolicy();
            cy.uiFillOutCustomPolicyFields('Policy 2', 'days', '160');
            cy.uiAddRandomChannelToCustomPolicy();
            cy.uiGetButton('Save').click();
            cy.uiClickCreatePolicy();
            cy.uiFillOutCustomPolicyFields('Policy 3', 'days', '100');
            cy.uiAddRandomChannelToCustomPolicy();
            cy.uiGetButton('Save').click();
            cy.findByText('1 - 3 of 3').scrollIntoView().should('be.visible');
            cy.apiGetCustomRetentionPolicies().then((result) => {
                expect(result.body.total_count).to.equal(3);
            });
        });
        it('MM-T4007 - show policy', () => {
            cy.uiClickCreatePolicy();
            cy.uiFillOutCustomPolicyFields('Policy 1', 'days', '60');
            cy.uiAddTeamsToCustomPolicy([testTeam.display_name]);
            cy.uiAddRandomChannelToCustomPolicy(1);
            cy.uiGetButton('Save').click();
            cy.findByText('1 - 1 of 1').scrollIntoView().should('be.visible');
        });
        it('MM-T4008 - Update custom policy', () => {
            cy.uiClickCreatePolicy();
            cy.uiFillOutCustomPolicyFields('Policy 2', 'years', '2');
            cy.uiAddRandomTeamToCustomPolicy();
            cy.uiGetButton('Save').click();
            cy.get('#custom_policy_table .DataGrid').should('be.visible');
            cy.wait('@createCustomPolicy').then((interception) => {
                cy.uiVerifyPolicyResponse(interception.response.body, 1, 0, 730, 'Policy 2');
                const policyId = interception.response.body.id;
                cy.get('#custom_policy_table .DataGrid').within(() => {
                    cy.uiVerifyCustomPolicyRow(policyId, 'Policy 2', '2 years', '1 team, 0 channels');
                    cy.uiClickEditCustomPolicyRow(policyId);
                });
                cy.get('.DataRetentionSettings .admin-console__header', {timeout: TIMEOUTS.TWO_MIN}).should('be.visible').invoke('text').should('include', 'Custom Retention Policy');
                cy.get('.PolicyTeamsList .DataGrid').within(() => {
                    cy.findByRole('link', {name: 'Remove'}).should('be.visible').click();
                });
                cy.uiAddRandomChannelToCustomPolicy();
                cy.uiGetButton('Save').click();
                cy.get('#custom_policy_table .DataGrid').should('be.visible');
                cy.get('#custom_policy_table .DataGrid').within(() => {
                    cy.uiVerifyCustomPolicyRow(policyId, 'Policy 2', '2 years', '0 teams, 1 channel');
                });
                cy.apiGetCustomRetentionPolicy(policyId).then((result) => {
                    expect(result.body.team_count).to.equal(0);
                    expect(result.body.channel_count).to.equal(1);
                    expect(result.body.post_duration).to.equal(730);
                    expect(result.body.display_name).to.equal('Policy 2');
                });
            });
        });
        it('MM-T4009 - Delete a custom policy', () => {
            cy.uiClickCreatePolicy();
            cy.uiGetTextbox('Policy name').clear().type('Policy 3');
            cy.uiAddRandomChannelToCustomPolicy();
            cy.uiGetButton('Save').click();
            cy.get('#custom_policy_table .DataGrid').should('be.visible');
            cy.wait('@createCustomPolicy').then((interception) => {
                cy.uiVerifyPolicyResponse(interception.response.body, 0, 1, -1, 'Policy 3');
                const policyId = interception.response.body.id;
                cy.get('#custom_policy_table .DataGrid').within(() => {
                    cy.uiVerifyCustomPolicyRow(policyId, 'Policy 3', 'Keep forever', '0 teams, 1 channel');
                    cy.get(`#customWrapper-${policyId}`).trigger('mouseover').click();
                    cy.findByRole('button', {name: 'Delete'}).should('be.visible').click();
                    cy.wait(TIMEOUTS.ONE_SEC);
                    cy.get(`#customDescription-${policyId}`).should('not.exist');
                });
            });
        });
    });
    describe('Teams in a custom Policy', () => {
        it('MM-T4010 - Show policy teams information', () => {
            cy.uiClickCreatePolicy();
            cy.uiFillOutCustomPolicyFields('Policy 1', 'years', '2');
            cy.uiAddTeamsToCustomPolicy([testTeam.display_name]);
            cy.uiGetButton('Save').click();
            cy.wait('@createCustomPolicy').then((interception) => {
                cy.uiVerifyPolicyResponse(interception.response.body, 1, 0, 730, 'Policy 1');
                const policyId = interception.response.body.id;
                cy.uiVerifyCustomPolicyRow(policyId, 'Policy 1', '2 years', '1 team, 0 channels');
                cy.get('#custom_policy_table .DataGrid').within(() => {
                    cy.uiClickEditCustomPolicyRow(policyId);
                });
                cy.get('.DataRetentionSettings .admin-console__header', {timeout: TIMEOUTS.TWO_MIN}).should('be.visible').invoke('text').should('include', 'Custom Retention Policy');
                cy.get('.PolicyTeamsList .DataGrid').within(() => {
                    cy.get(`#team-name-${testTeam.id}`).should('be.visible');
                });
                cy.apiGetCustomRetentionPolicyTeams(policyId).then((result) => {
                    expect(result.body.teams[0].id).to.equal(testTeam.id);
                });
            });
        });
        it('MM-T4012 - Search teams in policy', () => {
            cy.uiClickCreatePolicy();
            cy.uiFillOutCustomPolicyFields('Policy 1', 'years', '2');
            cy.uiAddTeamsToCustomPolicy([testTeam.display_name]);
            cy.uiAddRandomTeamToCustomPolicy();
            cy.uiGetButton('Save').click();
            cy.wait('@createCustomPolicy').then((interception) => {
                cy.uiVerifyPolicyResponse(interception.response.body, 2, 0, 730, 'Policy 1');
                const policyId = interception.response.body.id;
                cy.uiVerifyCustomPolicyRow(policyId, 'Policy 1', '2 years', '2 teams, 0 channels');
                cy.get('#custom_policy_table .DataGrid').within(() => {
                    cy.uiClickEditCustomPolicyRow(policyId);
                });
                cy.get('.DataRetentionSettings .admin-console__header', {timeout: TIMEOUTS.TWO_MIN}).should('be.visible').invoke('text').should('include', 'Custom Retention Policy');
                cy.get('.PolicyTeamsList .DataGrid').within(() => {
                    cy.findByRole('textbox').should('be.visible').clear().type(testTeam.name);
                    cy.wait(TIMEOUTS.ONE_SEC);
                    cy.get(`#team-name-${testTeam.id}`).should('be.visible').invoke('text').should('include', testTeam.display_name);
                });
                cy.apiSearchCustomRetentionPolicyTeams(policyId, testTeam.display_name).then((result) => {
                    expect(result.body[0].id).to.equal(testTeam.id);
                });
            });
        });
        it('MM-T4018 - Number of teams in policy', () => {
            cy.uiClickCreatePolicy();
            cy.uiFillOutCustomPolicyFields('Policy 1', 'years', '2');
            cy.uiAddTeamsToCustomPolicy([testTeam.display_name]);
            cy.uiAddRandomTeamToCustomPolicy(2);
            cy.uiGetButton('Save').click();
            cy.wait('@createCustomPolicy').then((interception) => {
                cy.uiVerifyPolicyResponse(interception.response.body, 3, 0, 730, 'Policy 1');
                const policyId = interception.response.body.id;
                cy.uiVerifyCustomPolicyRow(policyId, 'Policy 1', '2 years', '3 teams, 0 channels');
                cy.get('#custom_policy_table .DataGrid').within(() => {
                    cy.uiClickEditCustomPolicyRow(policyId);
                });
                cy.get('.DataRetentionSettings .admin-console__header', {timeout: TIMEOUTS.TWO_MIN}).should('be.visible').invoke('text').should('include', 'Custom Retention Policy');
                cy.get('.PolicyTeamsList .DataGrid').within(() => {
                    cy.findByText('1 - 3 of 3').scrollIntoView().should('be.visible');
                });
                cy.apiGetCustomRetentionPolicyTeams(policyId).then((result) => {
                    expect(result.body.teams.length).to.equal(3);
                });
            });
        });
        it('MM-T4011 - Add team in policy', () => {
            cy.uiClickCreatePolicy();
            cy.uiFillOutCustomPolicyFields('MyPolicy', 'days', '60');
            cy.uiAddTeamsToCustomPolicy([testTeam.display_name]);
            cy.uiGetButton('Save').click();
            cy.get('#custom_policy_table .DataGrid').within(() => {
                cy.get('.DataGrid_rows .DataGrid_cell').first().should('contain.text', 'MyPolicy').click();
            });
            cy.get('.DataGrid_row .DataGrid_cell').first().should('contain', testTeam.display_name);
        });
    });
    describe('Channels in a custom Policy', () => {
        it('MM-T4017 - Total channels in policy', () => {
            cy.uiClickCreatePolicy();
            cy.uiFillOutCustomPolicyFields('Policy 1', 'years', '2');
            cy.uiAddChannelsToCustomPolicy([testChannel.display_name]);
            cy.uiAddRandomChannelToCustomPolicy(2);
            cy.uiGetButton('Save').click();
            cy.wait('@createCustomPolicy').then((interception) => {
                cy.uiVerifyPolicyResponse(interception.response.body, 0, 3, 730, 'Policy 1');
                const policyId = interception.response.body.id;
                cy.uiVerifyCustomPolicyRow(policyId, 'Policy 1', '2 years', '0 teams, 3 channels');
                cy.get('#custom_policy_table .DataGrid').within(() => {
                    cy.uiClickEditCustomPolicyRow(policyId);
                });
                cy.get('.DataRetentionSettings .admin-console__header', {timeout: TIMEOUTS.TWO_MIN}).should('be.visible').invoke('text').should('include', 'Custom Retention Policy');
                cy.get('.PolicyChannelsList .DataGrid').within(() => {
                    cy.findByText('1 - 3 of 3').scrollIntoView().should('be.visible');
                });
                cy.apiGetCustomRetentionPolicyChannels(policyId).then((result) => {
                    expect(result.body.channels.length).to.equal(3);
                });
            });
        });
        it('MM-T4014 - Add channel in policy', () => {
            cy.uiClickCreatePolicy();
            cy.uiFillOutCustomPolicyFields('Policy 1', 'years', '2');
            cy.uiAddChannelsToCustomPolicy([testChannel.display_name]);
            cy.uiGetButton('Save').click();
            cy.wait('@createCustomPolicy').then((interception) => {
                cy.uiVerifyPolicyResponse(interception.response.body, 0, 1, 730, 'Policy 1');
                const policyId = interception.response.body.id;
                cy.uiVerifyCustomPolicyRow(policyId, 'Policy 1', '2 years', '0 teams, 1 channel');
                cy.apiGetCustomRetentionPolicyChannels(policyId).then((result) => {
                    expect(result.body.channels[0].id).to.equal(testChannel.id);
                });
            });
        });
        it('MM-T4015 - Delete channel in policy', () => {
            cy.uiClickCreatePolicy();
            cy.uiFillOutCustomPolicyFields('Policy 1', 'years', '1');
            cy.uiAddChannelsToCustomPolicy([testChannel.display_name]);
            cy.uiAddRandomChannelToCustomPolicy(2);
            cy.uiGetButton('Save').click();
            cy.wait('@createCustomPolicy').then((interception) => {
                cy.uiVerifyPolicyResponse(interception.response.body, 0, 3, 365, 'Policy 1');
                const policyId = interception.response.body.id;
                cy.uiVerifyCustomPolicyRow(policyId, 'Policy 1', '1 year', '0 teams, 3 channels');
                cy.get('#custom_policy_table .DataGrid').within(() => {
                    cy.uiClickEditCustomPolicyRow(policyId);
                });
                cy.get('.DataRetentionSettings .admin-console__header', {timeout: TIMEOUTS.TWO_MIN}).should('be.visible').invoke('text').should('include', 'Custom Retention Policy');
                cy.get('.PolicyChannelsList .DataGrid').within(() => {
                    cy.findAllByRole('link', {name: 'Remove'}).first().should('exist').click();
                });
                cy.uiGetButton('Save').click();
                cy.uiVerifyCustomPolicyRow(policyId, 'Policy 1', '1 year', '0 teams, 2 channels');
                cy.apiGetCustomRetentionPolicyChannels(policyId).then((result) => {
                    expect(result.body.channels.length).to.equal(2);
                });
            });
        });
        it('MM-T4016 - Search channels in policy', () => {
            cy.uiClickCreatePolicy();
            cy.uiFillOutCustomPolicyFields('Policy 1', 'years', '2');
            cy.uiAddChannelsToCustomPolicy([testChannel.display_name]);
            cy.uiAddRandomChannelToCustomPolicy();
            cy.uiGetButton('Save').click();
            cy.wait('@createCustomPolicy').then((interception) => {
                cy.uiVerifyPolicyResponse(interception.response.body, 0, 2, 730, 'Policy 1');
                const policyId = interception.response.body.id;
                cy.uiVerifyCustomPolicyRow(policyId, 'Policy 1', '2 years', '0 teams, 2 channels');
                cy.get('#custom_policy_table .DataGrid').within(() => {
                    cy.uiClickEditCustomPolicyRow(policyId);
                });
                cy.get('.DataRetentionSettings .admin-console__header', {timeout: TIMEOUTS.TWO_MIN}).should('be.visible').invoke('text').should('include', 'Custom Retention Policy');
                cy.get('.DataRetentionSettings .admin-console__wrapper').scrollTo('bottom');
                cy.get('.PolicyChannelsList .DataGrid').within(() => {
                    cy.findByRole('textbox').should('be.visible').clear().type(testChannel.name);
                    cy.wait(TIMEOUTS.ONE_SEC);
                    cy.get(`#channel-name-${testChannel.id}`).should('be.visible').invoke('text').should('include', testChannel.display_name);
                });
                cy.apiSearchCustomRetentionPolicyChannels(policyId, testChannel.display_name).then((result) => {
                    expect(result.body[0].id).to.equal(testChannel.id);
                });
            });
        });
    });
});