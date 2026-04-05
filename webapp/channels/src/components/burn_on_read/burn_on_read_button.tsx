import React, {memo} from 'react';
import {useIntl} from 'react-intl';
import {FireIcon} from '@mattermost/compass-icons/components';
import {IconContainer} from 'components/advanced_text_editor/formatting_bar/formatting_icon';
import WithTooltip from 'components/with_tooltip';
type Props = {
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    disabled: boolean;
    durationMinutes: number;
}
const BurnOnReadButton = ({enabled, onToggle, disabled, durationMinutes}: Props) => {
    const {formatMessage} = useIntl();
    const handleClick = () => {
        onToggle(!enabled);
    };
    const tooltipTitle = formatMessage(
        {
            id: 'burn_on_read.button.tooltip.title',
            defaultMessage: 'Burn-on-read',
        },
    );
    const tooltipHint = formatMessage(
        {
            id: 'burn_on_read.button.tooltip.hint',
            defaultMessage: 'Message will be deleted for a recipient {duration} minutes after they open it',
        },
        {duration: durationMinutes},
    );
    const tooltipMessage = `${tooltipTitle}: ${tooltipHint}`;
    return (
        <WithTooltip
            title={tooltipTitle}
            hint={tooltipHint}
        >
            <IconContainer
                id='burnOnReadButton'
                className='control'
                disabled={disabled}
                type='button'
                aria-label={tooltipMessage}
                onClick={handleClick}
            >
                <FireIcon
                    size={18}
                    color='currentColor'
                />
            </IconContainer>
        </WithTooltip>
    );
};
export default memo(BurnOnReadButton);