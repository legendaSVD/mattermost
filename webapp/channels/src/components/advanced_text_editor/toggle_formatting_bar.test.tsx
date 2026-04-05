import React from 'react';
import {fireEvent, renderWithContext, screen, userEvent} from 'tests/react_testing_utils';
import ToggleFormattingBar from './toggle_formatting_bar';
jest.mock('components/with_tooltip', () => {
    return ({children}: { children: React.ReactNode }) => <div>{children}</div>;
});
describe('ToggleFormattingBar Component', () => {
    it('should render correctly with default props', () => {
        renderWithContext(
            <ToggleFormattingBar
                onClick={jest.fn()}
                active={false}
                disabled={false}
            />,
        );
        expect(screen.getAllByLabelText('Format letter Case Icon')[0]).toBeInTheDocument();
    });
    it('should call onClick handler when clicked', async () => {
        const onClick = jest.fn();
        renderWithContext(
            <ToggleFormattingBar
                onClick={onClick}
                active={false}
                disabled={false}
            />,
        );
        await userEvent.click(screen.getByLabelText('formatting'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });
    it('should not be clickable when disabled', () => {
        const onClick = jest.fn();
        renderWithContext(
            <ToggleFormattingBar
                onClick={onClick}
                active={false}
                disabled={true}
            />,
        );
        fireEvent.click(screen.getByLabelText('formatting'));
        expect(onClick).not.toHaveBeenCalled();
    });
    it('should have the correct id based on active prop', () => {
        renderWithContext(
            <ToggleFormattingBar
                onClick={jest.fn()}
                active={true}
                disabled={false}
            />,
        );
        expect(screen.getByRole('button')).toHaveAttribute('id', 'toggleFormattingBarButton');
    });
});