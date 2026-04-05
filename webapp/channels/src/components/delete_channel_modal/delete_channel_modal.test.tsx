import React from 'react';
import type {Channel, ChannelType} from '@mattermost/types/channels';
import DeleteChannelModal from 'components/delete_channel_modal/delete_channel_modal';
import type {Props} from 'components/delete_channel_modal/delete_channel_modal';
import {renderWithContext, screen, userEvent, waitFor} from 'tests/react_testing_utils';
describe('components/delete_channel_modal', () => {
    const channel: Channel = {
        id: 'owsyt8n43jfxjpzh9np93mx1wa',
        create_at: 1508265709607,
        update_at: 1508265709607,
        delete_at: 0,
        team_id: 'eatxocwc3bg9ffo9xyybnj4omr',
        type: 'O' as ChannelType,
        display_name: 'testing',
        name: 'testing',
        header: 'test',
        purpose: 'test',
        last_post_at: 1508265709635,
        last_root_post_at: 1508265709635,
        creator_id: 'zaktnt8bpbgu8mb6ez9k64r7sa',
        scheme_id: '',
        group_constrained: false,
    };
    const baseProps: Props = {
        channel,
        actions: {
            deleteChannel: jest.fn(() => {
                return {data: true};
            }),
        },
        onExited: jest.fn(),
    };
    test('should match snapshot for delete_channel_modal', () => {
        const {baseElement} = renderWithContext(
            <DeleteChannelModal {...baseProps}/>,
        );
        expect(baseElement).toMatchSnapshot();
    });
    test('should hide on Cancel', async () => {
        renderWithContext(
            <DeleteChannelModal {...baseProps}/>,
        );
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        await userEvent.click(screen.getByText('Cancel'));
        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });
    test('should have called actions.deleteChannel on Archive', async () => {
        const actions = {deleteChannel: jest.fn()};
        const props = {...baseProps, actions};
        renderWithContext(
            <DeleteChannelModal {...props}/>,
        );
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', {name: 'Archive'}));
        expect(actions.deleteChannel).toHaveBeenCalledTimes(1);
        expect(actions.deleteChannel).toHaveBeenCalledWith(props.channel.id);
        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });
    test('should have called props.onExited when Modal.onExited is called', async () => {
        const onExited = jest.fn();
        renderWithContext(
            <DeleteChannelModal
                {...baseProps}
                onExited={onExited}
            />,
        );
        await userEvent.click(screen.getByText('Cancel'));
        await waitFor(() => {
            expect(onExited).toHaveBeenCalledTimes(1);
        });
    });
});