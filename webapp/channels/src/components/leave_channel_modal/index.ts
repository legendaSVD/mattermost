import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import type {Dispatch} from 'redux';
import {leaveChannel} from 'actions/views/channel';
import LeaveChannelModal from './leave_channel_modal';
function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            leaveChannel,
        }, dispatch),
    };
}
export default connect(null, mapDispatchToProps)(LeaveChannelModal);