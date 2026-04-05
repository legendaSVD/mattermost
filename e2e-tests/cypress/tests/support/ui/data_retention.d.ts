declare namespace Cypress {
    interface Chainable {
        uiGoToDataRetentionPage(): Chainable;
        uiClickCreatePolicy(): Chainable;
        uiFillOutCustomPolicyFields(name: string, durationDropdown: string, durationText?: string): Chainable;
        uiAddTeamsToCustomPolicy(teamNames: string[]): Chainable;
        uiAddChannelsToCustomPolicy(channelNames: string[]): Chainable;
        uiAddRandomTeamToCustomPolicy(numberOfTeams?: number): Chainable;
        uiAddRandomChannelToCustomPolicy(numberOfChannels?: number): Chainable;
        uiVerifyCustomPolicyRow(policyId: string, description: string, duration: string, appliedTo: string): Chainable;
        uiClickEditCustomPolicyRow(policyId: string): Chainable;
        uiVerifyPolicyResponse(body, teamCount: number, channelCount: number, duration: number, displayName: string): Chainable;
    }
}