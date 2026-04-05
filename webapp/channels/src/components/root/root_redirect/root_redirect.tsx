import React, {useEffect} from 'react';
import {Redirect, useHistory, useLocation} from 'react-router-dom';
import type {ActionResult} from 'mattermost-redux/types/actions';
import * as GlobalActions from 'actions/global_actions';
export type Props = {
    isElegibleForFirstAdmingOnboarding: boolean;
    currentUserId: string;
    location?: Location;
    isFirstAdmin: boolean;
    areThereTeams: boolean;
    actions: {
        getFirstAdminSetupComplete: () => Promise<ActionResult>;
    };
}
export default function RootRedirect(props: Props) {
    const history = useHistory();
    const location = useLocation();
    useEffect(() => {
        if (props.currentUserId) {
            if (props.isElegibleForFirstAdmingOnboarding) {
                props.actions.getFirstAdminSetupComplete().then((firstAdminCompletedSignup) => {
                    if (firstAdminCompletedSignup.data === false && props.isFirstAdmin && !props.areThereTeams) {
                        history.push('/preparing-workspace');
                    } else {
                        GlobalActions.redirectUserToDefaultTeam(new URLSearchParams(location.search));
                    }
                });
            } else {
                GlobalActions.redirectUserToDefaultTeam(new URLSearchParams(location.search));
            }
        }
    }, [props.currentUserId, props.isElegibleForFirstAdmingOnboarding]);
    if (props.currentUserId) {
        return null;
    }
    return (
        <Redirect
            to={{
                ...props.location,
                pathname: '/login',
            }}
        />
    );
}