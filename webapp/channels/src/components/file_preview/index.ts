import {connect} from 'react-redux';
import {getConfig} from 'mattermost-redux/selectors/entities/general';
import type {GlobalState} from 'types/store';
import FilePreview from './file_preview';
function mapStateToProps(state: GlobalState) {
    const config = getConfig(state);
    return {
        enableSVGs: config.EnableSVGs === 'true',
    };
}
export default connect(mapStateToProps)(FilePreview);