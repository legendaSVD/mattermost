import React from 'react';
import {useSelector} from 'react-redux';
import {getCloudSubscription} from 'mattermost-redux/selectors/entities/cloud';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import NotificationPermissionNeverGrantedBar from 'components/announcement_bar/notification_permission_bar/notification_permission_never_granted_bar';
import NotificationPermissionUnsupportedBar from 'components/announcement_bar/notification_permission_bar/notification_permission_unsupported_bar';
import {useDesktopAppNotificationPermission} from 'components/common/hooks/use_desktop_notification_permission';
import {
    isNotificationAPISupported,
    NotificationPermissionDenied,
    NotificationPermissionNeverGranted,
    getNotificationPermission,
} from 'utils/notifications';
import * as UserAgent from 'utils/user_agent';
export default function NotificationPermissionBar() {
    const isLoggedIn = Boolean(useSelector(getCurrentUserId));
    const subscription = useSelector(getCloudSubscription);
    useDesktopAppNotificationPermission();
    if (!isLoggedIn) {
        return null;
    }
    if (subscription?.is_cloud_preview) {
        return null;
    }
    if (!isNotificationAPISupported() && !UserAgent.isM365Mobile()) {
        return <NotificationPermissionUnsupportedBar/>;
    }
    if (getNotificationPermission() === NotificationPermissionNeverGranted) {
        return <NotificationPermissionNeverGrantedBar/>;
    }
    if (getNotificationPermission() === NotificationPermissionDenied) {
        return null;
    }
    return null;
}