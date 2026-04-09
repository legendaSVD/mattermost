import React from 'react';
import {isValidElementType} from 'react-is';
import type {Reducer} from 'redux';
import type {WebSocketMessages} from '@mattermost/client';
import reducerRegistry from 'mattermost-redux/store/reducer_registry';
import {
    registerAdminConsolePlugin,
    unregisterAdminConsolePlugin,
    registerAdminConsoleCustomSetting,
    registerAdminConsoleCustomSection,
} from 'actions/admin_actions';
import {showRHSPlugin, hideRHSPlugin, toggleRHSPlugin} from 'actions/views/rhs';
import {
    registerPluginTranslationsSource,
} from 'actions/views/root';
import type {
    TranslationPluginFunction} from 'actions/views/root';
import {
    registerPluginWebSocketEvent,
    unregisterPluginWebSocketEvent,
    registerPluginReconnectHandler,
    unregisterPluginReconnectHandler,
} from 'actions/websocket_actions';
import store from 'stores/redux_store';
import {ActionTypes} from 'utils/constants';
import {reArg} from 'utils/func';
import {registerRHSPluginPopoutListener, type PopoutListeners} from 'utils/popouts/popout_windows';
import {generateId} from 'utils/utils';
import type {
    PluginsState,
    ProductComponent,
    NeedsTeamComponent,
    PostDropdownMenuAction,
    ChannelHeaderAction,
    ChannelHeaderButtonAction,
    RightHandSidebarComponent,
    AppBarAction,
    FileUploadMethodAction,
    MainMenuAction,
    ChannelIntroButtonAction,
    UserGuideDropdownAction,
    FilesDropdownAction,
    CustomRouteComponent,
    AdminConsolePluginCustomSection,
    AdminConsolePluginComponent,
    SearchButtonsComponent,
    SearchSuggestionsComponent,
    SearchHintsComponent,
    CallButtonAction,
    CreateBoardFromTemplateComponent,
    PostWillRenderEmbedComponent,
    FilesWillUploadHook,
    MessageWillBePostedHook,
    SlashCommandWillBePostedHook,
    MessageWillFormatHook,
    FilePreviewComponent,
    MessageWillBeUpdatedHook,
    AppBarChannelAction,
    DesktopNotificationHook,
    PluggableText,
    SidebarBrowseOrAddChannelMenuAction,
} from 'types/store/plugins';
const defaultShouldRender = () => true;
type DPluginComponentProp = {component: React.ComponentType<unknown>};
function dispatchPluginComponentAction(name: keyof PluginsState['components'], pluginId: string, component: React.ComponentType<any>, id = generateId()) {
    store.dispatch({
        type: ActionTypes.RECEIVED_PLUGIN_COMPONENT,
        name,
        data: {
            id,
            pluginId,
            component,
        },
    });
    return id;
}
function dispatchPluginComponentWithData<T extends keyof PluginsState['components']>(name: T, data: PluginsState['components'][T][number]) {
    store.dispatch({
        type: ActionTypes.RECEIVED_PLUGIN_COMPONENT,
        name,
        data,
    });
}
type ReactResolvable = React.ReactNode | React.ElementType;
const resolveReactElement = (element: ReactResolvable): React.ReactNode => {
    if (
        element &&
        !React.isValidElement(element) &&
        isValidElementType(element) &&
        typeof element !== 'string'
    ) {
        return React.createElement(element);
    }
    return element;
};
const standardizeRoute = (route: string) => {
    let fixedRoute = route.trim();
    if (fixedRoute[0] === '/') {
        fixedRoute = fixedRoute.substring(1);
    }
    return fixedRoute;
};
export default class PluginRegistry {
    id: string;
    constructor(id: string) {
        this.id = id;
    }
    supports = {
        globalAppBar: true,
        globalRhs: true,
    };
    registerRootComponent = reArg(['component'], ({component}: DPluginComponentProp) => {
        return dispatchPluginComponentAction('Root', this.id, component);
    });
    registerPopoverUserAttributesComponent = reArg(['component'], ({component}: DPluginComponentProp) => {
        return dispatchPluginComponentAction('PopoverUserAttributes', this.id, component);
    });
    registerPopoverUserActionsComponent = reArg(['component'], ({component}: DPluginComponentProp) => {
        return dispatchPluginComponentAction('PopoverUserActions', this.id, component);
    });
    registerLeftSidebarHeaderComponent = reArg(['component'], ({component}: DPluginComponentProp) => {
        return dispatchPluginComponentAction('LeftSidebarHeader', this.id, component);
    });
    registerBottomTeamSidebarComponent = reArg(['component'], ({component}: DPluginComponentProp) => {
        return dispatchPluginComponentAction('BottomTeamSidebar', this.id, component);
    });
    registerPostMessageAttachmentComponent = reArg(['component'], ({component}: DPluginComponentProp) => {
        return dispatchPluginComponentAction('PostMessageAttachment', this.id, component);
    });
    registerSearchComponents = ({
        buttonComponent,
        suggestionsComponent,
        hintsComponent,
        action,
    }: {
        buttonComponent: SearchButtonsComponent['component'];
        suggestionsComponent: SearchSuggestionsComponent['component'];
        hintsComponent: SearchHintsComponent['component'];
        action: SearchButtonsComponent['action'];
    }) => {
        const id = generateId();
        dispatchPluginComponentWithData('SearchButtons', {
            id,
            pluginId: this.id,
            component: buttonComponent,
            action,
        });
        dispatchPluginComponentAction('SearchSuggestions', this.id, suggestionsComponent, id);
        dispatchPluginComponentAction('SearchHints', this.id, hintsComponent, id);
        return id;
    };
    registerLinkTooltipComponent = reArg(['component'], ({component}: DPluginComponentProp) => {
        return dispatchPluginComponentAction('LinkTooltip', this.id, component);
    });
    registerActionAfterChannelCreation = reArg(['component', 'action'], ({
        component,
        action,
    }: {
        component: CreateBoardFromTemplateComponent['component'];
        action: CreateBoardFromTemplateComponent['action'];
    }) => {
        const id = generateId();
        dispatchPluginComponentWithData('CreateBoardFromTemplate', {
            id,
            pluginId: this.id,
            component,
            action,
        });
        return id;
    });
    registerChannelHeaderIcon = reArg(['component'], ({component}: DPluginComponentProp) => {
        return dispatchPluginComponentAction('ChannelHeaderIcon', this.id, component);
    });
    registerChannelHeaderButtonAction = reArg([
        'icon',
        'action',
        'dropdownText',
        'tooltipText',
    ], ({
        icon,
        action,
        dropdownText,
        tooltipText,
    }: {
        icon: ReactResolvable;
        action: ChannelHeaderButtonAction['action'];
        dropdownText: ReactResolvable;
        tooltipText: ReactResolvable;
    }) => {
        const id = generateId();
        const data = {
            id,
            pluginId: this.id,
            icon: resolveReactElement(icon),
            action,
            dropdownText: resolveReactElement(dropdownText),
            tooltipText: resolveReactElement(tooltipText),
        };
        dispatchPluginComponentWithData('ChannelHeaderButton', data);
        dispatchPluginComponentWithData('MobileChannelHeaderButton', data);
        return id;
    });
    registerChannelIntroButtonAction = reArg([
        'icon',
        'action',
        'text',
    ], ({
        icon,
        action,
        text,
    }: {
        icon: ReactResolvable;
        action: ChannelIntroButtonAction['action'];
        text: ReactResolvable;
    }) => {
        const id = generateId();
        const data = {
            id,
            pluginId: this.id,
            icon: resolveReactElement(icon),
            action,
            text: text as PluggableText,
        };
        dispatchPluginComponentWithData('ChannelIntroButton', data);
        return id;
    });
    registerCallButtonAction = reArg([
        'button',
        'dropdownButton',
        'action',
        'icon',
        'dropdownText',
    ], ({
        button,
        dropdownButton,
        action,
        icon,
        dropdownText,
    }: {
        button: ReactResolvable;
        dropdownButton: ReactResolvable;
        action: CallButtonAction['action'];
        icon: ReactResolvable;
        dropdownText: ReactResolvable;
    }) => {
        const id = generateId();
        const data = {
            id,
            pluginId: this.id,
            button: resolveReactElement(button),
            dropdownButton: resolveReactElement(dropdownButton),
            icon: resolveReactElement(icon),
            dropdownText: resolveReactElement(dropdownText),
            action,
        };
        dispatchPluginComponentWithData('CallButton', data);
        dispatchPluginComponentWithData('MobileChannelHeaderButton', data);
        return id;
    });
    registerPostTypeComponent = reArg(['type', 'component'], ({type, component}) => {
        const id = generateId();
        store.dispatch({
            type: ActionTypes.RECEIVED_PLUGIN_POST_COMPONENT,
            data: {
                id,
                pluginId: this.id,
                type,
                component,
            },
        });
        return id;
    });
    registerPostCardTypeComponent = reArg(['type', 'component'], ({type, component}) => {
        const id = generateId();
        store.dispatch({
            type: ActionTypes.RECEIVED_PLUGIN_POST_CARD_COMPONENT,
            data: {
                id,
                pluginId: this.id,
                type,
                component,
            },
        });
        return id;
    });
    registerPostWillRenderEmbedComponent = reArg(['match', 'component', 'toggleable'], ({
        match,
        component,
        toggleable,
    }: {
        match: PostWillRenderEmbedComponent['match'];
        component: PostWillRenderEmbedComponent['component'];
        toggleable: PostWillRenderEmbedComponent['toggleable'];
    }) => {
        const id = generateId();
        dispatchPluginComponentWithData('PostWillRenderEmbedComponent', {
            id,
            pluginId: this.id,
            component,
            match,
            toggleable,
        });
        return id;
    });
    registerMainMenuAction = reArg([
        'text',
        'action',
        'mobileIcon',
    ], ({
        text,
        action,
        mobileIcon,
    }: {
        text: ReactResolvable;
        action: MainMenuAction['action'];
        mobileIcon: ReactResolvable;
    }) => {
        const id = generateId();
        dispatchPluginComponentWithData('MainMenu', {
            id,
            pluginId: this.id,
            text: resolveReactElement(text),
            action,
            mobileIcon: resolveReactElement(mobileIcon),
        });
        return id;
    });
    registerChannelHeaderMenuAction = reArg([
        'text',
        'action',
        'shouldRender',
    ], ({
        text,
        action,
        shouldRender = defaultShouldRender,
    }: {
        text: ChannelHeaderAction['text'];
        action: ChannelHeaderAction['action'];
        shouldRender?: ChannelHeaderAction['shouldRender'];
    }) => {
        const id = generateId();
        dispatchPluginComponentWithData('ChannelHeader', {
            id,
            pluginId: this.id,
            text: resolveReactElement(text),
            action,
            shouldRender,
        });
        return id;
    });
    registerFileDropdownMenuAction = reArg([
        'match',
        'text',
        'action',
    ], ({
        match,
        text,
        action,
    }: {
        match: FilesDropdownAction['match'];
        text: ReactResolvable;
        action: FilesDropdownAction['action'];
    }) => {
        const id = generateId();
        dispatchPluginComponentWithData('FilesDropdown', {
            id,
            pluginId: this.id,
            match,
            text: resolveReactElement(text),
            action,
        });
        return id;
    });
    registerUserGuideDropdownMenuAction = reArg([
        'text',
        'action',
    ], ({
        text,
        action,
    }: {
        text: ReactResolvable;
        action: UserGuideDropdownAction['action'];
    }) => {
        const id = generateId();
        dispatchPluginComponentWithData('UserGuideDropdown', {
            id,
            pluginId: this.id,
            text: resolveReactElement(text),
            action,
        });
        return id;
    });
    registerPostActionComponent = reArg(['component'], ({component}: DPluginComponentProp) => {
        return dispatchPluginComponentAction('PostAction', this.id, component);
    });
    registerPostEditorActionComponent = reArg(['component'], ({component}: DPluginComponentProp) => {
        return dispatchPluginComponentAction('PostEditorAction', this.id, component);
    });
    registerCodeBlockActionComponent = reArg(['component'], ({component}: DPluginComponentProp) => {
        return dispatchPluginComponentAction('CodeBlockAction', this.id, component);
    });
    registerNewMessagesSeparatorActionComponent = reArg(['component'], ({component}: DPluginComponentProp) => {
        return dispatchPluginComponentAction('NewMessagesSeparatorAction', this.id, component);
    });
    registerPostDropdownMenuAction = reArg([
        'text',
        'action',
        'filter',
    ], ({
        text,
        action,
        filter,
    }: {
        text: PostDropdownMenuAction['text'];
        action: PostDropdownMenuAction['action'];
        filter: PostDropdownMenuAction['filter'];
    }) => {
        const id = generateId();
        dispatchPluginComponentWithData('PostDropdownMenu', {
            id,
            pluginId: this.id,
            text: resolveReactElement(text),
            action,
            filter,
        });
        return id;
    });
    registerPostDropdownSubMenuAction = reArg([
        'text',
        'action',
        'filter',
    ], ({
        text,
        action,
        filter,
    }: {
        text: ReactResolvable;
        action: PostDropdownMenuAction['action'];
        filter: PostDropdownMenuAction['filter'];
    }) => {
        const id = generateId();
        const registerMenuItem = (
            pluginId: string,
            id: string,
            parentMenuId: string | undefined,
            innerText: ReactResolvable,
            innerAction: PostDropdownMenuAction['action'],
            innerFilter: PostDropdownMenuAction['filter'],
        ) => {
            dispatchPluginComponentWithData('PostDropdownMenu', {
                id,
                parentMenuId,
                pluginId,
                text: resolveReactElement(innerText),
                subMenu: [],
                action: innerAction,
                filter: innerFilter,
            });
            type TInnerParams = [
                innerText: ReactResolvable,
                innerAction: PostDropdownMenuAction['action'],
                innerFilter: PostDropdownMenuAction['filter'],
            ];
            return function registerSubMenuItem(...args: TInnerParams) {
                if (parentMenuId) {
                    throw new Error('Submenus are currently limited to a single level.');
                }
                return registerMenuItem(pluginId, generateId(), id, ...args);
            };
        };
        return {id, rootRegisterMenuItem: registerMenuItem(this.id, id, undefined, text, action, filter)};
    });
    warnedAboutRegisterPostDropdownMenuComponent = false;
    registerPostDropdownMenuComponent = reArg(['component'], ({component}: DPluginComponentProp) => {
        if (!this.warnedAboutRegisterPostDropdownMenuComponent) {
            console.warn(
                `${this.id}: This plugin is using registerPostDropdownMenuComponent which is deprecated in Mattermost ` +
                'v11.0. That API will be removed in a future release, and plugins that use it may not work correctly. ' +
                'Please update the plugin to use registerPostDropdownMenuAction instead. See ' +
                'https://forum.mattermost.com/t/deprecating-a-post-dropdown-menu-component-plugin-api-v11/25001 for ' +
                'more information.',
            );
            this.warnedAboutRegisterPostDropdownMenuComponent = true;
        }
        return dispatchPluginComponentAction('PostDropdownMenuItem', this.id, component);
    });
    registerFileUploadMethod = reArg([
        'icon',
        'action',
        'text',
    ], ({
        icon,
        action,
        text,
    }: {
        icon: ReactResolvable;
        action: FileUploadMethodAction['action'];
        text: ReactResolvable;
    }) => {
        const id = generateId();
        dispatchPluginComponentWithData('FileUploadMethod', {
            id,
            pluginId: this.id,
            text: text as PluggableText,
            action,
            icon: icon as React.ReactNode,
        });
        return id;
    });
    registerFilesWillUploadHook = reArg(['hook'], ({hook}: {
        hook: FilesWillUploadHook['hook'];
    }) => {
        const id = generateId();
        dispatchPluginComponentWithData('FilesWillUploadHook', {
            id,
            pluginId: this.id,
            hook,
        });
        return id;
    });
    unregisterComponent = reArg(['componentId'], ({componentId}: {componentId: string}) => {
        store.dispatch({
            type: ActionTypes.REMOVED_PLUGIN_COMPONENT,
            id: componentId,
        });
    });
    unregisterPostTypeComponent = reArg(['componentId'], ({componentId}: {componentId: string}) => {
        store.dispatch({
            type: ActionTypes.REMOVED_PLUGIN_POST_COMPONENT,
            id: componentId,
        });
    });
    registerReducer = reArg(['reducer'], ({reducer}: {reducer: Reducer}) => {
        reducerRegistry.register('plugins-' + this.id, reducer);
    });
    registerWebSocketEventHandler = reArg([
        'event',
        'handler',
    ], ({
        event,
        handler,
    }: {
        event: string;
        handler: (msg: WebSocketMessages.Unknown) => void;
    }) => {
        registerPluginWebSocketEvent(this.id, event, handler);
    });
    unregisterWebSocketEventHandler = reArg(['event'], ({event}: { event: string }) => {
        unregisterPluginWebSocketEvent(this.id, event);
    });
    registerReconnectHandler = reArg(['handler'], ({handler}: {handler: () => void}) => {
        registerPluginReconnectHandler(this.id, handler);
    });
    unregisterReconnectHandler() {
        unregisterPluginReconnectHandler(this.id);
    }
    registerMessageWillBePostedHook = reArg(['hook'], ({hook}: {
        hook: MessageWillBePostedHook['hook'];
    }) => {
        const id = generateId();
        dispatchPluginComponentWithData('MessageWillBePosted', {
            id,
            pluginId: this.id,
            hook,
        });
        return id;
    });
    registerSlashCommandWillBePostedHook = reArg(['hook'], ({hook}: {
        hook: SlashCommandWillBePostedHook['hook'];
    }) => {
        const id = generateId();
        dispatchPluginComponentWithData('SlashCommandWillBePosted', {
            id,
            pluginId: this.id,
            hook,
        });
        return id;
    });
    registerMessageWillFormatHook = reArg(['hook'], ({hook}: {
        hook: MessageWillFormatHook['hook'];
    }) => {
        const id = generateId();
        dispatchPluginComponentWithData('MessageWillFormat', {
            id,
            pluginId: this.id,
            hook,
        });
        return id;
    });
    registerFilePreviewComponent = reArg(['override', 'component'], ({override, component}: {
        override: FilePreviewComponent['override'];
        component: FilePreviewComponent['component'];
    }) => {
        const id = generateId();
        dispatchPluginComponentWithData('FilePreview', {
            id,
            pluginId: this.id,
            override,
            component,
        });
        return id;
    });
    registerTranslations = reArg(['getTranslationsForLocale'], ({getTranslationsForLocale}: {getTranslationsForLocale: TranslationPluginFunction}) => {
        store.dispatch(registerPluginTranslationsSource(this.id, getTranslationsForLocale));
    });
    registerAdminConsolePlugin = reArg(['func'], ({func}) => {
        store.dispatch(registerAdminConsolePlugin(this.id, func));
    });
    unregisterAdminConsolePlugin() {
        store.dispatch(unregisterAdminConsolePlugin(this.id));
    }
    registerAdminConsoleCustomSetting = reArg([
        'key',
        'component',
        'options',
    ], ({
        key,
        component,
        options: {showTitle} = {showTitle: false},
    }: {
        key: string;
        component: AdminConsolePluginComponent['component'];
        options?: {showTitle: boolean};
    }) => {
        store.dispatch(registerAdminConsoleCustomSetting(this.id, key, component, {showTitle}));
    });
    registerAdminConsoleCustomSection = reArg([
        'key',
        'component',
    ], ({
        key,
        component,
    }: {
        key: string;
        component: AdminConsolePluginCustomSection['component'];
    }) => {
        store.dispatch(registerAdminConsoleCustomSection(this.id, key, component));
    });
    registerRightHandSidebarComponent = reArg([
        'component',
        'title',
    ], ({
        component,
        title,
    }: {
        component: RightHandSidebarComponent['component'];
        title: ReactResolvable;
    }) => {
        const id = generateId();
        dispatchPluginComponentWithData('RightHandSidebarComponent', {
            id,
            pluginId: this.id,
            component,
            title: resolveReactElement(title),
        });
        return {id, showRHSPlugin: showRHSPlugin(id), hideRHSPlugin: hideRHSPlugin(id), toggleRHSPlugin: toggleRHSPlugin(id)};
    });
    registerNeedsTeamRoute = reArg([
        'route',
        'component',
    ], ({
        route,
        component,
    }: {
        route: string;
        component: NeedsTeamComponent['component'];
    }) => {
        const id = generateId();
        let fixedRoute = standardizeRoute(route);
        fixedRoute = this.id + '/' + fixedRoute;
        dispatchPluginComponentWithData('NeedsTeamComponent', {
            id,
            pluginId: this.id,
            component,
            route: fixedRoute,
        });
        return id;
    });
    registerCustomRoute = reArg([
        'route',
        'component',
    ], ({
        route,
        component,
    }: {
        route: string;
        component: CustomRouteComponent['component'];
    }) => {
        const id = generateId();
        let fixedRoute = standardizeRoute(route);
        fixedRoute = this.id + '/' + fixedRoute;
        dispatchPluginComponentWithData('CustomRouteComponent', {
            id,
            pluginId: this.id,
            component,
            route: fixedRoute,
        });
        return id;
    });
    registerProduct = reArg([
        'baseURL',
        'switcherIcon',
        'switcherText',
        'switcherLinkURL',
        'mainComponent',
        'headerCentreComponent',
        'headerRightComponent',
        'showTeamSidebar',
        'showAppBar',
        'wrapped',
        'publicComponent',
    ], ({
        baseURL,
        switcherIcon,
        switcherText,
        switcherLinkURL,
        mainComponent,
        headerCentreComponent = () => null,
        headerRightComponent = () => null,
        showTeamSidebar = false,
        showAppBar = false,
        wrapped = true,
        publicComponent,
    }: Omit<ProductComponent, 'id' | 'pluginId'>) => {
        const id = generateId();
        dispatchPluginComponentWithData('Product', {
            id,
            pluginId: this.id,
            switcherIcon: resolveReactElement(switcherIcon),
            switcherText: resolveReactElement(switcherText),
            baseURL: '/' + standardizeRoute(baseURL),
            switcherLinkURL: '/' + standardizeRoute(switcherLinkURL),
            mainComponent,
            headerCentreComponent,
            headerRightComponent,
            showTeamSidebar,
            showAppBar,
            wrapped,
            publicComponent,
        });
        return id;
    });
    registerMessageWillBeUpdatedHook = reArg(['hook'], ({hook}: {
        hook: MessageWillBeUpdatedHook['hook'];
    }) => {
        const id = generateId();
        dispatchPluginComponentWithData('MessageWillBeUpdated', {
            id,
            pluginId: this.id,
            hook,
        });
        return id;
    });
    registerSidebarChannelLinkLabelComponent = reArg(['component'], ({component}: DPluginComponentProp) => {
        return dispatchPluginComponentAction('SidebarChannelLinkLabel', this.id, component);
    });
    registerSidebarBrowseOrAddChannelMenuAction = reArg([
        'text',
        'action',
        'icon',
    ], ({
        text,
        action,
        icon,
    }: {
        text: ReactResolvable;
        action: SidebarBrowseOrAddChannelMenuAction['action'];
        icon: ReactResolvable;
    }) => {
        const id = generateId();
        dispatchPluginComponentWithData('SidebarBrowseOrAddChannelMenu', {
            id,
            pluginId: this.id,
            text: resolveReactElement(text),
            action,
            icon: resolveReactElement(icon),
        });
        return id;
    });
    registerChannelToastComponent = reArg(['component'], ({component}: DPluginComponentProp) => {
        return dispatchPluginComponentAction('ChannelToast', this.id, component);
    });
    registerGlobalComponent = reArg(['component'], ({component}: DPluginComponentProp) => {
        return dispatchPluginComponentAction('Global', this.id, component);
    });
    registerAppBarComponent = reArg([
        'iconUrl',
        'action',
        'tooltipText',
        'supportedProductIds',
        'rhsComponent',
        'rhsTitle',
    ], ({
        iconUrl,
        action,
        tooltipText,
        supportedProductIds = null,
        rhsComponent,
        rhsTitle,
    }: {
        iconUrl: AppBarAction['iconUrl'];
        tooltipText: ReactResolvable;
        supportedProductIds: AppBarAction['supportedProductIds'];
    } & ({
        action: AppBarChannelAction;
        rhsComponent?: never;
        rhsTitle?: never;
    } | {
        action?: never;
        rhsComponent: RightHandSidebarComponent['component'];
        rhsTitle: ReactResolvable;
    })) => {
        const id = generateId();
        const registeredRhsComponent = rhsComponent && this.registerRightHandSidebarComponent({title: rhsTitle, component: rhsComponent});
        dispatchPluginComponentWithData('AppBar', {
            id,
            pluginId: this.id,
            iconUrl,
            tooltipText: resolveReactElement(tooltipText),
            supportedProductIds,
            ...registeredRhsComponent ? {
                action: () => store.dispatch(registeredRhsComponent.toggleRHSPlugin),
                rhsComponentId: registeredRhsComponent.id,
            } : {
                action: action!,
            },
        });
        return registeredRhsComponent ? {id, rhsComponent: registeredRhsComponent} : id;
    });
    registerSiteStatisticsHandler = reArg(['handler'], ({handler}) => {
        const data = {
            pluginId: this.id,
            handler,
        };
        store.dispatch({
            type: ActionTypes.RECEIVED_PLUGIN_STATS_HANDLER,
            data,
        });
    });
    registerDesktopNotificationHook = reArg(['hook'], ({hook}: {
        hook: DesktopNotificationHook['hook'];
    }) => {
        const id = generateId();
        dispatchPluginComponentWithData('DesktopNotificationHooks', {
            id,
            pluginId: this.id,
            hook,
        });
        return id;
    });
    registerUserSettings = reArg(['setting'], ({setting}) => {
        const data = {
            pluginId: this.id,
            setting,
        };
        store.dispatch({
            type: ActionTypes.RECEIVED_PLUGIN_USER_SETTINGS,
            data,
        });
    });
    registerSystemConsoleGroupTable = reArg(['component'], ({component}: DPluginComponentProp) => {
        return dispatchPluginComponentAction('SystemConsoleGroupTable', this.id, component);
    });
    registerRHSPluginPopoutListener = reArg(['pluginId', 'onPopoutOpened'], ({pluginId, onPopoutOpened}: {pluginId: string; onPopoutOpened: (teamName: string, channelName: string | undefined, listeners: Partial<PopoutListeners>) => void}) => {
        registerRHSPluginPopoutListener(pluginId, onPopoutOpened);
    });
}