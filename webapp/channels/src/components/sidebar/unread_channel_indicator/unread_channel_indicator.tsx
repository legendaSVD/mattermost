import classNames from 'classnames';
import React from 'react';
import UnreadBelowIcon from 'components/widgets/icons/unread_below_icon';
import './unread_channel_indicator.scss';
type Props = {
    onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
    show?: boolean;
    extraClass?: string;
    content?: React.ReactNode;
    name?: string;
}
function UnreadChannelIndicator({
    onClick,
    show = false,
    extraClass = '',
    content = '',
    name,
}: Props) {
    return (
        <div
            id={'unreadIndicator' + name}
            className={classNames('nav-pills__unread-indicator', {
                'nav-pills__unread-indicator--visible': show,
            }, extraClass)}
            onClick={onClick}
        >
            <UnreadBelowIcon className='icon icon__unread'/>
            {content}
        </div>
    );
}
export default UnreadChannelIndicator;