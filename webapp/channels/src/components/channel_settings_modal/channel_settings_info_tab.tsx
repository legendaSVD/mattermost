import React, {useCallback, useState, useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {useDispatch, useSelector} from 'react-redux';
import type {Channel, ChannelType} from '@mattermost/types/channels';
import type {ServerError} from '@mattermost/types/errors';
import {patchChannel, updateChannelPrivacy} from 'mattermost-redux/actions/channels';
import {General} from 'mattermost-redux/constants';
import Permissions from 'mattermost-redux/constants/permissions';
import {haveIChannelPermission} from 'mattermost-redux/selectors/entities/roles';
import {
    setShowPreviewOnChannelSettingsHeaderModal,
    setShowPreviewOnChannelSettingsPurposeModal,
} from 'actions/views/textbox';
import {
    showPreviewOnChannelSettingsHeaderModal,
    showPreviewOnChannelSettingsPurposeModal,
} from 'selectors/views/textbox';
import ConvertConfirmModal from 'components/admin_console/team_channel_settings/convert_confirm_modal';
import ChannelNameFormField from 'components/channel_name_form_field/channel_name_form_field';
import type {TextboxElement} from 'components/textbox';
import AdvancedTextbox from 'components/widgets/advanced_textbox/advanced_textbox';
import SaveChangesPanel, {type SaveChangesPanelState} from 'components/widgets/modals/components/save_changes_panel';
import PublicPrivateSelector from 'components/widgets/public-private-selector/public-private-selector';
import Constants from 'utils/constants';
import type {GlobalState} from 'types/store';
type ChannelSettingsInfoTabProps = {
    channel: Channel;
    onCancel?: () => void;
    setAreThereUnsavedChanges?: (unsaved: boolean) => void;
    showTabSwitchError?: boolean;
};
function ChannelSettingsInfoTab({
    channel,
    onCancel,
    setAreThereUnsavedChanges,
    showTabSwitchError,
}: ChannelSettingsInfoTabProps) {
    const {formatMessage} = useIntl();
    const dispatch = useDispatch();
    const shouldShowPreviewPurpose = useSelector(showPreviewOnChannelSettingsPurposeModal);
    const shouldShowPreviewHeader = useSelector(showPreviewOnChannelSettingsHeaderModal);
    const isPrivate = channel.type === Constants.PRIVATE_CHANNEL;
    const isDirect = channel.type === Constants.DM_CHANNEL;
    const isGroup = channel.type === Constants.GM_CHANNEL;
    const isDMorGroupChannel = isDirect || isGroup;
    const canConvertToPrivate = useSelector((state: GlobalState) => {
        if (isDMorGroupChannel) {
            return false;
        }
        return haveIChannelPermission(state, channel.team_id, channel.id, Permissions.CONVERT_PUBLIC_CHANNEL_TO_PRIVATE);
    });
    const canConvertToPublic = useSelector((state: GlobalState) => {
        if (isDMorGroupChannel) {
            return false;
        }
        return haveIChannelPermission(state, channel.team_id, channel.id, Permissions.CONVERT_PRIVATE_CHANNEL_TO_PUBLIC);
    });
    const channelPropertiesPermission = isPrivate ? Permissions.MANAGE_PRIVATE_CHANNEL_PROPERTIES : Permissions.MANAGE_PUBLIC_CHANNEL_PROPERTIES;
    const canManageChannelProperties = useSelector((state: GlobalState) => {
        if (isDMorGroupChannel) {
            return true;
        }
        return haveIChannelPermission(state, channel.team_id, channel.id, channelPropertiesPermission);
    });
    const HEADER_MAX_LENGTH = 1024;
    const [internalUrlError, setUrlError] = useState('');
    const [channelNameError, setChannelNameError] = useState('');
    const [characterLimitExceeded, setCharacterLimitExceeded] = useState(false);
    const [showConvertConfirmModal, setShowConvertConfirmModal] = useState(false);
    const [displayName, setDisplayName] = useState(channel?.display_name ?? '');
    const [channelUrl, setChannelURL] = useState(channel?.name ?? '');
    const [channelPurpose, setChannelPurpose] = useState(channel.purpose ?? '');
    const [channelHeader, setChannelHeader] = useState(channel?.header ?? '');
    const [channelType, setChannelType] = useState<ChannelType>(channel?.type as ChannelType ?? Constants.OPEN_CHANNEL as ChannelType);
    const [formError, setFormError] = useState('');
    const [saveChangesPanelState, setSaveChangesPanelState] = useState<SaveChangesPanelState>();
    const handleChannelNameError = useCallback((isError: boolean, errorMessage?: string) => {
        setChannelNameError(errorMessage || '');
        if (isError && errorMessage) {
            setFormError(errorMessage);
        } else if (formError === channelNameError) {
            setFormError('');
        }
    }, [channelNameError, formError, setFormError]);
    useEffect(() => {
        const unsavedChanges = channel ? (
            displayName.trim() !== channel.display_name ||
            channelUrl.trim() !== channel.name ||
            channelPurpose.trim() !== channel.purpose ||
            channelHeader.trim() !== channel.header ||
            channelType !== channel.type
        ) : false;
        setAreThereUnsavedChanges?.(unsavedChanges);
    }, [channel, displayName, channelUrl, channelPurpose, channelHeader, channelType, setAreThereUnsavedChanges]);
    const handleURLChange = useCallback((newURL: string) => {
        if (internalUrlError) {
            setFormError('');
            setSaveChangesPanelState(undefined);
            setUrlError('');
        }
        setChannelURL(newURL.trim());
    }, [internalUrlError]);
    const togglePurposePreview = useCallback(() => {
        dispatch(setShowPreviewOnChannelSettingsPurposeModal(!shouldShowPreviewPurpose));
    }, [dispatch, shouldShowPreviewPurpose]);
    const toggleHeaderPreview = useCallback(() => {
        dispatch(setShowPreviewOnChannelSettingsHeaderModal(!shouldShowPreviewHeader));
    }, [dispatch, shouldShowPreviewHeader]);
    const handleChannelTypeChange = (type: ChannelType) => {
        if (channel.type === Constants.PRIVATE_CHANNEL && type === Constants.OPEN_CHANNEL) {
            return;
        }
        if (channel.type === Constants.OPEN_CHANNEL && type === Constants.PRIVATE_CHANNEL && !canConvertToPrivate) {
            return;
        }
        setChannelType(type);
        setFormError('');
    };
    const handleHeaderChange = useCallback((e: React.ChangeEvent<TextboxElement>) => {
        const newValue = e.target.value;
        setChannelHeader(newValue);
        if (newValue.trim().length > HEADER_MAX_LENGTH) {
            setFormError(formatMessage({
                id: 'edit_channel_header_modal.error',
                defaultMessage: 'The text entered exceeds the character limit. The channel header is limited to {maxLength} characters.',
            }, {
                maxLength: HEADER_MAX_LENGTH,
            }));
        } else if (formError && !channelNameError) {
            setFormError('');
        }
    }, [HEADER_MAX_LENGTH, formError, channelNameError, setFormError, formatMessage]);
    const handlePurposeChange = useCallback((e: React.ChangeEvent<TextboxElement>) => {
        const newValue = e.target.value;
        setChannelPurpose(newValue);
        if (newValue.trim().length > Constants.MAX_CHANNELPURPOSE_LENGTH) {
            setFormError(formatMessage({
                id: 'channel_settings.error_purpose_length',
                defaultMessage: 'The text entered exceeds the character limit. The channel purpose is limited to {maxLength} characters.',
            }, {
                maxLength: Constants.MAX_CHANNELPURPOSE_LENGTH,
            }));
        } else if (formError && !channelNameError) {
            setFormError('');
        }
    }, [formError, channelNameError, setFormError, formatMessage]);
    const handleServerError = useCallback((err: ServerError) => {
        const errorMsg = err.message || formatMessage({id: 'channel_settings.unknown_error', defaultMessage: 'Something went wrong.'});
        setFormError(errorMsg);
        setSaveChangesPanelState('error');
        if (err.message && (
            err.message.toLowerCase().includes('url') ||
            err.message.toLowerCase().includes('name') ||
            err.message.toLowerCase().includes('already exists')
        )) {
            setUrlError(errorMsg);
        }
    }, [formatMessage]);
    const handleSave = useCallback(async (): Promise<boolean> => {
        if (!channel) {
            return false;
        }
        if (!displayName.trim()) {
            setFormError(formatMessage({
                id: 'channel_settings.error_display_name_required',
                defaultMessage: 'Channel name is required',
            }));
            return false;
        }
        if (channel.type === Constants.OPEN_CHANNEL && channelType === Constants.PRIVATE_CHANNEL) {
            const {error} = await dispatch(updateChannelPrivacy(channel.id, General.PRIVATE_CHANNEL));
            if (error) {
                handleServerError(error as ServerError);
                return false;
            }
        }
        const updated: Partial<Channel> = {};
        if (!isDMorGroupChannel && displayName.trim() !== channel.display_name) {
            updated.display_name = displayName.trim();
        }
        if (!isDMorGroupChannel && channelUrl.trim() !== channel.name) {
            updated.name = channelUrl.trim();
        }
        if (!isDMorGroupChannel && channelPurpose.trim() !== channel.purpose) {
            updated.purpose = channelPurpose.trim();
        }
        if (channelHeader.trim() !== channel.header) {
            updated.header = channelHeader.trim();
        }
        if (Object.keys(updated).length === 0) {
            return true;
        }
        const {data, error} = await dispatch(patchChannel(channel.id, updated));
        if (error) {
            handleServerError(error as ServerError);
            return false;
        }
        if (!isDMorGroupChannel) {
            setDisplayName(data?.display_name ?? updated.display_name ?? channel.display_name);
            setChannelURL(data?.name ?? updated.name ?? channel.name);
            setChannelPurpose(data?.purpose ?? updated.purpose ?? channel.purpose);
        }
        setChannelHeader(data?.header ?? updated.header ?? channel.header);
        return true;
    }, [channel, displayName, channelType, isDMorGroupChannel, channelUrl, channelPurpose, channelHeader, dispatch, formatMessage, handleServerError]);
    const handleSaveChanges = useCallback(async () => {
        const isPrivacyChanging = channel.type === Constants.OPEN_CHANNEL &&
                                 channelType === Constants.PRIVATE_CHANNEL;
        if (isPrivacyChanging) {
            setShowConvertConfirmModal(true);
            return;
        }
        const success = await handleSave();
        if (!success) {
            setSaveChangesPanelState('error');
            return;
        }
        setSaveChangesPanelState('saved');
    }, [channel, channelType, handleSave]);
    const handleClose = useCallback(() => {
        setSaveChangesPanelState(undefined);
    }, []);
    const hideConvertConfirmModal = useCallback(() => {
        setShowConvertConfirmModal(false);
    }, []);
    const handleCancel = useCallback(() => {
        setSaveChangesPanelState(undefined);
        setDisplayName(channel?.display_name ?? '');
        setChannelURL(channel?.name ?? '');
        setChannelPurpose(channel?.purpose ?? '');
        setChannelHeader(channel?.header ?? '');
        setChannelType(channel?.type as ChannelType ?? Constants.OPEN_CHANNEL as ChannelType);
        setUrlError('');
        setFormError('');
        setCharacterLimitExceeded(false);
        setChannelNameError('');
        if (onCancel) {
            onCancel();
        }
    }, [channel, onCancel, setFormError]);
    const hasErrors = Boolean(formError) ||
                     characterLimitExceeded ||
                     Boolean(channelNameError) ||
                     Boolean(showTabSwitchError) ||
                     Boolean(internalUrlError);
    const shouldShowPanel = useMemo(() => {
        let unsavedChanges = false;
        if (channel) {
            unsavedChanges = unsavedChanges || channelHeader.trim() !== channel.header;
            if (!isDMorGroupChannel) {
                unsavedChanges = unsavedChanges || displayName.trim() !== channel.display_name;
                unsavedChanges = unsavedChanges || channelUrl.trim() !== channel.name;
                unsavedChanges = unsavedChanges || channelPurpose.trim() !== channel.purpose;
                unsavedChanges = unsavedChanges || channelType !== channel.type;
            }
        }
        return unsavedChanges || saveChangesPanelState === 'saved';
    }, [channel, isDMorGroupChannel, displayName, channelUrl, channelPurpose, channelHeader, channelType, saveChangesPanelState]);
    return (
        <div className='ChannelSettingsModal__infoTab'>
            {}
            <ConvertConfirmModal
                show={showConvertConfirmModal}
                onCancel={hideConvertConfirmModal}
                onConfirm={async () => {
                    hideConvertConfirmModal();
                    const success = await handleSave();
                    if (!success) {
                        setSaveChangesPanelState('error');
                        return;
                    }
                    setSaveChangesPanelState('saved');
                }}
                displayName={channel?.display_name || ''}
                toPublic={false}
            />
            {}
            <div
                className='ChannelSettingsModal__infoTabTitle'
            >
                {formatMessage({id: 'channel_settings.channel_info_tab.name', defaultMessage: 'Channel Info'})}
            </div>
            {!isDMorGroupChannel && (
                <ChannelNameFormField
                    value={displayName}
                    name='channel-settings-name'
                    placeholder={formatMessage({
                        id: 'channel_settings_modal.name.placeholder',
                        defaultMessage: 'Enter a name for your channel',
                    })}
                    onDisplayNameChange={(name) => {
                        setDisplayName(name);
                    }}
                    onURLChange={handleURLChange}
                    onErrorStateChange={handleChannelNameError}
                    urlError={internalUrlError}
                    currentUrl={channelUrl}
                    readOnly={!canManageChannelProperties}
                    isEditingExistingChannel={true}
                />
            )}
            {}
            {!isDMorGroupChannel && (
                <PublicPrivateSelector
                    className='ChannelSettingsModal__typeSelector'
                    selected={channelType}
                    publicButtonProps={{
                        title: formatMessage({id: 'channel_modal.type.public.title', defaultMessage: 'Public Channel'}),
                        description: formatMessage({id: 'channel_modal.type.public.description', defaultMessage: 'Anyone can join'}),
                        disabled: channel.type === Constants.PRIVATE_CHANNEL || !canConvertToPublic,
                    }}
                    privateButtonProps={{
                        title: formatMessage({id: 'channel_modal.type.private.title', defaultMessage: 'Private Channel'}),
                        description: formatMessage({id: 'channel_modal.type.private.description', defaultMessage: 'Only invited members'}),
                        disabled: !canConvertToPrivate,
                    }}
                    onChange={handleChannelTypeChange}
                />
            )}
            {}
            {!isDMorGroupChannel && (
                <AdvancedTextbox
                    id='channel_settings_purpose_textbox'
                    value={channelPurpose}
                    channelId={channel.id}
                    onChange={handlePurposeChange}
                    createMessage={formatMessage({
                        id: 'channel_settings_modal.purpose.placeholder',
                        defaultMessage: 'Enter a purpose for this channel (optional)',
                    })}
                    maxLength={Constants.MAX_CHANNELPURPOSE_LENGTH}
                    preview={shouldShowPreviewPurpose}
                    togglePreview={togglePurposePreview}
                    useChannelMentions={false}
                    onKeyPress={() => {}}
                    descriptionMessage={formatMessage({
                        id: 'channel_settings.purpose.description',
                        defaultMessage: 'Describe how this channel should be used.',
                    })}
                    hasError={channelPurpose.length > Constants.MAX_CHANNELPURPOSE_LENGTH}
                    errorMessage={channelPurpose.length > Constants.MAX_CHANNELPURPOSE_LENGTH ? formatMessage({
                        id: 'channel_settings.error_purpose_length',
                        defaultMessage: 'The text entered exceeds the character limit. The channel purpose is limited to {maxLength} characters.',
                    }, {
                        maxLength: Constants.MAX_CHANNELPURPOSE_LENGTH,
                    }) : undefined
                    }
                    showCharacterCount={channelPurpose.length > Constants.MAX_CHANNELPURPOSE_LENGTH}
                    readOnly={!canManageChannelProperties}
                    name={formatMessage({id: 'channel_settings.purpose.label', defaultMessage: 'Channel Purpose'})}
                />
            )}
            {}
            <AdvancedTextbox
                id='channel_settings_header_textbox'
                value={channelHeader}
                channelId={channel.id}
                onChange={handleHeaderChange}
                createMessage={formatMessage({
                    id: 'channel_settings_modal.header.placeholder',
                    defaultMessage: 'Enter a header for this channel',
                })}
                maxLength={HEADER_MAX_LENGTH}
                preview={shouldShowPreviewHeader}
                togglePreview={toggleHeaderPreview}
                useChannelMentions={false}
                onKeyPress={() => {}}
                descriptionMessage={formatMessage({
                    id: 'channel_settings.purpose.header',
                    defaultMessage: 'This is the text that will appear in the header of the channel beside the channel name. You can use markdown to include links by typing [Link Title](http://example.com).',
                })}
                hasError={channelHeader.length > HEADER_MAX_LENGTH}
                errorMessage={channelHeader.length > HEADER_MAX_LENGTH ? formatMessage({
                    id: 'edit_channel_header_modal.error',
                    defaultMessage: 'The text entered exceeds the character limit. The channel header is limited to {maxLength} characters.',
                }, {
                    maxLength: HEADER_MAX_LENGTH,
                }) : undefined
                }
                showCharacterCount={channelHeader.length > HEADER_MAX_LENGTH}
                readOnly={!canManageChannelProperties}
                name={formatMessage({id: 'channel_settings.header.label', defaultMessage: 'Channel Header'})}
            />
            {}
            {(canManageChannelProperties && shouldShowPanel) && (
                <SaveChangesPanel
                    handleSubmit={handleSaveChanges}
                    handleCancel={handleCancel}
                    handleClose={handleClose}
                    tabChangeError={hasErrors}
                    state={hasErrors ? 'error' : saveChangesPanelState}
                    {...(!showTabSwitchError && {
                        customErrorMessage: formatMessage({
                            id: 'channel_settings.save_changes_panel.standard_error',
                            defaultMessage: 'There are errors in the form above',
                        }),
                    })}
                    cancelButtonText={formatMessage({
                        id: 'channel_settings.save_changes_panel.reset',
                        defaultMessage: 'Reset',
                    })}
                />
            )}
        </div>
    );
}
export default ChannelSettingsInfoTab;