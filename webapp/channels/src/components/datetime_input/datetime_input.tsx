import type {Moment} from 'moment-timezone';
import moment from 'moment-timezone';
import React, {useEffect, useState, useCallback, useRef} from 'react';
import type {DayModifiers, DayPickerProps} from 'react-day-picker';
import {useIntl} from 'react-intl';
import {useSelector} from 'react-redux';
import {getCurrentLocale} from 'selectors/i18n';
import {isUseMilitaryTime} from 'selectors/preferences';
import DatePicker from 'components/date_picker';
import * as Menu from 'components/menu';
import Constants from 'utils/constants';
import {formatDateForDisplay} from 'utils/date_utils';
import {relativeFormatDate} from 'utils/datetime';
import {isKeyPressed} from 'utils/keyboard';
import {getCurrentMomentForTimezone, isBeforeTime} from 'utils/timezone';
const CUSTOM_STATUS_TIME_PICKER_INTERVALS_IN_MINUTES = 30;
export function getRoundedTime(value: Moment, roundedTo = CUSTOM_STATUS_TIME_PICKER_INTERVALS_IN_MINUTES): Moment {
    const diff = value.minute() % roundedTo;
    if (diff === 0) {
        return moment(value).seconds(0).milliseconds(0);
    }
    const remainder = roundedTo - diff;
    return moment(value).add(remainder, 'm').seconds(0).milliseconds(0);
}
export const getTimeInIntervals = (startTime: Moment, interval = CUSTOM_STATUS_TIME_PICKER_INTERVALS_IN_MINUTES): Moment[] => {
    let time = moment(startTime);
    const nextDay = moment(startTime).add(1, 'days').startOf('day');
    const intervals: Moment[] = [];
    while (time.isBefore(nextDay)) {
        intervals.push(time.clone());
        const utcOffset = time.utcOffset();
        time = time.add(interval, 'minutes').seconds(0).milliseconds(0);
        if (utcOffset > time.utcOffset()) {
            time = time.add(utcOffset - time.utcOffset(), 'minutes').seconds(0).milliseconds(0);
        }
    }
    return intervals;
};
export const parseTimeString = (input: string): {hours: number; minutes: number} | null => {
    if (!input || typeof input !== 'string') {
        return null;
    }
    const trimmed = input.trim().toLowerCase();
    const hasAM = (/am?$/).test(trimmed);
    const hasPM = (/pm?$/).test(trimmed);
    const is12Hour = hasAM || hasPM;
    const timeStr = trimmed.replace(/[ap]m?$/i, '').trim();
    const match = timeStr.match(/^(\d{1,2}):?(\d{2})?$/);
    if (!match) {
        return null;
    }
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    if (minutes < 0 || minutes > 59) {
        return null;
    }
    if (is12Hour) {
        if (hours < 1 || hours > 12) {
            return null;
        }
        if (hasAM) {
            if (hours === 12) {
                hours = 0;
            }
        } else if (hasPM) {
            if (hours !== 12) {
                hours += 12;
            }
        }
    } else if (hours < 0 || hours > 23) {
        return null;
    }
    return {hours, minutes};
};
type TimeInputManualProps = {
    time: Moment | null;
    timezone?: string;
    isMilitaryTime: boolean;
    onTimeChange: (time: Moment) => void;
}
const TimeInputManual: React.FC<TimeInputManualProps> = ({
    time,
    timezone,
    isMilitaryTime,
    onTimeChange,
}) => {
    const {formatMessage} = useIntl();
    const [timeInputValue, setTimeInputValue] = useState<string>('');
    const [timeInputError, setTimeInputError] = useState<boolean>(false);
    const timeInputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (time) {
            const formatted = time.format(isMilitaryTime ? 'HH:mm' : 'h:mm A');
            setTimeInputValue(formatted);
        } else {
            setTimeInputValue('');
        }
    }, [time, isMilitaryTime]);
    const handleTimeInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setTimeInputValue(event.target.value);
        setTimeInputError(false);
    }, []);
    const handleTimeInputBlur = useCallback(() => {
        const parsed = parseTimeString(timeInputValue);
        if (!parsed) {
            if (timeInputValue.trim() !== '') {
                setTimeInputError(true);
            }
            return;
        }
        const baseMoment = time ? time.clone() : getCurrentMomentForTimezone(timezone);
        let targetMoment: Moment;
        if (timezone) {
            targetMoment = moment.tz([
                baseMoment.year(),
                baseMoment.month(),
                baseMoment.date(),
                parsed.hours,
                parsed.minutes,
                0,
                0,
            ], timezone);
        } else {
            baseMoment.hour(parsed.hours);
            baseMoment.minute(parsed.minutes);
            baseMoment.second(0);
            baseMoment.millisecond(0);
            targetMoment = baseMoment;
        }
        onTimeChange(targetMoment);
        setTimeInputError(false);
    }, [timeInputValue, time, timezone, onTimeChange]);
    const handleTimeInputKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (isKeyPressed(event as any, Constants.KeyCodes.ENTER)) {
            event.preventDefault();
            timeInputRef.current?.blur();
        }
    }, []);
    return (
        <div className='date-time-input-manual'>
            <input
                ref={timeInputRef}
                id='time_input'
                type='text'
                className={`date-time-input__text-input${timeInputError ? ' error' : ''}`}
                value={timeInputValue}
                onChange={handleTimeInputChange}
                onBlur={handleTimeInputBlur}
                onKeyDown={handleTimeInputKeyDown}
                placeholder={isMilitaryTime ? '13:40' : '1:40 PM'}
                aria-label={formatMessage({
                    id: 'datetime.time',
                    defaultMessage: 'Time',
                })}
            />
        </div>
    );
};
type Props = {
    time: Moment | null;
    handleChange: (date: Moment | null) => void;
    timezone?: string;
    setIsInteracting?: (interacting: boolean) => void;
    relativeDate?: boolean;
    timePickerInterval?: number;
    allowPastDates?: boolean;
    allowManualTimeEntry?: boolean;
}
const DateTimeInputContainer: React.FC<Props> = ({
    time,
    handleChange,
    timezone,
    setIsInteracting,
    relativeDate,
    timePickerInterval,
    allowPastDates = false,
    allowManualTimeEntry = false,
}: Props) => {
    const currentTime = getCurrentMomentForTimezone(timezone);
    const displayTime = time;
    const locale = useSelector(getCurrentLocale);
    const isMilitaryTime = useSelector(isUseMilitaryTime);
    const [timeOptions, setTimeOptions] = useState<Moment[]>([]);
    const [isPopperOpen, setIsPopperOpen] = useState(false);
    const [isTimeMenuOpen, setIsTimeMenuOpen] = useState(false);
    const [menuWidth, setMenuWidth] = useState<string>('200px');
    const {formatMessage} = useIntl();
    const timeContainerRef = useRef<HTMLDivElement>(null);
    const handlePopperOpenState = useCallback((isOpen: boolean) => {
        setIsPopperOpen(isOpen);
        setIsInteracting?.(isOpen);
    }, [setIsInteracting]);
    const handleTimeMenuToggle = useCallback((isOpen: boolean) => {
        setIsTimeMenuOpen(isOpen);
        setIsInteracting?.(isOpen);
        if (isOpen && timeContainerRef.current) {
            const button = timeContainerRef.current.querySelector('button');
            if (button) {
                const buttonWidth = button.getBoundingClientRect().width;
                setMenuWidth(`${Math.max(buttonWidth, 200)}px`);
            }
        }
    }, [setIsInteracting]);
    const handleTimeChange = useCallback((selectedTime: Moment) => {
        handleChange(selectedTime.clone().second(0).millisecond(0));
    }, [handleChange]);
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (isKeyPressed(event, Constants.KeyCodes.ESCAPE)) {
            if (isPopperOpen && !isTimeMenuOpen) {
                handlePopperOpenState(false);
            }
        }
    }, [isPopperOpen, isTimeMenuOpen, handlePopperOpenState]);
    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);
    useEffect(() => {
        if (time && !allowManualTimeEntry) {
            const interval = timePickerInterval || CUSTOM_STATUS_TIME_PICKER_INTERVALS_IN_MINUTES;
            const rounded = getRoundedTime(time, interval);
            if (!rounded.isSame(time, 'minute')) {
                handleChange(rounded);
            }
        }
    }, [time, timePickerInterval, handleChange, allowManualTimeEntry]);
    const setTimeAndOptions = () => {
        const timeForOptions = displayTime || currentTime;
        let startTime = timeForOptions.clone().startOf('day');
        if (!allowPastDates && currentTime.isSame(timeForOptions, 'date')) {
            startTime = getRoundedTime(currentTime, timePickerInterval);
        }
        setTimeOptions(getTimeInIntervals(startTime, timePickerInterval));
    };
    useEffect(setTimeAndOptions, [displayTime, timePickerInterval, allowPastDates, timezone]);
    const handleDayChange = (day: Date, modifiers: DayModifiers) => {
        let effectiveTime = displayTime;
        if (!effectiveTime) {
            const nowInTimezone = getCurrentMomentForTimezone(timezone);
            effectiveTime = allowManualTimeEntry ?
                nowInTimezone :
                getRoundedTime(nowInTimezone, timePickerInterval || 60);
        }
        if (modifiers.today) {
            const baseTime = getCurrentMomentForTimezone(timezone);
            if (!allowPastDates && isBeforeTime(baseTime, effectiveTime)) {
                baseTime.hour(effectiveTime.hours());
                baseTime.minute(effectiveTime.minutes());
            }
            const roundedTime = getRoundedTime(baseTime, timePickerInterval);
            handleChange(roundedTime);
        } else if (timezone) {
            const dayMoment = moment(day);
            const targetDate = moment.tz([
                dayMoment.year(),
                dayMoment.month(),
                dayMoment.date(),
                effectiveTime.hour(),
                effectiveTime.minute(),
                0,
                0,
            ], timezone);
            handleChange(targetDate);
        } else {
            day.setHours(effectiveTime.hour(), effectiveTime.minute());
            handleChange(moment(day));
        }
        handlePopperOpenState(false);
    };
    const formatDate = (date: Moment): string => {
        if (relativeDate) {
            return relativeFormatDate(date, formatMessage);
        }
        const dateInTimezone = new Date(date.year(), date.month(), date.date());
        return formatDateForDisplay(dateInTimezone, locale);
    };
    const calendarIcon = (
        <i className='icon-calendar-outline'/>
    );
    const clockIcon = (
        <i className='icon-clock-outline'/>
    );
    const datePickerProps: DayPickerProps = {
        initialFocus: isPopperOpen,
        mode: 'single',
        selected: displayTime?.toDate(),
        defaultMonth: displayTime?.toDate() || new Date(),
        onDayClick: handleDayChange,
        disabled: allowPastDates ? undefined : {before: currentTime.toDate()},
        showOutsideDays: true,
    };
    return (
        <div className='dateTime'>
            <div className='dateTime__date'>
                <DatePicker
                    isPopperOpen={isPopperOpen}
                    handlePopperOpenState={handlePopperOpenState}
                    locale={locale}
                    datePickerProps={datePickerProps}
                    label={formatMessage({
                        id: 'datetime.date',
                        defaultMessage: 'Date',
                    })}
                    icon={calendarIcon}
                    value={displayTime ? formatDate(displayTime) : ''}
                >
                    <span className='date-time-input__placeholder'>
                        {formatMessage({
                            id: 'datetime.select_date',
                            defaultMessage: 'Select date',
                        })}
                    </span>
                </DatePicker>
            </div>
            <div
                className='dateTime__time'
                ref={timeContainerRef}
            >
                {allowManualTimeEntry ? (
                    <TimeInputManual
                        time={displayTime}
                        timezone={timezone}
                        isMilitaryTime={isMilitaryTime}
                        onTimeChange={handleTimeChange}
                    />
                ) : (
                    <Menu.Container
                        menuButton={{
                            id: 'time_button',
                            dataTestId: 'time_button',
                            'aria-label': formatMessage({
                                id: 'datetime.time',
                                defaultMessage: 'Time',
                            }),
                            class: isTimeMenuOpen ? 'date-time-input date-time-input--open' : 'date-time-input',
                            children: (
                                <>
                                    <span className='date-time-input__label'>{formatMessage({
                                        id: 'datetime.time',
                                        defaultMessage: 'Time',
                                    })}</span>
                                    <span className='date-time-input__icon'>{clockIcon}</span>
                                    <span className='date-time-input__value'>
                                        {displayTime ? (
                                            <time dateTime={displayTime.toISOString()}>
                                                {displayTime.format(isMilitaryTime ? 'HH:mm' : 'LT')}
                                            </time>
                                        ) : (
                                            <span>{'--:--'}</span>
                                        )}
                                    </span>
                                </>
                            ),
                        }}
                        menu={{
                            id: 'expiryTimeMenu',
                            'aria-label': formatMessage({id: 'time_dropdown.choose_time', defaultMessage: 'Choose a time'}),
                            onToggle: handleTimeMenuToggle,
                            width: menuWidth,
                            className: 'time-menu-scrollable',
                        }}
                    >
                        {timeOptions.map((option, index) => (
                            <Menu.Item
                                key={index}
                                id={`time_option_${index}`}
                                data-testid={`time_option_${index}`}
                                labels={
                                    <span>{option.format(isMilitaryTime ? 'HH:mm' : 'LT')}</span>
                                }
                                onClick={() => handleTimeChange(option)}
                            />
                        ))}
                    </Menu.Container>
                )}
            </div>
        </div>
    );
};
export default DateTimeInputContainer;