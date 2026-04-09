import './components/initial_loading_screen/initial_loading_screen.css';
window.publicPath = process.env.PUBLIC_PATH || window.publicPath || '/static/';
__webpack_public_path__ = window.publicPath;
window.basename = window.publicPath.substr(0, window.publicPath.length - '/static/'.length);
import('./entry');
export {};