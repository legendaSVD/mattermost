import type React from 'react';
export type PluginConfiguration = {
    id: string;
    uiName: string;
    icon?: string;
    action?: PluginConfigurationAction;
    sections: Array<PluginConfigurationSection | PluginConfigurationCustomSection>;
}
export type PluginConfigurationAction = {
    title: string;
    text: string;
    buttonText: string;
    onClick: () => void;
}
export type PluginConfigurationSection = {
    settings: PluginConfigurationSetting[];
    title: string;
    disabled?: boolean;
    onSubmit?: (changes: {[name: string]: string}) => void;
}
export type PluginConfigurationCustomSection = {
    title: string;
    component: React.ComponentType;
}
export type BasePluginConfigurationSetting = {
    name: string;
    title?: string;
    helpText?: string;
    default?: string;
}
export type PluginConfigurationRadioSetting = BasePluginConfigurationSetting & {
    type: 'radio';
    default: string;
    options: PluginConfigurationRadioSettingOption[];
}
export type PluginCustomSettingComponent = React.ComponentType<{informChange: (name: string, value: string) => void}>;
export type PluginConfigurationCustomSetting = BasePluginConfigurationSetting & {
    type: 'custom';
    component: PluginCustomSettingComponent;
}
export type PluginConfigurationRadioSettingOption = {
    value: string;
    text: string;
    helpText?: string;
}
export type PluginConfigurationSetting = PluginConfigurationRadioSetting | PluginConfigurationCustomSetting