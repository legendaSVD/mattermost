import React from 'react';
import GetLinkModal from 'components/get_link_modal';
import {renderWithContext, act, screen, userEvent} from 'tests/react_testing_utils';
describe('components/GetLinkModal', () => {
    const onHide = jest.fn();
    const requiredProps = {
        show: true,
        onHide,
        onExited: jest.fn(),
        title: 'title',
        link: 'https://mattermost.com',
    };
    beforeEach(() => {
        jest.useFakeTimers();
    });
    afterEach(() => {
        jest.useRealTimers();
    });
    test('should match snapshot when all props is set', () => {
        const helpText = 'help text';
        const props = {...requiredProps, helpText};
        const {baseElement} = renderWithContext(
            <GetLinkModal {...props}/>,
        );
        expect(baseElement).toMatchSnapshot();
    });
    test('should match snapshot when helpText is not set', () => {
        const {baseElement} = renderWithContext(
            <GetLinkModal {...requiredProps}/>,
        );
        expect(baseElement).toMatchSnapshot();
    });
    test('should have called onHide when close button is clicked', async () => {
        const user = userEvent.setup({advanceTimers: jest.advanceTimersByTime});
        const newOnHide = jest.fn();
        const props = {...requiredProps, onHide: newOnHide};
        const {baseElement} = renderWithContext(
            <GetLinkModal {...props}/>,
        );
        const modalCloseButton = baseElement.querySelector('.close') as HTMLElement;
        await user.click(modalCloseButton);
        expect(newOnHide).toHaveBeenCalledTimes(1);
        const copyButton = screen.getByRole('button', {name: /Copy Link/});
        await user.click(copyButton);
        expect(copyButton).toHaveTextContent('Copied');
        expect(copyButton).toHaveClass('btn-success');
        expect(baseElement).toMatchSnapshot();
        const footerCloseButton = baseElement.querySelector('#linkModalCloseButton') as HTMLElement;
        await user.click(footerCloseButton);
        expect(newOnHide).toHaveBeenCalledTimes(2);
        expect(baseElement).toMatchSnapshot();
        expect(copyButton).toHaveTextContent('Copy Link');
        expect(copyButton).not.toHaveClass('btn-success');
    });
    test('should have handle copyLink', async () => {
        const user = userEvent.setup({advanceTimers: jest.advanceTimersByTime});
        const {baseElement} = renderWithContext(
            <GetLinkModal {...requiredProps}/>,
        );
        const textarea = baseElement.querySelector('#linkModalTextArea') as HTMLElement;
        const copyButton = screen.getByRole('button', {name: /Copy Link/});
        expect(copyButton).toHaveTextContent('Copy Link');
        await user.click(textarea);
        expect(copyButton).toHaveTextContent('Copied');
        expect(copyButton).toHaveClass('btn-success');
    });
    test('should change button state when copying', async () => {
        const user = userEvent.setup({advanceTimers: jest.advanceTimersByTime});
        renderWithContext(
            <GetLinkModal {...requiredProps}/>,
        );
        const copyButton = screen.getByRole('button', {name: /Copy Link/});
        expect(copyButton).toHaveTextContent('Copy Link');
        expect(copyButton).toHaveClass('btn-primary');
        expect(copyButton).not.toHaveClass('btn-success');
        await user.click(copyButton);
        expect(copyButton).toHaveTextContent('Copied');
        expect(copyButton).toHaveClass('btn-primary');
        expect(copyButton).toHaveClass('btn-success');
        act(() => {
            jest.advanceTimersByTime(1000);
        });
        expect(copyButton).toHaveTextContent('Copy Link');
        expect(copyButton).toHaveClass('btn-primary');
        expect(copyButton).not.toHaveClass('btn-success');
    });
    test('should cleanup timeout on unmount', async () => {
        const user = userEvent.setup({advanceTimers: jest.advanceTimersByTime});
        const {unmount} = renderWithContext(
            <GetLinkModal {...requiredProps}/>,
        );
        const copyButton = screen.getByRole('button', {name: /Copy Link/});
        await user.click(copyButton);
        expect(copyButton).toHaveTextContent('Copied');
        unmount();
        jest.advanceTimersByTime(1000);
    });
});