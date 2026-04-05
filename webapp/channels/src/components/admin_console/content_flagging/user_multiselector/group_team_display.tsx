import React from 'react';
import {LinkVariantIcon, AccountMultipleOutlineIcon} from '@mattermost/compass-icons/components';
import type {Group} from '@mattermost/types/groups';
import type {Team} from '@mattermost/types/teams';
import './user_profile_pill.scss';
type GroupTeamDisplayProps = {
    item: Group | Team;
    variant: 'group' | 'team';
    displayMode?: 'list' | 'chip';
}
const isTeam = (option: Group | Team): option is Team => {
    return (option as Team).type !== undefined;
};
export function GroupTeamDisplay({item, variant, displayMode = 'list'}: GroupTeamDisplayProps) {
    const displayName = item.display_name || item.name;
    const showLdapSource = variant === 'group' && !isTeam(item) && (item as Group).source === 'ldap';
    const icon = variant === 'team' ? (
        <LinkVariantIcon size={16}/>
    ) : (
        <AccountMultipleOutlineIcon size={16}/>
    );
    const iconClassName = displayMode === 'chip' ? 'GroupIcon GroupIcon--chip' : 'GroupIcon';
    return (
        <>
            <div className={iconClassName}>
                {icon}
            </div>
            <span className='GroupLabel'>
                <span>{displayName}</span>
                {showLdapSource && <span className='GroupSource'>{'(AD/LDAP)'}</span>}
            </span>
        </>
    );
}