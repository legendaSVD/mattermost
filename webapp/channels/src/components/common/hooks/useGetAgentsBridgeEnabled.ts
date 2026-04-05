import {useCallback, useEffect, useRef} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import type {WebSocketMessage} from '@mattermost/client';
import {WebSocketEvents} from '@mattermost/client';
import {getAgentsStatus} from 'mattermost-redux/actions/agents';
import {getAgentsStatus as getAgentsStatusSelector} from 'mattermost-redux/selectors/entities/agents';
import {useWebSocket} from 'utils/use_websocket/hooks';
const AI_PLUGIN_ID = 'mattermost-ai';
const DEBOUNCE_DELAY_MS = 100;
export type AgentsBridgeStatus = {
    available: boolean;
    reason?: string;
};
export default function useGetAgentsBridgeEnabled(): AgentsBridgeStatus {
    const dispatch = useDispatch();
    const status = useSelector(getAgentsStatusSelector);
    const hasFetchedRef = useRef(false);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        if (!hasFetchedRef.current) {
            hasFetchedRef.current = true;
            dispatch(getAgentsStatus());
        }
    }, [dispatch]);
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);
    const debouncedRefetch = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
            dispatch(getAgentsStatus());
        }, DEBOUNCE_DELAY_MS);
    }, [dispatch]);
    const handleWebSocketMessage = useCallback((msg: WebSocketMessage) => {
        const isPluginEvent =
            (msg.event === WebSocketEvents.PluginEnabled || msg.event === WebSocketEvents.PluginDisabled) &&
            msg.data?.manifest?.id === AI_PLUGIN_ID;
        const isConfigChange = msg.event === WebSocketEvents.ConfigChanged;
        if (isPluginEvent || isConfigChange) {
            debouncedRefetch();
        }
    }, [debouncedRefetch]);
    useWebSocket({handler: handleWebSocketMessage});
    return status;
}