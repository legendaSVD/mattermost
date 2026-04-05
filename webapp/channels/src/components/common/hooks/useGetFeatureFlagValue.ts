import {useSelector} from 'react-redux';
import type {FeatureFlags} from '@mattermost/types/config';
import type {GlobalState} from '@mattermost/types/store';
import {getFeatureFlagValue} from 'mattermost-redux/selectors/entities/general';
export default function useGetFeatureFlagValue(key: keyof FeatureFlags): string | undefined {
    return useSelector((state: GlobalState) => getFeatureFlagValue(state, key));
}