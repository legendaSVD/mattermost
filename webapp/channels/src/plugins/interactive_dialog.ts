import {IntegrationTypes} from 'mattermost-redux/action_types';
import {openModal} from 'actions/views/modals';
import store from 'stores/redux_store';
import DialogRouter from 'components/dialog_router';
import {ModalIdentifiers} from 'utils/constants';
export function openInteractiveDialog(dialog: any): void {
    store.dispatch({type: IntegrationTypes.RECEIVED_DIALOG, data: dialog});
    store.dispatch(openModal({modalId: ModalIdentifiers.INTERACTIVE_DIALOG, dialogType: DialogRouter}));
}
let previousTriggerId = '';
store.subscribe(() => {
    const state = store.getState();
    const currentTriggerId = state.entities.integrations.dialogTriggerId;
    if (currentTriggerId === previousTriggerId) {
        return;
    }
    previousTriggerId = currentTriggerId;
    const dialog = state.entities.integrations.dialog;
    if (!dialog || dialog.trigger_id !== currentTriggerId) {
        return;
    }
    store.dispatch(openModal({modalId: ModalIdentifiers.INTERACTIVE_DIALOG, dialogType: DialogRouter}));
});