import React, {useCallback, useState} from 'react';
import {FormattedMessage} from 'react-intl';
import {useDispatch, useSelector} from 'react-redux';
import {TourTip, useMeasurePunchouts} from '@mattermost/components';
import {savePreferences} from 'mattermost-redux/actions/preferences';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/common';
import {hasSeenBurnOnReadTourTip, BURN_ON_READ_TOUR_TIP_PREFERENCE, getBurnOnReadDurationMinutes} from 'selectors/burn_on_read';
import BurnOnReadSVG from './burn_on_read.svg';
import './burn_on_read_tour_tip.scss';
type Props = {
    onTryItOut: () => void;
}
const BurnOnReadTourTip = ({onTryItOut}: Props) => {
    const dispatch = useDispatch();
    const currentUserId = useSelector(getCurrentUserId);
    const hasSeenTip = useSelector(hasSeenBurnOnReadTourTip);
    const durationMinutes = useSelector(getBurnOnReadDurationMinutes);
    const [showTourTip, setShowTourTip] = useState(false);
    const overlayPunchOut = useMeasurePunchouts(['burnOnReadButton'], []);
    const markTourTipAsSeen = useCallback(() => {
        const preferences = [{
            user_id: currentUserId,
            category: BURN_ON_READ_TOUR_TIP_PREFERENCE,
            name: currentUserId,
            value: '1',
        }];
        dispatch(savePreferences(currentUserId, preferences));
    }, [currentUserId, dispatch]);
    const handleOpen = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowTourTip(true);
    }, []);
    const handleDismiss = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        markTourTipAsSeen();
        setShowTourTip(false);
    }, [markTourTipAsSeen]);
    const handleTryItOut = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        markTourTipAsSeen();
        onTryItOut();
    }, [markTourTipAsSeen, onTryItOut]);
    if (hasSeenTip) {
        return null;
    }
    const title = (
        <div className='BurnOnReadTourTip__title'>
            <FormattedMessage
                id='burn_on_read.tour_tip.title'
                defaultMessage='Burn-on-read messages'
            />
            <span className='BurnOnReadTourTip__badge'>
                <FormattedMessage
                    id='burn_on_read.tour_tip.badge'
                    defaultMessage='NEW'
                />
            </span>
        </div>
    );
    const screen = (
        <>
            <p>
                <FormattedMessage
                    id='burn_on_read.tour_tip.description'
                    defaultMessage='Burn-on-read messages are sent in a masked state. Recipients must click on them to reveal the actual message contents. They will be deleted automatically for each recipient {duration} minutes after being opened.'
                    values={{duration: durationMinutes}}
                />
            </p>
            <div className='BurnOnReadTourTip__demo'>
                <BurnOnReadSVG/>
            </div>
        </>
    );
    const dismissBtn = (
        <FormattedMessage
            id='burn_on_read.tour_tip.dismiss'
            defaultMessage='Dismiss'
        />
    );
    const tryItOutBtn = (
        <FormattedMessage
            id='burn_on_read.tour_tip.try_it_out'
            defaultMessage='Try it out'
        />
    );
    return (
        <TourTip
            show={showTourTip}
            screen={screen}
            title={title}
            overlayPunchOut={overlayPunchOut}
            placement='top-start'
            pulsatingDotPlacement='top-start'
            pulsatingDotTranslate={{x: 7, y: 0}}
            step={1}
            singleTip={true}
            showOptOut={false}
            interactivePunchOut={false}
            handleOpen={handleOpen}
            handleDismiss={handleDismiss}
            handlePrevious={handleDismiss}
            handleNext={handleTryItOut}
            prevBtn={dismissBtn}
            nextBtn={tryItOutBtn}
            width={352}
            tippyBlueStyle={true}
            hideBackdrop={true}
            className='BurnOnReadTourTip'
        />
    );
};
export default BurnOnReadTourTip;