import React, {useState} from 'react';
import {Permissions} from 'mattermost-redux/constants';
import ActionsMenu from 'components/actions_menu';
import ModalController from 'components/modal_controller';
import {renderWithContext, screen, userEvent, waitFor} from 'tests/react_testing_utils';
import {TestHelper} from 'utils/test_helper';
function ActionsMenuTestWrapper(props: Omit<React.ComponentProps<typeof ActionsMenu>, 'isMenuOpen' | 'handleDropdownOpened'>) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    return (
        <ActionsMenu
            {...props}
            handleDropdownOpened={setIsMenuOpen}
            isMenuOpen={isMenuOpen}
        />
    );
}
describe('ActionsMenu', () => {
    test('should match snapshot, return empty ("") on Center', async () => {
        const user1 = TestHelper.getUserMock({id: 'user1', roles: 'system_admin system_user'});
        const post1 = TestHelper.getPostMock({id: 'post1', type: ''});
        const baseProps = {
            post: post1,
            teamId: 'team_id_1',
        };
        renderWithContext(
            <>
                <ActionsMenuTestWrapper {...baseProps}/>
                <ModalController/>
            </>,
            {
                entities: {
                    general: {
                        config: {
                            PluginsEnabled: 'true',
                            EnableMarketplace: 'true',
                        },
                    },
                    posts: {
                        posts: {
                            [post1.id]: post1,
                        },
                    },
                    roles: {
                        roles: {
                            system_admin: TestHelper.getRoleMock({
                                permissions: [Permissions.MANAGE_SYSTEM, Permissions.SYSCONSOLE_WRITE_PLUGINS],
                            }),
                        },
                    },
                    users: {
                        currentUserId: user1.id,
                        profiles: {
                            [user1.id]: user1,
                        },
                    },
                },
            },
        );
        expect(screen.getByRole('button')).toHaveAccessibleName('actions');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button'));
        await waitFor(() => {
            expect(screen.queryByRole('dialog', {name: 'actions'})).toBeVisible();
            expect(screen.queryByRole('button', {name: 'Visit the Marketplace'})).toBeInTheDocument();
            expect(screen.queryByRole('button', {name: 'Visit the Marketplace'})).toBeVisible();
        });
        await userEvent.tab();
        expect(screen.queryByRole('button', {name: 'Visit the Marketplace'})).toHaveFocus();
        await userEvent.tab();
        expect(screen.queryByRole('button', {name: 'Visit the Marketplace'})).toHaveFocus();
        await userEvent.keyboard('{Enter}');
        await waitFor(() => {
            expect(screen.queryByRole('dialog', {name: 'actions'})).not.toBeInTheDocument();
            expect(screen.queryByRole('dialog', {name: 'App Marketplace'})).toBeVisible();
        });
        await userEvent.type(screen.getByRole('dialog'), '{Escape}');
        await waitFor(() => {
            expect(screen.queryByRole('dialog', {name: 'App Marketplace'})).not.toBeInTheDocument();
        });
        await userEvent.click(screen.getByRole('button'));
        await waitFor(() => {
            expect(screen.queryByRole('dialog')).toBeVisible();
        });
        expect(screen.queryByRole('dialog')).toHaveAccessibleName('actions');
        await userEvent.keyboard('{Escape}');
        await waitFor(() => {
            expect(screen.queryByRole('dialog', {name: 'actions'})).not.toBeInTheDocument();
        });
    });
});