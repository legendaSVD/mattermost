import {useMemo} from 'react';
import {useDispatch} from 'react-redux';
import type {AccessControlVisualAST, AccessControlTestResult, AccessControlPolicy, AccessControlPolicyActiveUpdate} from '@mattermost/types/access_control';
import type {ChannelMembership} from '@mattermost/types/channels';
import type {JobTypeBase} from '@mattermost/types/jobs';
import type {UserPropertyField} from '@mattermost/types/properties';
import {
    getAccessControlFields,
    getVisualAST,
    searchUsersForExpression,
    getAccessControlPolicy,
    createAccessControlPolicy,
    deleteAccessControlPolicy,
    validateExpressionAgainstRequester,
    createAccessControlSyncJob,
    updateAccessControlPoliciesActive,
} from 'mattermost-redux/actions/access_control';
import {getChannelMembers} from 'mattermost-redux/actions/channels';
import {createJob} from 'mattermost-redux/actions/jobs';
import type {ActionResult} from 'mattermost-redux/types/actions';
export interface ChannelAccessControlActions {
    getAccessControlFields: (after: string, limit: number) => Promise<ActionResult<UserPropertyField[]>>;
    getVisualAST: (expression: string) => Promise<ActionResult<AccessControlVisualAST>>;
    searchUsers: (expression: string, term: string, after: string, limit: number) => Promise<ActionResult<AccessControlTestResult>>;
    getChannelPolicy: (channelId: string) => Promise<ActionResult<AccessControlPolicy>>;
    saveChannelPolicy: (policy: AccessControlPolicy) => Promise<ActionResult<AccessControlPolicy>>;
    deleteChannelPolicy: (policyId: string) => Promise<ActionResult>;
    getChannelMembers: (channelId: string, page?: number, perPage?: number) => Promise<ActionResult<ChannelMembership[]>>;
    createJob: (job: JobTypeBase & { data: any }) => Promise<ActionResult>;
    updateAccessControlPoliciesActive: (statuses: AccessControlPolicyActiveUpdate[]) => Promise<ActionResult>;
    validateExpressionAgainstRequester: (expression: string) => Promise<ActionResult<{requester_matches: boolean}>>;
    createAccessControlSyncJob: (jobData: {policy_id: string}) => Promise<ActionResult>;
}
export const useChannelAccessControlActions = (channelId?: string): ChannelAccessControlActions => {
    const dispatch = useDispatch();
    return useMemo(() => ({
        getAccessControlFields: (after: string, limit: number) => {
            return dispatch(getAccessControlFields(after, limit, channelId));
        },
        getVisualAST: (expression: string) => {
            return dispatch(getVisualAST(expression, channelId));
        },
        searchUsers: (expression: string, term: string, after: string, limit: number) => {
            return dispatch(searchUsersForExpression(expression, term, after, limit, channelId));
        },
        getChannelPolicy: (channelId: string) => {
            return dispatch(getAccessControlPolicy(channelId));
        },
        saveChannelPolicy: (policy: AccessControlPolicy) => {
            return dispatch(createAccessControlPolicy(policy));
        },
        deleteChannelPolicy: (policyId: string) => {
            return dispatch(deleteAccessControlPolicy(policyId));
        },
        getChannelMembers: (channelId: string, page = 0, perPage = 200) => {
            return dispatch(getChannelMembers(channelId, page, perPage));
        },
        createJob: (job: JobTypeBase & { data: any }) => {
            return dispatch(createJob(job));
        },
        validateExpressionAgainstRequester: (expression: string) => {
            return dispatch(validateExpressionAgainstRequester(expression, channelId));
        },
        createAccessControlSyncJob: (jobData: {policy_id: string}) => {
            return dispatch(createAccessControlSyncJob(jobData));
        },
        updateAccessControlPoliciesActive: (statuses: AccessControlPolicyActiveUpdate[]) => {
            return dispatch(updateAccessControlPoliciesActive(statuses));
        },
    }), [dispatch, channelId]);
};
export default useChannelAccessControlActions;