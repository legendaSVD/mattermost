import {useCallback} from 'react';
import {useDispatch} from 'react-redux';
import {savePreferences} from 'mattermost-redux/actions/preferences';
import {Preferences} from 'mattermost-redux/constants';
import {burnPostNow} from 'actions/burn_on_read_deletion';
import {closeModal} from 'actions/views/modals';
import {ModalIdentifiers} from 'utils/constants';
interface BurnOnReadDeleteModalParams {
    postId: string;
    userId: string;
    isSender: boolean;
}
interface BurnOnReadDeleteModalHandlers {
    onConfirm: (skipConfirmation: boolean) => Promise<void>;
    onCancel: () => void;
    isSenderDelete: boolean;
    showCheckbox: boolean;
}
interface PreferenceType {
    category: string;
    user_id: string;
    name: string;
    value: string;
}
interface BurnOnReadDeleteActions {
    burnPostNow?: (postId: string) => Promise<{data?: boolean; error?: Error}>;
    closeModal: (modalId: string) => void;
    savePreferences: (userId: string, preferences: PreferenceType[]) => void;
}
export function createBurnOnReadDeleteModalHandlers(
    actions: BurnOnReadDeleteActions,
    {postId, userId, isSender}: BurnOnReadDeleteModalParams,
): BurnOnReadDeleteModalHandlers {
    return {
        onConfirm: async (skipConfirmation: boolean) => {
            await actions.burnPostNow?.(postId);
            actions.closeModal(ModalIdentifiers.BURN_ON_READ_CONFIRMATION);
            if (skipConfirmation && !isSender) {
                const pref = {
                    category: Preferences.CATEGORY_BURN_ON_READ,
                    user_id: userId,
                    name: Preferences.BURN_ON_READ_SKIP_CONFIRMATION,
                    value: 'true',
                };
                actions.savePreferences(userId, [pref]);
            }
        },
        onCancel: () => {
            actions.closeModal(ModalIdentifiers.BURN_ON_READ_CONFIRMATION);
        },
        isSenderDelete: isSender,
        showCheckbox: !isSender,
    };
}
export function useBurnOnReadDeleteModal(
    params: BurnOnReadDeleteModalParams,
): BurnOnReadDeleteModalHandlers {
    const dispatch = useDispatch();
    const {postId, userId, isSender} = params;
    const onConfirm = useCallback(async (skipConfirmation: boolean) => {
        await dispatch(burnPostNow(postId));
        dispatch(closeModal(ModalIdentifiers.BURN_ON_READ_CONFIRMATION));
        if (skipConfirmation && !isSender) {
            const pref: PreferenceType = {
                category: Preferences.CATEGORY_BURN_ON_READ,
                user_id: userId,
                name: Preferences.BURN_ON_READ_SKIP_CONFIRMATION,
                value: 'true',
            };
            dispatch(savePreferences(userId, [pref]));
        }
    }, [dispatch, postId, userId, isSender]);
    const onCancel = useCallback(() => {
        dispatch(closeModal(ModalIdentifiers.BURN_ON_READ_CONFIRMATION));
    }, [dispatch]);
    return {
        onConfirm,
        onCancel,
        isSenderDelete: isSender,
        showCheckbox: !isSender,
    };
}