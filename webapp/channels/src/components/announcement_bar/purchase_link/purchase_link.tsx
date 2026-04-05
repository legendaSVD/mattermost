import React from 'react';
import useOpenSalesLink from 'components/common/hooks/useOpenSalesLink';
import './purchase_link.scss';
export interface Props {
    buttonTextElement: JSX.Element;
    eventID?: string;
    className?: string;
}
const PurchaseLink: React.FC<Props> = (props: Props) => {
    const [openSalesLink] = useOpenSalesLink();
    const handlePurchaseLinkClick = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.preventDefault();
        openSalesLink();
    };
    const defaultClassName = 'btn btn-primary';
    const buttonClassName = props.className || defaultClassName;
    return (
        <button
            id={props.eventID}
            className={buttonClassName}
            onClick={handlePurchaseLinkClick}
        >
            {props.buttonTextElement}
        </button>
    );
};
export default PurchaseLink;