import React from 'react';
import type {MessageDescriptor} from 'react-intl';
import {FormattedMessage, defineMessage} from 'react-intl';
import SuccessIcon from 'components/widgets/icons/fa_success_icon';
import WarningIcon from 'components/widgets/icons/fa_warning_icon';
import LoadingWrapper from 'components/widgets/loading/loading_wrapper';
type Props = {
    id?: string;
    requestAction: (
        success: () => void,
        error: (error: {message: string; detailed_error?: string}) => void
    ) => void;
    helpText?: React.ReactNode;
    loadingText?: React.ReactNode;
    buttonText: React.ReactNode;
    label?: React.ReactNode;
    disabled?: boolean;
    saveNeeded?: boolean;
    saveConfigAction?: (callback: () => void) => void;
    showSuccessMessage?: boolean;
    successMessage: string | MessageDescriptor;
    errorMessage: string | MessageDescriptor;
    includeDetailedError?: boolean;
    alternativeActionElement?: React.ReactNode;
    flushLeft?: boolean;
    buttonType?: 'primary' | 'secondary' | 'tertiary';
};
type State = {
    busy: boolean;
    fail: string;
    success: boolean;
}
export default class RequestButton extends React.PureComponent<Props, State> {
    static defaultProps: Partial<Props> = {
        disabled: false,
        saveNeeded: false,
        showSuccessMessage: true,
        includeDetailedError: false,
        successMessage: defineMessage({
            id: 'admin.requestButton.requestSuccess',
            defaultMessage: 'Test Successful',
        }),
        errorMessage: defineMessage({
            id: 'admin.requestButton.requestFailure',
            defaultMessage: 'Test Failure: {error}',
        }),
    };
    constructor(props: Props) {
        super(props);
        this.state = {
            busy: false,
            fail: '',
            success: false,
        };
    }
    handleRequest = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        this.setState({
            busy: true,
            fail: '',
            success: false,
        });
        const doRequest = () => this.props.requestAction(
            () => {
                this.setState({
                    busy: false,
                    success: true,
                });
            },
            (err) => {
                let errMsg = err.message;
                if (this.props.includeDetailedError && err.detailed_error) {
                    errMsg += ' - ' + err.detailed_error;
                }
                this.setState({
                    busy: false,
                    fail: errMsg,
                });
            },
        );
        if (this.props.saveNeeded && this.props.saveConfigAction) {
            this.props.saveConfigAction(doRequest);
        } else {
            doRequest();
        }
    };
    render() {
        let message = null;
        if (this.state.fail) {
            const text = typeof this.props.errorMessage === 'string' ?
                this.props.errorMessage :
                (
                    <FormattedMessage
                        {...this.props.errorMessage}
                        values={{
                            error: this.state.fail,
                        }}
                    />
                );
            message = (
                <div>
                    <div className='alert alert-warning'>
                        <WarningIcon/>
                        {text}
                    </div>
                </div>
            );
        } else if (this.state.success && this.props.showSuccessMessage) {
            const text = typeof this.props.successMessage === 'string' ?
                this.props.successMessage :
                (<FormattedMessage {...this.props.successMessage}/>);
            message = (
                <div>
                    <div className='alert alert-success'>
                        <SuccessIcon/>
                        {text}
                    </div>
                </div>
            );
        }
        let widgetClassNames = 'col-sm-8';
        let label = null;
        if (this.props.label) {
            label = (
                <label className='control-label col-sm-4'>
                    {this.props.label}
                </label>
            );
        } else if (this.props.flushLeft) {
            widgetClassNames = 'col-sm-12';
        } else {
            widgetClassNames = 'col-sm-offset-4 ' + widgetClassNames;
        }
        return (
            <div
                className='form-group'
                id={this.props.id}
            >
                {label}
                <div className={widgetClassNames}>
                    <div>
                        <button
                            type='button'
                            className={`btn btn-${this.props.buttonType || 'tertiary'}`}
                            onClick={this.handleRequest}
                            disabled={this.props.disabled}
                        >
                            <LoadingWrapper
                                loading={this.state.busy}
                                text={
                                    this.props.loadingText ||
                                    (
                                        <FormattedMessage
                                            id={'admin.requestButton.loading'}
                                            defaultMessage={'Loading...'}
                                        />
                                    )
                                }
                            >
                                {this.props.buttonText}
                            </LoadingWrapper>
                        </button>
                        {this.props.alternativeActionElement}
                        {message}
                    </div>
                    <div className='help-text'>{this.props.helpText}</div>
                </div>
            </div>
        );
    }
}