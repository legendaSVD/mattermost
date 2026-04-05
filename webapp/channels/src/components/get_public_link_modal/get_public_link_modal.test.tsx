import React from 'react';
import GetPublicLinkModal from 'components/get_public_link_modal/get_public_link_modal';
import {renderWithContext, screen, userEvent} from 'tests/react_testing_utils';
describe('components/GetPublicLinkModal', () => {
    const baseProps = {
        link: 'http://mattermost.com/files/n5bnoaz3e7g93nyipzo1bixdwr/public?h=atw9qQHI1nUPnxo1e48tPspo1Qvwd3kHtJZjysmI5zs',
        fileId: 'n5bnoaz3e7g93nyipzo1bixdwr',
        onExited: jest.fn(),
        actions: {
            getFilePublicLink: jest.fn(),
        },
    };
    test('should match snapshot when link is empty', () => {
        const props = {
            ...baseProps,
            link: '',
        };
        const {baseElement} = renderWithContext(
            <GetPublicLinkModal {...props}/>,
        );
        expect(baseElement).toMatchSnapshot();
    });
    test('should match snapshot when link is not empty', () => {
        const {baseElement} = renderWithContext(
            <GetPublicLinkModal {...baseProps}/>,
        );
        expect(baseElement).toMatchSnapshot();
    });
    test('should call getFilePublicLink on GetPublicLinkModal\'s show', () => {
        renderWithContext(<GetPublicLinkModal {...baseProps}/>);
        expect(baseProps.actions.getFilePublicLink).toHaveBeenCalledTimes(1);
        expect(baseProps.actions.getFilePublicLink).toHaveBeenCalledWith(baseProps.fileId);
    });
    test('should not call getFilePublicLink on GetLinkModal\'s onHide', async () => {
        renderWithContext(
            <GetPublicLinkModal {...baseProps}/>,
        );
        baseProps.actions.getFilePublicLink.mockClear();
        await userEvent.click(document.getElementById('linkModalCloseButton')!);
        expect(baseProps.actions.getFilePublicLink).not.toHaveBeenCalled();
    });
    test('should call handleToggle on GetLinkModal\'s onHide', async () => {
        renderWithContext(<GetPublicLinkModal {...baseProps}/>);
        expect(screen.getByText('Copy Public Link')).toBeInTheDocument();
        await userEvent.click(document.getElementById('linkModalCloseButton')!);
        const modal = document.querySelector('.modal');
        expect(modal).not.toHaveClass('in');
    });
});