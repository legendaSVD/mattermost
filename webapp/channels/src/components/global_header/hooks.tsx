import {useEffect, useRef} from 'react';
import type {MutableRefObject} from 'react';
import {useSelector} from 'react-redux';
import type {UserProfile} from '@mattermost/types/users';
import {getCurrentUser, isFirstAdmin, isCurrentUserSystemAdmin} from 'mattermost-redux/selectors/entities/users';
import {isModalOpen} from 'selectors/views/modals';
import type {GlobalState} from 'types/store';
export function useClickOutsideRef(ref: MutableRefObject<HTMLElement | null>, handler: () => void): void {
    useEffect(() => {
        function onMouseDown(event: MouseEvent) {
            const target = event.target as any;
            if (ref.current && target instanceof Node && !ref.current.contains(target)) {
                handler();
            }
        }
        document.addEventListener('mousedown', onMouseDown);
        return () => {
            document.removeEventListener('mousedown', onMouseDown);
        };
    }, [ref, handler]);
}
export const useFirstAdminUser = (): boolean => {
    return useSelector(isFirstAdmin);
};
export const useIsCurrentUserSystemAdmin = (): boolean => {
    return useSelector(isCurrentUserSystemAdmin);
};
export const useIsLoggedIn = (): boolean => {
    return Boolean(useSelector<GlobalState, UserProfile>(getCurrentUser));
};
export const useIsModalOpen = (modalIdentifier: string): [boolean, React.RefObject<boolean>] => {
    const modalOpenState = useSelector((state: GlobalState) => isModalOpen(state, modalIdentifier));
    const modalOpenStateRef = useRef(modalOpenState);
    useEffect(() => {
        modalOpenStateRef.current = modalOpenState;
    }, [modalOpenState]);
    return [modalOpenState, modalOpenStateRef];
};