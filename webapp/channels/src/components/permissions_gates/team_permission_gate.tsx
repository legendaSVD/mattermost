import React from 'react';
import {useSelector} from 'react-redux';
import {haveITeamPermission} from 'mattermost-redux/selectors/entities/roles';
import type {GlobalState} from 'types/store';
import Gate from './gate';
type Props = {
    teamId?: string;
    permissions: string[];
    invert?: boolean;
    children: React.ReactNode;
};
const TeamPermissionGate = ({
    teamId,
    permissions,
    invert = false,
    children,
}: Props) => {
    const hasPermission = useSelector((state: GlobalState) => {
        if (!teamId) {
            return false;
        }
        for (const permission of permissions) {
            if (haveITeamPermission(state, teamId, permission)) {
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
export default React.memo(TeamPermissionGate);