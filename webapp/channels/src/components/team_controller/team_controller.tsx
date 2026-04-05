import iNoBounce from 'inobounce';
import React, {lazy, memo, useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {Route, Switch, useHistory, useParams} from 'react-router-dom';
import type {ServerError} from '@mattermost/types/errors';
import type {Team} from '@mattermost/types/teams';
import {getTeamContentFlaggingStatus} from 'mattermost-redux/actions/content_flagging';
import {
    contentFlaggingFeatureEnabled,
} from 'mattermost-redux/selectors/entities/content_flagging';
import type {ActionResult} from 'mattermost-redux/types/actions';
import {reconnect} from 'actions/websocket_actions';
import LocalStorageStore from 'stores/local_storage_store';
import {makeAsyncComponent, makeAsyncPluggableComponent} from 'components/async_load';
import ChannelController from 'components/channel_layout/channel_controller';
import useTelemetryIdentitySync from 'components/common/hooks/useTelemetryIdentifySync';
import InitialLoadingScreen from 'components/initial_loading_screen';
import Constants from 'utils/constants';
import DesktopApp from 'utils/desktop_api';
import {cmdOrCtrlPressed, isKeyPressed} from 'utils/keyboard';
import {TEAM_NAME_PATH_PATTERN} from 'utils/path';
import {isIosSafari} from 'utils/user_agent';
import type {OwnProps, PropsFromRedux} from './index';
const BackstageController = makeAsyncComponent('BackstageController', lazy(() => import('components/backstage')));
const Pluggable = makeAsyncPluggableComponent();
const WAKEUP_CHECK_INTERVAL = 30000;
const WAKEUP_THRESHOLD = 60000;
const UNREAD_CHECK_TIME_MILLISECONDS = 120 * 1000;
declare global {
    interface Window {
        isActive: boolean;
    }
}
type Props = PropsFromRedux & OwnProps;
function TeamController(props: Props) {
    const dispatch = useDispatch();
    const history = useHistory();
    const {team: teamNameParam} = useParams<Props['match']['params']>();
    const [initialChannelsLoaded, setInitialChannelsLoaded] = useState(false);
    const [team, setTeam] = useState<Team | null>(getTeamFromTeamList(props.teamsList, teamNameParam));
    const contentFlaggingEnabled = useSelector(contentFlaggingFeatureEnabled);
    const blurTime = useRef(Date.now());
    const lastTime = useRef(Date.now());
    useTelemetryIdentitySync();
    useEffect(() => {
        InitialLoadingScreen.stop('team_controller');
        DesktopApp.reactAppInitialized();
        async function fetchAllChannels() {
            await props.fetchAllMyTeamsChannels();
            setInitialChannelsLoaded(true);
        }
        props.fetchAllMyChannelMembers();
        fetchAllChannels();
    }, []);
    useEffect(() => {
        if (props.disableWakeUpReconnectHandler) {
            return () => {};
        }
        const wakeUpIntervalId = setInterval(() => {
            const currentTime = Date.now();
            if ((currentTime - lastTime.current) > WAKEUP_THRESHOLD) {
                console.log('computer woke up - reconnecting');
                reconnect();
            }
            lastTime.current = currentTime;
        }, WAKEUP_CHECK_INTERVAL);
        return () => {
            clearInterval(wakeUpIntervalId);
        };
    }, [props.disableWakeUpReconnectHandler]);
    useEffect(() => {
        function handleFocus() {
            window.isActive = true;
            props.markAsReadOnFocus();
            if (!props.disableRefetchingOnBrowserFocus) {
                const currentTime = Date.now();
                if ((currentTime - blurTime.current) > UNREAD_CHECK_TIME_MILLISECONDS && props.currentTeamId) {
                    props.fetchChannelsAndMembers(props.currentTeamId);
                }
            }
        }
        function handleBlur() {
            window.isActive = false;
            blurTime.current = Date.now();
            props.unsetActiveChannelOnServer();
        }
        function handleKeydown(event: KeyboardEvent) {
            if (event.shiftKey && cmdOrCtrlPressed(event) && isKeyPressed(event, Constants.KeyCodes.L)) {
                const replyTextbox = document.querySelector<HTMLElement>('#sidebar-right.is-open.expanded #reply_textbox');
                if (replyTextbox) {
                    replyTextbox.focus();
                } else {
                    const postTextbox = document.getElementById('post_textbox');
                    if (postTextbox) {
                        postTextbox.focus();
                    }
                }
            }
        }
        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('keydown', handleKeydown);
        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('keydown', handleKeydown);
        };
    }, [props.currentTeamId]);
    useEffect(() => {
        if (contentFlaggingEnabled && props.currentTeamId) {
            dispatch(getTeamContentFlaggingStatus(props.currentTeamId));
        }
    }, [contentFlaggingEnabled, dispatch, props.currentTeamId]);
    useEffect(() => {
        const browserIsIosSafari = isIosSafari();
        if (browserIsIosSafari) {
            iNoBounce.enable();
        }
        window.isActive = true;
        LocalStorageStore.setTeamIdJoinedOnLoad(null);
        return () => {
            window.isActive = false;
            if (browserIsIosSafari) {
                iNoBounce.disable();
            }
        };
    }, []);
    async function initTeamOrRedirect(team: Team) {
        const {data: joinedTeam, error} = await props.initializeTeam(team) as ActionResult<Team, ServerError>;
        if (error) {
            history.push('/error?type=team_not_found');
            return;
        }
        if (joinedTeam) {
            setTeam(joinedTeam);
        }
    }
    async function joinTeamOrRedirect(teamNameParam: string, joinedOnFirstLoad: boolean) {
        setTeam(null);
        const {data: joinedTeam, error} = await props.joinTeam(teamNameParam, joinedOnFirstLoad) as ActionResult<Team, ServerError>;
        if (error) {
            history.push('/error?type=team_not_found');
            return;
        }
        if (joinedTeam) {
            setTeam(joinedTeam);
        }
    }
    const teamsListDependency = props.teamsList.map((team) => team.id).sort().join('+');
    useEffect(() => {
        if (teamNameParam) {
            if (Constants.RESERVED_TEAM_NAMES.includes(teamNameParam)) {
                return;
            }
            const teamFromTeamNameParam = getTeamFromTeamList(props.teamsList, teamNameParam);
            if (teamFromTeamNameParam) {
                initTeamOrRedirect(teamFromTeamNameParam);
            } else if (team && team.name !== teamNameParam) {
                joinTeamOrRedirect(teamNameParam, false);
            } else if (!team) {
                joinTeamOrRedirect(teamNameParam, true);
            }
        }
    }, [teamNameParam, teamsListDependency]);
    if (props.mfaRequired) {
        history.push('/mfa/setup');
        return null;
    }
    if (team === null) {
        return null;
    }
    const teamLoaded = team?.name.toLowerCase() === teamNameParam?.toLowerCase();
    return (
        <Switch>
            <Route
                path={`/:team(${TEAM_NAME_PATH_PATTERN})/integrations`}
                component={BackstageController}
            />
            <Route
                path={`/:team(${TEAM_NAME_PATH_PATTERN})/emoji`}
                component={BackstageController}
            />
            {props.plugins?.map((plugin) => (
                <Route
                    key={plugin.id}
                    path={`/:team(${TEAM_NAME_PATH_PATTERN})/` + (plugin as any).route}
                    render={() => (
                        <Pluggable
                            pluggableName={'NeedsTeamComponent'}
                            pluggableId={plugin.id}
                            css={{gridArea: 'center'}}
                        />
                    )}
                />
            ))}
            <ChannelController shouldRenderCenterChannel={initialChannelsLoaded && teamLoaded}/>
        </Switch>
    );
}
function getTeamFromTeamList(teamsList: Props['teamsList'], teamName?: string) {
    if (!teamName) {
        return null;
    }
    const team = teamsList.find((teamInList) => teamInList.name === teamName) ?? null;
    if (!team) {
        return null;
    }
    return team;
}
export default memo(TeamController);