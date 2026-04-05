import {screen, act} from '@testing-library/react';
import React from 'react';
import {renderWithContext} from 'tests/react_testing_utils';
import Readout from './readout';
describe('Readout', () => {
    it('should render message and clear it after timeout', async () => {
        jest.useFakeTimers();
        renderWithContext(<Readout/>, {
            views: {
                readout: {
                    message: 'Test message',
                },
            },
        });
        expect(screen.getByText('Test message')).toBeInTheDocument();
        act(() => {
            jest.advanceTimersByTime(2000);
        });
        expect(screen.queryByText('Test message')).not.toBeInTheDocument();
        jest.useRealTimers();
    });
});