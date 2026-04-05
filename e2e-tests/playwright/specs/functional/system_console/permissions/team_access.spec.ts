import {UserProfile} from '@mattermost/types/users';
import {expect, PlaywrightExtended, SystemConsolePage, test} from '@mattermost/playwright-lib';
test(
    'MM-63378 System Manager without team access permissions cannot view team details',
    {tag: ['@smoke', '@system_console']},
    async ({pw}) => {
        const {
            adminUser,
            adminClient,
            user: systemManagerUser,
            userClient: systemManagerClient,
            team,
        } = await pw.initSetup();
        await adminClient.updateUserRoles(systemManagerUser.id, 'system_user system_manager');
        const otherTeam = await adminClient.createTeam(await pw.random.team());
        await setupSystemManagerPermission(pw, adminUser, 'reporting', 'team_statistics', 'Can edit');
        await setupSystemManagerPermission(pw, adminUser, 'userManagement', 'teams', 'Can edit');
        const {systemConsolePage} = await pw.testBrowser.login(systemManagerUser);
        await systemConsolePage.goto();
        await verifyTeamStatisticsAccess(systemConsolePage, team.id, team.display_name);
        await systemConsolePage.teamStatistics.selectTeamById(otherTeam.id);
        await systemConsolePage.teamStatistics.toHaveTeamHeader(otherTeam.display_name);
        const fetchedOtherTeam = await systemManagerClient.getTeam(otherTeam.id);
        expect(fetchedOtherTeam.id).toEqual(otherTeam.id);
        await setupSystemManagerPermission(pw, adminUser, 'userManagement', 'teams', 'No access');
        const {systemConsolePage: systemConsolePage2} = await pw.testBrowser.login(systemManagerUser);
        await systemConsolePage2.goto();
        await verifyTeamStatisticsAccess(systemConsolePage2, team.id, team.display_name);
        let apiError: Error | null = null;
        try {
            await systemManagerClient.getTeam(otherTeam.id);
        } catch (error) {
            apiError = error as Error;
        }
        expect(apiError).not.toBeNull();
        expect(apiError?.message).toContain('You do not have the appropriate permissions');
    },
);
const verifyTeamStatisticsAccess = async (
    systemConsolePage: SystemConsolePage,
    teamId: string,
    teamDisplayName: string,
) => {
    await systemConsolePage.sidebar.reporting.teamStatistics.click();
    await systemConsolePage.teamStatistics.toBeVisible();
    await systemConsolePage.teamStatistics.selectTeamById(teamId);
    await systemConsolePage.teamStatistics.toHaveTeamHeader(teamDisplayName);
};
type PermissionValue = 'Can edit' | 'Read only' | 'No access';
const setupSystemManagerPermission = async (
    pw: PlaywrightExtended,
    adminUser: UserProfile,
    sectionName: 'reporting' | 'userManagement',
    subsectionName: string,
    permission: PermissionValue,
) => {
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    await systemConsolePage.goto();
    await systemConsolePage.sidebar.delegatedGranularAdministration.click();
    await systemConsolePage.delegatedGranularAdministration.toBeVisible();
    await systemConsolePage.delegatedGranularAdministration.adminRolesPanel.systemManager.clickEdit();
    await systemConsolePage.delegatedGranularAdministration.systemRoles.toBeVisible();
    const section = systemConsolePage.delegatedGranularAdministration.systemRoles.privilegesPanel[sectionName];
    await section.expandSubsections();
    const subsection = section.getSubsection(subsectionName);
    await subsection.setPermission(permission);
    await systemConsolePage.delegatedGranularAdministration.systemRoles.save();
    await systemConsolePage.page.waitForURL('**/admin_console/user_management/system_roles');
    await systemConsolePage.page.waitForLoadState('networkidle');
};