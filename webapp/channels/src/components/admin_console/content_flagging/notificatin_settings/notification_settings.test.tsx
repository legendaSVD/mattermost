import React from 'react';
import {IntlProvider} from 'react-intl';
import type {ContentFlaggingNotificationSettings} from '@mattermost/types/config';
import {fireEvent, render, screen, userEvent} from 'tests/react_testing_utils';
import ContentFlaggingNotificationSettingsSection from './notification_settings';
const renderWithContext = (component: React.ReactElement) => {
    return render(
        <IntlProvider locale='en'>
            {component}
        </IntlProvider>,
    );
};
describe('ContentFlaggingNotificationSettingsSection', () => {
    const defaultProps = {
        id: 'test-id',
        value: {
            EventTargetMapping: {
                flagged: ['reviewers'],
                assigned: ['reviewers'],
                removed: ['reviewers', 'author'],
                dismissed: ['reviewers'],
            },
        } as ContentFlaggingNotificationSettings,
        onChange: jest.fn(),
    };
    test('should render section title and description', () => {
        renderWithContext(<ContentFlaggingNotificationSettingsSection {...defaultProps}/>);
        expect(screen.getByText('Notification Settings')).toBeInTheDocument();
        expect(screen.getByText('Choose who receives notifications from the System bot when content is quarantined and reviewed')).toBeInTheDocument();
    });
    test('should render all notification setting sections', () => {
        renderWithContext(<ContentFlaggingNotificationSettingsSection {...defaultProps}/>);
        expect(screen.getByText('Notify when content is quarantined')).toBeInTheDocument();
        expect(screen.getByText('Notify when a reviewer is assigned')).toBeInTheDocument();
        expect(screen.getByText('Notify when content is removed')).toBeInTheDocument();
        expect(screen.getByText('Notify when quarantine is dismissed')).toBeInTheDocument();
    });
    test('should render all checkbox labels', () => {
        renderWithContext(<ContentFlaggingNotificationSettingsSection {...defaultProps}/>);
        expect(screen.getAllByText('Reviewer(s)')).toHaveLength(4);
        expect(screen.getAllByText('Author')).toHaveLength(3);
        expect(screen.getAllByText('Reporter')).toHaveLength(2);
    });
    test('should set correct default checked values for checkboxes', () => {
        renderWithContext(<ContentFlaggingNotificationSettingsSection {...defaultProps}/>);
        expect(screen.getByTestId('flagged_reviewers')).toBeChecked();
        expect(screen.getByTestId('flagged_author')).not.toBeChecked();
        expect(screen.getByTestId('assigned_reviewers')).toBeChecked();
        expect(screen.getByTestId('removed_reviewers')).toBeChecked();
        expect(screen.getByTestId('removed_author')).toBeChecked();
        expect(screen.getByTestId('removed_reporter')).not.toBeChecked();
        expect(screen.getByTestId('dismissed_reviewers')).toBeChecked();
        expect(screen.getByTestId('dismissed_author')).not.toBeChecked();
        expect(screen.getByTestId('dismissed_reporter')).not.toBeChecked();
    });
    test('should handle checkbox change when adding a target', async () => {
        renderWithContext(<ContentFlaggingNotificationSettingsSection {...defaultProps}/>);
        const flaggedAuthorsCheckbox = screen.getByTestId('flagged_author');
        await userEvent.click(flaggedAuthorsCheckbox);
        expect(defaultProps.onChange).toHaveBeenCalledWith('test-id', {
            EventTargetMapping: {
                flagged: ['reviewers', 'author'],
                assigned: ['reviewers'],
                removed: ['reviewers', 'author'],
                dismissed: ['reviewers'],
            },
        });
    });
    test('should handle checkbox change when removing a target', async () => {
        renderWithContext(<ContentFlaggingNotificationSettingsSection {...defaultProps}/>);
        const removedAuthorCheckbox = screen.getByTestId('removed_author');
        await userEvent.click(removedAuthorCheckbox);
        expect(defaultProps.onChange).toHaveBeenCalledWith('test-id', {
            EventTargetMapping: {
                flagged: ['reviewers'],
                assigned: ['reviewers'],
                removed: ['reviewers'],
                dismissed: ['reviewers'],
            },
        });
    });
    test('should disable flagged_reviewers checkbox', () => {
        renderWithContext(<ContentFlaggingNotificationSettingsSection {...defaultProps}/>);
        const flaggedReviewersCheckbox = screen.getByTestId('flagged_reviewers');
        expect(flaggedReviewersCheckbox).toBeDisabled();
    });
    test('should not disable other checkboxes', () => {
        renderWithContext(<ContentFlaggingNotificationSettingsSection {...defaultProps}/>);
        expect(screen.getByTestId('flagged_author')).not.toBeDisabled();
        expect(screen.getByTestId('assigned_reviewers')).not.toBeDisabled();
        expect(screen.getByTestId('removed_reviewers')).not.toBeDisabled();
        expect(screen.getByTestId('removed_author')).not.toBeDisabled();
        expect(screen.getByTestId('removed_reporter')).not.toBeDisabled();
        expect(screen.getByTestId('dismissed_reviewers')).not.toBeDisabled();
        expect(screen.getByTestId('dismissed_author')).not.toBeDisabled();
        expect(screen.getByTestId('dismissed_reporter')).not.toBeDisabled();
    });
    test('should initialize EventTargetMapping if not present', () => {
        const propsWithoutMapping = {
            ...defaultProps,
            value: {} as ContentFlaggingNotificationSettings,
        };
        renderWithContext(<ContentFlaggingNotificationSettingsSection {...propsWithoutMapping}/>);
        const flaggedReviewersCheckbox = screen.getByTestId('flagged_reviewers');
        fireEvent.click(flaggedReviewersCheckbox);
        expect(defaultProps.onChange).toHaveBeenCalledWith('test-id', {
            EventTargetMapping: {
                flagged: ['reviewers'],
                assigned: [],
                removed: [],
                dismissed: [],
            },
        });
    });
    test('should initialize action array if not present', async () => {
        const propsWithPartialMapping = {
            ...defaultProps,
            value: {
                EventTargetMapping: {
                    flagged: ['reviewers'],
                },
            } as ContentFlaggingNotificationSettings,
        };
        renderWithContext(<ContentFlaggingNotificationSettingsSection {...propsWithPartialMapping}/>);
        const assignedReviewersCheckbox = screen.getByTestId('assigned_reviewers');
        await userEvent.click(assignedReviewersCheckbox);
        expect(defaultProps.onChange).toHaveBeenCalledWith('test-id', {
            EventTargetMapping: {
                flagged: ['reviewers'],
                assigned: ['reviewers'],
            },
        });
    });
    test('should not add duplicate targets', () => {
        renderWithContext(<ContentFlaggingNotificationSettingsSection {...defaultProps}/>);
        const flaggedReviewersCheckbox = screen.getByTestId('flagged_reviewers');
        fireEvent.click(flaggedReviewersCheckbox);
        fireEvent.click(flaggedReviewersCheckbox);
        expect(defaultProps.onChange).toHaveBeenCalledWith('test-id', {
            EventTargetMapping: {
                flagged: ['reviewers'],
                assigned: ['reviewers'],
                removed: ['reviewers', 'author'],
                dismissed: ['reviewers'],
            },
        });
    });
    test('should handle multiple checkbox changes correctly', async () => {
        renderWithContext(<ContentFlaggingNotificationSettingsSection {...defaultProps}/>);
        const flaggedAuthorsCheckbox = screen.getByTestId('flagged_author');
        await userEvent.click(flaggedAuthorsCheckbox);
        const removedReporterCheckbox = screen.getByTestId('removed_reporter');
        await userEvent.click(removedReporterCheckbox);
        expect(defaultProps.onChange).toHaveBeenCalledTimes(2);
        expect(defaultProps.onChange).toHaveBeenNthCalledWith(1, 'test-id', {
            EventTargetMapping: {
                flagged: ['reviewers', 'author'],
                assigned: ['reviewers'],
                removed: ['reviewers', 'author'],
                dismissed: ['reviewers'],
            },
        });
        expect(defaultProps.onChange).toHaveBeenNthCalledWith(2, 'test-id', {
            EventTargetMapping: {
                flagged: ['reviewers', 'author'],
                assigned: ['reviewers'],
                removed: ['reviewers', 'author', 'reporter'],
                dismissed: ['reviewers'],
            },
        });
    });
    test('should handle unchecking and rechecking the same checkbox', async () => {
        renderWithContext(<ContentFlaggingNotificationSettingsSection {...defaultProps}/>);
        const removedAuthorCheckbox = screen.getByTestId('removed_author');
        await userEvent.click(removedAuthorCheckbox);
        expect(defaultProps.onChange).toHaveBeenNthCalledWith(1, 'test-id', {
            EventTargetMapping: {
                flagged: ['reviewers'],
                assigned: ['reviewers'],
                removed: ['reviewers'],
                dismissed: ['reviewers'],
            },
        });
        await userEvent.click(removedAuthorCheckbox);
        expect(defaultProps.onChange).toHaveBeenNthCalledWith(2, 'test-id', {
            EventTargetMapping: {
                flagged: ['reviewers'],
                assigned: ['reviewers'],
                removed: ['reviewers', 'author'],
                dismissed: ['reviewers'],
            },
        });
        expect(defaultProps.onChange).toHaveBeenCalledTimes(2);
    });
    test('should handle empty EventTargetMapping arrays', () => {
        const propsWithEmptyArrays = {
            ...defaultProps,
            value: {
                EventTargetMapping: {
                    flagged: [],
                    assigned: [],
                    removed: [],
                    dismissed: [],
                },
            } as unknown as ContentFlaggingNotificationSettings,
        };
        renderWithContext(<ContentFlaggingNotificationSettingsSection {...propsWithEmptyArrays}/>);
        expect(screen.getByTestId('flagged_reviewers')).not.toBeChecked();
        expect(screen.getByTestId('flagged_author')).not.toBeChecked();
        expect(screen.getByTestId('assigned_reviewers')).not.toBeChecked();
        expect(screen.getByTestId('removed_reviewers')).not.toBeChecked();
        expect(screen.getByTestId('removed_author')).not.toBeChecked();
        expect(screen.getByTestId('removed_reporter')).not.toBeChecked();
        expect(screen.getByTestId('dismissed_reviewers')).not.toBeChecked();
        expect(screen.getByTestId('dismissed_author')).not.toBeChecked();
        expect(screen.getByTestId('dismissed_reporter')).not.toBeChecked();
    });
});