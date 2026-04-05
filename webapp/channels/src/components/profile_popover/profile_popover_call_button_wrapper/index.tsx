import React from 'react';
import {useIntl} from 'react-intl';
import {useSelector} from 'react-redux';
import {getChannelByName} from 'mattermost-redux/selectors/entities/channels';
import {getUser} from 'mattermost-redux/selectors/entities/users';
import {isSystemAdmin} from 'mattermost-redux/utils/user_utils';
import {
    isCallsEnabled as getIsCallsEnabled,
    getSessionsInCalls,
    getCallsConfig,
    callsChannelExplicitlyDisabled,
    callsChannelExplicitlyEnabled,
} from 'selectors/calls';
import ProfilePopoverCallButton from 'components/profile_popover/profile_popover_calls_button';
import WithTooltip from 'components/with_tooltip';
import {getDirectChannelName} from 'utils/utils';
import type {GlobalState} from 'types/store';
type Props = {
    userId: string;
    currentUserId: string;
    fullname: string;
    username: string;
}
export function isUserInCall(state: GlobalState, userId: string, channelId: string) {
    const sessionsInCall = getSessionsInCalls(state)[channelId] || {};
    for (const session of Object.values(sessionsInCall)) {
        if (session.user_id === userId) {
            return true;
        }
    }
    return false;
}
const CallButton = ({
    userId,
    currentUserId,
    fullname,
    username,
}: Props) => {
    const {formatMessage} = useIntl();
    const isCallsEnabled = useSelector((state: GlobalState) => getIsCallsEnabled(state));
    const dmChannel = useSelector((state: GlobalState) => getChannelByName(state, getDirectChannelName(currentUserId, userId)));
    const shouldRenderButton = useSelector((state: GlobalState) => {
        if (!isCallsEnabled) {
            return false;
        }
        if (callsChannelExplicitlyDisabled(state, dmChannel?.id ?? '')) {
            return false;
        }
        if (isSystemAdmin(getUser(state, currentUserId)?.roles)) {
            return true;
        }
        if (getCallsConfig(state).DefaultEnabled) {
            return true;
        }
        if (callsChannelExplicitlyEnabled(state, dmChannel?.id ?? '')) {
            return true;
        }
        return false;
    });
    const hasDMCall = useSelector((state: GlobalState) => {
        if (isCallsEnabled && dmChannel) {
            return isUserInCall(state, currentUserId, dmChannel.id) || isUserInCall(state, userId, dmChannel.id);
        }
        return false;
    });
    if (!shouldRenderButton) {
        return null;
    }
    const disabled = hasDMCall;
    const startCallMessage = hasDMCall ? formatMessage({
        id: 'user_profile.call.ongoing',
        defaultMessage: 'Call with {user} is ongoing',
    }, {user: fullname || username},
    ) : formatMessage({
        id: 'user_profile.call.start',
        defaultMessage: 'Start Call',
    });
    const callButton = (
        <WithTooltip
            title={startCallMessage}
        >
            <button
                id='startCallButton'
                type='button'
                disabled={disabled}
                className='btn btn-icon btn-sm style--none'
                aria-label={startCallMessage}
            >
                <span
                    className='icon icon-phone'
                    aria-hidden='true'
                />
            </button>
        </WithTooltip>
    );
    if (disabled) {
        return callButton;
    }
    return (
        <ProfilePopoverCallButton
            dmChannel={dmChannel}
            userId={userId}
            customButton={callButton}
        />
    );
};
export default CallButton;