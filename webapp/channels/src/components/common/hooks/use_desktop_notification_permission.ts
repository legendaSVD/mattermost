import {useCallback, useEffect, useState} from 'react';
import type {NotificationPermissionNeverGranted} from 'utils/notifications';
import {isNotificationAPISupported} from 'utils/notifications';
import {isDesktopApp} from 'utils/user_agent';
export type DesktopNotificationPermission = Exclude<NotificationPermission, typeof NotificationPermissionNeverGranted> | undefined;
let desktopNotificationPermissionGlobalState: DesktopNotificationPermission | undefined;
export function useDesktopAppNotificationPermission(): [DesktopNotificationPermission, () => Promise<NotificationPermission>] {
    const [desktopNotificationPermission, setDesktopNotificationPermission] = useState<DesktopNotificationPermission>(undefined);
    const isDesktop = isDesktopApp();
    const isSupported = isNotificationAPISupported();
    const requestDesktopNotificationPermission = useCallback(async () => {
        const permission = await Notification.requestPermission();
        desktopNotificationPermissionGlobalState = permission as DesktopNotificationPermission;
        setDesktopNotificationPermission(permission as DesktopNotificationPermission);
        return permission;
    }, []);
    useEffect(() => {
        if (!isDesktop || !isSupported) {
            setDesktopNotificationPermission(undefined);
        } else if (desktopNotificationPermissionGlobalState === undefined) {
            requestDesktopNotificationPermission();
        } else if (desktopNotificationPermissionGlobalState !== undefined) {
            setDesktopNotificationPermission(desktopNotificationPermissionGlobalState);
        }
    }, [isDesktop, isSupported, requestDesktopNotificationPermission]);
    return [desktopNotificationPermission, requestDesktopNotificationPermission];
}