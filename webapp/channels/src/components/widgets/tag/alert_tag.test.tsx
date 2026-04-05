import React from 'react';
import {render, screen, userEvent} from 'tests/react_testing_utils';
import AlertTag from './alert_tag';
describe('components/widgets/tag/AlertTag', () => {
    test('should match snapshot', () => {
        const {container} = render(
            <AlertTag
                text='Tag Text'
            />,
        );
        expect(container).toMatchSnapshot();
    });
    test('should render the text correctly', () => {
        render(
            <AlertTag
                text='Tag Text'
            />,
        );
        expect(screen.getByText('Tag Text')).toBeInTheDocument();
    });
    test('should apply custom className', () => {
        const {container} = render(
            <AlertTag
                text='Tag Text'
                className='custom-class'
            />,
        );
        expect(container.querySelector('.custom-class')).not.toBeNull();
    });
    test('should apply variant class', () => {
        const {container} = render(
            <AlertTag
                text='Tag Text'
                variant='primary'
            />,
        );
        expect(container.querySelector('.AlertTag--primary')).not.toBeNull();
    });
    test('should apply size class', () => {
        const {container} = render(
            <AlertTag
                text='Tag Text'
                size='small'
            />,
        );
        expect(container.querySelector('.AlertTag--small')).not.toBeNull();
    });
    test('should apply clickable class when onClick is provided', () => {
        const onClick = jest.fn();
        const {container} = render(
            <AlertTag
                text='Tag Text'
                onClick={onClick}
            />,
        );
        expect(container.querySelector('.AlertTag--clickable')).not.toBeNull();
    });
    test('should call onClick when clicked', async () => {
        const onClick = jest.fn();
        render(
            <AlertTag
                text='Tag Text'
                onClick={onClick}
            />,
        );
        await userEvent.click(screen.getByText('Tag Text'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });
    test('should apply testId', () => {
        render(
            <AlertTag
                text='Tag Text'
                testId='test-id'
            />,
        );
        expect(screen.getByTestId('test-id')).toBeInTheDocument();
    });
    test('should use span element when onClick is not provided', () => {
        render(
            <AlertTag
                text='Tag Text'
            />,
        );
        const element = screen.getByText('Tag Text');
        expect(element.tagName).toBe('SPAN');
    });
    test('should use button element when onClick is provided', () => {
        const onClick = jest.fn();
        render(
            <AlertTag
                text='Tag Text'
                onClick={onClick}
            />,
        );
        const element = screen.getByText('Tag Text');
        expect(element.tagName).toBe('BUTTON');
    });
    test('should add type="button" attribute when onClick is provided', () => {
        const onClick = jest.fn();
        render(
            <AlertTag
                text='Tag Text'
                onClick={onClick}
            />,
        );
        const element = screen.getByText('Tag Text');
        expect(element.getAttribute('type')).toBe('button');
    });
    test('should render with tooltip when tooltipTitle is provided', () => {
        const {container} = render(
            <AlertTag
                text='Tag Text'
                tooltipTitle='Tooltip Text'
            />,
        );
        expect(screen.getByText('Tag Text')).toBeInTheDocument();
        const tagElement = screen.getByText('Tag Text');
        expect(tagElement.parentElement?.parentElement).not.toBe(container);
    });
});