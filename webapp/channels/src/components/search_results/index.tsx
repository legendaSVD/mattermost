import {connect} from 'react-redux';
import type {FileSearchResultItem} from '@mattermost/types/files';
import type {Post} from '@mattermost/types/posts';
import {getSearchFilesResults} from 'mattermost-redux/selectors/entities/files';
import {getSearchMatches, getSearchResults} from 'mattermost-redux/selectors/entities/posts';
import {getCurrentTeam} from 'mattermost-redux/selectors/entities/teams';
import {makeAddDateSeparatorsForSearchResults} from 'mattermost-redux/utils/post_list';
import {
    getSearchResultsTerms,
    getSearchResultsType,
    getIsSearchingTerm,
    getIsSearchingFlaggedPost,
    getIsSearchingPinnedPost,
    getIsSearchGettingMore,
    getCurrentSearchForSearchTeam,
} from 'selectors/rhs';
import type {GlobalState} from 'types/store';
import SearchResults from './search_results';
import type {StateProps, OwnProps} from './types';
function makeMapStateToProps() {
    let results: Post[];
    let fileResults: FileSearchResultItem[];
    let files: FileSearchResultItem[] = [];
    const addDateSeparatorsForSearchResults = makeAddDateSeparatorsForSearchResults();
    return function mapStateToProps(state: GlobalState, ownProps: OwnProps) {
        const newResults = getSearchResults(state);
        if (newResults && newResults !== results) {
            results = newResults;
            if (ownProps.isPinnedPosts) {
                results = results.sort((postA: Post | FileSearchResultItem, postB: Post | FileSearchResultItem) => postB.create_at - postA.create_at);
            }
        }
        const newFilesResults = getSearchFilesResults(state);
        if (newFilesResults && newFilesResults !== fileResults) {
            fileResults = newFilesResults;
            files = [];
            fileResults.forEach((file) => {
                if (!file) {
                    return;
                }
                files.push(file);
            });
        }
        const currentSearch = (getCurrentSearchForSearchTeam(state) as unknown as Record<string, any>) || {};
        const currentTeamName = getCurrentTeam(state)?.name ?? '';
        const resultsWithDateSeparators = addDateSeparatorsForSearchResults(state, results);
        return {
            results: resultsWithDateSeparators,
            fileResults: files,
            matches: getSearchMatches(state),
            searchTerms: getSearchResultsTerms(state),
            searchSelectedType: getSearchResultsType(state),
            isSearchingTerm: getIsSearchingTerm(state),
            isSearchingFlaggedPost: getIsSearchingFlaggedPost(state),
            isSearchingPinnedPost: getIsSearchingPinnedPost(state),
            isSearchGettingMore: getIsSearchGettingMore(state),
            isSearchAtEnd: currentSearch.isEnd,
            isSearchFilesAtEnd: currentSearch.isFilesEnd,
            searchPage: currentSearch.params?.page,
            currentTeamName,
        };
    };
}
export default connect<StateProps, {}, OwnProps, GlobalState>(makeMapStateToProps)(SearchResults);