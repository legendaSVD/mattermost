import React from 'react';
import type {UserProfile} from '@mattermost/types/users';
import {renderWithContext, screen, userEvent, waitFor} from 'tests/react_testing_utils';
import {TestHelper} from 'utils/test_helper';
import TestResultsModal from './test_modal';
jest.mock('components/searchable_user_list/searchable_user_list_container', () => {
    return function MockSearchableUserList({
        users,
        usersPerPage,
        total,
        nextPage,
        search,
    }: {
        users: UserProfile[];
        usersPerPage: number;
        total: number;
        nextPage: (page: number) => void;
        search: (term: string) => void;
    }) {
        return (
            <div data-testid='searchable-user-list'>
                <input
                    data-testid='search-input'
                    type='text'
                    placeholder='Search users'
                    onChange={(e) => search(e.target.value)}
                />
                <div data-testid='user-count'>
                    {'Showing '}{users.length}{' of '}{total}{' users'}
                </div>
                <div data-testid='users-per-page'>
                    {usersPerPage}{' users per page'}
                </div>
                <div data-testid='users-list'>
                    {users.map((user) => (
                        <div
                            key={user.id}
                            data-testid={`user-${user.id}`}
                        >
                            {user.username}
                        </div>
                    ))}
                </div>
                <button
                    data-testid='next-page-button'
                    onClick={() => nextPage(5)}
                >
                    {'Next Page'}
                </button>
            </div>
        );
    };
});
describe('TestResultsModal', () => {
    const mockUsers: UserProfile[] = [
        TestHelper.getUserMock({
            id: 'user1',
            username: 'testuser1',
            email: 'test1@example.com',
        }),
        TestHelper.getUserMock({
            id: 'user2',
            username: 'testuser2',
            email: 'test2@example.com',
        }),
    ];
    const mockSearchUsers = jest.fn();
    const mockOnExited = jest.fn();
    const defaultProps = {
        onExited: mockOnExited,
        actions: {
            searchUsers: mockSearchUsers,
        },
    };
    beforeEach(() => {
        mockSearchUsers.mockReturnValue(() => Promise.resolve({
            data: {
                users: mockUsers,
                total: 2,
            },
        }));
    });
    it('should render modal with proper title and structure', async () => {
        renderWithContext(<TestResultsModal {...defaultProps}/>);
        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });
        expect(screen.getByText('Access Rule Test Results')).toBeInTheDocument();
        expect(screen.getByTestId('searchable-user-list')).toBeInTheDocument();
    });
    it('should fetch users on initial load', async () => {
        renderWithContext(<TestResultsModal {...defaultProps}/>);
        await waitFor(() => {
            expect(mockSearchUsers).toHaveBeenCalledWith('', '', 50);
        });
    });
    it('should display users from search results', async () => {
        renderWithContext(<TestResultsModal {...defaultProps}/>);
        await waitFor(() => {
            expect(screen.getByTestId('user-count')).toHaveTextContent('Showing 2 of 2 users');
        });
        expect(screen.getByTestId('user-user1')).toBeInTheDocument();
        expect(screen.getByTestId('user-user2')).toBeInTheDocument();
        expect(screen.getByText('testuser1')).toBeInTheDocument();
        expect(screen.getByText('testuser2')).toBeInTheDocument();
    });
    it('should handle search functionality', async () => {
        renderWithContext(<TestResultsModal {...defaultProps}/>);
        await waitFor(() => {
            expect(screen.getByTestId('search-input')).toBeInTheDocument();
        });
        const searchInput = screen.getByTestId('search-input');
        await userEvent.clear(searchInput);
        await userEvent.type(searchInput, 'test search');
        await waitFor(() => {
            expect(mockSearchUsers).toHaveBeenCalledWith('test search', '', 50);
        });
    });
    it('should handle pagination', async () => {
        renderWithContext(<TestResultsModal {...defaultProps}/>);
        await waitFor(() => {
            expect(screen.getByTestId('user-user2')).toBeInTheDocument();
        });
        mockSearchUsers.mockReturnValue(() => Promise.resolve({
            data: {
                users: [],
                total: 2,
            },
        }));
        const nextPageButton = screen.getByTestId('next-page-button');
        await userEvent.click(nextPageButton);
        await waitFor(() => {
            expect(mockSearchUsers).toHaveBeenLastCalledWith('', 'user2', 50);
        });
    });
    it('should not paginate when loading', async () => {
        mockSearchUsers.mockClear();
        mockSearchUsers.mockReturnValue(() => new Promise(() => {}));
        renderWithContext(<TestResultsModal {...defaultProps}/>);
        await waitFor(() => {
            expect(screen.getByTestId('next-page-button')).toBeInTheDocument();
        });
        expect(mockSearchUsers).toHaveBeenCalledTimes(1);
        const nextPageButton = screen.getByTestId('next-page-button');
        await userEvent.click(nextPageButton);
        expect(mockSearchUsers).toHaveBeenCalledTimes(1);
    });
    it('should handle empty search results', async () => {
        mockSearchUsers.mockReturnValue(() => Promise.resolve({
            data: {
                users: [],
                total: 0,
            },
        }));
        renderWithContext(<TestResultsModal {...defaultProps}/>);
        await waitFor(() => {
            expect(screen.getByTestId('user-count')).toHaveTextContent('Showing 0 of 0 users');
        });
    });
    it('should handle search error gracefully', async () => {
        mockSearchUsers.mockReturnValue(() => Promise.resolve({
            error: 'Search failed',
        }));
        renderWithContext(<TestResultsModal {...defaultProps}/>);
        await waitFor(() => {
            expect(screen.getByTestId('user-count')).toHaveTextContent('Showing 0 of 0 users');
        });
    });
    it('should call onExited when modal is closed', async () => {
        renderWithContext(<TestResultsModal {...defaultProps}/>);
        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });
        const closeButton = screen.getByLabelText('Close');
        await userEvent.click(closeButton);
        await waitFor(() => {
            expect(mockOnExited).toHaveBeenCalled();
        });
    });
    it('should render with isStacked=true prop', async () => {
        renderWithContext(
            <TestResultsModal
                {...defaultProps}
                isStacked={true}
            />,
        );
        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });
        expect(screen.getByText('Access Rule Test Results')).toBeInTheDocument();
    });
    it('should render with isStacked=false prop (default)', async () => {
        renderWithContext(
            <TestResultsModal
                {...defaultProps}
                isStacked={false}
            />,
        );
        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });
        expect(screen.getByText('Access Rule Test Results')).toBeInTheDocument();
    });
    it('should reset search on new search term', async () => {
        mockSearchUsers.
            mockReturnValueOnce(() => Promise.resolve({
                data: {
                    users: [mockUsers[0]],
                    total: 1,
                },
            })).
            mockReturnValueOnce(() => Promise.resolve({
                data: {
                    users: [mockUsers[1]],
                    total: 1,
                },
            }));
        renderWithContext(<TestResultsModal {...defaultProps}/>);
        await waitFor(() => {
            expect(screen.getByTestId('search-input')).toBeInTheDocument();
        });
        const searchInput = screen.getByTestId('search-input');
        await userEvent.clear(searchInput);
        await userEvent.type(searchInput, 'search1');
        await waitFor(() => {
            expect(mockSearchUsers).toHaveBeenCalledWith('search1', '', 50);
        });
        await userEvent.clear(searchInput);
        await userEvent.type(searchInput, 'search2');
        await waitFor(() => {
            expect(mockSearchUsers).toHaveBeenCalledWith('search2', '', 50);
        });
    });
    it('should pass correct props to SearchableUserList', async () => {
        renderWithContext(<TestResultsModal {...defaultProps}/>);
        await waitFor(() => {
            expect(screen.getByTestId('users-per-page')).toHaveTextContent('10 users per page');
        });
    });
    it('should have proper accessibility attributes', async () => {
        renderWithContext(<TestResultsModal {...defaultProps}/>);
        await waitFor(() => {
            const dialog = screen.getByRole('dialog');
            expect(dialog).toHaveAttribute('aria-label', 'Access Rule Test Results');
        });
    });
});