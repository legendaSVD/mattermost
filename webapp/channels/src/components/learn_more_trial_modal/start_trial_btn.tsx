import React from 'react';
import {useIntl} from 'react-intl';
import useOpenStartTrialFormModal from 'components/common/hooks/useOpenStartTrialFormModal';
import './start_trial_btn.scss';
export type StartTrialBtnProps = {
    onClick?: () => void;
    btnClass?: string;
    renderAsButton?: boolean;
    disabled?: boolean;
};
const StartTrialBtn = ({
    btnClass,
    onClick,
    disabled = false,
    renderAsButton = false,
}: StartTrialBtnProps) => {
    const {formatMessage} = useIntl();
    const openTrialForm = useOpenStartTrialFormModal();
    const startTrial = async () => {
        openTrialForm();
        if (onClick) {
            onClick();
        }
    };
    const id = 'start_trial_btn';
    const btnText = formatMessage({id: 'admin.ldap_feature_discovery.call_to_action.primary', defaultMessage: 'Start trial'});
    return renderAsButton ? (
        <button
            id={id}
            className={btnClass}
            onClick={startTrial}
            disabled={disabled}
        >
            {btnText}
        </button>
    ) : (
        <a
            id={id}
            className='btn btn-secondary'
            onClick={startTrial}
        >
            {btnText}
        </a>
    );
};
export default StartTrialBtn;