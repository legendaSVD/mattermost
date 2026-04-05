import React from 'react';
import type {DeepPartial} from '@mattermost/types/utilities';
import {fireEvent, renderWithContext, screen, userEvent} from 'tests/react_testing_utils';
import type {GlobalState} from 'types/store';
import YoutubeVideo from './youtube_video';
jest.mock('actions/integration_actions');
describe('YoutubeVideo', () => {
    const baseProps = {
        postId: 'post_id_1',
        googleDeveloperKey: 'googledevkey',
        hasImageProxy: false,
        link: 'https://www.youtube.com/watch?v=xqCoNej8Zxo',
        show: true,
        metadata: {
            title: 'Youtube title',
            images: [{
                secure_url: 'linkForThumbnail',
                url: 'linkForThumbnail',
            }],
        },
        youtubeReferrerPolicy: false,
    };
    const initialState: DeepPartial<GlobalState> = {
        entities: {
            general: {
                config: {},
                license: {
                    Cloud: 'true',
                },
            },
            users: {
                currentUserId: 'currentUserId',
            },
        },
    };
    test('should match init snapshot', () => {
        const {container} = renderWithContext(
            <YoutubeVideo {...baseProps}/>,
            initialState,
        );
        expect(container).toMatchSnapshot();
        expect(container.querySelector('.video-thumbnail')).toHaveAttribute(
            'src',
            'https://img.youtube.com/vi/xqCoNej8Zxo/maxresdefault.jpg',
        );
        expect(screen.getByRole('heading', {level: 4})).toHaveTextContent('YouTube - Youtube title');
    });
    test('should match snapshot for playing state', async () => {
        const {container} = renderWithContext(
            <YoutubeVideo {...baseProps}/>,
            initialState,
        );
        await userEvent.click(screen.getByRole('button', {name: /Play Youtube title on YouTube/}));
        expect(container).toMatchSnapshot();
    });
    test('should match snapshot for playing state and `youtubeReferrerPolicy = true`', async () => {
        const {container} = renderWithContext(
            <YoutubeVideo
                {...baseProps}
                youtubeReferrerPolicy={true}
            />,
            initialState,
        );
        await userEvent.click(screen.getByRole('button', {name: /Play Youtube title on YouTube/}));
        expect(container).toMatchSnapshot();
        expect(container.querySelector('.video-playing iframe')).toHaveAttribute('referrerPolicy', 'origin');
        expect(container.querySelector('.video-playing iframe')).toHaveAttribute('src', 'https://www.youtube.com/embed/xqCoNej8Zxo?autoplay=1&rel=0&fs=1&enablejsapi=1');
    });
    test('should use url if secure_url is not present', () => {
        const props = {
            ...baseProps,
            metadata: {
                title: 'Youtube title',
                images: [{
                    url: 'linkUrl',
                }],
            },
        };
        const {container} = renderWithContext(
            <YoutubeVideo {...props}/>,
            initialState,
        );
        expect(container.querySelector('.video-thumbnail')).toHaveAttribute(
            'src',
            'https://img.youtube.com/vi/xqCoNej8Zxo/maxresdefault.jpg',
        );
    });
    describe('thumbnail fallback', () => {
        it('should fallback to hqdefault.jpg on image error', () => {
            const {container} = renderWithContext(
                <YoutubeVideo {...baseProps}/>,
                initialState,
            );
            const thumbnail = container.querySelector('.video-thumbnail');
            expect(thumbnail).toBeInTheDocument();
            expect(thumbnail).toHaveAttribute(
                'src',
                'https://img.youtube.com/vi/xqCoNej8Zxo/maxresdefault.jpg',
            );
            fireEvent.error(thumbnail!);
            expect(container.querySelector('.video-thumbnail')).toHaveAttribute(
                'src',
                'https://img.youtube.com/vi/xqCoNej8Zxo/hqdefault.jpg',
            );
        });
    });
    it('should initialize with useMaxResThumbnail set to true', () => {
        const {container} = renderWithContext(
            <YoutubeVideo {...baseProps}/>,
            initialState,
        );
        expect(container.querySelector('.video-thumbnail')).toHaveAttribute(
            'src',
            'https://img.youtube.com/vi/xqCoNej8Zxo/maxresdefault.jpg',
        );
    });
});