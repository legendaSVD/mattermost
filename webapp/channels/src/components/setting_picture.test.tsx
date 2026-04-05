import React from 'react';
import type {ReactNode} from 'react';
import {FormattedMessage} from 'react-intl';
import SettingPicture from 'components/setting_picture';
import {renderWithContext, screen, userEvent} from 'tests/react_testing_utils';
const helpText: ReactNode = (
    <FormattedMessage
        id={'setting_picture.help.profile.example'}
        defaultMessage='Upload a picture in BMP, JPG or PNG format. Maximum file size: {max}'
        values={{max: 52428800}}
    />
);
describe('components/SettingItemMin', () => {
    const baseProps = {
        clientError: '',
        serverError: '',
        src: 'http://localhost:8065/api/v4/users/src_id',
        loadingPicture: false,
        submitActive: false,
        onSubmit: jest.fn(),
        title: 'Profile Picture',
        onFileChange: jest.fn(),
        updateSection: jest.fn(),
        maxFileSize: 209715200,
        helpText,
    };
    const mockFile = new File([new Blob()], 'image.jpeg', {
        type: 'image/jpeg',
    });
    test('should match snapshot, profile picture on source', () => {
        const {container} = renderWithContext(
            <SettingPicture {...baseProps}/>,
        );
        expect(container).toMatchSnapshot();
    });
    test('should match snapshot, profile picture on file', () => {
        const props = {...baseProps, file: mockFile, src: ''};
        const {container} = renderWithContext(
            <SettingPicture {...props}/>,
        );
        expect(container).toMatchSnapshot();
    });
    test('should match snapshot, user icon on source', () => {
        const props = {...baseProps, onSetDefault: jest.fn()};
        const {container} = renderWithContext(
            <SettingPicture {...props}/>,
        );
        expect(container).toMatchSnapshot();
    });
    test('should match snapshot, team icon on source', () => {
        const props = {...baseProps, onRemove: jest.fn(), imageContext: 'team'};
        const {container} = renderWithContext(
            <SettingPicture {...props}/>,
        );
        expect(container).toMatchSnapshot();
    });
    test('should match snapshot, team icon on file', () => {
        const props = {...baseProps, onRemove: jest.fn(), imageContext: 'team', file: mockFile, src: ''};
        const {container} = renderWithContext(
            <SettingPicture {...props}/>,
        );
        expect(container).toMatchSnapshot();
    });
    test('should match snapshot, on loading picture', () => {
        const props = {...baseProps, loadingPicture: true};
        const {container} = renderWithContext(
            <SettingPicture {...props}/>,
        );
        expect(container).toMatchSnapshot();
    });
    test('should match snapshot with active Save button', () => {
        const props = {...baseProps, submitActive: true};
        const {container} = renderWithContext(
            <SettingPicture {...props}/>,
        );
        expect(container).toMatchSnapshot();
    });
    test('should match snapshot with removeSrc state active', async () => {
        const props = {...baseProps, onRemove: jest.fn()};
        const {container} = renderWithContext(
            <SettingPicture {...props}/>,
        );
        const removeButton = screen.getByTestId('removeSettingPicture');
        await userEvent.click(removeButton);
        expect(container).toMatchSnapshot();
    });
    test('should match state and call props.updateSection on handleCancel', async () => {
        const props = {...baseProps, updateSection: jest.fn(), onRemove: jest.fn()};
        const {container} = renderWithContext(
            <SettingPicture {...props}/>,
        );
        const removeButton = screen.getByTestId('removeSettingPicture');
        await userEvent.click(removeButton);
        const cancelButton = screen.getByTestId('cancelSettingPicture');
        await userEvent.click(cancelButton);
        expect(props.updateSection).toHaveBeenCalledTimes(1);
        expect(container.querySelector('.profile-img')).toBeInTheDocument();
    });
    test('should call props.onRemove on handleSave', async () => {
        const props = {...baseProps, onRemove: jest.fn()};
        renderWithContext(
            <SettingPicture {...props}/>,
        );
        const removeButton = screen.getByTestId('removeSettingPicture');
        await userEvent.click(removeButton);
        const saveButton = screen.getByTestId('saveSettingPicture');
        await userEvent.click(saveButton);
        expect(props.onRemove).toHaveBeenCalledTimes(1);
    });
    test('should call props.onSetDefault on handleSave', async () => {
        const props = {...baseProps, onSetDefault: jest.fn()};
        renderWithContext(
            <SettingPicture {...props}/>,
        );
        const removeButton = screen.getByTestId('removeSettingPicture');
        await userEvent.click(removeButton);
        const saveButton = screen.getByTestId('saveSettingPicture');
        await userEvent.click(saveButton);
        expect(props.onSetDefault).toHaveBeenCalledTimes(1);
    });
    test('should match state and call props.onSubmit on handleSave', async () => {
        const props = {...baseProps, onSubmit: jest.fn(), submitActive: true};
        renderWithContext(
            <SettingPicture {...props}/>,
        );
        const saveButton = screen.getByTestId('saveSettingPicture');
        await userEvent.click(saveButton);
        expect(props.onSubmit).toHaveBeenCalledTimes(1);
    });
    test('should match state on handleRemoveSrc', async () => {
        const props = {...baseProps, onRemove: jest.fn()};
        const {container} = renderWithContext(
            <SettingPicture {...props}/>,
        );
        expect(container.querySelector('.profile-img')).toBeInTheDocument();
        const removeButton = screen.getByTestId('removeSettingPicture');
        await userEvent.click(removeButton);
        expect(container.querySelector('.profile-img')).not.toBeInTheDocument();
    });
    test('should match state and call props.onFileChange on handleFileChange', async () => {
        const props = {...baseProps, onFileChange: jest.fn(), onRemove: jest.fn()};
        const {container} = renderWithContext(
            <SettingPicture {...props}/>,
        );
        const removeButton = screen.getByTestId('removeSettingPicture');
        await userEvent.click(removeButton);
        expect(container.querySelector('.profile-img')).not.toBeInTheDocument();
        const fileInput = screen.getByTestId('uploadPicture');
        await userEvent.upload(fileInput, mockFile);
        expect(props.onFileChange).toHaveBeenCalledTimes(1);
        expect(container.querySelector('.profile-img')).toBeInTheDocument();
    });
});