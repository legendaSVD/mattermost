import {ActionTypes} from 'utils/constants';
import {needsLoggedInLimitReachedCheck} from './admin';
describe('views/admin reducers', () => {
    describe('needsLoggedInLimitReachedCheck', () => {
        it('defaults to false', () => {
            const actual = needsLoggedInLimitReachedCheck(undefined, {type: 'testinit'});
            expect(actual).toBe(false);
        });
        it('is set by NEEDS_LOGGED_IN_LIMIT_REACHED_CHECK', () => {
            const falseValue = needsLoggedInLimitReachedCheck(
                undefined,
                {type: ActionTypes.NEEDS_LOGGED_IN_LIMIT_REACHED_CHECK, data: false},
            );
            expect(falseValue).toBe(false);
            const trueValue = needsLoggedInLimitReachedCheck(
                false,
                {type: ActionTypes.NEEDS_LOGGED_IN_LIMIT_REACHED_CHECK, data: true},
            );
            expect(trueValue).toBe(true);
        });
    });
});