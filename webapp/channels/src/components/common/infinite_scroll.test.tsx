import React from 'react';
import InfiniteScroll from 'components/common/infinite_scroll';
import {renderWithContext, fireEvent, waitFor, act} from 'tests/react_testing_utils';
describe('/components/common/InfiniteScroll', () => {
    const baseProps = {
        callBack: jest.fn(),
        endOfData: false,
        endOfDataMessage: 'No more items to fetch',
        styleClass: 'signup-team-all',
        totalItems: 20,
        itemsPerPage: 10,
        pageNumber: 1,
        bufferValue: 100,
    };
    test('should match snapshot', () => {
        const {container} = renderWithContext(<InfiniteScroll {...baseProps}><div/></InfiniteScroll>);
        expect(container).toMatchSnapshot();
        const wrapperDiv = container.querySelector(`.${baseProps.styleClass}`);
        expect(wrapperDiv).toBeInTheDocument();
        expect(wrapperDiv).toHaveClass('infinite-scroll');
    });
    test('should attach and remove event listeners', () => {
        const addEventListenerSpy = jest.spyOn(HTMLDivElement.prototype, 'addEventListener');
        const removeEventListenerSpy = jest.spyOn(HTMLDivElement.prototype, 'removeEventListener');
        const {unmount} = renderWithContext(<InfiniteScroll {...baseProps}><div/></InfiniteScroll>);
        expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
        unmount();
        expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
        addEventListenerSpy.mockRestore();
        removeEventListenerSpy.mockRestore();
    });
    test('should execute call back function when scroll reaches the bottom and there \'s more data and no current fetch is taking place', async () => {
        const {container} = renderWithContext(<InfiniteScroll {...baseProps}><div/></InfiniteScroll>);
        expect(baseProps.callBack).toHaveBeenCalledTimes(0);
        const scrollContainer = container.querySelector('.infinite-scroll') as HTMLElement;
        Object.defineProperty(scrollContainer, 'scrollHeight', {value: 1000, configurable: true});
        Object.defineProperty(scrollContainer, 'clientHeight', {value: 500, configurable: true});
        Object.defineProperty(scrollContainer, 'scrollTop', {value: 500, configurable: true});
        await act(async () => {
            fireEvent.scroll(scrollContainer);
            await new Promise((resolve) => setTimeout(resolve, 250));
        });
        await waitFor(() => {
            expect(baseProps.callBack).toHaveBeenCalledTimes(1);
        });
    });
    test('should not execute call back even if scroll is at the bottom when there \'s no more data', async () => {
        const propsWithNoData = {
            ...baseProps,
            totalItems: 0,
        };
        const {container} = renderWithContext(
            <InfiniteScroll {...propsWithNoData}><div/></InfiniteScroll>,
        );
        const scrollContainer = container.querySelector('.infinite-scroll') as HTMLElement;
        Object.defineProperty(scrollContainer, 'scrollHeight', {value: 1000, configurable: true});
        Object.defineProperty(scrollContainer, 'clientHeight', {value: 500, configurable: true});
        Object.defineProperty(scrollContainer, 'scrollTop', {value: 500, configurable: true});
        await act(async () => {
            fireEvent.scroll(scrollContainer);
            await new Promise((resolve) => setTimeout(resolve, 250));
        });
        await waitFor(() => {
            expect(baseProps.callBack).toHaveBeenCalledTimes(1);
        });
        await act(async () => {
            fireEvent.scroll(scrollContainer);
            await new Promise((resolve) => setTimeout(resolve, 250));
        });
        expect(baseProps.callBack).toHaveBeenCalledTimes(1);
    });
    test('should not show loading screen if there is no data', async () => {
        let resolveCallback: () => void;
        const slowCallback = jest.fn(() => new Promise<void>((resolve) => {
            resolveCallback = resolve;
        }));
        const propsWithSlowCallback = {
            ...baseProps,
            callBack: slowCallback,
        };
        const {container} = renderWithContext(<InfiniteScroll {...propsWithSlowCallback}><div/></InfiniteScroll>);
        let loadingDiv = container.querySelector('.loading-screen');
        expect(loadingDiv).not.toBeInTheDocument();
        const scrollContainer = container.querySelector('.infinite-scroll') as HTMLElement;
        Object.defineProperty(scrollContainer, 'scrollHeight', {value: 1000, configurable: true});
        Object.defineProperty(scrollContainer, 'clientHeight', {value: 500, configurable: true});
        Object.defineProperty(scrollContainer, 'scrollTop', {value: 500, configurable: true});
        await act(async () => {
            fireEvent.scroll(scrollContainer);
            await new Promise((resolve) => setTimeout(resolve, 250));
        });
        loadingDiv = container.querySelector('.loading-screen');
        expect(loadingDiv).toBeInTheDocument();
        expect(container).toMatchSnapshot();
        await act(async () => {
            resolveCallback!();
        });
    });
});