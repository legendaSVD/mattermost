import {Client4} from '@mattermost/client';
import {PluginManifest} from '@mattermost/types/plugins';
import {PreferenceType} from '@mattermost/types/preferences';
import {UserProfile} from '@mattermost/types/users';
import {createNewTeam, getAdminClient, getDefaultAdminUser, makeClient} from './server';
import {testConfig} from './test_config';
import {defaultTeam} from './util';
export async function baseGlobalSetup() {
    let adminClient: Client4;
    let adminUser: UserProfile | null;
    ({adminClient, adminUser} = await getAdminClient({skipLog: true}));
    if (!adminUser) {
        const firstClient = new Client4();
        firstClient.setUrl(testConfig.baseURL);
        const defaultAdmin = getDefaultAdminUser();
        await firstClient.createUser(defaultAdmin, '', '');
        ({client: adminClient, user: adminUser} = await makeClient(defaultAdmin));
    }
    printPlaywrightTestConfig();
    await sysadminSetup(adminClient, adminUser);
}
async function sysadminSetup(client: Client4, user: UserProfile | null) {
    if (!user) {
        await client.verifyUserEmail(client.token);
    }
    await printLicenseInfo(client);
    await printClientInfo(client);
    const myTeams = await client.getMyTeams();
    const myDefaultTeam = myTeams && myTeams.length > 0 && myTeams.find((team) => team.name === defaultTeam.name);
    if (!myDefaultTeam) {
        await createNewTeam(client, {name: defaultTeam.name, displayName: defaultTeam.displayName});
    } else if (myDefaultTeam && testConfig.resetBeforeTest) {
        await Promise.all(
            myTeams.filter((team) => team.name !== defaultTeam.name).map((team) => client.deleteTeam(team.id)),
        );
        const myChannels = await client.getMyChannels(myDefaultTeam.id);
        await Promise.all(
            myChannels
                .filter((channel) => {
                    return (
                        channel.team_id === myDefaultTeam.id &&
                        channel.name !== 'town-square' &&
                        channel.name !== 'off-topic'
                    );
                })
                .map((channel) => client.deleteChannel(channel.id)),
        );
    }
    await savePreferences(client, user?.id ?? '');
    await printPluginDetails(client);
}
function printPlaywrightTestConfig() {
    console.log(`Playwright Test Config:
  - Headless  = ${testConfig.headless}
  - SlowMo    = ${testConfig.slowMo}
  - Workers   = ${testConfig.workers}`);
}
async function printLicenseInfo(client: Client4) {
    const license = await client.getClientLicenseOld();
    console.log(`Server License:
  - IsLicensed      = ${license.IsLicensed}
  - IsTrial         = ${license.IsTrial}
  - SkuName         = ${license.SkuName}
  - SkuShortName    = ${license.SkuShortName}
  - Cloud           = ${license.Cloud}
  - Users           = ${license.Users}`);
}
async function printClientInfo(client: Client4) {
    const config = await client.getClientConfig();
    console.log(`Build Info:
  - BuildNumber                 = ${config.BuildNumber}
  - BuildDate                   = ${config.BuildDate}
  - Version                     = ${config.Version}
  - BuildHash                   = ${config.BuildHash}
  - BuildHashEnterprise         = ${config.BuildHashEnterprise}
  - BuildEnterpriseReady        = ${config.BuildEnterpriseReady}
  - TelemetryId                 = ${config.TelemetryId}
  - ServiceEnvironment          = ${config.ServiceEnvironment}`);
    const {LogSettings, ServiceSettings, PluginSettings, FeatureFlags} = await client.getConfig();
    console.log(`Notable Server Config:
  - ServiceSettings.EnableSecurityFixAlert  = ${ServiceSettings?.EnableSecurityFixAlert}
  - LogSettings.EnableDiagnostics           = ${LogSettings?.EnableDiagnostics}`);
    console.log('Feature Flags:');
    console.log(
        Object.entries(FeatureFlags)
            .map(([key, value]) => `  - ${key} = ${value}`)
            .join('\n'),
    );
    console.log(`Plugin Settings:
  - Enable  = ${PluginSettings?.Enable}
  - EnableUploads  = ${PluginSettings?.EnableUploads}
  - AutomaticPrepackagedPlugins  = ${PluginSettings?.AutomaticPrepackagedPlugins}`);
}
async function printPluginDetails(client: Client4) {
    const plugins = await client.getPlugins();
    if (plugins.active.length) {
        console.log('Active plugins:');
    }
    plugins.active.forEach((plugin: PluginManifest) => {
        console.log(`  - ${plugin.id}@${plugin.version} | min_server@${plugin.min_server_version}`);
    });
    if (plugins.inactive.length) {
        console.log('Inactive plugins:');
    }
    plugins.inactive.forEach((plugin: PluginManifest) => {
        console.log(`  - ${plugin.id}@${plugin.version} | min_server@${plugin.min_server_version}`);
    });
    console.log('');
}
async function savePreferences(client: Client4, userId: UserProfile['id']) {
    try {
        if (!userId) {
            throw new Error('userId is not defined');
        }
        const preferences: PreferenceType[] = [
            {user_id: userId, category: 'tutorial_step', name: userId, value: '999'},
            {user_id: userId, category: 'crt_thread_pane_step', name: userId, value: '999'},
            {user_id: userId, category: 'onboarding_task_list', name: 'onboarding_task_list_show', value: 'false'},
            {user_id: userId, category: 'onboarding_task_list', name: 'onboarding_task_list_open', value: 'false'},
        ];
        await client.savePreferences(userId, preferences);
    } catch (error) {
        console.log('Error saving preferences', error);
    }
}