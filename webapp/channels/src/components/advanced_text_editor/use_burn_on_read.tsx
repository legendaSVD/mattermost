import React, {useCallback, useMemo} from 'react';
import {useSelector} from 'react-redux';
import {PostTypes} from 'mattermost-redux/constants/posts';
import {getChannel} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUser, getUser} from 'mattermost-redux/selectors/entities/users';
import {getDirectChannelName, getUserIdFromChannelName, isDirectChannel} from 'mattermost-redux/utils/channel_utils';
import {
    isBurnOnReadEnabled,
    getBurnOnReadDurationMinutes,
    canUserSendBurnOnRead,
} from 'selectors/burn_on_read';
import BurnOnReadButton from 'components/burn_on_read/burn_on_read_button';
import BurnOnReadLabel from 'components/burn_on_read/burn_on_read_label';
import BurnOnReadTourTip from 'components/burn_on_read/burn_on_read_tour_tip';
import 'components/burn_on_read/burn_on_read_control.scss';
import type {GlobalState} from 'types/store';
import type {PostDraft} from 'types/store/draft';
const useBurnOnRead = (
    draft: PostDraft,
    handleDraftChange: (draft: PostDraft, options: {instant?: boolean; show?: boolean}) => void,
    focusTextbox: (keepFocus?: boolean) => void,
    shouldShowPreview: boolean,
    showIndividualCloseButton = true,
) => {
    const rootId = draft.rootId;
    const channelId = draft.channelId;
    const isEnabled = useSelector(isBurnOnReadEnabled);
    const durationMinutes = useSelector(getBurnOnReadDurationMinutes);
    const canSend = useSelector(canUserSendBurnOnRead);
    const channel = useSelector((state: GlobalState) => getChannel(state, channelId));
    const currentUser = useSelector(getCurrentUser);
    const otherUserId = useMemo(() => {
        if (!channel || !currentUser || !isDirectChannel(channel)) {
            return null;
        }
        return getUserIdFromChannelName(currentUser.id, channel.name);
    }, [channel, currentUser]);
    const otherUser = useSelector((state: GlobalState) => (otherUserId ? getUser(state, otherUserId) : null));
    const isAllowedInChannel = useMemo(() => {
        if (!channel || !currentUser) {
            return false;
        }
        if (isDirectChannel(channel)) {
            const selfDMName = getDirectChannelName(currentUser.id, currentUser.id);
            if (channel.name === selfDMName) {
                return false;
            }
            if (otherUser?.is_bot) {
                return false;
            }
        }
        return true;
    }, [channel, currentUser, otherUser]);
    const hasBurnOnReadSet = isEnabled && draft.type === PostTypes.BURN_ON_READ;
    const handleBurnOnReadApply = useCallback((enabled: boolean) => {
        const updatedDraft = {
            ...draft,
            type: enabled ? PostTypes.BURN_ON_READ : undefined,
        };
        handleDraftChange(updatedDraft, {instant: true});
        focusTextbox();
    }, [draft, handleDraftChange, focusTextbox]);
    const handleRemoveBurnOnRead = useCallback(() => {
        handleBurnOnReadApply(false);
    }, [handleBurnOnReadApply]);
    const labels = useMemo(() => (
        (hasBurnOnReadSet && !rootId) ? (
            <BurnOnReadLabel
                canRemove={showIndividualCloseButton && !shouldShowPreview}
                onRemove={handleRemoveBurnOnRead}
                durationMinutes={durationMinutes}
            />
        ) : undefined
    ), [hasBurnOnReadSet, rootId, showIndividualCloseButton, shouldShowPreview, handleRemoveBurnOnRead, durationMinutes]);
    const additionalControl = useMemo(() =>
        (!rootId && isEnabled && canSend && isAllowedInChannel ? (
            <div
                key='burn-on-read-control-key'
                className='BurnOnReadControl'
            >
                <BurnOnReadButton
                    key='burn-on-read-button-key'
                    enabled={hasBurnOnReadSet}
                    onToggle={handleBurnOnReadApply}
                    disabled={shouldShowPreview}
                    durationMinutes={durationMinutes}
                />
                <BurnOnReadTourTip
                    key='burn-on-read-tour-tip-key'
                    onTryItOut={() => handleBurnOnReadApply(true)}
                />
            </div>
        ) : undefined), [rootId, isEnabled, canSend, isAllowedInChannel, hasBurnOnReadSet, handleBurnOnReadApply, shouldShowPreview, durationMinutes]);
    return {
        labels,
        additionalControl,
        handleBurnOnReadApply,
        handleRemoveBurnOnRead,
    };
};
export default useBurnOnRead;