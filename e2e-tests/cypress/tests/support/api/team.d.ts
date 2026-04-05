declare namespace Cypress {
    interface Chainable {
        apiCreateTeam(name: string, displayName: string, type?: string, unique?: boolean, options?: Partial<Team>): Chainable<{team: Team}>;
        apiDeleteTeam(teamId: string, permanent?: boolean): Chainable<Record<string, any>>;
        apiDeleteUserFromTeam(teamId: string, userId: string): Chainable<Record<string, any>>;
        apiPatchTeam(teamId: string, patch: Partial<Team>): Chainable<Team>;
        apiGetTeamByName(name: string): Chainable<Team>;
        apiGetAllTeams(queryParams?: Record<string, any>): Chainable<{teams: Team[]}>;
        apiGetTeamsForUser(userId: string): Chainable<Team[]>;
        apiAddUserToTeam(teamId: string, userId: string): Chainable<TeamMembership>;
        apiGetTeamMembers(teamId: string): Chainable<TeamMembership[]>;
        apiAddUsersToTeam(teamId: string, teamMembers: TeamMembership[]): Chainable<TeamMembership[]>;
        apiUpdateTeamMemberSchemeRole(teamId: string, userId: string, schemeRoles: Record<string, any>): Chainable<Record<string, any>>;
    }
}