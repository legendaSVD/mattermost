import type {UnknownAction} from 'redux';
import type {ThunkDispatch} from 'redux-thunk';
declare module 'react-redux' {
    function useDispatch<A extends Action = UnknownAction, State = any>(): ThunkDispatch<State, unknown, A>;
}