import configureStore from 'store';
const store = configureStore();
(window as any).store = store;
export default store;