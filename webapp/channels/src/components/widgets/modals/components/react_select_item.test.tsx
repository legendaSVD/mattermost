import {defineMessage} from 'react-intl';
import {getOptionLabel, type SelectOption} from './react_select_item';
const mockIntl = {
    formatMessage: jest.fn((descriptor) => {
        if (typeof descriptor === 'object' && descriptor.defaultMessage) {
            return descriptor.defaultMessage;
        }
        return String(descriptor);
    }),
};
describe('getOptionLabel', () => {
    test('should return string label as-is', () => {
        const option: SelectOption = {
            value: 'test',
            label: 'Test Label',
        };
        const result = getOptionLabel(option, mockIntl as any);
        expect(result).toBe('Test Label');
        expect(mockIntl.formatMessage).not.toHaveBeenCalled();
    });
    test('should handle MessageDescriptor label correctly', () => {
        const messageDescriptor = defineMessage({
            id: 'test1',
            defaultMessage: 'Help Text',
        });
        const option: SelectOption = {
            value: 'test',
            label: messageDescriptor,
        };
        const result = getOptionLabel(option, mockIntl as any);
        expect(result).toBe('Help Text');
        expect(mockIntl.formatMessage).toHaveBeenCalledWith(messageDescriptor);
    });
    test('should return empty string for undefined label', () => {
        const option: SelectOption = {
            value: 'test',
            label: undefined as any,
        };
        const result = getOptionLabel(option, mockIntl as any);
        expect(result).toBe('');
        expect(mockIntl.formatMessage).not.toHaveBeenCalled();
    });
    test('should handle accessibility scenarios - no more [object,object]', () => {
        const messageDescriptor = defineMessage({
            id: 'test1',
            defaultMessage: 'Help Text',
        });
        const option: SelectOption = {
            value: 'all',
            label: messageDescriptor,
        };
        const result = getOptionLabel(option, mockIntl as any);
        expect(result).toBe('Help Text');
        expect(result).not.toBe('[object,object]');
        expect(result).not.toBe('[object Object]');
        expect(typeof result).toBe('string');
        expect(mockIntl.formatMessage).toHaveBeenCalledWith(messageDescriptor);
    });
});