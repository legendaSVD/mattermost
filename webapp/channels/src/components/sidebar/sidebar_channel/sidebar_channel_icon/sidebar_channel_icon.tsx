import React from 'react';
import {getArchiveIconClassName} from 'utils/channel_utils';
type Props = {
    icon: JSX.Element | null;
    isDeleted: boolean;
    channelType?: string;
};
function SidebarChannelIcon({isDeleted, icon, channelType}: Props) {
    if (isDeleted) {
        return (
            <i className={`icon ${getArchiveIconClassName(channelType)}`}/>
        );
    }
    return icon;
}
export default SidebarChannelIcon;