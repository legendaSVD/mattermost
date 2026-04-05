import {getIsMobileView} from 'selectors/views/browser';
import store from 'stores/redux_store';
export function isMobile() {
    return getIsMobileView(store.getState());
}