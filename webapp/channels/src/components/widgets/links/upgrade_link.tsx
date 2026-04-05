import React from 'react';
import {FormattedMessage} from 'react-intl';
import './link.scss';
import useOpenSalesLink from 'components/common/hooks/useOpenSalesLink';
export interface UpgradeLinkProps {
    buttonText?: string;
    styleButton?: boolean;
    styleLink?: boolean;
}
const UpgradeLink = (props: UpgradeLinkProps) => {
    const styleButton = props.styleButton ? ' style-button' : '';
    const styleLink = props.styleLink ? ' style-link' : '';
    const [openSalesLink] = useOpenSalesLink();
    const handleLinkClick = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.preventDefault();
        openSalesLink();
    };
    const buttonText = (
        <FormattedMessage
            id='upgradeLink.warn.upgrade_now'
            defaultMessage='Upgrade now'
        />
    );
    return (
        <button
            className={`upgradeLink${styleButton}${styleLink}`}
            onClick={(e) => handleLinkClick(e)}
        >
            {props.buttonText ? props.buttonText : buttonText}
        </button>
    );
};
export default UpgradeLink;