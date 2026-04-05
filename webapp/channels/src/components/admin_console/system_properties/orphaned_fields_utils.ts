import {useSelector} from 'react-redux';
import type {UserPropertyField} from '@mattermost/types/properties';
import type {GlobalState} from 'types/store';
export function isFieldOrphaned(
    field: UserPropertyField,
    installedPlugins: Record<string, any>,
): boolean {
    const sourcePluginId = field.attrs?.source_plugin_id;
    const isProtected = Boolean(field.attrs?.protected);
    return isProtected && Boolean(sourcePluginId) && !installedPlugins[sourcePluginId as string];
}
export function useIsFieldOrphaned(field: UserPropertyField): boolean {
    const installedPlugins = useSelector((state: GlobalState) => state.entities.admin.plugins ?? {});
    return isFieldOrphaned(field, installedPlugins);
}