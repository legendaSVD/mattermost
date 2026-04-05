import React from 'react';
import {renderWithContext, screen, userEvent, waitFor} from 'tests/react_testing_utils';
import SharedChannelIndicator from './shared_channel_indicator';
describe('components/SharedChannelIndicator', () => {
    test('should render without tooltip', () => {
        renderWithContext(
            <SharedChannelIndicator withTooltip={false}/>,
        );
        expect(screen.getByTestId('SharedChannelIcon')).toHaveClass('icon-circle-multiple-outline');
    });
    test('should render with default tooltip when no remote names', async () => {
        jest.useFakeTimers();
        renderWithContext(
            <SharedChannelIndicator withTooltip={true}/>,
        );
        const icon = screen.getByTestId('SharedChannelIcon');
        expect(icon).toHaveClass('icon-circle-multiple-outline');
        await userEvent.hover(icon, {advanceTimers: jest.advanceTimersByTime});
        await waitFor(() => {
            expect(screen.getByText('Shared with trusted organizations')).toBeInTheDocument();
        });
    });
    test('should render with remote names in tooltip', async () => {
        jest.useFakeTimers();
        const remoteNames = ['Remote 1', 'Remote 2'];
        renderWithContext(
            <SharedChannelIndicator
                withTooltip={true}
                remoteNames={remoteNames}
            />,
        );
        const icon = screen.getByTestId('SharedChannelIcon');
        expect(icon).toHaveClass('icon-circle-multiple-outline');
        await userEvent.hover(icon, {advanceTimers: jest.advanceTimersByTime});
        await waitFor(() => {
            expect(screen.getByText('Shared with: Remote 1, Remote 2')).toBeInTheDocument();
        });
    });
    test('should truncate and show count when more than 3 remote names', async () => {
        jest.useFakeTimers();
        const remoteNames = ['Remote 1', 'Remote 2', 'Remote 3', 'Remote 4', 'Remote 5'];
        renderWithContext(
            <SharedChannelIndicator
                withTooltip={true}
                remoteNames={remoteNames}
            />,
        );
        const icon = screen.getByTestId('SharedChannelIcon');
        expect(icon).toHaveClass('icon-circle-multiple-outline');
        await userEvent.hover(icon, {advanceTimers: jest.advanceTimersByTime});
        await waitFor(() => {
            expect(screen.getByText('Shared with: Remote 1, Remote 2, Remote 3 and 2 others')).toBeInTheDocument();
        });
    });
    test('should truncate long organization names with ellipsis', async () => {
        jest.useFakeTimers();
        const remoteNames = ['A Very Very Very Very Very Long Organization Name That Needs Truncation', 'Remote 2'];
        renderWithContext(
            <SharedChannelIndicator
                withTooltip={true}
                remoteNames={remoteNames}
            />,
        );
        const icon = screen.getByTestId('SharedChannelIcon');
        expect(icon).toHaveClass('icon-circle-multiple-outline');
        await userEvent.hover(icon, {advanceTimers: jest.advanceTimersByTime});
        await waitFor(() => {
            expect(screen.getByText('Shared with: A Very Very Very Very Very Lon..., Remote 2')).toBeInTheDocument();
        });
    });
    test('should correctly handle singular "other" in text', async () => {
        jest.useFakeTimers();
        const remoteNames = ['Remote 1', 'Remote 2', 'Remote 3', 'Remote 4'];
        renderWithContext(
            <SharedChannelIndicator
                withTooltip={true}
                remoteNames={remoteNames}
            />,
        );
        const icon = screen.getByTestId('SharedChannelIcon');
        expect(icon).toHaveClass('icon-circle-multiple-outline');
        await userEvent.hover(icon, {advanceTimers: jest.advanceTimersByTime});
        await waitFor(() => {
            expect(screen.getByText('Shared with: Remote 1, Remote 2, Remote 3 and 1 other')).toBeInTheDocument();
        });
    });
    test('should limit the overall tooltip length for extremely long content', async () => {
        jest.useFakeTimers();
        const longRemoteNames = [
            'Very Long Organization Name 1 That Exceeds Length Limits',
            'Very Long Organization Name 2 That Exceeds Length Limits',
            'Very Long Organization Name 3 That Exceeds Length Limits',
            'Very Long Organization Name 4 That Exceeds Length Limits',
            'Very Long Organization Name 5 That Exceeds Length Limits',
            'Very Long Organization Name 6 That Exceeds Length Limits',
        ];
        renderWithContext(
            <SharedChannelIndicator
                withTooltip={true}
                remoteNames={longRemoteNames}
            />,
        );
        const icon = screen.getByTestId('SharedChannelIcon');
        expect(icon).toHaveClass('icon-circle-multiple-outline');
        await userEvent.hover(icon, {advanceTimers: jest.advanceTimersByTime});
        await waitFor(() => {
            const tooltipText = screen.getByText(/Shared with:.*\.\.\./);
            expect(tooltipText).toBeInTheDocument();
            const tooltipContent = tooltipText.textContent || '';
            const actualContent = tooltipContent.replace('Shared with: ', '');
            expect(actualContent.length).toBeLessThanOrEqual(120);
        });
    });
    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
    });
});