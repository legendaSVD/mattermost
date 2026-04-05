import React from 'react';
import {render, screen} from 'tests/react_testing_utils';
import {TestHelper} from 'utils/test_helper';
import ReactionList from './reaction_list';
jest.mock('components/post_view/reaction', () => {
    return {
        __esModule: true,
        default: (props: any) => (
            <div data-testid={`reaction-${props.emojiName}`}/>
        ),
    };
});
jest.mock('./add_reaction_button', () => {
    return {
        __esModule: true,
        default: () => (
            <div data-testid='add-reaction-button'/>
        ),
    };
});
describe('components/ReactionList', () => {
    const reaction = {
        user_id: '1rj9fokoeffrigu7sk5uc8aiih',
        post_id: 'xbqfo5qb4bb4ffmj9hqfji6fiw',
        emoji_name: 'expressionless',
        create_at: 1542994995740,
    };
    const reactions = {[reaction.user_id + '-' + reaction.emoji_name]: reaction};
    const post = TestHelper.getPostMock({
        id: 'post_id',
    });
    const teamId = 'teamId';
    const actions = {
        toggleReaction: jest.fn(),
    };
    const baseProps = {
        post,
        teamId,
        reactions,
        canAddReactions: true,
        actions,
    };
    test('should render nothing when no reactions', () => {
        const props = {
            ...baseProps,
            reactions: {},
        };
        const {container} = render(
            <ReactionList {...props}/>,
        );
        expect(container).toMatchSnapshot();
    });
    test('should render when there are reactions', () => {
        const {container} = render(
            <ReactionList {...baseProps}/>,
        );
        expect(container).toMatchSnapshot();
    });
    test('should render consistently when reactions from state are not in the same order', () => {
        const reactionA = reaction;
        const reactionB = {...reaction, emoji_name: '+1', create_at: reaction.create_at + 100};
        const reactionC = {...reaction, user_id: 'x8pb0', create_at: reaction.create_at + 200};
        const propsA = {
            ...baseProps,
            reactions: {
                [reactionA.user_id + '-' + reactionA.emoji_name]: reactionA,
                [reactionB.user_id + '-' + reactionB.emoji_name]: reactionB,
                [reactionC.user_id + '-' + reactionC.emoji_name]: reactionC,
            },
        };
        const propsB = {
            ...baseProps,
            reactions: {
                [reactionB.user_id + '-' + reactionB.emoji_name]: reactionB,
                [reactionC.user_id + '-' + reactionC.emoji_name]: reactionC,
            },
        };
        const {rerender} = render(
            <ReactionList {...propsA}/>,
        );
        const firstRender = screen.getAllByTestId(/^reaction-/).map((el) => el.getAttribute('data-testid'));
        rerender(
            <ReactionList {...propsB}/>,
        );
        const secondRender = screen.getAllByTestId(/^reaction-/).map((el) => el.getAttribute('data-testid'));
        expect(firstRender.length).toBe(2);
        expect(firstRender).toEqual(secondRender);
    });
});