import React, {useEffect} from 'react';
import {useIntl} from 'react-intl';
import {useDispatch, useSelector} from 'react-redux';
import {getCloudProducts, getCloudSubscription} from 'mattermost-redux/actions/cloud';
import {getCloudSubscription as selectCloudSubscription, getSubscriptionProduct as selectSubscriptionProduct, isCurrentLicenseCloud} from 'mattermost-redux/selectors/entities/cloud';
import {getConfig, getLicense} from 'mattermost-redux/selectors/entities/general';
import {isCurrentUserSystemAdmin} from 'mattermost-redux/selectors/entities/users';
import useOpenPricingModal from 'components/common/hooks/useOpenPricingModal';
import WithTooltip from 'components/with_tooltip';
import {CloudProducts} from 'utils/constants';
const PlanUpgradeButton = (): JSX.Element | null => {
    const dispatch = useDispatch();
    const {formatMessage} = useIntl();
    const {openPricingModal, isAirGapped} = useOpenPricingModal();
    const isCloud = useSelector(isCurrentLicenseCloud);
    useEffect(() => {
        if (isCloud) {
            dispatch(getCloudSubscription());
            dispatch(getCloudProducts());
        }
    }, [isCloud]);
    const isAdmin = useSelector(isCurrentUserSystemAdmin);
    const subscription = useSelector(selectCloudSubscription);
    const product = useSelector(selectSubscriptionProduct);
    const config = useSelector(getConfig);
    const license = useSelector(getLicense);
    const isEnterpriseTrial = subscription?.is_free_trial === 'true';
    const isCloudFree = product?.sku === CloudProducts.STARTER;
    const isSelfHostedEnterpriseTrial = !isCloud && license.IsTrial === 'true';
    const isSelfHostedStarter = license.IsLicensed === 'false';
    const isEnterpriseReady = config.BuildEnterpriseReady === 'true';
    if (!isAdmin) {
        return null;
    }
    if (!isEnterpriseReady) {
        return null;
    }
    if (isCloud && !(isCloudFree || isEnterpriseTrial)) {
        return null;
    }
    if (!isCloud && !(isSelfHostedStarter || isSelfHostedEnterpriseTrial)) {
        return null;
    }
    if (isAirGapped) {
        return null;
    }
    return (
        <WithTooltip
            title={formatMessage({id: 'pricing_modal.btn.tooltip', defaultMessage: 'Only visible to system admins'})}
        >
            <button
                id='UpgradeButton'
                aria-haspopup='dialog'
                onClick={() => openPricingModal()}
                className='btn btn-primary btn-xs'
            >
                {formatMessage({id: 'pricing_modal.btn.viewPlans', defaultMessage: 'View plans'})}
            </button>
        </WithTooltip>);
};
export default PlanUpgradeButton;