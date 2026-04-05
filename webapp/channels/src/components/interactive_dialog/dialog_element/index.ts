import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import type {Dispatch} from 'redux';
import {autocompleteActiveChannels} from 'actions/channel_actions';
import {autocompleteUsers} from 'actions/user_actions';
import DialogElement from './dialog_element';
function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            autocompleteActiveChannels,
            autocompleteUsers,
        }, dispatch),
    };
}
export default connect(null, mapDispatchToProps)(DialogElement);