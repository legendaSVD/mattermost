import MuiMenuList from '@mui/material/MenuList';
import MuiPopover from '@mui/material/Popover';
import type {PopoverOrigin} from '@mui/material/Popover';
import classNames from 'classnames';
import React, {
    useState,
    useEffect,
    useCallback,
} from 'react';
import type {
    ReactNode,
    MouseEvent,
    KeyboardEvent,
} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {GenericModal} from '@mattermost/components';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {openModal, closeModal} from 'actions/views/modals';
import {getIsMobileView} from 'selectors/views/browser';
import CompassDesignProvider from 'components/compass_design_provider';
import WithTooltip from 'components/with_tooltip';
import Constants, {A11yClassNames} from 'utils/constants';
import {isKeyPressed} from 'utils/keyboard';
import {MenuContext, useMenuContextValue} from './menu_context';
import './menu.scss';
export const ELEMENT_ID_FOR_MENU_BACKDROP = 'backdropForMenuComponent';
const MENU_OPEN_ANIMATION_DURATION = 150;
const MENU_CLOSE_ANIMATION_DURATION = 100;
type MenuButtonProps = {
    id: string;
    dataTestId?: string;
    'aria-label'?: string;
    'aria-describedby'?: string;
    disabled?: boolean;
    class?: string;
    as?: keyof JSX.IntrinsicElements;
    children: ReactNode;
}
type MenuButtonTooltipProps = {
    isVertical?: boolean;
    class?: string;
    text: string;
    disabled?: boolean;
}
type MenuProps = {
    id: string;
    'aria-label'?: string;
    className?: string;
    'aria-labelledby'?: string;
    onToggle?: (isOpen: boolean) => void;
    onKeyDown?: (event: KeyboardEvent<HTMLDivElement>, forceCloseMenu?: () => void) => void;
    width?: string;
    isMenuOpen?: boolean;
}
const defaultAnchorOrigin = {vertical: 'bottom', horizontal: 'left'} as PopoverOrigin;
const defaultTransformOrigin = {vertical: 'top', horizontal: 'left'} as PopoverOrigin;
interface Props {
    menuButton: MenuButtonProps;
    menuButtonTooltip?: MenuButtonTooltipProps;
    menuHeader?: ReactNode;
    menuFooter?: ReactNode;
    menu: MenuProps;
    children: ReactNode | ReactNode[];
    closeMenuOnTab?: boolean;
    anchorOrigin?: PopoverOrigin;
    transformOrigin?: PopoverOrigin;
}
export function Menu(props: Props) {
    const {closeMenuOnTab = true} = props;
    const theme = useSelector(getTheme);
    const isMobileView = useSelector(getIsMobileView);
    const dispatch = useDispatch();
    const [anchorElement, setAnchorElement] = useState<null | HTMLElement>(null);
    const isMenuOpen = Boolean(anchorElement);
    function handleMenuClose(event: MouseEvent<HTMLDivElement>) {
        event.preventDefault();
        setAnchorElement(null);
    }
    const closeMenu = useCallback(() => {
        setAnchorElement(null);
    }, []);
    function handleMenuModalClose(modalId: MenuProps['id']) {
        dispatch(closeModal(modalId));
        setAnchorElement(null);
    }
    function handleMenuClick(e: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>) {
        e.stopPropagation();
    }
    function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (isKeyPressed(event, Constants.KeyCodes.ENTER) || isKeyPressed(event, Constants.KeyCodes.SPACE)) {
            const target = event.target as HTMLElement;
            const ariaHasPopupAttribute = target?.getAttribute('aria-haspopup') === 'true';
            const ariaHasExpandedAttribute = target?.getAttribute('aria-expanded') === 'true';
            if (ariaHasPopupAttribute && ariaHasExpandedAttribute) {
            } else {
                setAnchorElement(null);
            }
        }
        if (props.menu.onKeyDown) {
            props.menu.onKeyDown(event, closeMenu);
        }
        if (closeMenuOnTab && isKeyPressed(event, Constants.KeyCodes.TAB)) {
            closeMenu();
        }
    }
    function handleMenuButtonClick(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        if (isMobileView) {
            dispatch(
                openModal<MenuModalProps>({
                    modalId: props.menu.id,
                    dialogType: MenuModal,
                    dialogProps: {
                        menuButtonId: props.menuButton.id,
                        menuId: props.menu.id,
                        menuAriaLabel: props.menu?.['aria-label'] ?? '',
                        className: props.menu.className,
                        onModalClose: handleMenuModalClose,
                        children: props.children,
                        onKeyDown: props.menu.onKeyDown,
                        menuHeader: props.menuHeader,
                        menuFooter: props.menuFooter,
                    },
                }),
            );
        } else {
            setAnchorElement(event.currentTarget as HTMLElement);
        }
    }
    function renderMenuButton() {
        const MenuButtonComponent = props.menuButton?.as ?? 'button';
        const triggerElement = (
            <MenuButtonComponent
                id={props.menuButton.id}
                data-testid={props.menuButton.dataTestId}
                aria-controls={props.menu.id}
                aria-haspopup={true}
                aria-expanded={isMenuOpen}
                disabled={props.menuButton?.disabled ?? false}
                aria-label={props.menuButton?.['aria-label']}
                aria-describedby={props.menuButton?.['aria-describedby']}
                className={props.menuButton?.class ?? ''}
                onClick={handleMenuButtonClick}
            >
                {props.menuButton.children}
            </MenuButtonComponent>
        );
        if (props.menuButtonTooltip && props.menuButtonTooltip.text && !isMobileView) {
            return (
                <WithTooltip
                    title={props.menuButtonTooltip.text}
                    isVertical={props.menuButtonTooltip?.isVertical ?? true}
                    disabled={isMenuOpen || props.menuButton?.disabled}
                    className={props.menuButtonTooltip.class}
                >
                    {triggerElement}
                </WithTooltip>
            );
        }
        return triggerElement;
    }
    useEffect(() => {
        if (props.menu.onToggle) {
            props.menu.onToggle(isMenuOpen);
        }
    }, [isMenuOpen]);
    useEffect(() => {
        if (props.menu.isMenuOpen === false) {
            setAnchorElement(null);
        }
    }, [props.menu.isMenuOpen]);
    const providerValue = useMenuContextValue(closeMenu, Boolean(anchorElement));
    if (isMobileView) {
        return renderMenuButton();
    }
    return (
        <CompassDesignProvider theme={theme}>
            {renderMenuButton()}
            <MenuContext.Provider value={providerValue}>
                <MuiPopover
                    anchorEl={anchorElement}
                    open={isMenuOpen}
                    onClose={handleMenuClose}
                    onClick={handleMenuClick}
                    onKeyDown={handleMenuKeyDown}
                    className={classNames(A11yClassNames.POPUP, 'menu_menuStyled')}
                    marginThreshold={0}
                    anchorOrigin={props.anchorOrigin || defaultAnchorOrigin}
                    transformOrigin={props.transformOrigin || defaultTransformOrigin}
                    TransitionProps={{
                        mountOnEnter: true,
                        unmountOnExit: true,
                        timeout: {
                            enter: MENU_OPEN_ANIMATION_DURATION,
                            exit: MENU_CLOSE_ANIMATION_DURATION,
                        },
                    }}
                    slotProps={{
                        backdrop: {
                            id: ELEMENT_ID_FOR_MENU_BACKDROP,
                        },
                    }}
                    onTransitionExited={providerValue.handleClosed}
                >
                    {props.menuHeader}
                    <MuiMenuList
                        id={props.menu.id}
                        aria-label={props.menu?.['aria-label']}
                        aria-labelledby={props.menu['aria-labelledby']}
                        className={props.menu.className}
                        style={{
                            width: props.menu.width,
                        }}
                        autoFocusItem={isMenuOpen}
                    >
                        {props.children}
                    </MuiMenuList>
                    {props.menuFooter}
                </MuiPopover>
            </MenuContext.Provider>
        </CompassDesignProvider>
    );
}
interface MenuModalProps {
    menuButtonId: MenuButtonProps['id'];
    menuId: MenuProps['id'];
    menuAriaLabel: MenuProps['aria-label'];
    className: MenuProps['className'];
    onModalClose: (modalId: MenuProps['id']) => void;
    children: Props['children'];
    onKeyDown?: MenuProps['onKeyDown'];
    menuHeader?: Props['menuHeader'];
    menuFooter?: Props['menuFooter'];
}
function MenuModal(props: MenuModalProps) {
    const theme = useSelector(getTheme);
    function closeMenuModal() {
        props.onModalClose(props.menuId);
    }
    function handleModalClickCapture(event: MouseEvent<HTMLDivElement>) {
        if (event && event.currentTarget.contains(event.target as Node)) {
            for (const currentElement of event.currentTarget.children) {
                if (currentElement.contains(event.target as Node) && !currentElement.ariaHasPopup) {
                    closeMenuModal();
                    break;
                }
            }
        }
    }
    function handleKeydown(event?: React.KeyboardEvent<HTMLDivElement>) {
        if (event && props.onKeyDown) {
            props.onKeyDown(event, closeMenuModal);
        }
    }
    return (
        <CompassDesignProvider theme={theme}>
            <GenericModal
                id={props.menuId}
                className='menuModal'
                backdrop={true}
                ariaLabel={props.menuAriaLabel}
                onExited={closeMenuModal}
                enforceFocus={false}
                handleKeydown={handleKeydown}
            >
                <MuiMenuList
                    component='div'
                    aria-labelledby={props.menuButtonId}
                    onClick={handleModalClickCapture}
                    className={props.className}
                >
                    {props.menuHeader}
                    {props.children}
                    {props.menuFooter}
                </MuiMenuList>
            </GenericModal>
        </CompassDesignProvider>
    );
}