import {useState, useEffect} from 'react';
import {useDispatch} from 'react-redux';
import type {AccessControlPolicy} from '@mattermost/types/access_control';
import type {Channel} from '@mattermost/types/channels';
import {getAccessControlPolicy} from 'mattermost-redux/actions/access_control';
import type {ActionFunc} from 'types/store';
interface UseChannelSystemPoliciesResult {
    policies: AccessControlPolicy[];
    loading: boolean;
    error: string | null;
}
export function useChannelSystemPolicies(channel: Channel | null): UseChannelSystemPoliciesResult {
    const dispatch = useDispatch();
    const [policies, setPolicies] = useState<AccessControlPolicy[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        if (!channel) {
            setPolicies([]);
            setLoading(false);
            return;
        }
        const fetchPolicies = async () => {
            setLoading(true);
            setError(null);
            try {
                if (!channel.policy_enforced) {
                    setPolicies([]);
                    setLoading(false);
                    return;
                }
                const channelPolicyResult = await dispatch(getAccessControlPolicy(channel.id) as unknown as ActionFunc);
                if (channelPolicyResult.error) {
                    setPolicies([]);
                    setLoading(false);
                    return;
                }
                const channelPolicy = channelPolicyResult.data as AccessControlPolicy;
                if (channelPolicy && channelPolicy.imports && channelPolicy.imports.length > 0) {
                    const parentPromises = channelPolicy.imports.map((parentId) =>
                        dispatch(getAccessControlPolicy(parentId, channel.id) as unknown as ActionFunc),
                    );
                    const parentResults = await Promise.all(parentPromises);
                    const parentPolicies: AccessControlPolicy[] = [];
                    for (const result of parentResults) {
                        if (result && !result.error && result.data) {
                            parentPolicies.push(result.data as AccessControlPolicy);
                        }
                    }
                    setPolicies(parentPolicies);
                } else if (channelPolicy && channelPolicy.type === 'parent') {
                    setPolicies([channelPolicy]);
                } else if (channelPolicy) {
                    setPolicies([]);
                } else {
                    setPolicies([]);
                }
            } catch (err) {
                setError('Failed to fetch policies');
                setPolicies([]);
            } finally {
                setLoading(false);
            }
        };
        fetchPolicies();
    }, [channel, channel?.id, channel?.policy_enforced, dispatch]);
    return {policies, loading, error};
}