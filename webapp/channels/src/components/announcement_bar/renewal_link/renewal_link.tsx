import React from 'react';
import {FormattedMessage} from 'react-intl';
import useOpenSalesLink from 'components/common/hooks/useOpenSalesLink';
import './renew_link.scss';
export interface RenewalLinkProps {
    isDisabled?: boolean;
    className?: string;
}
const RenewalLink = (props: RenewalLinkProps) => {
    const [openContactSales] = useOpenSalesLink();
    const handleLinkClick = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.preventDefault();
        openContactSales();
    };
    const btnText = (
        <FormattedMessage
            id='announcement_bar.warn.renew_license_contact_sales'
            defaultMessage='Contact sales'
        />
    );
    const defaultClassName = 'btn btn-primary';
    const buttonClassName = props.className || defaultClassName;
    return (
        <button
            className={buttonClassName}
            disabled={props.isDisabled}
            onClick={(e) => handleLinkClick(e)}
        >
            {btnText}
        </button>
    );
};
export default RenewalLink;