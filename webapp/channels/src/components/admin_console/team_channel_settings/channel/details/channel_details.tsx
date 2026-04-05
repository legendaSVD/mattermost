import cloneDeep from 'lodash/cloneDeep';
import React from 'react';
import {FormattedMessage} from 'react-intl';
import type {AccessControlPolicy, AccessControlPolicyActiveUpdate} from '@mattermost/types/access_control';
import type {Channel, ChannelModeration as ChannelPermissions, ChannelModerationPatch} from '@mattermost/types/channels';
import {SyncableType} from '@mattermost/types/groups';
import type {SyncablePatch, Group} from '@mattermost/types/groups';
import type {JobTypeBase} from '@mattermost/types/jobs';
import type {UserPropertyField} from '@mattermost/types/properties';
import type {Scheme} from '@mattermost/types/schemes';
import type {Team} from '@mattermost/types/teams';
import type {UserProfile} from '@mattermost/types/users';
import {Permissions} from 'mattermost-redux/constants';
import type {ActionResult} from 'mattermost-redux/types/actions';
import BlockableLink from 'components/admin_console/blockable_link';
import ChannelAccessRulesConfirmModal from 'components/channel_settings_modal/channel_access_rules_confirm_modal';
import ConfirmModal from 'components/confirm_modal';
import FormError from 'components/form_error';
import AdminHeader from 'components/widgets/admin_console/admin_header';
import {getHistory} from 'utils/browser_history';
import Constants, {JobTypes} from 'utils/constants';
import {ChannelAccessControl} from './channel_access_control_policy';
import {ChannelGroups} from './channel_groups';
import ChannelLevelAccessRules from './channel_level_access_rules';
import ChannelMembers from './channel_members';
import ChannelModeration from './channel_moderation';
import {ChannelModes} from './channel_modes';
import {ChannelProfile} from './channel_profile';
import type {ChannelModerationRoles} from './types';
import SaveChangesPanel from '../../../save_changes_panel';
import ConvertAndRemoveConfirmModal from '../../convert_and_remove_confirm_modal';
import ConvertConfirmModal from '../../convert_confirm_modal';
import {NeedGroupsError, UsersWillBeRemovedError} from '../../errors';
import RemoveConfirmModal from '../../remove_confirm_modal';
export interface ChannelDetailsProps {
    channelID: string;
    channel?: Channel;
    team?: Team;
    groups: Group[];
    totalGroups: number;
    allGroups: Record<string, Group>;
    channelPermissions: ChannelPermissions[];
    teamScheme?: Scheme;
    guestAccountsEnabled: boolean;
    channelModerationEnabled: boolean;
    channelGroupsEnabled: boolean;
    abacSupported: boolean;
    isDisabled?: boolean;
    actions: ChannelDetailsActions;
}
interface ChannelDetailsState {
    isSynced: boolean;
    isPublic: boolean;
    isDefault: boolean;
    totalGroups: number;
    groups: Group[];
    usersToRemoveCount: number;
    usersToRemove: Record<string, UserProfile>;
    usersToAdd: Record<string, UserProfile>;
    rolesToUpdate: {
        [userId: string]: {
            schemeUser: boolean;
            schemeAdmin: boolean;
        };
    };
    saveNeeded: boolean;
    serverError: JSX.Element | undefined;
    previousServerError: JSX.Element | undefined;
    isPrivacyChanging: boolean;
    saving: boolean;
    showConvertConfirmModal: boolean;
    showRemoveConfirmModal: boolean;
    showConvertAndRemoveConfirmModal: boolean;
    channelPermissions: ChannelPermissions[];
    teamScheme?: Scheme;
    isLocalArchived: boolean;
    showArchiveConfirmModal: boolean;
    policyToggled: boolean;
    accessControlPolicy?: AccessControlPolicy;
    accessControlPolicies: AccessControlPolicy[];
    accessControlPoliciesToRemove: string[];
    abacSupported: boolean;
    channelRulesExpression: string;
    channelRulesOriginalExpression: string;
    channelRulesAutoSync: boolean;
    channelRulesOriginalAutoSync: boolean;
    channelRulesHaveChanges: boolean;
    userAttributes: UserPropertyField[];
    attributesLoaded: boolean;
    showAccessRulesConfirmModal: boolean;
    accessRulesUsersToAdd: string[];
    accessRulesUsersToRemove: string[];
    accessRulesConfirmed: boolean;
}
export type ChannelDetailsActions = {
    getGroups: (channelID: string, q?: string, page?: number, perPage?: number, filterAllowReference?: boolean) => Promise<ActionResult>;
    linkGroupSyncable: (groupID: string, syncableID: string, syncableType: SyncableType, patch: SyncablePatch) => Promise<ActionResult>;
    unlinkGroupSyncable: (groupID: string, syncableID: string, syncableType: SyncableType) => Promise<ActionResult>;
    membersMinusGroupMembers: (channelID: string, groupIDs: string[], page?: number, perPage?: number) => Promise<ActionResult>;
    setNavigationBlocked: (blocked: boolean) => {type: 'SET_NAVIGATION_BLOCKED'; blocked: boolean};
    getChannel: (channelId: string) => void;
    getTeam: (teamId: string) => Promise<ActionResult>;
    getChannelModerations: (channelId: string) => Promise<ActionResult>;
    patchChannel: (channelId: string, patch: Partial<Channel>) => Promise<ActionResult>;
    updateChannelPrivacy: (channelId: string, privacy: string) => Promise<ActionResult>;
    patchGroupSyncable: (groupID: string, syncableID: string, syncableType: SyncableType, patch: Partial<SyncablePatch>) => Promise<ActionResult>;
    patchChannelModerations: (channelID: string, patch: ChannelModerationPatch[]) => Promise<ActionResult>;
    loadScheme: (schemeID: string) => Promise<ActionResult>;
    addChannelMember: (channelId: string, userId: string, postRootId?: string) => Promise<ActionResult>;
    removeChannelMember: (channelId: string, userId: string) => Promise<ActionResult>;
    updateChannelMemberSchemeRoles: (channelId: string, userId: string, isSchemeUser: boolean, isSchemeAdmin: boolean) => Promise<ActionResult>;
    deleteChannel: (channelId: string) => Promise<ActionResult>;
    unarchiveChannel: (channelId: string) => Promise<ActionResult>;
    getAccessControlPolicy: (channelId: string) => Promise<ActionResult>;
    searchPolicies: (term: string, type: string, after: string, limit: number) => Promise<ActionResult>;
    assignChannelToAccessControlPolicy: (policyId: string, channelId: string) => Promise<ActionResult>;
    unassignChannelsFromAccessControlPolicy: (policyId: string, channelIds: string[]) => Promise<ActionResult>;
    deleteAccessControlPolicy: (policyId: string) => Promise<ActionResult>;
    getAccessControlFields: (after: string, limit: number, channelId?: string) => Promise<ActionResult>;
    getVisualAST: (expression: string, channelId?: string) => Promise<ActionResult>;
    saveChannelAccessPolicy: (policy: AccessControlPolicy) => Promise<ActionResult>;
    validateChannelExpression: (expression: string, channelId: string) => Promise<ActionResult>;
    createAccessControlSyncJob: (job: JobTypeBase & { data: any }) => Promise<ActionResult>;
    updateAccessControlPoliciesActive: (states: AccessControlPolicyActiveUpdate[]) => Promise<ActionResult>;
    searchUsersForExpression: (expression: string, term: string, after: string, limit: number, channelId?: string) => Promise<ActionResult>;
    getChannelMembers: (channelId: string, page?: number, perPage?: number) => Promise<ActionResult>;
    getProfilesByIds: (userIds: string[]) => Promise<ActionResult>;
};
export default class ChannelDetails extends React.PureComponent<ChannelDetailsProps, ChannelDetailsState> {
    constructor(props: ChannelDetailsProps) {
        super(props);
        this.state = {
            isSynced: Boolean(props.channel?.group_constrained),
            isPublic: props.channel?.type === Constants.OPEN_CHANNEL,
            isDefault: props.channel?.name === Constants.DEFAULT_CHANNEL,
            isPrivacyChanging: false,
            saving: false,
            totalGroups: props.totalGroups,
            showConvertConfirmModal: false,
            showRemoveConfirmModal: false,
            showConvertAndRemoveConfirmModal: false,
            usersToRemoveCount: 0,
            usersToRemove: {},
            usersToAdd: {},
            rolesToUpdate: {},
            groups: props.groups,
            saveNeeded: false,
            serverError: undefined,
            previousServerError: undefined,
            channelPermissions: props.channelPermissions,
            teamScheme: props.teamScheme,
            isLocalArchived: props.channel?.delete_at !== 0,
            showArchiveConfirmModal: false,
            policyToggled: false,
            accessControlPolicy: undefined,
            accessControlPolicies: [],
            accessControlPoliciesToRemove: [],
            abacSupported: props.abacSupported,
            channelRulesExpression: '',
            channelRulesOriginalExpression: '',
            channelRulesAutoSync: false,
            channelRulesOriginalAutoSync: false,
            channelRulesHaveChanges: false,
            userAttributes: [],
            attributesLoaded: false,
            showAccessRulesConfirmModal: false,
            accessRulesUsersToAdd: [],
            accessRulesUsersToRemove: [],
            accessRulesConfirmed: false,
        };
    }
    componentDidUpdate(prevProps: ChannelDetailsProps) {
        const {channel, totalGroups, actions} = this.props;
        if (channel?.id !== prevProps.channel?.id || totalGroups !== prevProps.totalGroups) {
            this.setState({
                totalGroups,
                isSynced: Boolean(channel?.group_constrained),
                isPublic: channel?.type === Constants.OPEN_CHANNEL,
                isDefault: channel?.name === Constants.DEFAULT_CHANNEL,
                isLocalArchived: channel?.delete_at !== 0,
                policyToggled: channel?.policy_enforced || false,
            });
            if (this.props.abacSupported && channel?.id) {
                this.loadUserAttributes();
                this.fetchAccessControlPolicies(channel.id);
            }
            if (channel?.policy_enforced && channel?.id) {
                this.loadChannelLevelAccessRules(channel.id);
            }
        }
        if (!prevProps.team?.id && !prevProps.channel?.team_id && channel?.team_id) {
            actions.getTeam(channel.team_id).
                then(async (data: any) => {
                    if (data.data && data.data.scheme_id) {
                        await actions.loadScheme(data.data.scheme_id);
                    }
                }).
                then(() => this.setState({teamScheme: this.props.teamScheme}));
        }
    }
    componentDidMount() {
        const {channelID, channel, actions} = this.props;
        if (channelID) {
            if (this.props.channelModerationEnabled) {
                actions.getGroups(channelID).
                    then(() => this.setState({groups: this.props.groups}));
                actions.getChannelModerations(channelID).then(() => this.restrictChannelMentions());
            }
            actions.getChannel(channelID);
            if (this.props.abacSupported) {
                this.loadUserAttributes();
                this.fetchAccessControlPolicies(channelID);
            }
            if (channel?.policy_enforced) {
                this.loadChannelLevelAccessRules(channelID);
                this.setState({policyToggled: true});
            }
        }
        if (channel?.team_id) {
            actions.getTeam(channel.team_id).
                then(async (data: any) => {
                    if (data.data && data.data.scheme_id) {
                        await actions.loadScheme(data.data.scheme_id);
                    }
                }).
                then(() => this.setState({teamScheme: this.props.teamScheme}));
        }
    }
    private restrictChannelMentions() {
        let channelPermissions = this.props.channelPermissions;
        const currentCreatePostRoles: any = channelPermissions.find((element) => element.name === Permissions.CHANNEL_MODERATED_PERMISSIONS.CREATE_POST)?.roles;
        if (currentCreatePostRoles) {
            for (const channelRole of Object.keys(currentCreatePostRoles)) {
                channelPermissions = channelPermissions.map((permission) => {
                    if (permission.name === Permissions.CHANNEL_MODERATED_PERMISSIONS.USE_CHANNEL_MENTIONS && (!currentCreatePostRoles[channelRole].value || !currentCreatePostRoles[channelRole].enabled)) {
                        return {
                            name: permission.name,
                            roles: {
                                ...permission.roles,
                                [channelRole]: {
                                    value: false,
                                    enabled: false,
                                },
                            },
                        };
                    }
                    return permission;
                });
            }
        }
        this.setState({channelPermissions});
    }
    private setToggles = (isSynced: boolean, isPublic: boolean, policyEnforced: boolean) => {
        const {channel} = this.props;
        const isOriginallyPublic = channel?.type === Constants.OPEN_CHANNEL;
        this.setState(
            {
                saveNeeded: true,
                isSynced,
                isPublic,
                isPrivacyChanging: isPublic !== isOriginallyPublic,
                policyToggled: policyEnforced,
            },
            () => this.processGroupsChange(this.state.groups),
        );
        this.props.actions.setNavigationBlocked(true);
    };
    async processGroupsChange(groups: Group[]) {
        const {actions, channelID} = this.props;
        actions.setNavigationBlocked(true);
        let serverError: JSX.Element | undefined;
        let usersToRemoveCount = 0;
        if (this.state.isSynced) {
            try {
                if (groups.length === 0) {
                    serverError = (
                        <NeedGroupsError
                            warning={true}
                            isChannel={true}
                        />
                    );
                } else {
                    if (!channelID) {
                        return;
                    }
                    const result = await actions.membersMinusGroupMembers(channelID, groups.map((g) => g.id));
                    if ('data' in result) {
                        usersToRemoveCount = result.data.total_count;
                        if (usersToRemoveCount > 0) {
                            serverError = (
                                <UsersWillBeRemovedError
                                    total={usersToRemoveCount}
                                    users={result.data.users}
                                    scope='channel'
                                    scopeId={this.props.channelID}
                                />
                            );
                        }
                    }
                }
            } catch (ex) {
                serverError = ex;
            }
        }
        this.setState({groups, usersToRemoveCount, saveNeeded: true, serverError});
    }
    private handleGroupRemoved = (gid: string) => {
        const groups = this.state.groups.filter((g) => g.id !== gid);
        this.setState({totalGroups: this.state.totalGroups - 1});
        this.processGroupsChange(groups);
    };
    private setNewGroupRole = (gid: string) => {
        const groups = cloneDeep(this.state.groups).map((g) => {
            if (g.id === gid) {
                g.scheme_admin = !g.scheme_admin;
            }
            return g;
        });
        this.processGroupsChange(groups);
    };
    private channelPermissionsChanged = (name: string, channelRole: ChannelModerationRoles) => {
        const currentValueIndex = this.state.channelPermissions.findIndex((element) => element.name === name);
        const currentValue = this.state.channelPermissions[currentValueIndex].roles[channelRole]!.value;
        const newValue = !currentValue;
        let channelPermissions = [...this.state.channelPermissions];
        if (name === Permissions.CHANNEL_MODERATED_PERMISSIONS.CREATE_POST) {
            const originalObj = this.props.channelPermissions.find((element) => element.name === Permissions.CHANNEL_MODERATED_PERMISSIONS.USE_CHANNEL_MENTIONS)?.roles![channelRole];
            channelPermissions = channelPermissions.map((permission) => {
                if (permission.name === Permissions.CHANNEL_MODERATED_PERMISSIONS.USE_CHANNEL_MENTIONS && !newValue) {
                    return {
                        name: permission.name,
                        roles: {
                            ...permission.roles,
                            [channelRole]: {
                                value: false,
                                enabled: false,
                            },
                        },
                    };
                } else if (permission.name === Permissions.CHANNEL_MODERATED_PERMISSIONS.USE_CHANNEL_MENTIONS) {
                    return {
                        name: permission.name,
                        roles: {
                            ...permission.roles,
                            [channelRole]: {
                                value: originalObj?.value,
                                enabled: originalObj?.enabled,
                            },
                        },
                    };
                }
                return permission;
            });
        }
        channelPermissions[currentValueIndex] = {
            ...channelPermissions[currentValueIndex],
            roles: {
                ...channelPermissions[currentValueIndex].roles,
                [channelRole]: {
                    ...channelPermissions[currentValueIndex].roles[channelRole],
                    value: newValue,
                },
            },
        };
        this.setState({channelPermissions, saveNeeded: true});
        this.props.actions.setNavigationBlocked(true);
    };
    private handleGroupChange = (groupIDs: string[]) => {
        const groups = [...this.state.groups, ...groupIDs.map((gid: string) => this.props.allGroups[gid])];
        this.setState({totalGroups: this.state.totalGroups + groupIDs.length});
        this.processGroupsChange(groups);
    };
    private hideConvertConfirmModal = () => {
        this.setState({showConvertConfirmModal: false});
    };
    private hideRemoveConfirmModal = () => {
        this.setState({showRemoveConfirmModal: false});
    };
    private hideConvertAndRemoveConfirmModal = () => {
        this.setState({showConvertAndRemoveConfirmModal: false});
    };
    private hideArchiveConfirmModal = () => {
        this.setState({showArchiveConfirmModal: false});
    };
    private hideAccessRulesConfirmModal = () => {
        this.setState({
            showAccessRulesConfirmModal: false,
            accessRulesUsersToAdd: [],
            accessRulesUsersToRemove: [],
        });
    };
    private confirmAccessRulesSave = async () => {
        this.hideAccessRulesConfirmModal();
        this.setState({accessRulesConfirmed: true}, () => {
            this.handleSubmit();
        });
    };
    private onSave = () => {
        const {channel} = this.props;
        const {isSynced, usersToRemoveCount, serverError} = this.state;
        let {isPublic, isPrivacyChanging} = this.state;
        if (this.channelToBeArchived()) {
            this.setState({showArchiveConfirmModal: true});
            return;
        }
        const isOriginallyPublic = channel?.type === Constants.OPEN_CHANNEL;
        if (isSynced) {
            isPublic = false;
            isPrivacyChanging = isOriginallyPublic;
            this.setState({
                isPublic,
                isPrivacyChanging,
            });
        }
        if (isPrivacyChanging && usersToRemoveCount > 0) {
            this.setState({showConvertAndRemoveConfirmModal: true});
            return;
        }
        if (isPrivacyChanging && usersToRemoveCount === 0 && !serverError) {
            this.setState({showConvertConfirmModal: true});
            return;
        }
        if (!isPrivacyChanging && usersToRemoveCount > 0) {
            this.setState({showRemoveConfirmModal: true});
            return;
        }
        this.handleSubmit();
    };
    private handleSubmit = async () => {
        const {groups: origGroups, channelID, actions, channel} = this.props;
        if (!channel) {
            return;
        }
        this.setState({showConvertConfirmModal: false, showRemoveConfirmModal: false, showConvertAndRemoveConfirmModal: false, showArchiveConfirmModal: false, saving: true});
        const {groups, isSynced, isPublic, isPrivacyChanging, channelPermissions, usersToAdd, usersToRemove, rolesToUpdate, policyToggled, accessControlPolicies, accessControlPoliciesToRemove} = this.state;
        let serverError: JSX.Element | undefined;
        let saveNeeded = false;
        if (this.channelToBeArchived()) {
            const result = await actions.deleteChannel(channel.id);
            if ('error' in result) {
                serverError = <FormError error={result.error.message}/>;
                saveNeeded = true;
            }
            this.setState({serverError, saving: false, saveNeeded, isPrivacyChanging: false, usersToRemoveCount: 0, rolesToUpdate: {}, usersToAdd: {}, usersToRemove: {}}, () => {
                actions.setNavigationBlocked(saveNeeded);
                if (!saveNeeded) {
                    getHistory().push('/admin_console/user_management/channels');
                }
            });
            return;
        } else if (this.channelToBeRestored() && !this.state.serverError) {
            const result = await actions.unarchiveChannel(channel.id);
            if ('error' in result) {
                serverError = <FormError error={result.error.message}/>;
            }
            this.setState({serverError, previousServerError: undefined});
        }
        if (this.state.groups.length === 0 && isSynced) {
            serverError = <NeedGroupsError isChannel={true}/>;
            saveNeeded = true;
            this.setState({serverError, saving: false, saveNeeded});
            actions.setNavigationBlocked(saveNeeded);
            return;
        }
        let privacyChangePromise;
        if (isPrivacyChanging) {
            privacyChangePromise = actions.updateChannelPrivacy(channel.id, isPublic ? Constants.OPEN_CHANNEL : Constants.PRIVATE_CHANNEL);
        }
        const patchChannelSyncable = groups.
            filter((g) => {
                return origGroups.some((group) => group.id === g.id && group.scheme_admin !== g.scheme_admin);
            }).
            map((g) => actions.patchGroupSyncable(g.id, channelID, SyncableType.Channel, {scheme_admin: g.scheme_admin}));
        const link = groups.
            filter((g) => {
                return !origGroups.some((group) => group.id === g.id);
            }).
            map((g) => actions.linkGroupSyncable(g.id, channelID, SyncableType.Channel, {auto_add: true, scheme_admin: g.scheme_admin}));
        const promisesToExecute = [...patchChannelSyncable, ...link];
        if (privacyChangePromise) {
            promisesToExecute.push(privacyChangePromise);
        }
        const linkResult = await Promise.all(promisesToExecute);
        let resultWithError = linkResult.find((r) => 'error' in r);
        if (resultWithError && 'error' in resultWithError) {
            serverError = <FormError error={resultWithError.error.message}/>;
        }
        const patchResult = await actions.patchChannel(channel.id, {
            group_constrained: isSynced,
        });
        if ('error' in patchResult) {
            serverError = <FormError error={patchResult.error.message}/>;
        }
        const unlink = origGroups.
            filter((g) => {
                return !groups.some((group) => group.id === g.id);
            }).
            map((g) => actions.unlinkGroupSyncable(g.id, channelID, SyncableType.Channel));
        if (unlink.length > 0) {
            const unlinkResult = await Promise.all(unlink);
            resultWithError = unlinkResult.find((r) => 'error' in r);
            if (resultWithError && 'error' in resultWithError) {
                serverError = <FormError error={resultWithError.error.message}/>;
            }
        }
        if (!(resultWithError && 'error' in resultWithError) && !('error' in patchResult)) {
            const actionsToAwait: any[] = [];
            if (this.props.channelModerationEnabled) {
                actionsToAwait.push(actions.getGroups(channelID));
            }
            if (isPrivacyChanging) {
                if (this.props.channelModerationEnabled) {
                    actionsToAwait.push(
                        actions.getChannelModerations(channelID).then(() => {
                            const manageMembersIndex = channelPermissions.findIndex((element) => element.name === Permissions.CHANNEL_MODERATED_PERMISSIONS.MANAGE_MEMBERS);
                            if (channelPermissions) {
                                const updatedManageMembers = this.props.channelPermissions.find((element) => element.name === Permissions.CHANNEL_MODERATED_PERMISSIONS.MANAGE_MEMBERS);
                                channelPermissions[manageMembersIndex] = updatedManageMembers || channelPermissions[manageMembersIndex];
                            }
                            this.setState({channelPermissions});
                        }),
                    );
                }
            }
            if (actionsToAwait.length > 0) {
                await Promise.all(actionsToAwait);
            }
            await Promise.resolve();
        }
        if (this.props.channelModerationEnabled) {
            const patchChannelPermissionsArray: ChannelModerationPatch[] = channelPermissions.map((p) => {
                return {
                    name: p.name,
                    roles: {
                        ...(p.roles.members && p.roles.members.enabled && {members: p.roles.members!.value}),
                        ...(p.roles.guests && p.roles.guests.enabled && {guests: p.roles.guests!.value}),
                    },
                };
            });
            const patchChannelModerationsResult = await actions.patchChannelModerations(channelID, patchChannelPermissionsArray);
            if (patchChannelModerationsResult.error) {
                serverError = <FormError error={patchChannelModerationsResult.error.message}/>;
            }
            this.restrictChannelMentions();
        }
        if (policyToggled) {
            if (isPublic) {
                serverError = (
                    <FormError
                        error={
                            <FormattedMessage
                                id='admin.channel_details.policy_public_error'
                                defaultMessage='You cannot assign a policy to a public channel.'
                            />}
                    />
                );
                saveNeeded = true;
                this.setState({serverError, saving: false, saveNeeded});
                actions.setNavigationBlocked(saveNeeded);
                return;
            }
            if (isSynced) {
                serverError = (
                    <FormError
                        error={
                            <FormattedMessage
                                id='admin.channel_details.policy_synced_error'
                                defaultMessage='You cannot assign a policy to a synced channel.'
                            />}
                    />
                );
                saveNeeded = true;
                this.setState({serverError, saving: false, saveNeeded});
                actions.setNavigationBlocked(saveNeeded);
                return;
            }
            const hasChannelRules = this.state.channelRulesExpression && this.state.channelRulesExpression.trim().length > 0;
            const hasParentPolicies = accessControlPolicies.length > 0;
            if (!hasChannelRules && !hasParentPolicies) {
                serverError = (
                    <FormError
                        error={
                            <FormattedMessage
                                id='admin.channel_details.policy_required_error'
                                defaultMessage='You must select an access policy or define channel-specific access rules when attribute-based channel access is enabled.'
                            />}
                    />
                );
                saveNeeded = true;
                this.setState({serverError, saving: false, saveNeeded});
                actions.setNavigationBlocked(saveNeeded);
                return;
            }
            if (accessControlPolicies.length > 0) {
                try {
                    await Promise.all(
                        accessControlPolicies.map((policy) =>
                            actions.assignChannelToAccessControlPolicy(policy.id, channelID),
                        ),
                    );
                } catch (error) {
                    serverError = <FormError error={error.message}/>;
                    saveNeeded = true;
                }
            }
            if (accessControlPoliciesToRemove.length > 0) {
                try {
                    await Promise.all(
                        accessControlPoliciesToRemove.map((policyId) =>
                            actions.unassignChannelsFromAccessControlPolicy(policyId, [channelID]),
                        ),
                    );
                } catch (error) {
                    serverError = <FormError error={error.message}/>;
                    saveNeeded = true;
                }
            }
        } else {
            await actions.deleteAccessControlPolicy(channelID).catch((error) => {
                if (error.message && !error.message.includes('not found')) {
                    serverError = <FormError error={error.message}/>;
                    saveNeeded = true;
                }
            });
        }
        if (policyToggled && this.state.channelRulesHaveChanges && !this.state.accessRulesConfirmed) {
            try {
                const {channelRulesExpression, channelRulesAutoSync} = this.state;
                const changes = await this.calculateMembershipChanges(channelRulesExpression, channelRulesAutoSync);
                if (changes.toAdd.length > 0 || changes.toRemove.length > 0) {
                    this.setState({
                        showAccessRulesConfirmModal: true,
                        accessRulesUsersToAdd: changes.toAdd,
                        accessRulesUsersToRemove: changes.toRemove,
                        saving: false,
                    });
                    return;
                }
            } catch (error) {
                console.error('Failed to calculate membership changes:', error);
            }
        }
        if (policyToggled && this.state.channelRulesHaveChanges) {
            try {
                const {channelRulesExpression, channelRulesAutoSync, accessControlPolicy} = this.state;
                const hasChannelRules = channelRulesExpression && channelRulesExpression.trim().length > 0;
                const hasParentPolicies = this.state.accessControlPolicies && this.state.accessControlPolicies.length > 0;
                const isEmptyRulesState = !hasChannelRules && !hasParentPolicies;
                if (isEmptyRulesState) {
                    try {
                        await actions.deleteAccessControlPolicy(channelID);
                    } catch (deleteError: unknown) {
                        const errorMessage = deleteError instanceof Error ? deleteError.message : String(deleteError);
                        if (errorMessage && !errorMessage.includes('not found')) {
                            serverError = <FormError error={errorMessage || 'Failed to delete channel policy'}/>;
                            saveNeeded = true;
                        }
                    }
                    if (!serverError) {
                        this.setState({
                            channelRulesOriginalExpression: '',
                            channelRulesOriginalAutoSync: false,
                            channelRulesHaveChanges: false,
                            accessRulesConfirmed: false,
                            accessControlPolicy: undefined,
                        });
                    }
                } else
                    if (channelRulesExpression.trim()) {
                        const channelPolicy: AccessControlPolicy = {
                            id: channelID,
                            name: accessControlPolicy?.name || `Channel Rules for ${channel.display_name}`,
                            type: 'channel',
                            version: accessControlPolicy?.version || 'v0.2',
                            revision: accessControlPolicy ? (accessControlPolicy.revision || 1) + 1 : 1,
                            created_at: accessControlPolicy?.created_at || Date.now(),
                            active: false,
                            imports: this.state.accessControlPolicies.map((p) => p.id),
                            rules: [{
                                actions: ['*'],
                                expression: channelRulesExpression,
                            }],
                        };
                        const result = await actions.saveChannelAccessPolicy(channelPolicy);
                        if ('error' in result) {
                            serverError = <FormError error={result.error.message}/>;
                            saveNeeded = true;
                        } else {
                            try {
                                await actions.updateAccessControlPoliciesActive([{id: channelID, active: channelRulesAutoSync} as AccessControlPolicyActiveUpdate]);
                            } catch (activeError) {
                                console.error('Failed to update policy active status:', activeError);
                                serverError = <FormError error={`Failed to update active status: ${activeError.message || activeError}`}/>;
                                saveNeeded = true;
                            }
                            if (!serverError) {
                                if (channelRulesExpression.trim()) {
                                    try {
                                        const job: JobTypeBase & { data: {policy_id: string} } = {
                                            type: JobTypes.ACCESS_CONTROL_SYNC,
                                            data: {
                                                policy_id: channelID,
                                            },
                                        };
                                        await actions.createAccessControlSyncJob(job);
                                    } catch (jobError) {
                                        console.error('Failed to create access control sync job:', jobError);
                                    }
                                }
                                this.setState({
                                    channelRulesOriginalExpression: channelRulesExpression,
                                    channelRulesOriginalAutoSync: channelRulesAutoSync,
                                    channelRulesHaveChanges: false,
                                    accessRulesConfirmed: false,
                                    accessControlPolicy: {...channelPolicy, active: channelRulesAutoSync},
                                });
                            }
                        }
                    } else {
                        if (this.state.accessControlPolicies.length > 0) {
                            const updatedPolicy: AccessControlPolicy = {
                                id: accessControlPolicy?.id || channelID,
                                name: accessControlPolicy?.name || channel.display_name,
                                type: 'channel',
                                version: accessControlPolicy?.version || 'v0.2',
                                created_at: accessControlPolicy?.created_at || Date.now(),
                                revision: (accessControlPolicy?.revision || 1) + 1,
                                active: channelRulesAutoSync,
                                rules: [],
                                imports: this.state.accessControlPolicies.map((p) => p.id),
                            };
                            const result = await actions.saveChannelAccessPolicy(updatedPolicy);
                            if ('error' in result) {
                                serverError = <FormError error={result.error.message}/>;
                                saveNeeded = true;
                            } else {
                                this.setState({
                                    channelRulesOriginalExpression: '',
                                    channelRulesOriginalAutoSync: channelRulesAutoSync,
                                    channelRulesHaveChanges: false,
                                    accessRulesConfirmed: false,
                                    accessControlPolicy: updatedPolicy,
                                });
                            }
                        }
                        if (this.state.accessControlPolicies.length === 0) {
                            await actions.deleteAccessControlPolicy(channelID).catch((error) => {
                                if (error.message && !error.message.includes('not found')) {
                                    serverError = <FormError error={error.message}/>;
                                    saveNeeded = true;
                                }
                            });
                            this.setState({
                                channelRulesOriginalExpression: '',
                                channelRulesOriginalAutoSync: false,
                                channelRulesHaveChanges: false,
                                accessRulesConfirmed: false,
                                accessControlPolicy: undefined,
                            });
                        }
                    }
            } catch (error) {
                serverError = <FormError error={error.message || 'Failed to save channel access rules'}/>;
                saveNeeded = true;
            }
        }
        let privacyChanging = isPrivacyChanging;
        if (serverError == null) {
            privacyChanging = false;
        }
        const usersToAddList = Object.values(usersToAdd);
        const usersToRemoveList = Object.values(usersToRemove);
        const userRolesToUpdate = Object.keys(rolesToUpdate);
        const usersToUpdate = usersToAddList.length > 0 || usersToRemoveList.length > 0 || userRolesToUpdate.length > 0;
        if (usersToUpdate && !isSynced) {
            const addUserActions: any[] = [];
            const removeUserActions: any[] = [];
            const {addChannelMember, removeChannelMember, updateChannelMemberSchemeRoles} = this.props.actions;
            usersToAddList.forEach((user) => {
                addUserActions.push(addChannelMember(channelID, user.id));
            });
            usersToRemoveList.forEach((user) => {
                removeUserActions.push(removeChannelMember(channelID, user.id));
            });
            if (addUserActions.length > 0) {
                const result = await Promise.all(addUserActions);
                const resultWithError = result.find((r) => 'error' in r);
                if (resultWithError && 'error' in resultWithError) {
                    serverError = <FormError error={resultWithError.error.message}/>;
                }
            }
            if (removeUserActions.length > 0) {
                const result = await Promise.all(removeUserActions);
                const resultWithError = result.find((r) => 'error' in r);
                if (resultWithError && 'error' in resultWithError) {
                    serverError = <FormError error={resultWithError.error.message}/>;
                }
            }
            const rolesToPromote: any[] = [];
            const rolesToDemote: any[] = [];
            userRolesToUpdate.forEach((userId) => {
                const {schemeUser, schemeAdmin} = rolesToUpdate[userId];
                if (schemeAdmin) {
                    rolesToPromote.push(updateChannelMemberSchemeRoles(channelID, userId, schemeUser, schemeAdmin));
                } else {
                    rolesToDemote.push(updateChannelMemberSchemeRoles(channelID, userId, schemeUser, schemeAdmin));
                }
            });
            if (rolesToPromote.length > 0) {
                const result = await Promise.all(rolesToPromote);
                const resultWithError = result.find((r) => 'error' in r);
                if (resultWithError && 'error' in resultWithError) {
                    serverError = <FormError error={resultWithError.error.message}/>;
                }
            }
            if (rolesToDemote.length > 0) {
                const result = await Promise.all(rolesToDemote);
                const resultWithError = result.find((r) => 'error' in r);
                if (resultWithError && 'error' in resultWithError) {
                    serverError = <FormError error={resultWithError.error.message}/>;
                }
            }
        }
        this.setState({
            serverError,
            saving: false,
            saveNeeded,
            isPrivacyChanging: privacyChanging,
            usersToRemoveCount: 0,
            rolesToUpdate: {},
            usersToAdd: {},
            usersToRemove: {},
            accessControlPoliciesToRemove: !serverError && !saveNeeded ? [] : this.state.accessControlPoliciesToRemove,
        }, () => {
            actions.setNavigationBlocked(saveNeeded);
            if (!saveNeeded && !serverError) {
                getHistory().push('/admin_console/user_management/channels');
            }
        });
    };
    private channelToBeArchived = (): boolean => {
        const {isLocalArchived} = this.state;
        const isServerArchived = this.props.channel?.delete_at !== 0;
        return isLocalArchived && !isServerArchived;
    };
    private channelToBeRestored = (): boolean => {
        const {isLocalArchived} = this.state;
        const isServerArchived = this.props.channel?.delete_at !== 0;
        return !isLocalArchived && isServerArchived;
    };
    private addRolesToUpdate = (userId: string, schemeUser: boolean, schemeAdmin: boolean) => {
        const {rolesToUpdate} = this.state;
        rolesToUpdate[userId] = {schemeUser, schemeAdmin};
        this.setState({rolesToUpdate: {...rolesToUpdate}, saveNeeded: true});
        this.props.actions.setNavigationBlocked(true);
    };
    private addUserToRemove = (user: UserProfile) => {
        let {usersToRemoveCount} = this.state;
        const {usersToAdd, usersToRemove, rolesToUpdate} = this.state;
        if (usersToAdd[user.id]?.id === user.id) {
            delete usersToAdd[user.id];
        } else if (usersToRemove[user.id]?.id !== user.id) {
            usersToRemoveCount += 1;
            usersToRemove[user.id] = user;
        }
        delete rolesToUpdate[user.id];
        this.setState({usersToRemove: {...usersToRemove}, usersToAdd: {...usersToAdd}, rolesToUpdate: {...rolesToUpdate}, usersToRemoveCount, saveNeeded: true});
        this.props.actions.setNavigationBlocked(true);
    };
    private addUsersToAdd = (users: UserProfile[]) => {
        let {usersToRemoveCount} = this.state;
        const usersToRemove = {...this.state.usersToRemove};
        const usersToAdd = {...this.state.usersToAdd};
        users.forEach((user) => {
            if (usersToRemove[user.id]?.id === user.id) {
                delete usersToRemove[user.id];
                usersToRemoveCount -= 1;
            } else {
                usersToAdd[user.id] = user;
            }
        });
        this.setState({usersToAdd: {...usersToAdd}, usersToRemove: {...usersToRemove}, usersToRemoveCount, saveNeeded: true});
        this.props.actions.setNavigationBlocked(true);
    };
    private onToggleArchive = () => {
        const {isLocalArchived, serverError, previousServerError} = this.state;
        const {isDisabled} = this.props;
        if (isDisabled) {
            return;
        }
        const newState: any = {
            saveNeeded: true,
            isLocalArchived: !isLocalArchived,
        };
        if (newState.isLocalArchived) {
            newState.previousServerError = serverError;
            newState.serverError = undefined;
        } else {
            newState.serverError = previousServerError;
            newState.previousServerError = undefined;
        }
        this.props.actions.setNavigationBlocked(true);
        this.setState(newState);
    };
    private onPolicySelected = (policy: AccessControlPolicy) => {
        const {accessControlPolicies} = this.state;
        const existingPolicy = accessControlPolicies.find((p) => p.id === policy.id);
        if (existingPolicy) {
            return;
        }
        this.setState({
            accessControlPolicies: [...accessControlPolicies, policy],
            saveNeeded: true,
        });
        this.props.actions.setNavigationBlocked(true);
    };
    private onPolicyRemoveAll = () => {
        const {accessControlPolicies, accessControlPoliciesToRemove} = this.state;
        for (const policy of accessControlPolicies) {
            this.setState({
                accessControlPoliciesToRemove: [...accessControlPoliciesToRemove, policy.id] as string[],
                saveNeeded: true,
            });
        }
        this.setState({
            accessControlPolicies: [],
        });
        this.props.actions.setNavigationBlocked(true);
    };
    private onPolicyRemove = (policyId: string) => {
        const {accessControlPoliciesToRemove, accessControlPolicies} = this.state;
        this.setState({
            accessControlPoliciesToRemove: [...accessControlPoliciesToRemove, policyId],
            accessControlPolicies: accessControlPolicies.filter((policy) => policy.id !== policyId),
            saveNeeded: true,
        });
        this.props.actions.setNavigationBlocked(true);
    };
    private handleChannelRulesChange = (hasChanges: boolean, expression: string, autoSync: boolean) => {
        const hasRealChannelRulesChanges = hasChanges && (
            expression !== this.state.channelRulesOriginalExpression ||
            autoSync !== this.state.channelRulesOriginalAutoSync
        );
        this.setState({
            channelRulesExpression: expression,
            channelRulesAutoSync: autoSync,
            channelRulesHaveChanges: hasChanges,
            policyToggled: true,
        });
        if (hasRealChannelRulesChanges) {
            this.setState({saveNeeded: true});
            this.props.actions.setNavigationBlocked(true);
        }
    };
    private loadUserAttributes = async () => {
        try {
            const result = await this.props.actions.getAccessControlFields('', 100);
            if (result.error) {
                this.setState({
                    userAttributes: [],
                    attributesLoaded: true,
                });
                return;
            }
            let attributes = [];
            if (result.data && Array.isArray(result.data)) {
                attributes = result.data;
            } else if (result.data && result.data.fields && Array.isArray(result.data.fields)) {
                attributes = result.data.fields;
            } else if (result.data && result.data.attributes && Array.isArray(result.data.attributes)) {
                attributes = result.data.attributes;
            } else if (Array.isArray(result)) {
                attributes = result;
            }
            this.setState({
                userAttributes: attributes,
                attributesLoaded: true,
            });
        } catch (error) {
            console.error('Error loading user attributes:', error);
            this.setState({
                userAttributes: [],
                attributesLoaded: true,
            });
        }
    };
    private loadChannelLevelAccessRules = async (channelId: string) => {
        try {
            const result = await this.props.actions.getAccessControlPolicy(channelId);
            if (result.data) {
                const policy = result.data as AccessControlPolicy;
                if (policy.type === 'channel' && policy.rules && policy.rules.length > 0) {
                    const rule = policy.rules[0];
                    const autoSyncValue = policy.active === true;
                    this.setState({
                        channelRulesExpression: rule.expression || '',
                        channelRulesOriginalExpression: rule.expression || '',
                        channelRulesAutoSync: autoSyncValue,
                        channelRulesOriginalAutoSync: autoSyncValue,
                        channelRulesHaveChanges: false,
                    });
                }
            }
        } catch (error) {
        }
    };
    private combineParentAndChannelExpressions = (channelExpression: string): string => {
        const parentExpressions = this.state.accessControlPolicies.
            map((policy) => policy.rules?.[0]?.expression).
            filter((expr) => expr && expr.trim());
        const allExpressions = [];
        if (channelExpression.trim()) {
            allExpressions.push(channelExpression.trim());
        }
        if (parentExpressions.length > 0) {
            allExpressions.push(...parentExpressions);
        }
        if (allExpressions.length === 0) {
            return '';
        } else if (allExpressions.length === 1) {
            return allExpressions[0];
        }
        return allExpressions.
            map((expr) => `(${expr})`).
            join(' && ');
    };
    private calculateMembershipChanges = async (channelExpression: string, autoSyncEnabled: boolean): Promise<{toAdd: string[]; toRemove: string[]}> => {
        const combinedExpression = this.combineParentAndChannelExpressions(channelExpression);
        if (!combinedExpression.trim()) {
            return {toAdd: [], toRemove: []};
        }
        try {
            const matchResult = await this.props.actions.searchUsersForExpression(combinedExpression, '', '', 1000);
            const matchingUserIds = matchResult.data?.users.map((u: any) => u.id) || [];
            const membersResult = await this.props.actions.getChannelMembers(this.props.channelID);
            const currentMemberIds = membersResult.data?.map((m: any) => m.user_id) || [];
            const toAdd = autoSyncEnabled ? matchingUserIds.filter((id: string) => !currentMemberIds.includes(id)) : [];
            const toRemove = currentMemberIds.filter((id: string) => !matchingUserIds.includes(id));
            return {toAdd, toRemove};
        } catch (error) {
            console.error('Failed to calculate membership changes:', error);
            return {toAdd: [], toRemove: []};
        }
    };
    private fetchAccessControlPolicies = (channelId: string) => {
        if (!channelId) {
            return;
        }
        this.props.actions.getAccessControlPolicy(channelId).then((result) => {
            if (result.data) {
                const currentAccessControlPolicy = result.data;
                const policies: AccessControlPolicy[] = [];
                const promises: Array<Promise<any>> = [];
                this.setState({
                    accessControlPolicy: currentAccessControlPolicy,
                });
                if (currentAccessControlPolicy.imports && currentAccessControlPolicy.imports.length > 0) {
                    for (const policyId of currentAccessControlPolicy.imports) {
                        const promise = this.props.actions.getAccessControlPolicy(policyId).then((policyResult) => {
                            if (policyResult.data) {
                                policies.push(policyResult.data as AccessControlPolicy);
                            }
                        });
                        promises.push(promise);
                    }
                    Promise.all(promises).then(() => {
                        this.setState({
                            accessControlPolicies: policies,
                        });
                    });
                } else {
                    this.setState({
                        accessControlPolicies: [],
                    });
                }
            }
        });
    };
    public render = () => {
        const {
            totalGroups,
            saving,
            saveNeeded,
            serverError,
            isSynced,
            isPublic,
            isDefault,
            groups,
            showConvertConfirmModal,
            showRemoveConfirmModal,
            showConvertAndRemoveConfirmModal,
            usersToRemoveCount,
            channelPermissions,
            teamScheme,
            usersToRemove,
            usersToAdd,
            isLocalArchived,
            showArchiveConfirmModal,
            policyToggled,
            accessControlPolicies,
        } = this.state;
        const {channel, team} = this.props;
        if (!channel) {
            return null;
        }
        const missingGroup = (og: {id: string}) => !groups.find((g: Group) => g.id === og.id);
        const removedGroups = this.props.groups.filter(missingGroup);
        const nonArchivedContent = (
            <>
                <ConvertConfirmModal
                    show={showConvertConfirmModal}
                    onCancel={this.hideConvertConfirmModal}
                    onConfirm={this.handleSubmit}
                    displayName={channel.display_name || ''}
                    toPublic={isPublic}
                />
                {this.props.channelModerationEnabled &&
                    <ChannelModeration
                        channelPermissions={channelPermissions}
                        onChannelPermissionsChanged={this.channelPermissionsChanged}
                        teamSchemeID={teamScheme?.id}
                        teamSchemeDisplayName={teamScheme?.display_name}
                        guestAccountsEnabled={this.props.guestAccountsEnabled}
                        isPublic={channel.type === Constants.OPEN_CHANNEL}
                        readOnly={this.props.isDisabled}
                    />
                }
                <RemoveConfirmModal
                    show={showRemoveConfirmModal}
                    onCancel={this.hideRemoveConfirmModal}
                    onConfirm={this.handleSubmit}
                    inChannel={true}
                    amount={usersToRemoveCount}
                />
                <ConvertAndRemoveConfirmModal
                    show={showConvertAndRemoveConfirmModal}
                    onCancel={this.hideConvertAndRemoveConfirmModal}
                    onConfirm={this.handleSubmit}
                    displayName={channel.display_name || ''}
                    toPublic={isPublic}
                    removeAmount={usersToRemoveCount}
                />
                <ChannelAccessRulesConfirmModal
                    show={this.state.showAccessRulesConfirmModal}
                    onHide={this.hideAccessRulesConfirmModal}
                    onConfirm={this.confirmAccessRulesSave}
                    channelName={channel.display_name || channel.name || ''}
                    usersToAdd={this.state.accessRulesUsersToAdd}
                    usersToRemove={this.state.accessRulesUsersToRemove}
                    autoSyncEnabled={this.state.channelRulesAutoSync}
                    isStacked={true}
                />
                <ChannelModes
                    isPublic={isPublic}
                    isSynced={isSynced}
                    isDefault={isDefault}
                    onToggle={this.setToggles}
                    isDisabled={this.props.isDisabled}
                    groupsSupported={this.props.channelGroupsEnabled}
                    abacSupported={this.props.abacSupported}
                    policyEnforced={policyToggled}
                    policyEnforcedToggleAvailable={accessControlPolicies.length === 0}
                />
                {this.props.abacSupported && policyToggled && (
                    <>
                        <ChannelAccessControl
                            parentPolicies={this.state.accessControlPolicies}
                            actions={{
                                onPolicySelected: this.onPolicySelected,
                                onPolicyRemoveAll: this.onPolicyRemoveAll,
                                onPolicyRemove: this.onPolicyRemove,
                                searchPolicies: this.props.actions.searchPolicies,
                            }}
                        />
                        <ChannelLevelAccessRules
                            channel={channel}
                            userAttributes={this.state.userAttributes}
                            onRulesChange={this.handleChannelRulesChange}
                            initialExpression={this.state.channelRulesExpression}
                            initialAutoSync={this.state.channelRulesAutoSync}
                            isDisabled={this.props.isDisabled}
                        />
                    </>
                )}
                {this.props.channelGroupsEnabled && !policyToggled &&
                    <ChannelGroups
                        synced={isSynced}
                        channel={channel}
                        totalGroups={totalGroups}
                        groups={groups}
                        removedGroups={removedGroups}
                        onAddCallback={this.handleGroupChange}
                        onGroupRemoved={this.handleGroupRemoved}
                        setNewGroupRole={this.setNewGroupRole}
                        isDisabled={this.props.isDisabled}
                    />
                }
                {!isSynced &&
                    <ChannelMembers
                        onRemoveCallback={this.addUserToRemove}
                        onAddCallback={this.addUsersToAdd}
                        usersToRemove={usersToRemove}
                        usersToAdd={usersToAdd}
                        updateRole={this.addRolesToUpdate}
                        channelId={this.props.channelID}
                        isDisabled={this.props.isDisabled}
                    />
                }
            </>
        );
        return (
            <div className='wrapper--fixed'>
                <AdminHeader withBackButton={true}>
                    <div>
                        <BlockableLink
                            to='/admin_console/user_management/channels'
                            className='fa fa-angle-left back'
                        />
                        <FormattedMessage
                            id='admin.channel_settings.channel_detail.channel_configuration'
                            defaultMessage='Channel Configuration'
                        />
                    </div>
                </AdminHeader>
                <div className='admin-console__wrapper'>
                    <div className='admin-console__content'>
                        <ChannelProfile
                            channel={channel}
                            team={team}
                            onToggleArchive={this.onToggleArchive}
                            isArchived={isLocalArchived}
                            isDisabled={this.props.isDisabled}
                        />
                        <ConfirmModal
                            show={showArchiveConfirmModal}
                            title={
                                <FormattedMessage
                                    id='admin.channel_settings.channel_detail.archive_confirm.title'
                                    defaultMessage='Save and Archive Channel'
                                />
                            }
                            message={
                                <FormattedMessage
                                    id='admin.channel_settings.channel_detail.archive_confirm.message'
                                    defaultMessage={'Saving will archive the channel from the team and make it\'s contents inaccessible for all users. Are you sure you wish to save and archive this channel?'}
                                />
                            }
                            confirmButtonText={
                                <FormattedMessage
                                    id='admin.channel_settings.channel_detail.archive_confirm.button'
                                    defaultMessage='Save and Archive Channel'
                                />
                            }
                            onConfirm={this.handleSubmit}
                            onCancel={this.hideArchiveConfirmModal}
                        />
                        {!isLocalArchived && nonArchivedContent}
                    </div>
                </div>
                <SaveChangesPanel
                    saving={saving}
                    saveNeeded={saveNeeded}
                    onClick={this.onSave}
                    serverError={serverError}
                    cancelLink='/admin_console/user_management/channels'
                    isDisabled={this.props.isDisabled}
                />
            </div>
        );
    };
}