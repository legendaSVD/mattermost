import classNames from 'classnames';
import React from 'react';
type Props = {
    unreadMentions: number;
    hasUrgent?: boolean;
    icon?: React.ReactNode;
    className?: string;
};
export default function ChannelMentionBadge({unreadMentions, hasUrgent, icon, className}: Props) {
    if (unreadMentions > 0) {
        return (
            <span
                id='unreadMentions'
                className={classNames({badge: true, urgent: hasUrgent}, className)}
            >
                {icon}
                <span className='unreadMentions'>
                    {unreadMentions}
                </span>
            </span>
        );
    }
    return null;
}