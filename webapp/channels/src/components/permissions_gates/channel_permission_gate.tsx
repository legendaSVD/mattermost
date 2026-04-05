import React from 'react';
import {useSelector} from 'react-redux';
import type {GlobalState} from '@mattermost/types/store';
import {haveIChannelPermission} from 'mattermost-redux/selectors/entities/roles';
import Gate from './gate';
type Props = {
    channelId?: string;
    teamId?: string;
    permissions: string[];
    invert?: boolean;
    children: React.ReactNode;
}
const ChannelPermissionGate = ({channelId, teamId, permissions, children, invert = false}: Props) => {
    const hasPermission = useSelector((state: GlobalState) => {
        if (!channelId || teamId === null || typeof teamId === 'undefined') {
            return false;
        }
        for (const permission of permissions) {
            if (haveIChannelPermission(state, teamId, channelId, permission)) {
                return true;
            }
        }
        return false;
    });
    return (
        <Gate
            invert={invert}
            hasPermission={hasPermission}
        >
            {children}
        </Gate>
    );
};
export default React.memo(ChannelPermissionGate);