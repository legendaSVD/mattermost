import configureStore from 'mattermost-redux/store';
export function makeInitialState(preloadedState) {
    return testConfigureStore(preloadedState).getState();
}
export default function testConfigureStore(preloadedState) {
    const store = configureStore({preloadedState, appReducers: {}, getAppReducers: () => {}});
    return store;
}
export function mockDispatch(dispatch) {
    const mocked = (action) => {
        dispatch(action);
        mocked.actions.push(action);
    };
    mocked.actions = [];
    return mocked;
}