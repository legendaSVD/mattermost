import React from 'react';
import InteractiveDialog from 'components/interactive_dialog/interactive_dialog';
import InteractiveDialogAdapter from './interactive_dialog_adapter';
import type {PropsFromRedux} from './index';
type OptionalPropsFromRedux = Partial<PropsFromRedux> & Pick<PropsFromRedux, 'emojiMap' | 'isAppsFormEnabled' | 'hasUrl' | 'actions'>;
type Props = OptionalPropsFromRedux & {
    onExited?: () => void;
};
const DialogRouter: React.FC<Props> = (props) => {
    const {isAppsFormEnabled, hasUrl} = props;
    if (!hasUrl) {
        console.error('Interactive dialog missing URL - this is a configuration error');
        return null;
    }
    if (isAppsFormEnabled) {
        return <InteractiveDialogAdapter {...props}/>;
    }
    return <InteractiveDialog {...props}/>;
};
export default DialogRouter;