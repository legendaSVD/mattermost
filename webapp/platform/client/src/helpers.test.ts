import {buildQueryString} from './helpers';
describe('Helpers', () => {
    test.each([
        [{}, ''],
        [{a: 1}, '?a=1'],
        [{a: 1, b: 'str'}, '?a=1&b=str'],
        [{a: 1, b: 'str', c: undefined}, '?a=1&b=str'],
        [{a: 1, b: 'str', c: 0}, '?a=1&b=str&c=0'],
        [{a: 1, b: 'str', c: ''}, '?a=1&b=str&c='],
        [{a: 1, b: undefined, c: 'str'}, '?a=1&c=str'],
    ])('buildQueryString with %o should return %s', (params, expected) => {
        expect(buildQueryString(params)).toEqual(expected);
    });
});