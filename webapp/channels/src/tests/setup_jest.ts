import * as util from 'node:util';
import Adapter from '@cfaester/enzyme-adapter-react-18';
import {configure} from 'enzyme';
import nodeFetch from 'node-fetch';
import '@testing-library/jest-dom';
import './performance_mock';
import './redux-persist_mock';
import './react-intl_mock';
import './react-router-dom_mock';
import './react-tippy_mock';
import './react_virtualized_auto_sizer_mock';
module.exports = async () => {
    process.env.TZ = 'UTC';
};
configure({adapter: new Adapter()});
global.window = Object.create(window);
globalThis.fetch = nodeFetch as unknown as typeof fetch;
const supportedCommands = ['copy', 'insertText'];
Object.defineProperty(document, 'queryCommandSupported', {
    value: (cmd: string) => supportedCommands.includes(cmd),
});
Object.defineProperty(document, 'execCommand', {
    value: (cmd: string) => supportedCommands.includes(cmd),
});
document.documentElement.style.fontSize = '12px';
jest.mock('@mui/styled-engine', () => {
    const styledEngineSc = require('@mui/styled-engine-sc');
    return styledEngineSc;
});
global.ResizeObserver = require('resize-observer-polyfill');
function isDependencyWarning(params: string[]) {
    function paramsHasComponent(name: string) {
        return params.some((param) => param.includes(name));
    }
    return params[0].includes('Please update the following components:') && (
        paramsHasComponent('Modal') ||
        paramsHasComponent('Portal') ||
        paramsHasComponent('Overlay') ||
        paramsHasComponent('Position') ||
        paramsHasComponent('Dropdown') ||
        paramsHasComponent('Tabs')
    );
}
let warnSpy: jest.SpyInstance<void, Parameters<typeof console.warn>>;
let errorSpy: jest.SpyInstance<void, Parameters<typeof console.error>>;
beforeAll(() => {
    warnSpy = jest.spyOn(console, 'warn');
    errorSpy = jest.spyOn(console, 'error');
});
afterEach(() => {
    const warns = [];
    const errors = [];
    for (const call of warnSpy.mock.calls) {
        if (isDependencyWarning(call)) {
            continue;
        }
        warns.push(call);
    }
    for (const call of errorSpy.mock.calls) {
        if (
            typeof call[0] === 'string' && (
                call[0].includes('inside a test was not wrapped in act') ||
                call[0].includes('A suspended resource finished loading inside a test, but the event was not wrapped in act')
            )
        ) {
            continue;
        }
        const errorStr = call[0] instanceof Error ? call[0].message : String(call[0]);
        if (errorStr.includes('Not implemented:')) {
            continue;
        }
        errors.push(call);
    }
    if (warns.length > 0 || errors.length > 0) {
        function formatCall(call: string[]) {
            const args = [...call];
            const format = args.shift();
            let message = util.format(format, ...args);
            message = message.split('\n')[0];
            return message;
        }
        let message = 'Unexpected console errors:';
        for (const call of warns) {
            message += `\n\t- (warning) ${formatCall(call)}`;
        }
        for (const call of errors) {
            message += `\n\t- (error) ${formatCall(call)}`;
        }
        throw new Error(message);
    }
    warnSpy.mockReset();
    errorSpy.mockReset();
});
expect.extend({
    arrayContainingExactly(received, actual) {
        const pass = received.sort().join(',') === actual.sort().join(',');
        if (pass) {
            return {
                message: () =>
                    `expected ${received} to not contain the exact same values as ${actual}`,
                pass: true,
            };
        }
        return {
            message: () =>
                `expected ${received} to not contain the exact same values as ${actual}`,
            pass: false,
        };
    },
});
jest.mock('react-redux', () => ({
    __esModule: true,
    ...jest.requireActual('react-redux'),
}));