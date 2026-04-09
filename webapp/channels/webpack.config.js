const path = require('path');
const url = require('url');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ExternalTemplateRemotesPlugin = require('external-remotes-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const webpack = require('webpack');
const {ModuleFederationPlugin} = require('webpack').container;
const WebpackPwaManifest = require('webpack-pwa-manifest');
const packageJson = require('./package.json');
const NPM_TARGET = process.env.npm_lifecycle_event;
const targetIsBuild = NPM_TARGET?.startsWith('build');
const targetIsRun = NPM_TARGET?.startsWith('run');
const targetIsStats = NPM_TARGET === 'stats';
const targetIsDevServer = NPM_TARGET?.startsWith('dev-server');
const targetIsEsLint = !targetIsBuild && !targetIsRun && !targetIsDevServer;
const DEV = targetIsRun || targetIsStats || targetIsDevServer;
const STANDARD_EXCLUDE = [
    /node_modules/,
];
let publicPath = '/static/';
if (DEV) {
    const siteURL = process.env.MM_SERVICESETTINGS_SITEURL || '';
    if (siteURL) {
        publicPath = path.join(new url.URL(siteURL).pathname, 'static') + '/';
    }
}
const buildTimestamp = Date.now();
var config = {
    entry: ['./src/root.tsx'],
    output: {
        publicPath,
        filename: '[name].[contenthash].js',
        chunkFilename: '[name].[contenthash].js',
        assetModuleFilename: 'files/[contenthash][ext]',
        clean: true,
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx|ts|tsx)$/,
                exclude: STANDARD_EXCLUDE,
                use: {
                    loader: 'babel-loader',
                    options: {
                        cacheDirectory: true,
                    },
                },
            },
            {
                test: /\.json$/,
                include: [
                    path.resolve(__dirname, 'src/i18n'),
                ],
                exclude: [/en\.json$/],
                type: 'asset/resource',
                generator: {
                    filename: 'i18n/[name].[contenthash].json',
                },
            },
            {
                test: /\.(css|scss)$/,
                exclude: /\/highlight\.js\
                use: [
                    DEV ? 'style-loader' : MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                    },
                ],
            },
            {
                test: /\.scss$/,
                use: [
                    {
                        loader: 'sass-loader',
                        options: {
                            sassOptions: {
                                loadPaths: ['src/sass'],
                            },
                        },
                    },
                ],
            },
            {
                test: /\.(png|eot|tiff|svg|woff2|woff|ttf|gif|mp3|jpg)$/,
                type: 'asset/resource',
                use: [
                    !DEV && {
                        loader: 'image-webpack-loader',
                        options: {},
                    },
                ],
            },
            {
                test: /\.apng$/,
                type: 'asset/resource',
            },
            {
                test: /\/highlight\.js\/.*\.css$/,
                type: 'asset/resource',
            },
        ],
    },
    resolve: {
        modules: [
            'node_modules',
            './src',
        ],
        alias: {
            'mattermost-redux/test': 'packages/mattermost-redux/test',
            'mattermost-redux': 'packages/mattermost-redux/src',
            '@mui/styled-engine': '@mui/styled-engine-sc',
            'styled-components': path.resolve(__dirname, '..', 'node_modules', 'styled-components'),
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
        fallback: {
            crypto: require.resolve('crypto-browserify'),
            stream: require.resolve('stream-browserify'),
            buffer: require.resolve('buffer/'),
        },
    },
    performance: {
        hints: 'warning',
    },
    target: 'web',
    plugins: [
        new webpack.ProvidePlugin({
            process: 'process/browser.js',
            Buffer: ['buffer', 'Buffer'],
        }),
        new MiniCssExtractPlugin({
            filename: '[name].[contenthash].css',
            chunkFilename: '[name].[contenthash].css',
        }),
        new HtmlWebpackPlugin({
            filename: 'root.html',
            inject: 'head',
            template: 'src/root.html',
            scriptLoading: 'blocking',
            meta: {
                csp: {
                    'http-equiv': 'Content-Security-Policy',
                    content: generateCSP(),
                },
            },
        }),
        new CopyWebpackPlugin({
            patterns: [
                {from: 'src/images/emoji', to: 'emoji'},
                {from: 'src/images/img_trans.gif', to: 'images'},
                {from: 'src/images/logo-email.png', to: 'images'},
                {from: 'src/images/favicon', to: 'images/favicon'},
                {from: 'src/images/appIcons.png', to: 'images'},
                {from: 'src/images/logo-email.png', to: 'images'},
                {from: 'src/images/browser-icons', to: 'images/browser-icons'},
                {from: 'src/images/cloud', to: 'images'},
                {from: 'src/images/welcome_illustration_new.png', to: 'images'},
                {from: 'src/images/logo_email_blue.png', to: 'images'},
                {from: 'src/images/logo_email_dark.png', to: 'images'},
                {from: 'src/images/logo_email_gray.png', to: 'images'},
                {from: 'src/images/forgot_password_illustration.png', to: 'images'},
                {from: 'src/images/invite_illustration.png', to: 'images'},
                {from: 'src/images/channel_icon.png', to: 'images'},
                {from: 'src/images/c_avatar.png', to: 'images'},
                {from: 'src/images/c_download.png', to: 'images'},
                {from: 'src/images/c_socket.png', to: 'images'},
                {from: 'src/images/admin-onboarding-background.jpg', to: 'images'},
                {from: 'src/images/logo.svg', to: 'images'},
                {from: 'src/images/alert.svg', to: 'images'},
                {from: 'src/images/cloud-laptop.png', to: 'images'},
                {from: 'src/images/cloud-laptop-error.png', to: 'images'},
                {from: 'src/images/cloud-laptop-warning.png', to: 'images'},
                {from: 'src/images/cloud-upgrade-person-hand-to-face.png', to: 'images'},
                {from: 'src/images/payment_processing.png', to: 'images'},
                {from: 'src/images/purchase_alert.png', to: 'images'},
                {from: 'src/fonts/Metropolis-SemiBold.woff', to: 'fonts'},
                {from: 'src/fonts/open-sans-v18-vietnamese_latin-ext_latin_greek-ext_greek_cyrillic-ext_cyrillic-regular.woff2', to: 'fonts'},
                {from: 'src/fonts/open-sans-v18-vietnamese_latin-ext_latin_greek-ext_greek_cyrillic-ext_cyrillic-regular.woff', to: 'fonts'},
                {from: 'src/fonts/open-sans-v18-vietnamese_latin-ext_latin_greek-ext_greek_cyrillic-ext_cyrillic-600.woff2', to: 'fonts'},
                {from: 'src/fonts/open-sans-v18-vietnamese_latin-ext_latin_greek-ext_greek_cyrillic-ext_cyrillic-600.woff', to: 'fonts'},
                {from: '../node_modules/pdfjs-dist/cmaps', to: 'cmaps'},
            ],
        }),
        new WebpackPwaManifest({
            name: 'Mattermost',
            short_name: 'Mattermost',
            start_url: '..',
            description: 'Mattermost is an open source, self-hosted Slack-alternative',
            background_color: '#ffffff',
            inject: true,
            ios: true,
            fingerprints: false,
            orientation: 'any',
            filename: 'manifest.json',
            icons: [{
                src: path.resolve('src/images/favicon/android-chrome-192x192.png'),
                type: 'image/png',
                sizes: '192x192',
            }, {
                src: path.resolve('src/images/favicon/apple-touch-icon-120x120.png'),
                type: 'image/png',
                sizes: '120x120',
                ios: true,
            }, {
                src: path.resolve('src/images/favicon/apple-touch-icon-144x144.png'),
                type: 'image/png',
                sizes: '144x144',
                ios: true,
            }, {
                src: path.resolve('src/images/favicon/apple-touch-icon-152x152.png'),
                type: 'image/png',
                sizes: '152x152',
                ios: true,
            }, {
                src: path.resolve('src/images/favicon/apple-touch-icon-57x57.png'),
                type: 'image/png',
                sizes: '57x57',
                ios: true,
            }, {
                src: path.resolve('src/images/favicon/apple-touch-icon-60x60.png'),
                type: 'image/png',
                sizes: '60x60',
                ios: true,
            }, {
                src: path.resolve('src/images/favicon/apple-touch-icon-72x72.png'),
                type: 'image/png',
                sizes: '72x72',
                ios: true,
            }, {
                src: path.resolve('src/images/favicon/apple-touch-icon-76x76.png'),
                type: 'image/png',
                sizes: '76x76',
                ios: true,
            }, {
                src: path.resolve('src/images/favicon/favicon-16x16.png'),
                type: 'image/png',
                sizes: '16x16',
            }, {
                src: path.resolve('src/images/favicon/favicon-32x32.png'),
                type: 'image/png',
                sizes: '32x32',
            }, {
                src: path.resolve('src/images/favicon/favicon-96x96.png'),
                type: 'image/png',
                sizes: '96x96',
            }],
        }),
        new MonacoWebpackPlugin({
            languages: [],
            features: [
                '!bracketMatching',
                '!codeAction',
                '!codelens',
                '!colorPicker',
                '!comment',
                '!diffEditor',
                '!diffEditorBreadcrumbs',
                '!folding',
                '!gotoError',
                '!gotoLine',
                '!gotoSymbol',
                '!gotoZoom',
                '!inspectTokens',
                '!multicursor',
                '!parameterHints',
                '!quickCommand',
                '!quickHelp',
                '!quickOutline',
                '!referenceSearch',
                '!rename',
                '!snippet',
                '!stickyScroll',
                '!suggest',
                '!toggleHighContrast',
                '!unicodeHighlighter',
            ],
        }),
    ],
    watchOptions: {
        ignored: /node_modules([\\]+|\/)(?!@mattermost\/(client|components|types|shared))/,
    },
};
function generateCSP() {
    let csp = 'script-src \'self\' js.stripe.com/v3';
    if (DEV) {
        csp += ' \'unsafe-eval\'';
    }
    return csp;
}
async function initializeModuleFederation() {
    function makeSharedModules(packageNames, singleton) {
        const sharedObject = {};
        for (const packageName of packageNames) {
            const version = packageJson.dependencies[packageName];
            sharedObject[packageName] = {
                singleton,
                strictVersion: singleton,
                requiredVersion: singleton ? version : undefined,
                version,
            };
        }
        return sharedObject;
    }
    async function getRemoteContainers() {
        const products = [];
        const remotes = {};
        for (const product of products) {
            remotes[product.name] = `${product.name}@[window.basename]/static/products/${product.name}/remote_entry.js?bt=${buildTimestamp}`;
        }
        return {remotes};
    }
    const {remotes} = await getRemoteContainers();
    const moduleFederationPluginOptions = {
        name: 'mattermost_webapp',
        remotes,
        shared: [
            makeSharedModules([
                '@mattermost/client',
                '@mattermost/types',
                'luxon',
            ], false),
            makeSharedModules([
                'history',
                'react',
                'react-beautiful-dnd',
                'react-bootstrap',
                'react-dom',
                'react-intl',
                'react-redux',
                'react-router-dom',
                'styled-components',
            ], true),
        ],
    };
    moduleFederationPluginOptions.exposes = {
        './app': 'components/app',
        './store': 'stores/redux_store',
        './styles': './src/sass/styles.scss',
        './registry': 'module_registry',
    };
    moduleFederationPluginOptions.filename = `remote_entry.js?bt=${buildTimestamp}`;
    config.plugins.push(new ModuleFederationPlugin(moduleFederationPluginOptions));
    config.plugins.push(new ExternalTemplateRemotesPlugin());
    config.plugins.push(new webpack.DefinePlugin({
        REMOTE_CONTAINERS: JSON.stringify(remotes),
    }));
}
if (DEV) {
    config.mode = 'development';
    config.devtool = 'eval-cheap-module-source-map';
} else {
    config.mode = 'production';
    config.devtool = 'source-map';
}
const env = {};
if (DEV) {
    env.PUBLIC_PATH = JSON.stringify(publicPath);
} else {
    env.NODE_ENV = JSON.stringify('production');
}
config.plugins.push(new webpack.DefinePlugin({
    'process.env': env,
}));
if (targetIsDevServer) {
    const proxyToServer = {
        logLevel: 'silent',
        target: process.env.MM_SERVICESETTINGS_SITEURL ?? 'http://localhost:8065',
        xfwd: true,
    };
    config = {
        ...config,
        devtool: 'eval-cheap-module-source-map',
        devServer: {
            liveReload: true,
            proxy: [
                {
                    context: '/api',
                    ...proxyToServer,
                    ws: true,
                },
                {
                    context: '/plugins',
                    ...proxyToServer,
                },
                {
                    context: '/static/plugins',
                    ...proxyToServer,
                },
            ],
            port: 9005,
            devMiddleware: {
                writeToDisk: false,
            },
            historyApiFallback: {
                index: '/static/root.html',
            },
        },
        performance: false,
        optimization: {
            ...config.optimization,
            splitChunks: false,
        },
    };
}
if (process.env.PRODUCTION_PERF_DEBUG) {
    console.log('Enabling production performance debug settings');
    config.resolve.alias['react-dom'] = 'react-dom/profiling';
    config.resolve.alias['schedule/tracing'] = 'schedule/tracing-profiling';
    config.optimization = {
        minimize: false,
    };
}
if (targetIsEsLint) {
    module.exports = config;
} else {
    module.exports = async () => {
        await initializeModuleFederation();
        return config;
    };
}