import {render, screen, within} from '@testing-library/react';
import React from 'react';
import BasicSeparator from './basic-separator';
import NotificationSeparator from './notification-separator';
describe('components/widgets/separator', () => {
    describe('BasicSeparator', () => {
        test('should render separator with text', () => {
            render(
                <BasicSeparator>
                    {'Some text'}
                </BasicSeparator>,
            );
            const separator = screen.getByTestId('basicSeparator');
            expect(separator).toBeInTheDocument();
            expect(separator).toHaveClass('Separator', 'BasicSeparator');
            const hr = within(separator).getByRole('separator');
            expect(hr).toBeInTheDocument();
            expect(hr).toHaveClass('separator__hr');
            expect(screen.getByText('Some text')).toBeInTheDocument();
            expect(screen.getByText('Some text')).toHaveClass('separator__text');
        });
        test('should render separator without text', () => {
            render(<BasicSeparator/>);
            const separator = screen.getByTestId('basicSeparator');
            expect(separator).toBeInTheDocument();
            expect(within(separator).getByRole('separator')).toBeInTheDocument();
            const textDiv = separator.querySelector('.separator__text');
            expect(textDiv).not.toBeInTheDocument();
        });
    });
    describe('NotificationSeparator', () => {
        test('should render separator without text', () => {
            render(<NotificationSeparator/>);
            const separator = screen.getByTestId('NotificationSeparator');
            expect(separator).toBeInTheDocument();
            expect(separator).toHaveClass('Separator', 'NotificationSeparator');
            const hr = within(separator).getByRole('separator');
            expect(hr).toBeInTheDocument();
            expect(hr).toHaveClass('separator__hr');
            const textDiv = separator.querySelector('.separator__text');
            expect(textDiv).not.toBeInTheDocument();
        });
        test('should render separator with text', () => {
            render(
                <NotificationSeparator>
                    {'Some text'}
                </NotificationSeparator>,
            );
            const separator = screen.getByTestId('NotificationSeparator');
            expect(separator).toBeInTheDocument();
            expect(screen.getByText('Some text')).toBeInTheDocument();
            expect(screen.getByText('Some text')).toHaveClass('separator__text');
        });
    });
});