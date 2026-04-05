import React from 'react';
type Modal = {
    open: boolean;
    dialogType: React.ComponentType;
    dialogProps?: Record<string, any>;
}
type Props = {
    modals: {
        modalState: {
            [modalId: string]: Modal;
        };
    };
    actions: {
        closeModal: (modalId: string) => void;
    };
}
const ModalController = ({
    modals,
    actions,
}: Props) => {
    if (!modals) {
        return null;
    }
    const {modalState} = modals;
    const modalOutput = [];
    for (const modalId in modalState) {
        if (Object.hasOwn(modalState, modalId)) {
            const modal = modalState[modalId];
            if (modal.open) {
                const modalComponent = React.createElement(modal.dialogType, Object.assign({}, modal.dialogProps, {
                    onExited: () => {
                        actions.closeModal(modalId);
                        modal.dialogProps?.onExited?.();
                    },
                    onHide: actions.closeModal.bind(this, modalId),
                    key: `${modalId}_modal`,
                }));
                modalOutput.push(modalComponent);
            }
        }
    }
    return <>{modalOutput}</>;
};
export default ModalController;