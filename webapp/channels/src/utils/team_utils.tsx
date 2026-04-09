import type {Team} from '@mattermost/types/teams';
function compareTeamsByDisplayName(locale: string, a: Team, b: Team) {
    if (a.display_name !== null) {
        if (a.display_name !== b.display_name) {
            return a.display_name.localeCompare(b.display_name, locale, {numeric: true});
        }
    }
    return a.name.localeCompare(b.name, locale, {numeric: true});
}
export function filterAndSortTeamsByDisplayName<T extends Team>(teams: T[], locale: string, teamsOrder = '') {
    if (!teams) {
        return [];
    }
    const teamsOrderList = teamsOrder.split(',');
    const customSortedTeams = teams.filter((team) => {
        if (team !== null) {
            return teamsOrderList.includes(team.id);
        }
        return false;
    }).sort((a, b) => {
        return teamsOrderList.indexOf(a.id) - teamsOrderList.indexOf(b.id);
    });
    const otherTeams = teams.filter((team) => {
        if (team !== null) {
            return !teamsOrderList.includes(team.id);
        }
        return false;
    }).sort((a, b) => {
        return compareTeamsByDisplayName(locale, a, b);
    });
    return [...customSortedTeams, ...otherTeams].filter((team) => {
        return team && (!team.delete_at as unknown as number) > 0 && team.display_name != null;
    });
}
export function makeNewTeam(displayName: string, name: string): Team {
    return {
        id: '',
        create_at: 0,
        update_at: 0,
        delete_at: 0,
        display_name: displayName,
        name,
        description: '',
        email: '',
        type: 'O',
        company_name: '',
        allowed_domains: '',
        invite_id: '',
        allow_open_invite: false,
        scheme_id: '',
        group_constrained: false,
    };
}