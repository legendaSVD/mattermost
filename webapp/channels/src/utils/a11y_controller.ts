import Constants, {EventTypes, A11yClassNames, A11yAttributeNames, A11yCustomEventTypes, isA11yFocusEventDetail} from 'utils/constants';
import {isKeyPressed, cmdOrCtrlPressed} from 'utils/keyboard';
import {isDesktopApp, isMac} from 'utils/user_agent';
const listenerOptions = {
    capture: true,
};
export default class A11yController {
    regionHTMLCollection = this.getAllRegions();
    sectionHTMLCollection?: HTMLCollectionOf<HTMLElement>;
    modalHTMLCollection = this.getAllModals();
    popupHTMLCollection = this.getAllPopups();
    activeRegion?: HTMLElement;
    activeSection?: HTMLElement;
    activeElement?: HTMLElement;
    mouseIsPressed = false;
    lastInputEventIsKeyDown = false;
    lastInputEventIsKeyboard = true;
    manualFocus = false;
    enterKeyIsPressed = false;
    f6KeyIsPressed = false;
    upArrowKeyIsPressed = false;
    downArrowKeyIsPressed = false;
    tabKeyIsPressed = false;
    tildeKeyIsPressed = false;
    lKeyIsPressed = false;
    escKeyIsPressed = false;
    windowIsFocused = true;
    originElement?: HTMLElement | null = null;
    resetNavigation = false;
    constructor() {
        document.addEventListener(EventTypes.KEY_DOWN, this.handleKeyDown, listenerOptions);
        document.addEventListener(EventTypes.KEY_UP, this.handleKeyUp, listenerOptions);
        document.addEventListener(EventTypes.CLICK, this.handleMouseClick, listenerOptions);
        document.addEventListener(EventTypes.MOUSE_DOWN, this.handleMouseDown, listenerOptions);
        document.addEventListener(EventTypes.MOUSE_UP, this.handleMouseUp, listenerOptions);
        document.addEventListener(EventTypes.FOCUS, this.handleFocus, listenerOptions);
        document.addEventListener(A11yCustomEventTypes.FOCUS, this.handleA11yFocus, listenerOptions);
        window.addEventListener(EventTypes.BLUR, this.handleWindowBlur, listenerOptions);
    }
    destroy() {
        this.clearActiveRegion();
        this.clearCurrentFocus();
        document.removeEventListener(EventTypes.KEY_DOWN, this.handleKeyDown, listenerOptions);
        document.removeEventListener(EventTypes.KEY_UP, this.handleKeyUp, listenerOptions);
        document.removeEventListener(EventTypes.CLICK, this.handleMouseClick, listenerOptions);
        document.removeEventListener(EventTypes.MOUSE_DOWN, this.handleMouseDown, listenerOptions);
        document.removeEventListener(EventTypes.MOUSE_UP, this.handleMouseUp, listenerOptions);
        document.removeEventListener(EventTypes.FOCUS, this.handleFocus, listenerOptions);
        document.removeEventListener(A11yCustomEventTypes.FOCUS, this.handleA11yFocus, listenerOptions);
        window.removeEventListener(EventTypes.BLUR, this.handleWindowBlur, listenerOptions);
    }
    storeOriginElement(element: HTMLElement) {
        this.originElement = element;
    }
    resetOriginElement() {
        this.originElement = null;
    }
    get navigationInProgress() {
        if (!this.regions || !this.regions.length || !this.isElementValid(this.activeRegion)) {
            return false;
        }
        if (!this.lastInputEventIsKeyDown) {
            return false;
        }
        if (this.modalIsOpen || this.popupIsOpen) {
            return false;
        }
        if (!this.isElementValid(this.activeElement)) {
            return false;
        }
        return true;
    }
    get regions() {
        let domElements = this.sortElementsByAttributeOrder(this.regionHTMLCollection);
        domElements = domElements.filter((element) => {
            return this.elementIsVisible(element);
        });
        return domElements;
    }
    get sections() {
        let domElements = this.sortElementsByAttributeOrder(this.sectionHTMLCollection!);
        domElements = domElements.filter((element) => {
            return this.elementIsVisible(element);
        });
        if (this.shouldReverseSections) {
            domElements.reverse();
        }
        return domElements;
    }
    get activeRegionIndex() {
        if (!this.activeRegion) {
            return -1;
        }
        return this.regions.indexOf(this.activeRegion);
    }
    get activeSectionIndex() {
        if (!this.activeSection) {
            return -1;
        }
        return this.sections.indexOf(this.activeSection);
    }
    get shouldReverseSections() {
        if (!this.activeRegion) {
            return false;
        }
        return this.getOrderReverseAttribute(this.activeRegion);
    }
    get focusedElement() {
        let focusedElement;
        if (this.activeElement) {
            focusedElement = this.activeElement;
        } else if (this.activeSection) {
            focusedElement = this.activeSection;
        } else if (this.activeRegion) {
            focusedElement = this.activeRegion;
        }
        return focusedElement;
    }
    get a11yKeyIsPressed() {
        return this.f6KeyIsPressed ||
               this.upArrowKeyIsPressed ||
               this.downArrowKeyIsPressed ||
               this.tabKeyIsPressed ||
               this.tildeKeyIsPressed ||
               this.lKeyIsPressed ||
               this.escKeyIsPressed;
    }
    get modalIsOpen() {
        return this.modalHTMLCollection.length > 0;
    }
    get popupIsOpen() {
        return this.popupHTMLCollection.length > 0;
    }
    get disableNavigation() {
        return this.activeRegion && this.activeRegion.getAttribute(A11yAttributeNames.DISABLE_NAVIGATION) === 'true';
    }
    nextRegion() {
        const regions = this.regions;
        if (
            !regions ||
            !regions.length ||
            this.modalIsOpen ||
            this.popupIsOpen
        ) {
            return;
        }
        if (!this.disableNavigation) {
            let newRegion;
            if (
                !this.activeRegion ||
                this.activeRegionIndex === regions.length - 1 ||
                this.resetNavigation
            ) {
                newRegion = regions[0];
            } else {
                newRegion = regions[this.activeRegionIndex + 1];
            }
            this.setActiveRegion(newRegion);
        }
        this.setCurrentFocus();
        this.resetNavigation = false;
    }
    previousRegion() {
        const regions = this.regions;
        if (
            !regions ||
            !regions.length ||
            this.modalIsOpen ||
            this.popupIsOpen
        ) {
            return;
        }
        if (!this.disableNavigation) {
            let newRegion;
            if (!this.activeRegion || (this.activeRegionIndex !== 0 && this.resetNavigation)) {
                newRegion = regions[0];
            } else if (this.activeRegionIndex === 0) {
                newRegion = regions[regions.length - 1];
            } else {
                newRegion = regions[this.activeRegionIndex - 1];
            }
            this.setActiveRegion(newRegion);
        }
        this.setCurrentFocus();
        this.resetNavigation = false;
    }
    nextSection() {
        const sections = this.sections;
        const shouldLoopNavigation = this.getLoopNavigationAttribute(this.activeRegion);
        if (
            this.modalIsOpen ||
            this.popupIsOpen ||
            !sections ||
            !sections.length ||
            (!shouldLoopNavigation && this.activeSectionIndex === sections.length - 1)
        ) {
            return;
        }
        if (!this.disableNavigation) {
            let newSection;
            if (this.activeSection && this.activeSectionIndex < sections.length - 1) {
                newSection = sections[this.activeSectionIndex + 1];
            } else {
                newSection = sections[0];
            }
            this.setActiveSection(newSection);
        }
        this.setCurrentFocus();
        this.resetNavigation = true;
    }
    previousSection() {
        const sections = this.sections;
        const shouldLoopNavigation = this.getLoopNavigationAttribute(this.activeRegion);
        if (
            this.modalIsOpen ||
            this.popupIsOpen ||
            !sections ||
            !sections.length ||
            (!shouldLoopNavigation && this.activeSectionIndex === 0)
        ) {
            return;
        }
        if (!this.disableNavigation) {
            let newSection;
            if (this.activeSection && this.activeSectionIndex > 0) {
                newSection = sections[this.activeSectionIndex - 1];
            } else if (this.activeSection && this.activeSectionIndex === 0) {
                newSection = sections[sections.length - 1];
            } else {
                newSection = sections[0];
            }
            this.setActiveSection(newSection);
        }
        this.setCurrentFocus();
        this.resetNavigation = true;
    }
    nextElement(element: HTMLElement, elementPath: EventTarget[] | boolean = false) {
        function isPath(obj: unknown): obj is HTMLElement[] {
            return Array.isArray(obj);
        }
        let region;
        let section;
        if (isPath(elementPath)) {
            if (!this.activeRegion || elementPath.indexOf(this.activeRegion) < 0) {
                region = elementPath.find((pathElement) => {
                    if (!pathElement.classList) {
                        return false;
                    }
                    return pathElement.classList.contains(A11yClassNames.REGION);
                });
            }
            if (!this.activeSection || elementPath.indexOf(this.activeSection) < 0) {
                section = elementPath.find((pathElement) => {
                    if (!pathElement.classList) {
                        return false;
                    }
                    return pathElement.classList.contains(A11yClassNames.SECTION);
                });
            }
        } else if (elementPath && typeof element.closest === 'function') {
            region = element.closest(`.${A11yClassNames.REGION}`) as HTMLElement;
            section = element.closest(`.${A11yClassNames.SECTION}`) as HTMLElement;
        }
        if (region && this.activeRegion !== region) {
            this.setActiveRegion(region, false);
        }
        if (section && this.activeSection !== section) {
            this.setActiveSection(section);
        }
        this.setActiveElement(element);
        this.setCurrentFocus();
        this.resetNavigation = true;
    }
    restoreOriginFocus() {
        if (this.originElement && this.isElementValid(this.originElement)) {
            const customEvent = new CustomEvent(A11yCustomEventTypes.FOCUS, {
                detail: {
                    target: this.originElement,
                    keyboardOnly: false,
                },
            });
            this.handleA11yFocus(customEvent);
            setTimeout(() => {
                this.originElement = null;
            }, 0);
        }
    }
    cancelNavigation() {
        this.clearActiveRegion();
        this.setCurrentFocus();
        this.resetInterractionStates();
    }
    setActiveRegion(element: HTMLElement, canFocusChild = true) {
        if (!this.isElementValid(element, [this.activeRegion]) && !this.resetNavigation) {
            return;
        }
        this.clearActiveRegion();
        this.activeRegion = element;
        this.activeRegion.addEventListener(A11yCustomEventTypes.UPDATE, this.handleActiveRegionUpdate);
        this.activeRegion.dispatchEvent(new Event(A11yCustomEventTypes.ACTIVATE));
        this.updateActiveRegion();
        this.sectionHTMLCollection = this.getAllSectionsForRegion(this.activeRegion);
        if (canFocusChild && this.getFocusChildAttribute(this.activeRegion) && this.sections && this.sections.length) {
            this.setActiveSection(this.sections[0]);
        }
    }
    setActiveSection(element: HTMLElement) {
        if (!this.isElementValid(element, [this.activeSection])) {
            return;
        }
        this.clearActiveSection();
        this.activeSection = element;
        this.activeSection.addEventListener(A11yCustomEventTypes.UPDATE, this.handleActiveSectionUpdate);
        this.activeSection.dispatchEvent(new Event(A11yCustomEventTypes.ACTIVATE));
        this.updateActiveSection();
    }
    setActiveElement(element: HTMLElement) {
        if (!this.isElementValid(element, [this.activeElement])) {
            return;
        }
        this.clearActiveElement();
        this.activeElement = element;
        this.activeElement.addEventListener(A11yCustomEventTypes.UPDATE, this.handleActiveElementUpdate);
        if (this.activeElement !== this.activeRegion && this.activeElement !== this.activeSection) {
            this.activeElement.dispatchEvent(new Event(A11yCustomEventTypes.ACTIVATE));
        }
        this.updateActiveElement();
    }
    setCurrentFocus() {
        this.clearCurrentFocus();
        if (!this.focusedElement) {
            return;
        }
        if (document.activeElement !== this.focusedElement) {
            this.focusedElement.focus();
        }
        this.udpateCurrentFocus();
    }
    updateActiveRegion() {
        if (!this.activeRegion) {
            return;
        }
        this.activeRegion.classList.add(A11yClassNames.ACTIVE);
        if (!this.activeRegion.getAttribute('tabindex')) {
            this.activeRegion.setAttribute('tabindex', '-1');
        }
    }
    updateActiveSection() {
        if (!this.activeSection) {
            return;
        }
        this.activeSection.classList.add(A11yClassNames.ACTIVE);
        if (!this.activeSection.getAttribute('tabindex')) {
            this.activeSection.setAttribute('tabindex', '-1');
        }
    }
    updateActiveElement() {
        if (!this.activeElement) {
            return;
        }
        this.activeElement.classList.add(A11yClassNames.ACTIVE);
    }
    udpateCurrentFocus(forceUpdate = false) {
        if ((!this.focusedElement || !(this.a11yKeyIsPressed || this.manualFocus)) && !forceUpdate) {
            return;
        }
        this.focusedElement?.classList.add(A11yClassNames.FOCUSED);
    }
    clearActiveRegion() {
        if (this.activeRegion) {
            this.activeRegion.classList.remove(A11yClassNames.ACTIVE);
            this.activeRegion.dispatchEvent(new Event(A11yCustomEventTypes.DEACTIVATE));
            this.activeRegion.removeEventListener(A11yCustomEventTypes.UPDATE, this.handleActiveRegionUpdate);
            this.activeRegion = undefined;
        }
        this.clearActiveSection();
    }
    clearActiveSection() {
        if (this.activeSection) {
            this.activeSection.classList.remove(A11yClassNames.ACTIVE);
            this.activeSection.dispatchEvent(new Event(A11yCustomEventTypes.DEACTIVATE));
            this.activeSection.removeEventListener(A11yCustomEventTypes.UPDATE, this.handleActiveSectionUpdate);
            this.activeSection = undefined;
        }
        this.clearActiveElement();
    }
    clearActiveElement() {
        if (this.activeElement) {
            if (this.activeElement !== this.activeRegion && this.activeElement !== this.activeSection) {
                this.activeElement.classList.remove(A11yClassNames.ACTIVE);
                this.activeElement.dispatchEvent(new Event(A11yCustomEventTypes.DEACTIVATE));
            }
            this.activeElement.removeEventListener(A11yCustomEventTypes.UPDATE, this.handleActiveElementUpdate);
            this.activeElement = undefined;
        }
    }
    clearCurrentFocus(blurActiveElement = false) {
        Array.from(document.getElementsByClassName(A11yClassNames.FOCUSED)).forEach((element) => {
            element.classList.remove(A11yClassNames.FOCUSED);
        });
        if (blurActiveElement) {
            (document.activeElement as HTMLElement).blur();
        }
    }
    resetInterractionStates() {
        this.mouseIsPressed = false;
        this.f6KeyIsPressed = false;
        this.upArrowKeyIsPressed = false;
        this.downArrowKeyIsPressed = false;
        this.tabKeyIsPressed = false;
        this.tildeKeyIsPressed = false;
        this.enterKeyIsPressed = false;
        this.escKeyIsPressed = false;
        this.lKeyIsPressed = false;
        this.lastInputEventIsKeyDown = false;
    }
    getAllRegions() {
        return document.getElementsByClassName(A11yClassNames.REGION) as HTMLCollectionOf<HTMLElement>;
    }
    getAllSectionsForRegion(region: HTMLElement) {
        if (!region) {
            return undefined;
        }
        return region.getElementsByClassName(A11yClassNames.SECTION) as HTMLCollectionOf<HTMLElement>;
    }
    sortElementsByAttributeOrder(elements: HTMLCollectionOf<HTMLElement>) {
        if (!elements || !elements.length) {
            return [];
        }
        return Array.from(elements).sort((elementA, elementB) => {
            const elementAOrder = parseInt(elementA.getAttribute(A11yAttributeNames.SORT_ORDER) || '', 10);
            const elementBOrder = parseInt(elementB.getAttribute(A11yAttributeNames.SORT_ORDER) || '', 10);
            if (isNaN(elementAOrder) && isNaN(elementBOrder)) {
                return 0;
            }
            if (isNaN(elementBOrder)) {
                return -1;
            }
            if (isNaN(elementAOrder)) {
                return 1;
            }
            return elementAOrder - elementBOrder;
        });
    }
    elementIsVisible(element: HTMLElement) {
        return element &&
            element instanceof HTMLElement &&
            element.offsetParent;
    }
    getAllModals() {
        return document.getElementsByClassName(A11yClassNames.MODAL) as HTMLCollectionOf<HTMLElement>;
    }
    getAllPopups() {
        return document.getElementsByClassName(A11yClassNames.POPUP) as HTMLCollectionOf<HTMLElement>;
    }
    getLoopNavigationAttribute(element: HTMLElement | undefined) {
        const attributeValue = element?.getAttribute(A11yAttributeNames.LOOP_NAVIGATION);
        if (attributeValue && attributeValue.toLowerCase() === 'false') {
            return false;
        }
        return true;
    }
    getOrderReverseAttribute(element: HTMLElement) {
        const attributeValue = element.getAttribute(A11yAttributeNames.ORDER_REVERSE);
        if (attributeValue && attributeValue.toLowerCase() === 'true') {
            return true;
        }
        return false;
    }
    getFocusChildAttribute(element: HTMLElement) {
        const attributeValue = element.getAttribute(A11yAttributeNames.FOCUS_CHILD);
        if (attributeValue && attributeValue.toLowerCase() === 'true') {
            return true;
        }
        return false;
    }
    isElementValid(element: HTMLElement | undefined, invalidElements: Array<HTMLElement | undefined> = []) {
        if (
            element &&
            element.classList &&
            !invalidElements.includes(element)
        ) {
            return true;
        }
        return false;
    }
    handleKeyDown = (event: Event) => {
        if (
            !(event instanceof KeyboardEvent) ||
            !event.target ||
            !(event.target instanceof HTMLElement)
        ) {
            return;
        }
        this.lastInputEventIsKeyboard = true;
        const modifierKeys = {
            ctrlIsPressed: event.ctrlKey,
            altIsPressed: event.altKey,
            shiftIsPressed: event.shiftKey,
        };
        switch (true) {
        case isKeyPressed(event, Constants.KeyCodes.TAB):
            this.lastInputEventIsKeyDown = true;
            if ((!isMac() && modifierKeys.altIsPressed) || cmdOrCtrlPressed(event)) {
                return;
            }
            this.tabKeyIsPressed = true;
            break;
        case isKeyPressed(event, Constants.KeyCodes.TILDE):
            this.lastInputEventIsKeyDown = true;
            if (!this.regions || !this.regions.length) {
                return;
            }
            if (modifierKeys.ctrlIsPressed && !modifierKeys.altIsPressed) {
                this.tildeKeyIsPressed = true;
                event.preventDefault();
                if (modifierKeys.shiftIsPressed) {
                    this.previousRegion();
                } else {
                    this.nextRegion();
                }
            }
            break;
        case isKeyPressed(event, Constants.KeyCodes.F6):
            this.lastInputEventIsKeyDown = true;
            if (!isDesktopApp() && !cmdOrCtrlPressed(event)) {
                return;
            }
            this.f6KeyIsPressed = true;
            event.preventDefault();
            if (modifierKeys.shiftIsPressed) {
                this.previousRegion();
            } else {
                this.nextRegion();
            }
            break;
        case isKeyPressed(event, Constants.KeyCodes.UP):
            this.lastInputEventIsKeyDown = true;
            if (!this.navigationInProgress || !this.sections || !this.sections.length) {
                return;
            }
            this.upArrowKeyIsPressed = true;
            event.preventDefault();
            if (this.shouldReverseSections) {
                this.nextSection();
            } else {
                this.previousSection();
            }
            break;
        case isKeyPressed(event, Constants.KeyCodes.DOWN):
            this.lastInputEventIsKeyDown = true;
            if (!this.navigationInProgress || !this.sections || !this.sections.length) {
                return;
            }
            this.downArrowKeyIsPressed = true;
            event.preventDefault();
            if (this.shouldReverseSections) {
                this.previousSection();
            } else {
                this.nextSection();
            }
            break;
        case isKeyPressed(event, Constants.KeyCodes.ESCAPE):
            this.escKeyIsPressed = true;
            this.lastInputEventIsKeyDown = true;
            if (!this.navigationInProgress) {
                return;
            }
            event.preventDefault();
            this.cancelNavigation();
            break;
        case isKeyPressed(event, Constants.KeyCodes.ENTER):
            this.enterKeyIsPressed = true;
            break;
        case isKeyPressed(event, Constants.KeyCodes.SPACE):
            if (event.target.nodeName === 'BUTTON') {
                event.preventDefault();
                event.stopPropagation();
                event.target.click();
            }
            break;
        case isKeyPressed(event, Constants.KeyCodes.L):
            this.lastInputEventIsKeyDown = true;
            this.lKeyIsPressed = true;
            break;
        }
    };
    handleKeyUp = () => {
        this.resetInterractionStates();
    };
    handleMouseClick = (event: Event) => {
        if (!this.enterKeyIsPressed) {
            this.lastInputEventIsKeyDown = false;
        }
        if (event.target === this.activeElement) {
            return;
        }
        this.cancelNavigation();
    };
    handleMouseDown = () => {
        this.mouseIsPressed = true;
        this.lastInputEventIsKeyboard = false;
    };
    handleMouseUp = () => {
        this.mouseIsPressed = false;
    };
    handleFocus = (event: Event) => {
        if (event.target instanceof HTMLElement) {
            if (this.lastInputEventIsKeyDown && this.windowIsFocused && event.target.id !== 'edit_textbox') {
                this.nextElement(event.target, event.composedPath() || true);
            }
        }
        if (!this.windowIsFocused) {
            this.windowIsFocused = true;
        }
    };
    handleA11yFocus = (event: Event) => {
        if (!(event instanceof CustomEvent)) {
            return;
        }
        if (!isA11yFocusEventDetail(event.detail) || !event.detail.target) {
            return;
        }
        if (!event.detail.keyboardOnly || this.lastInputEventIsKeyboard) {
            this.manualFocus = true;
            this.nextElement(event.detail.target, true);
            this.manualFocus = false;
        } else {
            event.detail.target.focus();
        }
    };
    handleWindowBlur = (event: Event) => {
        if (event.target === window) {
            this.windowIsFocused = false;
        }
    };
    handleActiveRegionUpdate = () => {
        if (this.navigationInProgress) {
            this.updateActiveRegion();
            if (this.focusedElement === this.activeRegion) {
                this.udpateCurrentFocus(true);
            }
        }
    };
    handleActiveSectionUpdate = () => {
        if (this.navigationInProgress) {
            this.updateActiveSection();
            if (this.focusedElement === this.activeSection) {
                this.udpateCurrentFocus(true);
            }
        }
    };
    handleActiveElementUpdate = () => {
        if (this.navigationInProgress) {
            this.updateActiveElement();
            if (this.focusedElement === this.activeElement) {
                this.udpateCurrentFocus(true);
            }
        }
    };
}