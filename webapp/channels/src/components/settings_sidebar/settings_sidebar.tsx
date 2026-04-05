import classNames from 'classnames';
import React from 'react';
import {FormattedMessage} from 'react-intl';
import Constants from 'utils/constants';
import {isKeyPressed} from 'utils/keyboard';
export type Tab = {
    icon: string | {url: string};
    iconTitle: string;
    name: string;
    uiName: string;
    newGroup?: boolean;
    display?: boolean;
}
export type Props = {
    activeTab?: string;
    tabs: Tab[];
    pluginTabs?: Tab[];
    updateTab: (name: string) => void;
    isMobileView: boolean;
};
export default class SettingsSidebar extends React.PureComponent<Props> {
    buttonRefs: Map<string, HTMLButtonElement>;
    constructor(props: Props) {
        super(props);
        this.buttonRefs = new Map();
    }
    private getVisibleTabs(): Tab[] {
        const visibleTabs = this.props.tabs.filter((tab) => tab.display !== false);
        const visiblePluginTabs = this.props.pluginTabs?.filter((tab) => tab.display !== false) || [];
        return [...visibleTabs, ...visiblePluginTabs];
    }
    public handleClick = (tab: Tab, e: React.MouseEvent) => {
        e.preventDefault();
        this.props.updateTab(tab.name);
        (e.target as Element).closest('.settings-modal')?.classList.add('display--content');
    };
    public handleKeyDown = (tab: Tab, e: React.KeyboardEvent) => {
        if (!isKeyPressed(e, Constants.KeyCodes.UP) && !isKeyPressed(e, Constants.KeyCodes.DOWN)) {
            return;
        }
        e.preventDefault();
        const visibleTabs = this.getVisibleTabs();
        if (visibleTabs.length === 0) {
            return;
        }
        const currentIndex = visibleTabs.findIndex((t) => t.name === tab.name);
        if (currentIndex === -1) {
            return;
        }
        let nextIndex: number;
        if (isKeyPressed(e, Constants.KeyCodes.UP)) {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : visibleTabs.length - 1;
        } else {
            nextIndex = currentIndex < visibleTabs.length - 1 ? currentIndex + 1 : 0;
        }
        const targetTab = visibleTabs[nextIndex];
        this.props.updateTab(targetTab.name);
        const targetButton = this.buttonRefs.get(targetTab.name);
        if (targetButton) {
            targetButton.focus();
        }
    };
    private renderTab(tab: Tab) {
        const key = `${tab.name}_li`;
        const isActive = this.props.activeTab === tab.name;
        let icon;
        if (typeof tab.icon === 'string') {
            icon = (
                <i
                    className={tab.icon}
                    title={tab.iconTitle}
                />
            );
        } else {
            icon = (
                <img
                    src={tab.icon.url}
                    alt={tab.iconTitle}
                    className='icon'
                />
            );
        }
        return (
            <React.Fragment key={key}>
                {tab.newGroup && <hr/>}
                <button
                    data-testid={`${tab.name}-tab-button`}
                    ref={(element: HTMLButtonElement) => {
                        if (element) {
                            this.buttonRefs.set(tab.name, element);
                        } else {
                            this.buttonRefs.delete(tab.name);
                        }
                    }}
                    id={`${tab.name}Button`}
                    className={classNames('cursor--pointer style--none nav-pills__tab', {active: isActive})}
                    onClick={this.handleClick.bind(null, tab)}
                    onKeyDown={this.handleKeyDown.bind(null, tab)}
                    aria-label={tab.uiName.toLowerCase()}
                    role='tab'
                    aria-selected={isActive}
                    tabIndex={!isActive && !this.props.isMobileView ? -1 : 0}
                    aria-controls={`${tab.name}Settings`}
                >
                    {icon}
                    {tab.uiName}
                </button>
            </React.Fragment>
        );
    }
    public render() {
        const visibleTabs = this.props.tabs.filter((tab) => tab.display !== false);
        const tabList = visibleTabs.map((tab) => this.renderTab(tab));
        let pluginTabList: React.ReactNode;
        if (this.props.pluginTabs?.length) {
            const visiblePluginTabs = this.props.pluginTabs.filter((tab) => tab.display !== false);
            if (visiblePluginTabs.length) {
                pluginTabList = (
                    <>
                        <hr/>
                        <div
                            role='group'
                            aria-labelledby='userSettingsModal.pluginPreferences.header'
                        >
                            <div
                                key={'plugin preferences heading'}
                                role='heading'
                                className={'header'}
                                aria-level={3}
                                id='userSettingsModal_pluginPreferences_header'
                            >
                                <FormattedMessage
                                    id={'userSettingsModal.pluginPreferences.header'}
                                    defaultMessage={'PLUGIN PREFERENCES'}
                                />
                            </div>
                            {visiblePluginTabs.map((tab) => this.renderTab(tab))}
                        </div>
                    </>
                );
            }
        }
        return (
            <div
                id='tabList'
                className='nav nav-pills nav-stacked'
                role='tablist'
                aria-orientation='vertical'
            >
                <div role='group'>
                    {tabList}
                </div>
                {pluginTabList}
            </div>
        );
    }
}