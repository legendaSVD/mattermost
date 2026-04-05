import {Page} from '@playwright/test';
import SystemConsoleNavbar from '@/ui/components/system_console/navbar';
import SystemConsoleSidebar from '@/ui/components/system_console/sidebar';
import SystemConsoleHeader from '@/ui/components/system_console/header';
import EditionAndLicense from '@/ui/components/system_console/sections/about/edition_and_license';
import TeamStatistics from '@/ui/components/system_console/sections/reporting/team_statistics';
import Users from '@/ui/components/system_console/sections/user_management/users';
import DelegatedGranularAdministration from '@/ui/components/system_console/sections/user_management/delegated_granular_administration';
import PermissionsSystemScheme from '@/ui/components/system_console/sections/user_management/permissions_system_scheme';
import MobileSecurity from '@/ui/components/system_console/sections/environment/mobile_security';
import Localization from '@/ui/components/system_console/sections/site_configuration/localization';
import Notifications from '@/ui/components/system_console/sections/site_configuration/notifications';
import UsersAndTeams from '@/ui/components/system_console/sections/site_configuration/users_and_teams';
import FeatureDiscovery from '@/ui/components/system_console/sections/system_users/feature_discovery';
export default class SystemConsolePage {
    readonly page: Page;
    readonly navbar: SystemConsoleNavbar;
    readonly sidebar: SystemConsoleSidebar;
    readonly header: SystemConsoleHeader;
    readonly editionAndLicense: EditionAndLicense;
    readonly teamStatistics: TeamStatistics;
    readonly users: Users;
    readonly delegatedGranularAdministration: DelegatedGranularAdministration;
    readonly permissionsSystemScheme: PermissionsSystemScheme;
    readonly mobileSecurity: MobileSecurity;
    readonly localization: Localization;
    readonly notifications: Notifications;
    readonly usersAndTeams: UsersAndTeams;
    readonly featureDiscovery: FeatureDiscovery;
    constructor(page: Page) {
        this.page = page;
        this.navbar = new SystemConsoleNavbar(page.locator('.backstage-navbar'));
        this.sidebar = new SystemConsoleSidebar(page.locator('.admin-sidebar'));
        const adminConsoleWrapper = page.locator('#adminConsoleWrapper');
        this.header = new SystemConsoleHeader(adminConsoleWrapper);
        this.editionAndLicense = new EditionAndLicense(adminConsoleWrapper);
        this.teamStatistics = new TeamStatistics(adminConsoleWrapper);
        this.users = new Users(adminConsoleWrapper);
        this.delegatedGranularAdministration = new DelegatedGranularAdministration(adminConsoleWrapper);
        this.permissionsSystemScheme = new PermissionsSystemScheme(adminConsoleWrapper);
        this.mobileSecurity = new MobileSecurity(adminConsoleWrapper);
        this.localization = new Localization(adminConsoleWrapper);
        this.notifications = new Notifications(adminConsoleWrapper);
        this.usersAndTeams = new UsersAndTeams(adminConsoleWrapper);
        this.featureDiscovery = new FeatureDiscovery(adminConsoleWrapper);
    }
    async toBeVisible() {
        await this.page.waitForLoadState('networkidle');
        await this.navbar.toBeVisible();
        await this.sidebar.toBeVisible();
    }
    async goto() {
        await this.page.goto('/admin_console');
    }
}