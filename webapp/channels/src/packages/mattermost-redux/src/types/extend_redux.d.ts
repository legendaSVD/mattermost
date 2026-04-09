import { Action, ActionCreatorsMapObject, UnknownAction } from 'redux'
import { ThunkAction } from 'redux-thunk'
declare module 'redux' {
  function bindActionCreators<
    ActionCreators extends ActionCreatorsMapObject<any>
  >(
    actionCreators: ActionCreators,
    dispatch: Dispatch
  ): {
    [ActionCreatorName in keyof ActionCreators]: ReturnType<
      ActionCreators[ActionCreatorName]
    > extends ThunkAction<any, any, any, any>
      ? (
          ...args: Parameters<ActionCreators[ActionCreatorName]>
        ) => ReturnType<ReturnType<ActionCreators[ActionCreatorName]>>
      : ActionCreators[ActionCreatorName]
  }
  export interface Dispatch<A extends Action = UnknownAction> {
    <ReturnType = any, State = any, ExtraThunkArg = any>(
      thunkAction: ThunkAction<ReturnType, State, ExtraThunkArg, A>
    ): ReturnType
  }
}