import React from 'react';
import type {Group} from '@mattermost/types/groups';
import {renderWithContext, screen, userEvent, waitFor} from 'tests/react_testing_utils';
import {TestHelper} from 'utils/test_helper';
import ListModal, {DEFAULT_NUM_PER_PAGE} from './list_modal';
describe('components/ListModal', () => {
    const mockItem1 = TestHelper.getGroupMock({id: '123', name: 'bar31'});
    const mockItem2 = TestHelper.getGroupMock({id: '234', name: 'bar2'});
    const mockItem3 = TestHelper.getGroupMock({id: '345', name: 'bar3'});
    const mockItems = [mockItem1, mockItem2];
    const mockItemsPage2 = [mockItem3];
    const mockSearchTerm = 'ar3';
    const mockItemsSearch = mockItems.concat(mockItemsPage2).filter((item) => item.name.includes(mockSearchTerm));
    const totalCount = mockItems.length + mockItemsPage2.length;
    const baseProps = {
        loadItems: jest.fn(async (pageNumber: number, searchTerm: string) => {
            if (searchTerm === mockSearchTerm) {
                return {items: mockItemsSearch, totalCount};
            }
            if (pageNumber === 0) {
                return {items: mockItems, totalCount};
            }
            return {items: mockItemsPage2, totalCount};
        }),
        renderRow: (item: Group) => {
            return (
                <div
                    className='item'
                    key={item.id}
                    data-testid={`item-${item.id}`}
                >
                    {item.id}
                </div>
            );
        },
        titleText: 'list modal',
        searchPlaceholderText: 'search for name',
        numPerPage: DEFAULT_NUM_PER_PAGE,
        titleBarButtonText: 'DEFAULT',
        titleBarButtonTextOnClick: () => {},
    };
    it('should match snapshot', async () => {
        const {baseElement} = renderWithContext(
            <ListModal {...baseProps}/>,
        );
        await waitFor(() => {
            expect(screen.getByTestId('item-123')).toBeInTheDocument();
        });
        expect(baseElement).toMatchSnapshot();
        expect(screen.getByTestId('item-123')).toBeInTheDocument();
        expect(screen.getByTestId('item-234')).toBeInTheDocument();
        expect(screen.getByText(/1 - 2 of 3 total/)).toBeInTheDocument();
    });
    it('should update numPerPage', async () => {
        const numPerPage = totalCount - 1;
        const props = {...baseProps, numPerPage};
        renderWithContext(
            <ListModal {...props}/>,
        );
        await waitFor(() => {
            expect(screen.getByTestId('item-123')).toBeInTheDocument();
        });
        expect(screen.getByRole('button', {name: 'Next'})).toBeInTheDocument();
    });
    it('should match snapshot with title bar button', async () => {
        const props = {
            ...baseProps,
            titleBarButtonText: 'Add Foo',
            titleBarButtonOnClick: jest.fn(),
        };
        const {baseElement} = renderWithContext(
            <ListModal {...props}/>,
        );
        await waitFor(() => {
            expect(screen.getByTestId('item-123')).toBeInTheDocument();
        });
        expect(baseElement).toMatchSnapshot();
        expect(screen.getByRole('link', {name: 'Add Foo'})).toBeInTheDocument();
    });
    test('should have called onHide when handleExit is called', async () => {
        const onHide = jest.fn();
        const props = {...baseProps, onHide};
        const {baseElement} = renderWithContext(
            <ListModal {...props}/>,
        );
        await waitFor(() => {
            expect(screen.getByTestId('item-123')).toBeInTheDocument();
        });
        const closeButton = baseElement.querySelector('.close') as HTMLElement;
        await userEvent.click(closeButton);
        await waitFor(() => {
            expect(onHide).toHaveBeenCalledTimes(1);
        });
    });
    test('paging loads new items', async () => {
        const props = {
            ...baseProps,
            numPerPage: 2,
        };
        renderWithContext(
            <ListModal {...props}/>,
        );
        await waitFor(() => {
            expect(screen.getByTestId('item-123')).toBeInTheDocument();
        });
        expect(screen.getByTestId('item-123')).toBeInTheDocument();
        expect(screen.getByTestId('item-234')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', {name: 'Next'}));
        await waitFor(() => {
            expect(screen.getByTestId('item-345')).toBeInTheDocument();
        });
        expect(screen.queryByTestId('item-123')).not.toBeInTheDocument();
        expect(screen.getByTestId('item-345')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', {name: 'Previous'}));
        await waitFor(() => {
            expect(screen.getByTestId('item-123')).toBeInTheDocument();
        });
        expect(screen.getByTestId('item-123')).toBeInTheDocument();
        expect(screen.getByTestId('item-234')).toBeInTheDocument();
    });
    test('search input', async () => {
        renderWithContext(
            <ListModal {...baseProps}/>,
        );
        await waitFor(() => {
            expect(screen.getByTestId('item-123')).toBeInTheDocument();
        });
        const searchInput = screen.getByPlaceholderText('search for name');
        await userEvent.type(searchInput, mockSearchTerm);
        await waitFor(() => {
            expect(screen.getByTestId('item-123')).toBeInTheDocument();
        });
        expect(screen.queryByTestId('item-234')).not.toBeInTheDocument();
    });
});