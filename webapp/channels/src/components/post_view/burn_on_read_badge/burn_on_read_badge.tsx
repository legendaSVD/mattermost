import React, {memo, useCallback} from 'react';
import {useIntl} from 'react-intl';
import {useSelector} from 'react-redux';
import {FireIcon} from '@mattermost/compass-icons/components';
import type {Post} from '@mattermost/types/posts';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {getBurnOnReadRecipientData} from 'selectors/burn_on_read_recipients';
import BurnOnReadExpirationHandler from 'components/post_view/burn_on_read_expiration_handler';
import WithTooltip from 'components/with_tooltip';
import type {GlobalState} from 'types/store';
import './burn_on_read_badge.scss';
type Props = {
    post: Post;
    isSender: boolean;
    revealed: boolean;
    expireAt?: number | null;
    maxExpireAt?: number | null;
    onReveal?: (postId: string) => void;
    onSenderDelete?: () => void;
};
function BurnOnReadBadge({
    post,
    isSender,
    revealed,
    expireAt,
    maxExpireAt,
    onReveal,
    onSenderDelete,
}: Props) {
    const {formatMessage} = useIntl();
    const currentUserId = useSelector(getCurrentUserId);
    const recipientData = useSelector((state: GlobalState) => getBurnOnReadRecipientData(state, post, currentUserId));
    const handleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (isSender && onSenderDelete) {
            onSenderDelete();
            return;
        }
        if (!isSender && !revealed && onReveal) {
            onReveal(post.id);
        }
    }, [isSender, revealed, onReveal, onSenderDelete, post.id]);
    const getTooltipContent = () => {
        if (isSender) {
            const deleteText = formatMessage({
                id: 'burn_on_read.badge.sender.delete',
                defaultMessage: 'Click to delete message for everyone',
            });
            if (recipientData) {
                const readReceiptText = formatMessage(
                    {
                        id: 'burn_on_read.badge.read_receipt',
                        defaultMessage: 'Read by {revealedCount} of {totalRecipients} recipients',
                    },
                    {
                        revealedCount: recipientData.revealedCount,
                        totalRecipients: recipientData.totalRecipients,
                    },
                );
                return (
                    <div className='BurnOnReadBadge__tooltip-content'>
                        <div className='primary-text'>{deleteText}</div>
                        <div className='secondary-text'>{readReceiptText}</div>
                    </div>
                );
            }
            return deleteText;
        }
        if (!isSender && !revealed) {
            const primaryText = formatMessage({
                id: 'burn_on_read.badge.recipient.title',
                defaultMessage: 'Burn-on-read message',
            });
            const readDuration = post.props?.read_duration;
            if (readDuration && typeof readDuration === 'number') {
                const minutes = Math.floor(readDuration / 60000);
                const secondaryText = formatMessage(
                    {
                        id: 'burn_on_read.badge.recipient.subtitle',
                        defaultMessage: 'Message will be deleted {time} after you view it',
                    },
                    {
                        time: minutes > 0 ? formatMessage(
                            {
                                id: 'burn_on_read.duration.minutes',
                                defaultMessage: '{count, plural, one {# min} other {# mins}}',
                            },
                            {count: minutes},
                        ) : formatMessage({
                            id: 'burn_on_read.duration.less_than_minute',
                            defaultMessage: 'less than 1 min',
                        }),
                    },
                );
                return (
                    <div className='BurnOnReadBadge__tooltip-content'>
                        <div className='primary-text'>{primaryText}</div>
                        <div className='secondary-text'>{secondaryText}</div>
                    </div>
                );
            }
            return primaryText;
        }
        return null;
    };
    const tooltipContent = getTooltipContent();
    const senderHasActiveTimer = isSender && typeof expireAt === 'number';
    const getAriaLabel = () => {
        if (isSender) {
            const deleteText = formatMessage({
                id: 'burn_on_read.badge.sender.delete',
                defaultMessage: 'Click to delete message for everyone',
            });
            if (recipientData) {
                const readReceiptText = formatMessage(
                    {
                        id: 'burn_on_read.badge.read_receipt',
                        defaultMessage: 'Read by {revealedCount} of {totalRecipients} recipients',
                    },
                    {
                        revealedCount: recipientData.revealedCount,
                        totalRecipients: recipientData.totalRecipients,
                    },
                );
                return `${deleteText}. ${readReceiptText}`;
            }
            return deleteText;
        }
        if (!isSender && !revealed) {
            const primaryText = formatMessage({
                id: 'burn_on_read.badge.recipient.title',
                defaultMessage: 'Burn-on-read message',
            });
            const readDuration = post.props?.read_duration;
            if (readDuration && typeof readDuration === 'number') {
                const minutes = Math.floor(readDuration / 60000);
                const secondaryText = formatMessage(
                    {
                        id: 'burn_on_read.badge.recipient.subtitle',
                        defaultMessage: 'Message will be deleted {time} after you view it',
                    },
                    {
                        time: minutes > 0 ? formatMessage(
                            {
                                id: 'burn_on_read.duration.minutes',
                                defaultMessage: '{count, plural, one {# min} other {# mins}}',
                            },
                            {count: minutes},
                        ) : formatMessage({
                            id: 'burn_on_read.duration.less_than_minute',
                            defaultMessage: 'less than 1 min',
                        }),
                    },
                );
                return `${primaryText}. ${secondaryText}`;
            }
            return primaryText;
        }
        return '';
    };
    const isInteractive = isSender || (!isSender && !revealed);
    return (
        <>
            {}
            {}
            <BurnOnReadExpirationHandler
                postId={post.id}
                expireAt={expireAt}
                maxExpireAt={maxExpireAt}
            />
            {}
            {tooltipContent && !senderHasActiveTimer && (
                <WithTooltip
                    id={`burn-on-read-tooltip-${post.id}`}
                    title={tooltipContent}
                    isVertical={true}
                >
                    <button
                        type='button'
                        className='BurnOnReadBadge'
                        data-testid={`burn-on-read-badge-${post.id}`}
                        aria-label={getAriaLabel()}
                        onClick={isInteractive ? handleClick : undefined}
                        disabled={!isInteractive}
                    >
                        <FireIcon
                            size={14}
                            className='BurnOnReadBadge__icon'
                        />
                    </button>
                </WithTooltip>
            )}
        </>
    );
}
export default memo(BurnOnReadBadge);