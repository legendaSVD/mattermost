import {detectOverflow} from '@floating-ui/react';
import type {Boundary, MiddlewareState} from '@floating-ui/react-dom';
export type HorizontallyWithinOptions = {
    boundary?: Boundary | null;
}
export function horizontallyWithin(options: HorizontallyWithinOptions = {}) {
    return ({
        name: 'horizontallyWithin',
        options,
        async fn(state: MiddlewareState) {
            const {boundary} = options;
            if (!boundary) {
                return {};
            }
            const overflow = await detectOverflow(state, {
                boundary,
            });
            if (overflow.right > 0) {
                return {
                    x: state.x - overflow.right,
                    y: state.y,
                };
            } else if (overflow.left > 0) {
                return {
                    x: state.x + overflow.left,
                    y: state.y,
                };
            }
            return {};
        },
    });
}