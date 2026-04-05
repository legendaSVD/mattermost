import classNames from 'classnames';
import React from 'react';
import type {ReactNode} from 'react';
import WithTooltip from 'components/with_tooltip';
import './alert_tag.scss';
export type AlertTagProps = {
    text: string;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
    variant?: 'default' | 'primary' | 'secondary' | 'info';
    size?: 'small' | 'medium' | 'large';
    testId?: string;
    tooltipTitle?: string | ReactNode;
};
const AlertTag: React.FC<AlertTagProps> = ({
    text,
    className,
    onClick,
    variant = 'default',
    size = 'medium',
    testId,
    tooltipTitle,
}) => {
    const TagElement = onClick ? 'button' : 'span';
    const tagElement = (
        <TagElement
            className={classNames(
                'AlertTag',
                `AlertTag--${variant}`,
                `AlertTag--${size}`,
                {
                    'AlertTag--clickable': Boolean(onClick),
                },
                className,
            )}
            onClick={onClick}
            data-testid={testId}
            {...(onClick && {type: 'button'})}
        >
            {text}
        </TagElement>
    );
    if (tooltipTitle) {
        return (
            <WithTooltip
                title={tooltipTitle}
            >
                {tagElement}
            </WithTooltip>
        );
    }
    return tagElement;
};
export default AlertTag;