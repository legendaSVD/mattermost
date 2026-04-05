import {renderHook, act, waitFor} from '@testing-library/react';
import React from 'react';
import {Provider} from 'react-redux';
import configureStore from 'redux-mock-store';
import {thunk} from 'redux-thunk';
import {useAccessControlAttributes, EntityType} from './useAccessControlAttributes';
jest.mock('mattermost-redux/actions/channels', () => {
    const mockFn = jest.fn();
    mockFn.mockImplementation((channelId) => {
        if (channelId === 'error-channel') {
            return () => Promise.resolve({error: new Error('Failed to fetch attributes')});
        }
        if (channelId === 'unsupported') {
            throw new Error('Unsupported entity type: unsupported');
        }
        return () => Promise.resolve({
            data: {
                department: ['engineering', 'marketing'],
                location: ['remote'],
            },
        });
    });
    return {
        getChannelAccessControlAttributes: mockFn,
    };
});
describe('useAccessControlAttributes', () => {
    const mockStore = configureStore([thunk]);
    const initialState = {
        entities: {
            channels: {
                channels: {
                    'channel-1': {
                        id: 'channel-1',
                        policy_enforced: true,
                    },
                },
            },
        },
    };
    const store = mockStore(initialState);
    const wrapper = ({children}: {children: React.ReactNode}) => (
        <Provider store={store}>
            {children}
        </Provider>
    );
    test('should return initial state', () => {
        const {result} = renderHook(() => useAccessControlAttributes(EntityType.Channel, undefined, undefined), {wrapper});
        expect(result.current.attributeTags).toEqual([]);
        expect(result.current.structuredAttributes).toEqual([]);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe(null);
    });
    test('should not fetch attributes if entityId is undefined', async () => {
        const {result} = renderHook(() => useAccessControlAttributes(EntityType.Channel, undefined, true), {wrapper});
        await act(async () => {
            await result.current.fetchAttributes();
        });
        expect(result.current.attributeTags).toEqual([]);
        expect(result.current.structuredAttributes).toEqual([]);
        expect(result.current.loading).toBe(false);
    });
    test('should not fetch attributes if hasAccessControl is false', async () => {
        const {result} = renderHook(() => useAccessControlAttributes(EntityType.Channel, 'channel-1', false), {wrapper});
        await act(async () => {
            await result.current.fetchAttributes();
        });
        expect(result.current.attributeTags).toEqual([]);
        expect(result.current.structuredAttributes).toEqual([]);
        expect(result.current.loading).toBe(false);
    });
    test('should fetch and process attributes successfully', async () => {
        const {result} = renderHook(() => useAccessControlAttributes(EntityType.Channel, 'channel-1', true), {wrapper});
        expect(result.current.loading).toBe(true);
        await waitFor(() => {
            expect(result.current.attributeTags).toEqual(['engineering', 'marketing', 'remote']);
            expect(result.current.structuredAttributes).toEqual([
                {name: 'department', values: ['engineering', 'marketing']},
                {name: 'location', values: ['remote']},
            ]);
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBe(null);
        });
    });
    test('should handle errors when fetching attributes', async () => {
        const {result} = renderHook(() => useAccessControlAttributes(EntityType.Channel, 'error-channel', true), {wrapper});
        expect(result.current.loading).toBe(true);
        await waitFor(() => {
            expect(result.current.attributeTags).toEqual([]);
            expect(result.current.structuredAttributes).toEqual([]);
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBeInstanceOf(Error);
            expect(result.current.error?.message).toBe('Failed to fetch attributes');
        });
    });
    test('should handle unsupported entity types', async () => {
        const {result} = renderHook(() => useAccessControlAttributes('unsupported', 'channel-1', true), {wrapper});
        await act(async () => {
            result.current.loading = true;
            try {
                await result.current.fetchAttributes();
            } catch (error) {
            }
        });
        expect(result.current.attributeTags).toEqual([]);
        expect(result.current.structuredAttributes).toEqual([]);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.error?.message).toBe('Unsupported entity type: unsupported');
    });
    test('should use cached data if available and not expired', async () => {
        const {result: result1} = renderHook(() => useAccessControlAttributes(EntityType.Channel, 'channel-1', true), {wrapper});
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
        });
        expect(result1.current.attributeTags).toEqual(['engineering', 'marketing', 'remote']);
        expect(result1.current.loading).toBe(false);
        const getChannelAccessControlAttributes = require('mattermost-redux/actions/channels').getChannelAccessControlAttributes;
        getChannelAccessControlAttributes.mockClear();
        const {result: result2} = renderHook(() => useAccessControlAttributes(EntityType.Channel, 'channel-1', true), {wrapper});
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
        });
        expect(result2.current.attributeTags).toEqual(result1.current.attributeTags);
        expect(result2.current.structuredAttributes).toEqual(result1.current.structuredAttributes);
        expect(getChannelAccessControlAttributes).not.toHaveBeenCalled();
    });
    test('should manually fetch attributes when fetchAttributes is called', async () => {
        const {result} = renderHook(() => useAccessControlAttributes(EntityType.Channel, 'channel-1', true), {wrapper});
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
        const getChannelAccessControlAttributes = require('mattermost-redux/actions/channels').getChannelAccessControlAttributes;
        getChannelAccessControlAttributes.mockClear();
        await act(async () => {
            await result.current.fetchAttributes(true);
        });
        expect(getChannelAccessControlAttributes).toHaveBeenCalledWith('channel-1');
    });
});