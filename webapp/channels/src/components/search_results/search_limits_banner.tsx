import React from 'react';
import {useSelector} from 'react-redux';
import type {GlobalState} from '@mattermost/types/store';
import {isSearchTruncated} from 'mattermost-redux/selectors/entities/search';
import {getRhsState} from 'selectors/rhs';
import CenterMessageLock from 'components/center_message_lock';
import useGetServerLimits from 'components/common/hooks/useGetServerLimits';
import {DataSearchTypes, RHSStates} from 'utils/constants';
import './search_limits_banner.scss';
type Props = {
    searchType: string;
}
function SearchLimitsBanner(props: Props) {
    const [serverLimits] = useGetServerLimits();
    const searchTruncated = useSelector((state: GlobalState) => {
        const searchType = props.searchType === DataSearchTypes.FILES_SEARCH_TYPE ? 'files' : 'posts';
        return isSearchTruncated(state, searchType);
    });
    const rhsState = useSelector(getRhsState);
    const isShowingSearchResults = rhsState === RHSStates.SEARCH;
    if (!searchTruncated || !serverLimits?.postHistoryLimit || !isShowingSearchResults) {
        return null;
    }
    return (
        <div
            id={`${props.searchType}_search_limits_banner`}
            className='SearchLimitsBanner__wrapper'
        >
            <CenterMessageLock/>
        </div>
    );
}
export default SearchLimitsBanner;