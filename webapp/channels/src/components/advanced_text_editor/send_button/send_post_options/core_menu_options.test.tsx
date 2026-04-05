import {DateTime} from 'luxon';
import React from 'react';
import useTimePostBoxIndicator from 'components/advanced_text_editor/use_post_box_indicator';
import {WithTestMenuContext} from 'components/menu/menu_context_test';
import {fireEvent, renderWithContext, screen} from 'tests/react_testing_utils';
import CoreMenuOptions from './core_menu_options';
jest.mock('components/advanced_text_editor/use_post_box_indicator');
const mockedUseTimePostBoxIndicator = jest.mocked(useTimePostBoxIndicator);
const teammateDisplayName = 'John Doe';
const userCurrentTimezone = 'America/New_York';
const teammateTimezone = {
    useAutomaticTimezone: true,
    automaticTimezone: 'Europe/London',
    manualTimezone: '',
};
const defaultUseTimePostBoxIndicatorReturnValue = {
    userCurrentTimezone: 'America/New_York',
    teammateTimezone,
    teammateDisplayName,
    isDM: false,
    showRemoteUserHour: false,
    currentUserTimesStamp: 0,
    isScheduledPostEnabled: false,
    showDndWarning: false,
    teammateId: '',
};
const initialState = {
    entities: {
        preferences: {
            myPreferences: {},
        },
        users: {
            currentUserId: 'currentUserId',
        },
    },
};
describe('CoreMenuOptions Component', () => {
    const handleOnSelect = jest.fn();
    beforeEach(() => {
        handleOnSelect.mockReset();
        mockedUseTimePostBoxIndicator.mockReturnValue({
            ...defaultUseTimePostBoxIndicatorReturnValue,
            isDM: false,
            isSelfDM: false,
            isBot: false,
        });
    });
    afterEach(() => {
        jest.useRealTimers();
    });
    function renderComponent(state = initialState, handleOnSelectOverride = handleOnSelect) {
        renderWithContext(
            <WithTestMenuContext>
                <CoreMenuOptions
                    handleOnSelect={handleOnSelectOverride}
                    channelId='channelId'
                />
            </WithTestMenuContext>,
            state,
        );
    }
    function setMockDate(weekday: number) {
        const mockDate = DateTime.fromObject({weekday}, {zone: userCurrentTimezone}).toJSDate();
        jest.useFakeTimers();
        jest.setSystemTime(mockDate);
    }
    it('should render tomorrow option on Sunday', () => {
        setMockDate(7);
        renderComponent();
        expect(screen.getByText(/Tomorrow at/)).toBeInTheDocument();
        expect(screen.queryByText(/Monday at/)).not.toBeInTheDocument();
    });
    it('should render tomorrow and next Monday options on Monday', () => {
        setMockDate(1);
        renderComponent();
        expect(screen.getByText(/Tomorrow at/)).toBeInTheDocument();
        expect(screen.getByText(/Next Monday at/)).toBeInTheDocument();
    });
    it('should render Monday option on Friday', () => {
        setMockDate(5);
        renderComponent();
        expect(screen.getByText(/Monday at/)).toBeInTheDocument();
        expect(screen.queryByText(/Tomorrow at/)).not.toBeInTheDocument();
    });
    it('should include trailing element when isDM true', () => {
        setMockDate(2);
        mockedUseTimePostBoxIndicator.mockReturnValue({
            ...defaultUseTimePostBoxIndicatorReturnValue,
            isDM: true,
            isSelfDM: false,
            isBot: false,
        });
        renderComponent();
        expect(screen.getAllByText(/John Doe/)[0]).toBeInTheDocument();
    });
    it('should NOT include trailing element when isDM false', () => {
        setMockDate(2);
        renderComponent();
        expect(screen.queryByText(/John Doe/)).not.toBeInTheDocument();
    });
    it('should call handleOnSelect with the right timestamp if tomorrow option is clicked', () => {
        setMockDate(3);
        renderComponent();
        const tomorrowOption = screen.getByText(/Tomorrow at/);
        fireEvent.click(tomorrowOption);
        const expectedTimestamp = DateTime.now().
            setZone(userCurrentTimezone).
            plus({days: 1}).
            set({hour: 9, minute: 0, second: 0, millisecond: 0}).
            toMillis();
        expect(handleOnSelect).toHaveBeenCalledWith(expect.anything(), expectedTimestamp);
    });
    it('should NOT include trailing element when isDM and isBot are true', () => {
        setMockDate(2);
        mockedUseTimePostBoxIndicator.mockReturnValue({
            ...defaultUseTimePostBoxIndicatorReturnValue,
            isDM: true,
            isSelfDM: false,
            isBot: true,
        });
        renderComponent();
        expect(screen.queryByText(/John Doe/)).toBeNull();
    });
    it('should NOT include trailing element when the DM is with oneself', () => {
        setMockDate(2);
        mockedUseTimePostBoxIndicator.mockReturnValue({
            ...defaultUseTimePostBoxIndicatorReturnValue,
            isDM: true,
            isSelfDM: true,
            isBot: false,
        });
        renderComponent();
        expect(screen.queryByText(/John Doe/)).toBeNull();
    });
    it('should format teammate time according to user locale', () => {
        setMockDate(2);
        const stateWithFrenchLocale = {
            ...initialState,
            entities: {
                ...initialState.entities,
                users: {
                    ...initialState.entities.users,
                    profiles: {
                        currentUserId: {
                            locale: 'fr',
                        },
                    },
                },
            },
        };
        mockedUseTimePostBoxIndicator.mockReturnValue({
            ...defaultUseTimePostBoxIndicatorReturnValue,
            isDM: true,
            isSelfDM: false,
            isBot: false,
        });
        renderComponent(stateWithFrenchLocale);
        const timeTexts = screen.getAllByText(/\d{2}:\d{2}(?!\s*[AP]M)/);
        expect(timeTexts.length).toBeGreaterThan(0);
    });
});