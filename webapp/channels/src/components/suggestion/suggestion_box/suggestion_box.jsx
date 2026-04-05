import PropTypes from 'prop-types';
import React from 'react';
import QuickInput from 'components/quick_input';
import Constants, {A11yCustomEventTypes} from 'utils/constants';
import * as Keyboard from 'utils/keyboard';
import * as UserAgent from 'utils/user_agent';
import * as Utils from 'utils/utils';
import {
    emptyResults,
    flattenTerms,
    getItemForTerm,
    hasLoadedResults,
    hasResults,
    normalizeResultsFromProvider,
} from '../suggestion_results';
const EXECUTE_CURRENT_COMMAND_ITEM_ID = Constants.Integrations.EXECUTE_CURRENT_COMMAND_ITEM_ID;
const OPEN_COMMAND_IN_MODAL_ITEM_ID = Constants.Integrations.OPEN_COMMAND_IN_MODAL_ITEM_ID;
const KeyCodes = Constants.KeyCodes;
export default class SuggestionBox extends React.PureComponent {
    static propTypes = {
        listComponent: PropTypes.any.isRequired,
        listPosition: PropTypes.oneOf(['top', 'bottom']),
        inputComponent: PropTypes.elementType,
        dateComponent: PropTypes.any,
        value: PropTypes.string.isRequired,
        providers: PropTypes.arrayOf(PropTypes.object).isRequired,
        containerClass: PropTypes.string,
        renderNoResults: PropTypes.bool,
        shouldSearchCompleteText: PropTypes.bool,
        completeOnTab: PropTypes.bool,
        onFocus: PropTypes.func,
        onBlur: PropTypes.func,
        onChange: PropTypes.func,
        onKeyDown: PropTypes.func,
        onKeyPress: PropTypes.func,
        onComposition: PropTypes.func,
        onSearchTypeSelected: PropTypes.func,
        onItemSelected: PropTypes.func,
        requiredCharacters: PropTypes.number,
        openOnFocus: PropTypes.bool,
        disabled: PropTypes.bool,
        openWhenEmpty: PropTypes.bool,
        replaceAllInputOnSelect: PropTypes.bool,
        contextId: PropTypes.string,
        onSuggestionsReceived: PropTypes.func,
        forceSuggestionsWhenBlur: PropTypes.bool,
        alignWithTextbox: PropTypes.bool,
        actions: PropTypes.shape({
            addMessageIntoHistory: PropTypes.func.isRequired,
        }).isRequired,
        id: PropTypes.string,
        className: PropTypes.string,
        placeholder: PropTypes.string,
        maxLength: PropTypes.string,
        delayInputUpdate: PropTypes.bool,
        spellCheck: PropTypes.string,
        onMouseUp: PropTypes.func,
        onKeyUp: PropTypes.func,
        onHeightChange: PropTypes.func,
        onWidthChange: PropTypes.func,
        onPaste: PropTypes.func,
        style: PropTypes.object,
        tabIndex: PropTypes.string,
        type: PropTypes.string,
        clearable: PropTypes.bool,
        onClear: PropTypes.func,
    };
    static defaultProps = {
        listPosition: 'top',
        containerClass: '',
        renderNoResults: false,
        shouldSearchCompleteText: false,
        completeOnTab: true,
        requiredCharacters: 1,
        openOnFocus: false,
        openWhenEmpty: false,
        replaceAllInputOnSelect: false,
        forceSuggestionsWhenBlur: false,
        alignWithTextbox: false,
    };
    constructor(props) {
        super(props);
        this.composing = false;
        this.pretext = '';
        this.timeoutId = '';
        this.preventSuggestionListCloseFlag = false;
        this.state = {
            focused: false,
            cleared: true,
            results: emptyResults(),
            selection: '',
            selectionIndex: 0,
            allowDividers: true,
            presentationType: 'text',
            suggestionBoxAlgn: undefined,
        };
        this.inputRef = React.createRef();
    }
    componentDidMount() {
        this.handlePretextChanged(this.pretext);
    }
    componentDidUpdate(prevProps) {
        const {value} = this.props;
        if (value === '' && this.pretext !== value) {
            this.handlePretextChanged(value);
            return;
        }
        if (prevProps.contextId !== this.props.contextId) {
            const textbox = this.getTextbox();
            const pretext = textbox.value.substring(0, textbox.selectionEnd);
            this.handlePretextChanged(pretext);
        }
    }
    componentWillUnmount() {
        clearTimeout(this.timeoutId);
    }
    getTextbox = () => {
        if (!this.inputRef.current) {
            return null;
        }
        return this.inputRef.current;
    };
    handleEmitClearSuggestions = (delay = 0) => {
        setTimeout(() => {
            this.clear();
            this.handlePretextChanged('');
        }, delay);
    };
    preventSuggestionListClose = () => {
        this.preventSuggestionListCloseFlag = true;
    };
    handleFocusOut = (e) => {
        if (this.preventSuggestionListCloseFlag) {
            this.preventSuggestionListCloseFlag = false;
            return;
        }
        if (this.container.contains(e.relatedTarget)) {
            return;
        }
        if (UserAgent.isIos() && !e.relatedTarget) {
            return;
        }
        if (!this.props.forceSuggestionsWhenBlur) {
            this.handleEmitClearSuggestions();
        }
        this.setState({focused: false});
        if (this.props.onBlur) {
            this.props.onBlur(e);
        }
    };
    handleFocusIn = (e) => {
        if (this.container.contains(e.relatedTarget) || this.preventSuggestionListCloseFlag) {
            return;
        }
        this.setState({focused: true});
        if (this.props.openOnFocus || this.props.openWhenEmpty) {
            setTimeout(() => {
                const textbox = this.getTextbox();
                if (textbox) {
                    const pretext = textbox.value.substring(0, textbox.selectionEnd);
                    if (this.props.openWhenEmpty || pretext.length >= this.props.requiredCharacters) {
                        if (this.pretext !== pretext) {
                            this.handlePretextChanged(pretext);
                        }
                    }
                }
            });
        }
        if (this.props.onFocus) {
            this.props.onFocus();
        }
    };
    handleChange = (e) => {
        const textbox = this.getTextbox();
        const pretext = this.props.shouldSearchCompleteText ? textbox.value.trim() : textbox.value.substring(0, textbox.selectionEnd);
        if (!this.composing && this.pretext !== pretext) {
            this.handlePretextChanged(pretext);
        }
        if (this.props.onChange) {
            this.props.onChange(e);
        }
    };
    handleCompositionStart = () => {
        this.composing = true;
        if (this.props.onComposition) {
            this.props.onComposition();
        }
    };
    handleCompositionUpdate = (e) => {
        if (!e.data) {
            return;
        }
        const textbox = this.getTextbox();
        const pretext = textbox.value.substring(0, textbox.selectionStart) + e.data;
        this.handlePretextChanged(pretext);
        if (this.props.onComposition) {
            this.props.onComposition();
        }
    };
    handleCompositionEnd = () => {
        this.composing = false;
        if (this.props.onComposition) {
            this.props.onComposition();
        }
    };
    addTextAtCaret = (term, matchedPretext) => {
        const textbox = this.getTextbox();
        const caret = textbox.selectionEnd;
        const text = this.props.value;
        const pretext = textbox.value.substring(0, textbox.selectionEnd);
        let prefix;
        let keepPretext = false;
        if (pretext.toLowerCase().endsWith(matchedPretext.toLowerCase())) {
            prefix = pretext.substring(0, pretext.length - matchedPretext.length);
        } else {
            const termWithoutMatched = term.substring(matchedPretext.length);
            const overlap = SuggestionBox.findOverlap(pretext, termWithoutMatched);
            keepPretext = overlap.length === 0;
            prefix = pretext.substring(0, pretext.length - overlap.length - matchedPretext.length);
        }
        if (keepPretext) {
            return;
        }
        const suffix = text.substring(caret);
        const newValue = prefix + term + ' ' + suffix;
        textbox.value = newValue;
        if (this.props.onChange) {
            const e = {
                target: textbox,
            };
            this.props.onChange(e);
        }
        window.requestAnimationFrame(() => {
            if (textbox.value === newValue) {
                Utils.setCaretPosition(textbox, prefix.length + term.length + 1);
            }
        });
    };
    replaceText = (term) => {
        const textbox = this.getTextbox();
        textbox.value = term;
        if (this.props.onChange) {
            const e = {
                target: textbox,
            };
            this.props.onChange(e);
        }
    };
    handleCompleteWord = (term, matchedPretext, e) => {
        let fixedTerm = term;
        let finish = false;
        let openCommandInModal = false;
        if (term.endsWith(EXECUTE_CURRENT_COMMAND_ITEM_ID)) {
            fixedTerm = term.substring(0, term.length - EXECUTE_CURRENT_COMMAND_ITEM_ID.length);
            finish = true;
        }
        if (term.endsWith(OPEN_COMMAND_IN_MODAL_ITEM_ID)) {
            fixedTerm = term.substring(0, term.length - OPEN_COMMAND_IN_MODAL_ITEM_ID.length);
            finish = true;
            openCommandInModal = true;
        }
        if (!finish) {
            if (this.props.replaceAllInputOnSelect) {
                this.replaceText(fixedTerm);
            } else {
                this.addTextAtCaret(fixedTerm, matchedPretext);
            }
        }
        if (this.props.onItemSelected) {
            const item = getItemForTerm(this.state.results, fixedTerm);
            if (item) {
                this.props.onItemSelected(item);
            }
        }
        this.clear();
        this.handlePretextChanged('');
        if (openCommandInModal) {
            const appProvider = this.props.providers.find((p) => p.openAppsModalFromCommand);
            if (!appProvider) {
                return false;
            }
            appProvider.openAppsModalFromCommand(fixedTerm);
            this.props.actions.addMessageIntoHistory(fixedTerm);
            this.inputRef.current.value = '';
            this.handleChange({target: this.inputRef.current});
            return false;
        }
        this.inputRef.current.focus();
        if (finish && this.props.onKeyPress) {
            let ke = e;
            if (!e || Keyboard.isKeyPressed(e, Constants.KeyCodes.TAB)) {
                ke = new KeyboardEvent('keydown', {
                    bubbles: true, cancelable: true, keyCode: 13,
                });
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
            this.props.onKeyPress(ke);
            return true;
        }
        if (!finish) {
            for (const provider of this.props.providers) {
                if (provider.handleCompleteWord) {
                    provider.handleCompleteWord(fixedTerm, matchedPretext, this.handlePretextChanged);
                }
            }
        }
        if (e) {
            e.stopPropagation();
        }
        return false;
    };
    selectNext = () => {
        this.setSelectionByDelta(1);
    };
    selectPrevious = () => {
        this.setSelectionByDelta(-1);
    };
    setSelectionByDelta = (delta) => {
        const terms = flattenTerms(this.state.results);
        let selectionIndex = terms.indexOf(this.state.selection);
        if (selectionIndex === -1) {
            this.setState({
                selection: '',
            });
            return;
        }
        selectionIndex += delta;
        if (selectionIndex < 0) {
            selectionIndex = 0;
        } else if (selectionIndex > terms.length - 1) {
            selectionIndex = terms.length - 1;
        }
        this.setState({
            selection: terms[selectionIndex],
            selectionIndex,
        });
    };
    setSelection = (term) => {
        const terms = flattenTerms(this.state.results);
        const selectionIndex = terms.indexOf(this.state.selection);
        this.setState({
            selection: term,
            selectionIndex,
        });
    };
    clear = () => {
        if (!this.state.cleared) {
            this.setState({
                cleared: true,
                results: emptyResults(),
                selection: '',
                suggestionBoxAlgn: undefined,
            });
        }
    };
    hasSuggestions = () => {
        return hasLoadedResults(this.state.results);
    };
    handleKeyDown = (e) => {
        if ((this.props.openWhenEmpty || this.props.value) && this.hasSuggestions()) {
            const ctrlOrMetaKeyPressed = e.ctrlKey || e.metaKey;
            if (Keyboard.isKeyPressed(e, KeyCodes.UP)) {
                this.selectPrevious();
                e.preventDefault();
            } else if (Keyboard.isKeyPressed(e, KeyCodes.DOWN)) {
                this.selectNext();
                e.preventDefault();
            } else if ((Keyboard.isKeyPressed(e, KeyCodes.ENTER) && !ctrlOrMetaKeyPressed) || (this.props.completeOnTab && Keyboard.isKeyPressed(e, KeyCodes.TAB))) {
                e.stopPropagation();
                const matchedPretext = this.state.results.matchedPretext;
                if (this.pretext.toLowerCase().endsWith(matchedPretext.toLowerCase())) {
                    if (this.handleCompleteWord(this.state.selection, matchedPretext, e)) {
                        return;
                    }
                } else {
                    clearTimeout(this.timeoutId);
                    this.nonDebouncedPretextChanged(this.pretext, true);
                }
                if (this.props.onKeyDown) {
                    this.props.onKeyDown(e);
                }
                e.preventDefault();
            } else if (Keyboard.isKeyPressed(e, KeyCodes.ESCAPE)) {
                this.clear();
                this.setState({presentationType: 'text'});
                e.preventDefault();
            } else if (this.props.onKeyDown) {
                this.props.onKeyDown(e);
            }
        } else if (this.props.onKeyDown) {
            this.props.onKeyDown(e);
        }
    };
    focusInputOnEscape = () => {
        if (this.inputRef.current) {
            document.dispatchEvent(new CustomEvent(
                A11yCustomEventTypes.FOCUS, {
                    detail: {
                        target: this.inputRef.current,
                        keyboardOnly: true,
                    },
                },
            ));
        }
    };
    handleReceivedSuggestions = (suggestions) => {
        const results = normalizeResultsFromProvider(suggestions);
        if (this.props.onSuggestionsReceived) {
            this.props.onSuggestionsReceived(results);
        }
        const terms = flattenTerms(results);
        let selection = this.state.selection;
        const selectionIndex = terms.indexOf(selection);
        if (selectionIndex !== this.state.selectionIndex) {
            if (terms.length > 0) {
                selection = terms[0];
            } else if (this.state.selection) {
                selection = '';
            }
        }
        this.setState({
            cleared: false,
            selection,
            results,
        });
        return {selection, matchedPretext: suggestions.matchedPretext};
    };
    makeHandleReceivedSuggestionsAndComplete = () => {
        let firstComplete = true;
        return (suggestions) => {
            const {selection, matchedPretext} = this.handleReceivedSuggestions(suggestions);
            if (selection && firstComplete) {
                this.handleCompleteWord(selection, matchedPretext);
                firstComplete = false;
            }
        };
    };
    nonDebouncedPretextChanged = (pretext, complete = false) => {
        const {alignWithTextbox} = this.props;
        this.pretext = pretext;
        let handled = false;
        let callback = this.handleReceivedSuggestions;
        if (complete) {
            callback = this.makeHandleReceivedSuggestionsAndComplete();
        }
        for (const provider of this.props.providers) {
            handled = provider.handlePretextChanged(pretext, callback) || handled;
            if (handled) {
                if (!this.state.suggestionBoxAlgn && ['@', ':', '~', '/'].includes(provider.triggerCharacter)) {
                    const char = provider.triggerCharacter;
                    const pxToSubstract = Utils.getPxToSubstract(char);
                    const suggestionBoxAlgn = Utils.getSuggestionBoxAlgn(this.getTextbox(), pxToSubstract, alignWithTextbox);
                    this.setState({
                        suggestionBoxAlgn,
                    });
                }
                this.setState({
                    presentationType: provider.presentationType(),
                    allowDividers: provider.allowDividers(),
                });
                break;
            }
        }
        if (!handled) {
            this.clear();
        }
    };
    debouncedPretextChanged = (pretext) => {
        clearTimeout(this.timeoutId);
        this.timeoutId = setTimeout(() => this.nonDebouncedPretextChanged(pretext), Constants.SEARCH_TIMEOUT_MILLISECONDS);
    };
    handlePretextChanged = (pretext) => {
        this.pretext = pretext;
        this.debouncedPretextChanged(pretext);
    };
    blur = () => {
        this.inputRef.current.blur();
    };
    focus = () => {
        const input = this.inputRef.current;
        if (input.value === '""' || input.value.endsWith('""')) {
            input.selectionStart = input.value.length - 1;
            input.selectionEnd = input.value.length - 1;
        } else {
            input.selectionStart = input.value.length;
        }
        input.focus();
        this.handleChange({target: this.inputRef.current});
    };
    setContainerRef = (container) => {
        if (this.container) {
            this.container.removeEventListener('focusin', this.handleFocusIn);
            this.container.removeEventListener('focusout', this.handleFocusOut);
        }
        if (container) {
            container.addEventListener('focusin', this.handleFocusIn);
            container.addEventListener('focusout', this.handleFocusOut);
        }
        this.container = container;
    };
    getListPosition = (listPosition) => {
        if (!this.state.suggestionBoxAlgn) {
            return listPosition;
        }
        return listPosition === 'bottom' && this.state.suggestionBoxAlgn.placementShift ? 'top' : listPosition;
    };
    render() {
        const {
            dateComponent,
            listComponent,
            listPosition,
            renderNoResults,
            ...props
        } = this.props;
        Reflect.deleteProperty(props, 'providers');
        Reflect.deleteProperty(props, 'onChange');
        Reflect.deleteProperty(props, 'onComposition');
        Reflect.deleteProperty(props, 'onItemSelected');
        Reflect.deleteProperty(props, 'completeOnTab');
        Reflect.deleteProperty(props, 'requiredCharacters');
        Reflect.deleteProperty(props, 'openOnFocus');
        Reflect.deleteProperty(props, 'openWhenEmpty');
        Reflect.deleteProperty(props, 'onFocus');
        Reflect.deleteProperty(props, 'onBlur');
        Reflect.deleteProperty(props, 'containerClass');
        Reflect.deleteProperty(props, 'replaceAllInputOnSelect');
        Reflect.deleteProperty(props, 'contextId');
        Reflect.deleteProperty(props, 'forceSuggestionsWhenBlur');
        Reflect.deleteProperty(props, 'onSuggestionsReceived');
        Reflect.deleteProperty(props, 'actions');
        Reflect.deleteProperty(props, 'shouldSearchCompleteText');
        Reflect.deleteProperty(props, 'alignWithTextbox');
        const SuggestionListComponent = listComponent;
        const SuggestionDateComponent = dateComponent;
        return (
            <div
                ref={this.setContainerRef}
                className={this.props.containerClass}
            >
                <QuickInput
                    ref={this.inputRef}
                    autoComplete='off'
                    {...props}
                    aria-controls='suggestionList'
                    role='combobox'
                    aria-activedescendant={this.state.selection ? `suggestionList_item_${this.state.selection}` : undefined}
                    aria-autocomplete='list'
                    aria-expanded={(this.state.focused || this.props.forceSuggestionsWhenBlur) && hasResults(this.state.results)}
                    onInput={this.handleChange}
                    onCompositionStart={this.handleCompositionStart}
                    onCompositionUpdate={this.handleCompositionUpdate}
                    onCompositionEnd={this.handleCompositionEnd}
                    onKeyDown={this.handleKeyDown}
                />
                {(this.props.openWhenEmpty || this.props.value.length >= this.props.requiredCharacters) && this.state.presentationType === 'text' && (
                    <SuggestionListComponent
                        open={this.state.focused || this.props.forceSuggestionsWhenBlur}
                        pretext={this.pretext}
                        position={this.getListPosition(listPosition)}
                        renderNoResults={renderNoResults}
                        onCompleteWord={this.handleCompleteWord}
                        preventClose={this.preventSuggestionListClose}
                        onItemHover={this.setSelection}
                        cleared={this.state.cleared}
                        results={this.state.results}
                        suggestionBoxAlgn={this.state.suggestionBoxAlgn}
                        selection={this.state.selection}
                        inputRef={this.inputRef}
                        onLoseVisibility={this.blur}
                    />
                )}
                {(this.props.openWhenEmpty || this.props.value.length >= this.props.requiredCharacters) && this.state.presentationType === 'date' &&
                    <SuggestionDateComponent
                        results={this.state.results}
                        onCompleteWord={this.handleCompleteWord}
                        preventClose={this.preventSuggestionListClose}
                        handleEscape={this.focusInputOnEscape}
                    />
                }
            </div>
        );
    }
    static findOverlap(a, b) {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        for (let i = bLower.length; i > 0; i--) {
            const substring = bLower.substring(0, i);
            if (aLower.endsWith(substring)) {
                return substring;
            }
        }
        return '';
    }
}