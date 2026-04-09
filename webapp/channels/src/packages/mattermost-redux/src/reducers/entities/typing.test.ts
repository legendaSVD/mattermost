import {WebSocketTypes} from 'mattermost-redux/action_types';
import typingReducer from 'mattermost-redux/reducers/entities/typing';
import TestHelper from '../../../test/test_helper';
describe('Reducers.Typing', () => {
    it('initial state', async () => {
        let state = {};
        state = typingReducer(
            state,
            {type: 'testinit'},
        );
        expect(state).toEqual({});
    });
    it('WebSocketTypes.TYPING', async () => {
        let state = {};
        const id1 = TestHelper.generateId();
        const userId1 = TestHelper.generateId();
        const now1 = 1234;
        state = typingReducer(
            state,
            {
                type: WebSocketTypes.TYPING,
                data: {
                    id: id1,
                    userId: userId1,
                    now: now1,
                },
            },
        );
        expect(state).toEqual({
            [id1]: {
                [userId1]: now1,
            },
        });
        const id2 = TestHelper.generateId();
        const now2 = 1235;
        state = typingReducer(
            state,
            {
                type: WebSocketTypes.TYPING,
                data: {
                    id: id2,
                    userId: userId1,
                    now: now2,
                },
            },
        );
        expect(state).toEqual({
            [id1]: {
                [userId1]: now1,
            },
            [id2]: {
                [userId1]: now2,
            },
        });
        const userId2 = TestHelper.generateId();
        const now3 = 1237;
        state = typingReducer(
            state,
            {
                type: WebSocketTypes.TYPING,
                data: {
                    id: id1,
                    userId: userId2,
                    now: now3,
                },
            },
        );
        expect(state).toEqual({
            [id1]: {
                [userId1]: now1,
                [userId2]: now3,
            },
            [id2]: {
                [userId1]: now2,
            },
        });
        const now4 = 1238;
        state = typingReducer(
            state,
            {
                type: WebSocketTypes.TYPING,
                data: {
                    id: id2,
                    userId: userId2,
                    now: now4,
                },
            },
        );
        expect(state).toEqual({
            [id1]: {
                [userId1]: now1,
                [userId2]: now3,
            },
            [id2]: {
                [userId1]: now2,
                [userId2]: now4,
            },
        });
    });
    it('WebSocketTypes.STOPPED_TYPING', async () => {
        const id1 = TestHelper.generateId();
        const id2 = TestHelper.generateId();
        const userId1 = TestHelper.generateId();
        const userId2 = TestHelper.generateId();
        const now1 = 1234;
        const now2 = 1235;
        const now3 = 1236;
        const now4 = 1237;
        let state = {
            [id1]: {
                [userId1]: now1,
                [userId2]: now3,
            },
            [id2]: {
                [userId1]: now2,
                [userId2]: now4,
            },
        };
        state = typingReducer(
            state,
            {
                type: WebSocketTypes.STOPPED_TYPING,
                data: {
                    id: id1,
                    userId: userId1,
                    now: now1,
                },
            },
        );
        expect(state).toEqual({
            [id1]: {
                [userId2]: now3,
            },
            [id2]: {
                [userId1]: now2,
                [userId2]: now4,
            },
        });
        state = typingReducer(
            state,
            {
                type: WebSocketTypes.STOPPED_TYPING,
                data: {
                    id: id2,
                    userId: userId1,
                    now: now2,
                },
            },
        );
        expect(state).toEqual({
            [id1]: {
                [userId2]: now3,
            },
            [id2]: {
                [userId2]: now4,
            },
        });
        state = typingReducer(
            state,
            {
                type: WebSocketTypes.STOPPED_TYPING,
                data: {
                    id: id1,
                    userId: userId2,
                    now: now3,
                },
            },
        );
        expect(state).toEqual({
            [id2]: {
                [userId2]: now4,
            },
        },
        );
        state = typingReducer(
            state,
            {
                type: WebSocketTypes.STOPPED_TYPING,
                data: {
                    id: id2,
                    userId: userId2,
                    now: now4,
                },
            },
        );
        expect(state).toEqual({});
        state = {
            [id1]: {
                [userId1]: now2,
            },
        };
        state = typingReducer(
            state,
            {
                type: WebSocketTypes.STOPPED_TYPING,
                data: {
                    id: id1,
                    userId: userId1,
                    now: now1,
                },
            },
        );
        expect(state).toEqual({
            [id1]: {
                [userId1]: now2,
            },
        });
        state = typingReducer(
            state,
            {
                type: WebSocketTypes.STOPPED_TYPING,
                data: {
                    id: id1,
                    userId: userId1,
                    now: now3,
                },
            },
        );
        expect(state).toEqual({});
    });
});