import React from 'react';
import ReactDOM from 'react-dom';
import {logError, LogErrorBarMode} from 'mattermost-redux/actions/errors';
import store from 'stores/redux_store';
import App from 'components/app';
import {AnnouncementBarTypes} from 'utils/constants';
import {setCSRFFromCookie} from 'utils/utils';
import './sass/styles.scss';
import 'katex/dist/katex.min.css';
import '@mattermost/compass-icons/css/compass-icons.css';
import '@mattermost/components/dist/index.esm.css';
declare global {
    interface Window {
        publicPath?: string;
    }
}
function preRenderSetup(onPreRenderSetupReady: () => void) {
    window.onerror = (msg, url, line, column, error) => {
        if (msg === 'ResizeObserver loop limit exceeded') {
            return;
        }
        store.dispatch(
            logError(
                {
                    type: AnnouncementBarTypes.DEVELOPER,
                    message: 'A JavaScript error in the webapp client has occurred. (msg: ' + msg + ', row: ' + line + ', col: ' + column + ').',
                    stack: error?.stack,
                    url,
                },
                {errorBarMode: LogErrorBarMode.InDevMode},
            ),
        );
    };
    setCSRFFromCookie();
    onPreRenderSetupReady();
}
function renderReactRootComponent() {
    ReactDOM.render(<App/>, document.getElementById('root')!);
}
function appendOnDOMContentLoadedEvent(onDomContentReady: () => void) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onDomContentReady);
    } else {
        onDomContentReady();
    }
}
appendOnDOMContentLoadedEvent(() => {
    preRenderSetup(renderReactRootComponent);
});