import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import {addMessageIntoHistory} from 'mattermost-redux/actions/posts';
import SuggestionBox from './suggestion_box';
function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            addMessageIntoHistory,
        }, dispatch),
    };
}
export default connect(null, mapDispatchToProps, null, {forwardRef: true})(SuggestionBox);