import {ChainableT} from '../../types';
interface SetupResult {
    user: Cypress.UserProfile;
    team: Cypress.Team;
    channel: Cypress.Channel;
    channelUrl: string;
    offTopicUrl: string;
    townSquareUrl: string;
}
interface SetupParam {
    loginAfter?: boolean;
    promoteNewUserAsAdmin?: boolean;
    hideAdminTrialModal?: boolean;
    userPrefix?: string;
    userCreateAt?: number;
    teamPrefix?: {name: string; displayName: string};
    channelPrefix?: {name: string; displayName: string};
    skipBoardsWelcomePage?: boolean;
}
function apiInitSetup(arg: SetupParam = {}): ChainableT<SetupResult> {
    const {
        loginAfter = false,
        promoteNewUserAsAdmin = false,
        hideAdminTrialModal = true,
        userPrefix,
        userCreateAt,
        teamPrefix = {name: 'team', displayName: 'Team'},
        channelPrefix = {name: 'channel', displayName: 'Channel'},
        skipBoardsWelcomePage = true,
    } = arg;
    return (cy.apiCreateTeam(teamPrefix.name, teamPrefix.displayName) as any).then(({team}) => {
        return (cy.apiCreateChannel(team.id, channelPrefix.name, channelPrefix.displayName) as any).then(({channel}) => {
            return (cy.apiCreateUser({prefix: userPrefix || (promoteNewUserAsAdmin ? 'admin' : 'user'), createAt: userCreateAt}) as any).then(({user}) => {
                if (promoteNewUserAsAdmin) {
                    (cy as any).apiPatchUserRoles(user.id, ['system_admin', 'system_user']);
                    cy.apiSaveStartTrialModal(user.id, hideAdminTrialModal.toString());
                }
                if (skipBoardsWelcomePage) {
                    cy.apiBoardsWelcomePageViewed(user.id);
                }
                return cy.apiAddUserToTeam(team.id, user.id).then(() => {
                    return cy.apiAddUserToChannel(channel.id, user.id).then(() => {
                        const getUrl = (channelName: string) => `/${team.name}/channels/${channelName}`;
                        const data = {
                            channel,
                            team,
                            user,
                            channelUrl: getUrl(channel.name),
                            offTopicUrl: getUrl('off-topic'),
                            townSquareUrl: getUrl('town-square'),
                        };
                        if (loginAfter) {
                            return cy.apiLogin(user).then(() => {
                                return cy.wrap(data);
                            });
                        }
                        return cy.wrap(data);
                    });
                });
            });
        });
    });
}
Cypress.Commands.add('apiInitSetup', apiInitSetup);
declare global {
    namespace Cypress {
        interface Chainable {
            apiInitSetup: typeof apiInitSetup;
        }
    }
}