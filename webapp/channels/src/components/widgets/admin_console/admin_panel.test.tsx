import React from 'react';
import {renderWithContext, screen, userEvent} from 'tests/react_testing_utils';
import AdminPanel from './admin_panel';
describe('components/widgets/admin_console/AdminPanel', () => {
    const defaultProps = {
        className: 'test-class-name',
        id: 'test-id',
        title: {id: 'test-title-id', defaultMessage: 'test-title-default'},
        subtitle: {id: 'test-subtitle-id', defaultMessage: 'test-subtitle-default'},
        subtitleValues: {foo: 'bar'},
    };
    test('should render with title, subtitle, and children', () => {
        renderWithContext(
            <AdminPanel {...defaultProps}>{'Test'}</AdminPanel>,
        );
        const heading = screen.getByRole('heading', {level: 3});
        expect(heading).toHaveTextContent('test-title-default');
        const panel = heading.closest('.AdminPanel');
        expect(panel).toHaveClass('AdminPanel', 'clearfix', 'test-class-name');
        expect(panel).toHaveAttribute('id', 'test-id');
        expect(screen.getByText('test-subtitle-default')).toBeInTheDocument();
        expect(screen.getByText('Test')).toBeInTheDocument();
        expect(screen.queryByText(/Button/i)).not.toBeInTheDocument();
    });
    test('should render with button when provided', () => {
        renderWithContext(
            <AdminPanel
                {...defaultProps}
                button={<span>{'TestButton'}</span>}
            >
                {'Test'}
            </AdminPanel>,
        );
        expect(screen.getByText('TestButton')).toBeInTheDocument();
        expect(screen.getByText('test-title-default')).toBeInTheDocument();
        expect(screen.getByText('Test')).toBeInTheDocument();
    });
    test('should call onHeaderClick when header is clicked', async () => {
        const onHeaderClick = jest.fn();
        renderWithContext(
            <AdminPanel
                {...defaultProps}
                onHeaderClick={onHeaderClick}
            >
                {'Test'}
            </AdminPanel>,
        );
        await userEvent.click(screen.getByText('test-title-default'));
        expect(onHeaderClick).toHaveBeenCalledTimes(1);
    });
});