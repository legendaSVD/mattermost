import React, {useState, useEffect, useCallback, useMemo, useRef} from 'react';
import {FormattedMessage, useIntl} from 'react-intl';
import {useSelector} from 'react-redux';
import type {Channel} from '@mattermost/types/channels';
import type {UserPropertyField} from '@mattermost/types/properties';
import {getAccessControlSettings} from 'mattermost-redux/selectors/entities/access_control';
import {getChannelMessageCount} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUser, isCurrentUserSystemAdmin} from 'mattermost-redux/selectors/entities/users';
import TableEditor from 'components/admin_console/access_control/editors/table_editor/table_editor';
import ConfirmModal from 'components/confirm_modal';
import SystemPolicyIndicator from 'components/system_policy_indicator';
import SaveChangesPanel, {type SaveChangesPanelState} from 'components/widgets/modals/components/save_changes_panel';
import {useChannelAccessControlActions} from 'hooks/useChannelAccessControlActions';
import {useChannelSystemPolicies} from 'hooks/useChannelSystemPolicies';
import type {GlobalState} from 'types/store';
import ChannelAccessRulesConfirmModal from './channel_access_rules_confirm_modal';
import ChannelActivityWarningModal from './channel_activity_warning_modal';
import './channel_settings_access_rules_tab.scss';
const SAVE_RESULT_SAVED = 'saved' as const;
const SAVE_RESULT_ERROR = 'error' as const;
const SAVE_RESULT_CONFIRMATION_REQUIRED = 'confirmation_required' as const;
const MAX_USERS_SEARCH_LIMIT = 1000;
type SaveResult = typeof SAVE_RESULT_SAVED | typeof SAVE_RESULT_ERROR | typeof SAVE_RESULT_CONFIRMATION_REQUIRED;
type ChannelSettingsAccessRulesTabProps = {
    channel: Channel;
    setAreThereUnsavedChanges?: (unsaved: boolean) => void;
    showTabSwitchError?: boolean;
};
function ChannelSettingsAccessRulesTab({
    channel,
    setAreThereUnsavedChanges,
    showTabSwitchError,
}: ChannelSettingsAccessRulesTabProps) {
    const {formatMessage} = useIntl();
    const accessControlSettings = useSelector((state: GlobalState) => getAccessControlSettings(state));
    const currentUser = useSelector(getCurrentUser);
    const channelMessageCount = useSelector((state: GlobalState) => getChannelMessageCount(state, channel.id));
    const isSystemAdmin = useSelector(isCurrentUserSystemAdmin);
    const [expression, setExpression] = useState('');
    const [originalExpression, setOriginalExpression] = useState('');
    const [userAttributes, setUserAttributes] = useState<UserPropertyField[]>([]);
    const [attributesLoaded, setAttributesLoaded] = useState(false);
    const [autoSyncMembers, setAutoSyncMembers] = useState(false);
    const [originalAutoSyncMembers, setOriginalAutoSyncMembers] = useState(false);
    const [saveChangesPanelState, setSaveChangesPanelState] = useState<SaveChangesPanelState>();
    const [formError, setFormError] = useState('');
    const [showSelfExclusionModal, setShowSelfExclusionModal] = useState(false);
    const [showActivityWarningModal, setShowActivityWarningModal] = useState(false);
    const [shouldShowActivityWarning, setShouldShowActivityWarning] = useState(false);
    const [activityWarningModalKey, setActivityWarningModalKey] = useState(0);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [usersToAdd, setUsersToAdd] = useState<string[]>([]);
    const [usersToRemove, setUsersToRemove] = useState<string[]>([]);
    const [isProcessingSave, setIsProcessingSave] = useState(false);
    const actions = useChannelAccessControlActions(channel.id);
    const {policies: systemPolicies, loading: policiesLoading} = useChannelSystemPolicies(channel);
    useEffect(() => {
        const loadAttributes = async () => {
            try {
                const result = await actions.getAccessControlFields('', 100);
                if (result.data) {
                    setUserAttributes(result.data);
                }
                setAttributesLoaded(true);
            } catch (error) {
                setUserAttributes([]);
                const errorMessage = error instanceof Error ? error.message : String(error);
                if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
                    setAttributesLoaded(true);
                }
            }
        };
        loadAttributes();
    }, [actions]);
    useEffect(() => {
        const loadChannelPolicy = async () => {
            try {
                const result = await actions.getChannelPolicy(channel.id);
                if (result.data) {
                    const existingExpression = result.data.rules?.[0]?.expression || '';
                    const existingAutoSync = result.data.active || false;
                    setExpression(existingExpression);
                    setOriginalExpression(existingExpression);
                    setAutoSyncMembers(existingAutoSync);
                    setOriginalAutoSyncMembers(existingAutoSync);
                }
            } catch (error) {
                setExpression('');
                setOriginalExpression('');
            }
        };
        loadChannelPolicy();
    }, [channel.id, actions]);
    useEffect(() => {
        const unsavedChanges =
            expression !== originalExpression ||
            autoSyncMembers !== originalAutoSyncMembers;
        setAreThereUnsavedChanges?.(unsavedChanges);
    }, [expression, originalExpression, autoSyncMembers, originalAutoSyncMembers, setAreThereUnsavedChanges]);
    const handleExpressionChange = useCallback((newExpression: string) => {
        setExpression(newExpression);
        setSaveChangesPanelState(undefined);
    }, []);
    const handleParseError = useCallback((errorMessage?: string) => {
        console.warn('Failed to parse expression in table editor');
        if (errorMessage?.includes('403') || errorMessage?.includes('Forbidden')) {
            return;
        }
        setFormError(formatMessage({
            id: 'channel_settings.access_rules.parse_error',
            defaultMessage: 'Invalid expression format',
        }));
    }, [formatMessage]);
    const isEmptyRulesState = useMemo((): boolean => {
        const hasChannelRules = expression && expression.trim().length > 0;
        const hasSystemPolicies = systemPolicies && systemPolicies.length > 0;
        return !(hasChannelRules || hasSystemPolicies);
    }, [expression, systemPolicies]);
    useEffect(() => {
        if (policiesLoading) {
            return;
        }
        if (isEmptyRulesState && autoSyncMembers) {
            setAutoSyncMembers(false);
        }
    }, [isEmptyRulesState, autoSyncMembers]);
    const handleAutoSyncToggle = useCallback(() => {
        if (isEmptyRulesState) {
            return;
        }
        setAutoSyncMembers((prev) => !prev);
    }, [isEmptyRulesState]);
    const combineSystemAndChannelExpressions = useCallback((channelExpression: string): string => {
        const systemExpressions = systemPolicies.
            map((policy) => policy.rules?.[0]?.expression).
            filter((expr) => expr && expr.trim());
        const allExpressions = [];
        if (channelExpression.trim()) {
            allExpressions.push(channelExpression.trim());
        }
        if (systemExpressions.length > 0) {
            allExpressions.push(...systemExpressions);
        }
        if (allExpressions.length === 0) {
            return '';
        } else if (allExpressions.length === 1) {
            return allExpressions[0];
        }
        return allExpressions.
            map((expr) => `(${expr})`).
            join(' && ');
    }, [systemPolicies]);
    const validateSelfExclusion = useCallback(async (testExpression: string): Promise<boolean> => {
        if (!testExpression.trim()) {
            return true;
        }
        if (!currentUser?.id) {
            setFormError(formatMessage({
                id: 'channel_settings.access_rules.error.no_current_user',
                defaultMessage: 'Cannot validate access rules: current user not found',
            }));
            return false;
        }
        try {
            const result = await actions.validateExpressionAgainstRequester(testExpression);
            if (!result.data?.requester_matches) {
                setShowSelfExclusionModal(true);
                return false;
            }
            return true;
        } catch (error) {
            console.error('Failed to validate self-exclusion:', error);
            setFormError(formatMessage({
                id: 'channel_settings.access_rules.error.validation_failed',
                defaultMessage: 'Failed to validate access rules. Please try again.',
            }));
            return false;
        }
    }, [currentUser?.id]);
    const isBecomingLessRestrictive = useCallback(async (oldExpression: string, newExpression: string): Promise<boolean> => {
        try {
            const hadRules = oldExpression.trim().length > 0;
            const hasRules = newExpression.trim().length > 0;
            if (!hadRules) {
                return false;
            }
            if (!hasRules) {
                return true;
            }
            const oldCombined = combineSystemAndChannelExpressions(oldExpression);
            const newCombined = combineSystemAndChannelExpressions(newExpression);
            const oldMatchResult = await actions.searchUsers(oldCombined, '', '', MAX_USERS_SEARCH_LIMIT);
            const oldMatchingUserIds = oldMatchResult.data?.users.map((u) => u.id) || [];
            const newMatchResult = await actions.searchUsers(newCombined, '', '', MAX_USERS_SEARCH_LIMIT);
            const newMatchingUserIds = newMatchResult.data?.users.map((u) => u.id) || [];
            const newlyMatchingUsers = newMatchingUserIds.filter((id) => !oldMatchingUserIds.includes(id));
            if (newlyMatchingUsers.length > 0) {
                return true;
            }
            const removedUsers = oldMatchingUserIds.filter((id) => !newMatchingUserIds.includes(id));
            if (removedUsers.length > 0) {
                return false;
            }
            return oldExpression.trim() !== newExpression.trim();
        } catch (error) {
            console.error('Failed to compare expression restrictiveness:', error);
            return true;
        }
    }, [actions, combineSystemAndChannelExpressions]);
    const calculateMembershipChanges = useCallback(async (channelExpression: string): Promise<{toAdd: string[]; toRemove: string[]; potentialToAdd: string[]}> => {
        const combinedExpression = combineSystemAndChannelExpressions(channelExpression);
        if (!combinedExpression.trim()) {
            return {toAdd: [], toRemove: [], potentialToAdd: []};
        }
        try {
            const matchResult = await actions.searchUsers(combinedExpression, '', '', MAX_USERS_SEARCH_LIMIT);
            const matchingUserIds = matchResult.data?.users.map((u) => u.id) || [];
            const membersResult = await actions.getChannelMembers(channel.id);
            const currentMemberIds = membersResult.data?.map((m: {user_id: string}) => m.user_id) || [];
            const potentialToAdd = matchingUserIds.filter((id) => !currentMemberIds.includes(id));
            const toAdd = autoSyncMembers ? potentialToAdd : [];
            const toRemove = currentMemberIds.filter((id) => !matchingUserIds.includes(id));
            return {toAdd, toRemove, potentialToAdd};
        } catch (error) {
            console.error('Failed to calculate membership changes:', error);
            return {toAdd: [], toRemove: [], potentialToAdd: []};
        }
    }, [channel.id, autoSyncMembers, actions, combineSystemAndChannelExpressions]);
    const performSave = useCallback(async (): Promise<boolean> => {
        try {
            setIsProcessingSave(true);
            const willBeEmptyState = isEmptyRulesState;
            if (willBeEmptyState) {
                try {
                    await actions.deleteChannelPolicy(channel.id);
                } catch (deleteError: unknown) {
                    const errorMessage = deleteError instanceof Error ? deleteError.message : String(deleteError);
                    if (errorMessage && !errorMessage.includes('not found')) {
                        throw new Error(errorMessage || 'Failed to delete channel policy');
                    }
                }
                setOriginalExpression('');
                setOriginalAutoSyncMembers(false);
                setShowConfirmModal(false);
                setUsersToAdd([]);
                setUsersToRemove([]);
                return true;
            }
            const policy = {
                id: channel.id,
                name: channel.display_name,
                type: 'channel',
                version: 'v0.2',
                active: false,
                revision: 1,
                created_at: Date.now(),
                rules: expression.trim() ? [{
                    actions: ['*'],
                    expression: expression.trim(),
                }] : [],
                imports: systemPolicies.map((p) => p.id),
            };
            const result = await actions.saveChannelPolicy(policy);
            if (result.error) {
                throw new Error(result.error.message || 'Failed to save policy');
            }
            try {
                await actions.updateAccessControlPoliciesActive([{id: channel.id, active: autoSyncMembers}]);
            } catch (activeError) {
                console.error('Failed to update policy active status:', activeError);
            }
            if (expression.trim()) {
                try {
                    await actions.createAccessControlSyncJob({
                        policy_id: channel.id,
                    });
                } catch (jobError) {
                    console.error('Failed to create access control sync job:', jobError);
                }
            }
            setOriginalExpression(expression);
            setOriginalAutoSyncMembers(autoSyncMembers);
            setShowConfirmModal(false);
            setUsersToAdd([]);
            setUsersToRemove([]);
            return true;
        } catch (error) {
            console.error('Failed to save access rules:', error);
            setFormError(formatMessage({
                id: 'channel_settings.access_rules.save_error',
                defaultMessage: 'Failed to save access rules',
            }));
            return false;
        } finally {
            setIsProcessingSave(false);
        }
    }, [channel.id, channel.display_name, expression, autoSyncMembers, systemPolicies, actions, formatMessage, isEmptyRulesState]);
    const handleSave = useCallback(async (): Promise<SaveResult> => {
        try {
            const hasChannelHistory = (channelMessageCount?.total ?? 0) > 0;
            const hadRulesBefore = originalExpression.trim().length > 0;
            const hasRulesNow = expression.trim().length > 0;
            const isRemovingAllRules = hadRulesBefore && !hasRulesNow;
            if (isEmptyRulesState) {
                if (isRemovingAllRules && hasChannelHistory) {
                    setShouldShowActivityWarning(true);
                    setActivityWarningModalKey((prev) => prev + 1);
                    setShowActivityWarningModal(true);
                    return SAVE_RESULT_CONFIRMATION_REQUIRED;
                }
                const success = await performSave();
                const result = success ? SAVE_RESULT_SAVED : SAVE_RESULT_ERROR;
                return result;
            }
            if (autoSyncMembers && isEmptyRulesState) {
                setFormError(formatMessage({
                    id: 'channel_settings.access_rules.expression_required_for_autosync',
                    defaultMessage: 'Access rules are required when auto-add members is enabled',
                }));
                return SAVE_RESULT_ERROR;
            }
            if (expression.trim()) {
                const isValid = await validateSelfExclusion(expression);
                if (!isValid) {
                    return SAVE_RESULT_ERROR;
                }
            }
            const changes = await calculateMembershipChanges(expression);
            const becomingLessRestrictive = await isBecomingLessRestrictive(originalExpression, expression);
            const willImmediatelyAddUsers = changes.toAdd.length > 0;
            const isAddingFirstRules = !hadRulesBefore && hasRulesNow;
            const rulesBecomingLessRestrictiveWithAutoAddDisabled = !autoSyncMembers && becomingLessRestrictive;
            const rulesBecomingLessRestrictiveWithAutoAddEnabled = autoSyncMembers && becomingLessRestrictive;
            const addingUsersWithAutoAddEnabled = autoSyncMembers && willImmediatelyAddUsers;
            const shouldShowWarning = hasChannelHistory && (
                isRemovingAllRules ||
                rulesBecomingLessRestrictiveWithAutoAddDisabled ||
                rulesBecomingLessRestrictiveWithAutoAddEnabled ||
                addingUsersWithAutoAddEnabled
            ) && !isAddingFirstRules;
            if (changes.toAdd.length > 0 || changes.toRemove.length > 0) {
                setUsersToAdd(changes.toAdd);
                setUsersToRemove(changes.toRemove);
                setShouldShowActivityWarning(shouldShowWarning);
                setShowConfirmModal(true);
                return SAVE_RESULT_CONFIRMATION_REQUIRED;
            }
            if (shouldShowWarning) {
                setShouldShowActivityWarning(true);
                setActivityWarningModalKey((prev) => prev + 1);
                setShowActivityWarningModal(true);
                return SAVE_RESULT_CONFIRMATION_REQUIRED;
            }
            const success = await performSave();
            const finalResult = success ? SAVE_RESULT_SAVED : SAVE_RESULT_ERROR;
            return finalResult;
        } catch (error) {
            console.error('handleSave: Caught error in save process:', error);
            setFormError(formatMessage({
                id: 'channel_settings.access_rules.save_error',
                defaultMessage: 'Failed to save access rules',
            }));
            return SAVE_RESULT_ERROR;
        }
    }, [expression, originalExpression, autoSyncMembers, formatMessage, validateSelfExclusion, calculateMembershipChanges, performSave, isEmptyRulesState, channelMessageCount, isBecomingLessRestrictive]);
    const saveInProgressRef = useRef(false);
    const handleConfirmSave = useCallback(async () => {
        if (saveInProgressRef.current) {
            return;
        }
        setShowConfirmModal(false);
        if (shouldShowActivityWarning) {
            setActivityWarningModalKey((prev) => prev + 1);
            setShowActivityWarningModal(true);
            return;
        }
        saveInProgressRef.current = true;
        try {
            const success = await performSave();
            if (success) {
                setSaveChangesPanelState(SAVE_RESULT_SAVED);
            } else {
                setSaveChangesPanelState(SAVE_RESULT_ERROR);
            }
        } finally {
            saveInProgressRef.current = false;
        }
    }, [shouldShowActivityWarning, performSave]);
    const handleSaveChanges = useCallback(async () => {
        if (saveInProgressRef.current) {
            return;
        }
        saveInProgressRef.current = true;
        try {
            const result = await handleSave();
            if (result === SAVE_RESULT_SAVED) {
                setSaveChangesPanelState(SAVE_RESULT_SAVED);
            } else if (result === SAVE_RESULT_ERROR) {
                setSaveChangesPanelState(SAVE_RESULT_ERROR);
            }
        } finally {
            saveInProgressRef.current = false;
        }
    }, [handleSave]);
    const handleCancel = useCallback(() => {
        setExpression(originalExpression);
        setAutoSyncMembers(originalAutoSyncMembers);
        setFormError('');
        setSaveChangesPanelState(undefined);
    }, [originalExpression, originalAutoSyncMembers]);
    const handleClose = useCallback(() => {
        setSaveChangesPanelState(undefined);
    }, []);
    const handleActivityWarningContinue = useCallback(async () => {
        setShowActivityWarningModal(false);
        saveInProgressRef.current = true;
        try {
            const success = await performSave();
            if (success) {
                setSaveChangesPanelState(SAVE_RESULT_SAVED);
            } else {
                setSaveChangesPanelState(SAVE_RESULT_ERROR);
            }
        } finally {
            saveInProgressRef.current = false;
        }
    }, [performSave]);
    const handleActivityWarningClose = useCallback(() => {
        setShowActivityWarningModal(false);
    }, []);
    const hasErrors = Boolean(formError) || Boolean(showTabSwitchError);
    const shouldShowPanel = useMemo(() => {
        const unsavedChanges =
            expression !== originalExpression ||
            autoSyncMembers !== originalAutoSyncMembers;
        return unsavedChanges || saveChangesPanelState === SAVE_RESULT_SAVED;
    }, [expression, originalExpression, autoSyncMembers, originalAutoSyncMembers, saveChangesPanelState]);
    return (
        <div className='ChannelSettingsModal__accessRulesTab'>
            {}
            {!policiesLoading && systemPolicies.length > 0 && (
                <div className='ChannelSettingsModal__systemPolicies'>
                    <SystemPolicyIndicator
                        policies={systemPolicies}
                        resourceType='channel'
                        showPolicyNames={true}
                        variant='detailed'
                    />
                </div>
            )}
            <div className='ChannelSettingsModal__accessRulesHeader'>
                <h3 className='ChannelSettingsModal__accessRulesTitle'>
                    {formatMessage({id: 'channel_settings.access_rules.title', defaultMessage: 'Access Rules'})}
                </h3>
                <p className='ChannelSettingsModal__accessRulesSubtitle'>
                    {formatMessage({
                        id: 'channel_settings.access_rules.subtitle',
                        defaultMessage: 'Select user attributes and values as rules to restrict channel membership',
                    })}
                </p>
            </div>
            {}
            {attributesLoaded && (
                <div className='ChannelSettingsModal__accessRulesEditor'>
                    <TableEditor
                        value={expression}
                        onChange={handleExpressionChange}
                        onValidate={() => setFormError('')}
                        userAttributes={userAttributes}
                        onParseError={handleParseError}
                        channelId={channel.id}
                        actions={actions}
                        enableUserManagedAttributes={accessControlSettings?.EnableUserManagedAttributes || false}
                        isSystemAdmin={isSystemAdmin}
                        validateExpressionAgainstRequester={actions.validateExpressionAgainstRequester}
                    />
                </div>
            )}
            {}
            <hr className='ChannelSettingsModal__divider'/>
            {}
            <div className='ChannelSettingsModal__autoSyncSection'>
                <div className='ChannelSettingsModal__autoSyncCheckboxContainer'>
                    <input
                        type='checkbox'
                        className='ChannelSettingsModal__autoSyncCheckbox'
                        checked={autoSyncMembers}
                        onChange={handleAutoSyncToggle}
                        disabled={isEmptyRulesState}
                        id='autoSyncMembersCheckbox'
                        name='autoSyncMembers'
                    />
                    <label
                        htmlFor='autoSyncMembersCheckbox'
                        className='ChannelSettingsModal__autoSyncLabel'
                        title={(() => {
                            if (isEmptyRulesState) {
                                return formatMessage({
                                    id: 'channel_settings.access_rules.auto_sync_disabled_empty_state',
                                    defaultMessage: 'Auto-add is disabled because no access rules are defined',
                                });
                            }
                            if (!expression.trim()) {
                                return formatMessage({
                                    id: 'channel_settings.access_rules.auto_sync_requires_expression',
                                    defaultMessage: 'Define access rules to enable auto-add members',
                                });
                            }
                            return undefined;
                        })()}
                    >
                        <span className={`ChannelSettingsModal__autoSyncText ${(isEmptyRulesState && systemPolicies.length === 0) ? 'disabled' : ''}`}>
                            {formatMessage({
                                id: 'channel_settings.access_rules.auto_sync',
                                defaultMessage: 'Auto-add members based on access rules',
                            })}
                        </span>
                    </label>
                </div>
                <p className='ChannelSettingsModal__autoSyncDescription'>
                    {(() => {
                        if (autoSyncMembers) {
                            return formatMessage({
                                id: 'channel_settings.access_rules.auto_sync_enabled_description',
                                defaultMessage: 'Users who match the configured attribute values will be automatically added as members and those who no longer match will be removed.',
                            });
                        }
                        return formatMessage({
                            id: 'channel_settings.access_rules.auto_sync_disabled_description',
                            defaultMessage: 'Access rules will prevent unauthorized users from joining, but will not automatically add qualifying members.',
                        });
                    })()}
                </p>
            </div>
            {}
            {shouldShowPanel && (
                <SaveChangesPanel
                    handleSubmit={handleSaveChanges}
                    handleCancel={handleCancel}
                    handleClose={handleClose}
                    tabChangeError={hasErrors}
                    state={hasErrors ? SAVE_RESULT_ERROR : saveChangesPanelState}
                    customErrorMessage={formError || (showTabSwitchError ? undefined : formatMessage({
                        id: 'channel_settings.access_rules.form_error',
                        defaultMessage: 'There are errors in the form above',
                    }))}
                    cancelButtonText={formatMessage({
                        id: 'channel_settings.save_changes_panel.reset',
                        defaultMessage: 'Reset',
                    })}
                />
            )}
            {}
            <ConfirmModal
                show={showSelfExclusionModal}
                title={
                    <FormattedMessage
                        id='channel_settings.access_rules.error.self_exclusion_title'
                        defaultMessage='Cannot save access rules'
                    />
                }
                message={
                    <FormattedMessage
                        id='channel_settings.access_rules.error.self_exclusion_message'
                        defaultMessage="You cannot set this rule because it would remove you from the channel. Please update the access rules to make sure you satisfy them and they don't cause any unintended issues."
                    />
                }
                confirmButtonText={
                    <FormattedMessage
                        id='channel_settings.access_rules.error.back_to_editing'
                        defaultMessage='Back to editing'
                    />
                }
                onConfirm={() => setShowSelfExclusionModal(false)}
                onCancel={() => setShowSelfExclusionModal(false)}
                hideCancel={true}
                confirmButtonClass='btn btn-primary'
                isStacked={true}
            />
            {}
            <ChannelAccessRulesConfirmModal
                show={showConfirmModal}
                onHide={() => {
                    setShowConfirmModal(false);
                    setUsersToAdd([]);
                    setUsersToRemove([]);
                    if (saveChangesPanelState === SAVE_RESULT_ERROR) {
                        setSaveChangesPanelState(undefined);
                    }
                }}
                onConfirm={handleConfirmSave}
                channelName={channel.display_name}
                usersToAdd={usersToAdd}
                usersToRemove={usersToRemove}
                isProcessing={isProcessingSave}
                autoSyncEnabled={autoSyncMembers}
                isStacked={true}
                willShowActivityWarning={shouldShowActivityWarning}
            />
            {}
            <ChannelActivityWarningModal
                key={activityWarningModalKey}
                isOpen={showActivityWarningModal}
                onClose={handleActivityWarningClose}
                onConfirm={handleActivityWarningContinue}
            />
        </div>
    );
}
export default ChannelSettingsAccessRulesTab;