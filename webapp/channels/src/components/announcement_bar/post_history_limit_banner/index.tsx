import React, {useCallback, useMemo} from 'react';
import {FormattedMessage, defineMessage} from 'react-intl';
import {useDispatch, useSelector} from 'react-redux';
import {savePreferences} from 'mattermost-redux/actions/preferences';
import {getCurrentUserLocale} from 'mattermost-redux/selectors/entities/i18n';
import {getPostHistoryLimitBannerPreferences} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUser, isCurrentUserSystemAdmin} from 'mattermost-redux/selectors/entities/users';
import AnnouncementBar from 'components/announcement_bar/default_announcement_bar';
import useGetServerLimits from 'components/common/hooks/useGetServerLimits';
import useOpenPricingModal from 'components/common/hooks/useOpenPricingModal';
import {Preferences, AnnouncementBarTypes} from 'utils/constants';
import './post_history_limit_banner.scss';
const ONE_DAY_MS = 1000 * 60 * 60 * 24;
const PostHistoryLimitBanner = () => {
    const {openPricingModal} = useOpenPricingModal();
    const dispatch = useDispatch();
    const currentUser = useSelector(getCurrentUser);
    const isAdmin = useSelector(isCurrentUserSystemAdmin);
    const userLocale = useSelector(getCurrentUserLocale);
    const [serverLimits, limitsLoaded] = useGetServerLimits();
    const postHistoryLimit = serverLimits?.postHistoryLimit || 0;
    const lastAccessiblePostTime = serverLimits?.lastAccessiblePostTime || 0;
    const postHistoryLimitPreferences = useSelector(getPostHistoryLimitBannerPreferences);
    const preferenceName = 'post_history_limit_banner';
    const handleClose = useCallback(() => {
        dispatch(savePreferences(currentUser.id, [{
            category: Preferences.POST_HISTORY_LIMIT_BANNER,
            name: preferenceName,
            user_id: currentUser.id,
            value: Date.now().toString(),
        }]));
    }, [currentUser?.id]);
    const handleUpgradeClick = useCallback((e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.preventDefault();
        openPricingModal();
    }, []);
    const showBanner = useMemo(() => {
        if (!limitsLoaded) {
            return false;
        }
        const postsAreTruncated = lastAccessiblePostTime > 0;
        if (!postsAreTruncated) {
            return false;
        }
        const dismissalPreference = postHistoryLimitPreferences.find(
            (pref) => pref.name === preferenceName,
        );
        const dismissalTimestamp = dismissalPreference ? parseInt(dismissalPreference.value, 10) : 0;
        if (!dismissalTimestamp) {
            return true;
        }
        const daysSinceDismissal = (Date.now() - dismissalTimestamp) / ONE_DAY_MS;
        const threshold = isAdmin ? 7 : 30;
        return daysSinceDismissal >= threshold;
    }, [
        lastAccessiblePostTime,
        postHistoryLimitPreferences,
        limitsLoaded,
        isAdmin,
    ]);
    if (!showBanner) {
        return null;
    }
    const cutoffDate = new Date(lastAccessiblePostTime);
    const formattedDate = cutoffDate.toLocaleDateString(userLocale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const message = (
        <FormattedMessage
            id='workspace_limits.post_history_banner.text'
            defaultMessage='{limit, number}-message limit reached. Messages sent before {date} are hidden'
            values={{
                limit: postHistoryLimit,
                date: formattedDate,
            }}
        />
    );
    const upgradeButtonText = defineMessage({
        id: 'workspace_limits.post_history_banner.cta_button',
        defaultMessage: 'Restore Access',
    });
    return (
        <AnnouncementBar
            type={AnnouncementBarTypes.GENERAL}
            showCloseButton={true}
            onButtonClick={handleUpgradeClick}
            modalButtonText={upgradeButtonText}
            message={message}
            showLinkAsButton={true}
            className='post-history-limit-banner'
            icon={<i className='icon icon-alert-outline'/>}
            handleClose={handleClose}
        />
    );
};
export default PostHistoryLimitBanner;