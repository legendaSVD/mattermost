import React from 'react';
import {injectIntl} from 'react-intl';
import type {WrappedComponentProps} from 'react-intl';
import type {AppForm, AppCallRequest} from '@mattermost/types/apps';
import type {DialogElement, DialogSubmission, SubmitDialogResponse} from '@mattermost/types/integrations';
import type {ActionResult} from 'mattermost-redux/types/actions';
import {makeAsyncComponent} from 'components/async_load';
import {createCallContext} from 'utils/apps';
import {
    convertAppFormValuesToDialogSubmission,
    convertDialogToAppForm,
    convertServerDialogResponseToAppForm,
    extractPrimitiveValues,
    type ConversionOptions,
    type ValidationError,
} from 'utils/dialog_conversion';
import type {DoAppCallResult} from 'types/apps';
const AppsFormContainer = makeAsyncComponent('AppsFormContainer', React.lazy(() => import('components/apps_form/apps_form_container')));
interface Props extends WrappedComponentProps {
    elements?: DialogElement[];
    title?: string;
    introductionText?: string;
    iconUrl?: string;
    submitLabel?: string;
    url?: string;
    callbackId?: string;
    state?: string;
    notifyOnCancel?: boolean;
    onExited?: () => void;
    sourceUrl?: string;
    conversionOptions?: Partial<ConversionOptions>;
    actions: {
        submitInteractiveDialog: (submission: DialogSubmission) => Promise<ActionResult<SubmitDialogResponse>>;
        lookupInteractiveDialog: (submission: DialogSubmission) => Promise<ActionResult<{items: Array<{text: string; value: string}>}>>;
    };
}
class InteractiveDialogAdapter extends React.PureComponent<Props> {
    private readonly conversionContext: ConversionOptions = {
        enhanced: false,
        ...this.props.conversionOptions,
    };
    private currentDialogElements: DialogElement[] | undefined;
    private accumulatedValues: Record<string, any> = {};
    private logWarn = (message: string, data?: unknown): void => {
        console.warn('[InteractiveDialogAdapter]', message, data || '');
    };
    private logError = (message: string, error?: unknown): void => {
        console.error('[InteractiveDialogAdapter]', message, error || '');
    };
    private handleValidationErrors = (errors: ValidationError[]): {error?: string} => {
        if (errors.length === 0) {
            return {};
        }
        if (this.conversionContext.enhanced) {
            const formattedErrors = errors.map((e) => e.message);
            const errorMessage = this.props.intl.formatMessage({
                id: 'interactive_dialog.validation_failed',
                defaultMessage: 'Dialog validation failed: {errors}',
            }, {
                errors: formattedErrors.join(', '),
            });
            return {error: errorMessage};
        }
        this.logWarn('Dialog validation errors detected (non-blocking)', {
            errorCount: errors.length,
            errors: errors.map((e) => ({
                field: e.field,
                message: e.message,
                code: e.code,
            })),
            note: 'These are warnings - processing will continue for backwards compatibility',
        });
        return {};
    };
    private convertToAppForm = (): {form?: AppForm; error?: string} => {
        const {elements, title, introductionText, iconUrl, submitLabel, sourceUrl, state} = this.props;
        this.currentDialogElements = elements;
        const {form, errors} = convertDialogToAppForm(
            elements,
            title,
            introductionText,
            iconUrl,
            submitLabel,
            sourceUrl || '',
            state || '',
            this.conversionContext,
        );
        const {error} = this.handleValidationErrors(errors);
        if (error) {
            return {error};
        }
        return {form};
    };
    private processFormValues = (currentValues: Record<string, any>): void => {
        const normalizedCurrentValues = extractPrimitiveValues(currentValues);
        this.accumulatedValues = {
            ...this.accumulatedValues,
            ...normalizedCurrentValues,
        };
    };
    private handleSubmissionError = (result: any, errorId: string, defaultMessage: string) => {
        if (result?.data?.error || result?.data?.errors) {
            return {
                error: {
                    type: 'error' as const,
                    text: result.data.error || this.props.intl.formatMessage({
                        id: `${errorId}_validation`,
                        defaultMessage: `${defaultMessage} with validation errors`,
                    }),
                    data: {
                        errors: result.data.errors || {},
                    },
                },
            };
        }
        if (result?.error) {
            return {
                error: {
                    type: 'error' as const,
                    text: this.props.intl.formatMessage({
                        id: errorId,
                        defaultMessage,
                    }),
                    data: {
                        errors: {},
                    },
                },
            };
        }
        return null;
    };
    private convertServerResponseToForm = (serverForm: any) => {
        const {form, errors} = convertServerDialogResponseToAppForm(serverForm, this.conversionContext);
        this.currentDialogElements = form.fields?.map((field) => ({
            name: field.name,
            type: field.type === 'static_select' ? 'select' : field.type,
            display_name: field.label,
        } as any)) || [];
        if (errors.length > 0) {
            this.logWarn('Form conversion validation errors', {
                errorCount: errors.length,
                errors,
            });
        }
        return form;
    };
    private submitAdapter = async (call: AppCallRequest): Promise<DoAppCallResult<unknown>> => {
        try {
            const currentValues = call.values || {};
            this.processFormValues(currentValues);
            const finalSubmission = this.accumulatedValues;
            const dialogState = call.state || this.props.state || '';
            if (this.currentDialogElements && this.conversionContext.enhanced) {
                const {errors} = convertAppFormValuesToDialogSubmission(
                    finalSubmission,
                    this.currentDialogElements,
                    this.conversionContext,
                );
                if (errors.length > 0) {
                    this.logWarn('Form submission validation errors', {
                        errorCount: errors.length,
                        errors,
                    });
                }
            }
            const legacySubmission: DialogSubmission = {
                url: this.props.url || '',
                callback_id: this.props.callbackId || '',
                state: dialogState,
                submission: finalSubmission as {[x: string]: string},
                user_id: '',
                channel_id: '',
                team_id: '',
                cancelled: false,
            };
            const result = await this.props.actions.submitInteractiveDialog(legacySubmission);
            const errorResult = this.handleSubmissionError(result, 'interactive_dialog.submission_failed', 'Submission failed');
            if (errorResult) {
                return errorResult;
            }
            if (result?.data?.type === 'form' && result?.data?.form) {
                const form = this.convertServerResponseToForm(result.data.form);
                return {
                    data: {
                        type: 'form' as const,
                        form,
                    },
                };
            }
            this.accumulatedValues = {};
            return {
                data: {
                    type: 'ok' as const,
                    text: '',
                },
            };
        } catch (error) {
            this.accumulatedValues = {};
            this.logError('Dialog submission failed', {
                error: error instanceof Error ? error.message : String(error),
                callbackId: this.props.callbackId,
                url: this.props.url,
            });
            return {
                error: {
                    type: 'error' as const,
                    text: error instanceof Error ? error.message : this.props.intl.formatMessage({
                        id: 'interactive_dialog.submission_failed',
                        defaultMessage: 'Submission failed',
                    }),
                    data: {
                        errors: {
                            form: String(error),
                        },
                    },
                },
            };
        }
    };
    private cancelAdapter = async (): Promise<void> => {
        this.accumulatedValues = {};
        if (!this.props.notifyOnCancel) {
            return;
        }
        const cancelSubmission: DialogSubmission = {
            url: this.props.url || '',
            callback_id: this.props.callbackId || '',
            state: this.props.state || '',
            cancelled: true,
            user_id: '',
            channel_id: '',
            team_id: '',
            submission: {},
        };
        try {
            const result = await this.props.actions.submitInteractiveDialog(cancelSubmission);
            if (result?.error) {
                this.logError('Failed to notify server of dialog cancellation', {
                    error: result.error,
                    callbackId: this.props.callbackId,
                    url: this.props.url,
                });
            }
        } catch (error) {
            this.logError('Failed to notify server of dialog cancellation', {
                error: error instanceof Error ? error.message : String(error),
                callbackId: this.props.callbackId,
                url: this.props.url,
            });
        }
    };
    private performLookupCall = async (call: AppCallRequest): Promise<DoAppCallResult<unknown>> => {
        const {url, callbackId, state} = this.props;
        let lookupPath = call.path;
        if (!lookupPath && call.selected_field) {
            const field = this.props.elements?.find((element) => element.name === call.selected_field);
            if (field?.data_source === 'dynamic' && field?.data_source_url) {
                lookupPath = field.data_source_url;
            }
        }
        if (!lookupPath) {
            lookupPath = url || '';
        }
        if (!lookupPath) {
            return {
                error: {
                    type: 'error' as const,
                    text: 'No lookup URL provided',
                },
            };
        }
        if (!lookupPath || !this.isValidLookupURL(lookupPath)) {
            return {
                error: {
                    type: 'error' as const,
                    text: 'Invalid lookup URL: must be HTTPS URL or /plugins/ path',
                },
            };
        }
        const values = call.values || {};
        const {submission: convertedValues, errors} = convertAppFormValuesToDialogSubmission(
            values,
            this.props.elements,
            this.conversionContext,
        );
        if (errors.length > 0) {
            this.logWarn('Form submission validation errors', {
                errorCount: errors.length,
                errors,
            });
        }
        const dialog: DialogSubmission = {
            url: lookupPath || '',
            callback_id: callbackId ?? '',
            state: state ?? '',
            submission: convertedValues as {[x: string]: string},
            user_id: '',
            channel_id: '',
            team_id: '',
            cancelled: false,
        };
        if (call.query) {
            dialog.submission.query = call.query;
        }
        if (call.selected_field) {
            dialog.submission.selected_field = call.selected_field;
        }
        try {
            const response = await this.props.actions.lookupInteractiveDialog(dialog);
            if (response?.data?.items) {
                return {
                    data: {
                        type: 'ok' as const,
                        data: {
                            items: response.data.items.map((item) => ({
                                label: item.text,
                                value: item.value,
                            })),
                        },
                    },
                };
            }
            if (response?.error) {
                return {
                    error: {
                        type: 'error' as const,
                        text: response.error.message || 'Lookup failed',
                    },
                };
            }
            return {
                data: {
                    type: 'ok' as const,
                    data: {
                        items: [],
                    },
                },
            };
        } catch (error) {
            this.logError('Lookup request failed', error);
            return {
                error: {
                    type: 'error' as const,
                    text: this.getSafeErrorMessage(error),
                },
            };
        }
    };
    private refreshOnSelect = async (call: AppCallRequest = {} as AppCallRequest): Promise<DoAppCallResult<unknown>> => {
        try {
            if (!this.props.sourceUrl) {
                this.logWarn('Field refresh requested but no sourceUrl provided', {
                    fieldName: call.selected_field,
                    suggestion: 'Add sourceUrl to dialog definition',
                });
                return {
                    data: {
                        type: 'ok' as const,
                    },
                };
            }
            const currentValues = call.values || {};
            this.processFormValues(currentValues);
            const refreshPayload = this.accumulatedValues;
            const refreshSubmission: DialogSubmission = {
                url: this.props.sourceUrl,
                callback_id: this.props.callbackId || '',
                state: call.state || this.props.state || '',
                submission: refreshPayload as {[x: string]: string},
                user_id: '',
                channel_id: '',
                team_id: '',
                cancelled: false,
                type: 'refresh',
            };
            const result = await this.props.actions.submitInteractiveDialog(refreshSubmission);
            const errorResult = this.handleSubmissionError(result, 'interactive_dialog.refresh_failed', 'Field refresh failed');
            if (errorResult) {
                return errorResult;
            }
            if (result?.data?.type === 'form' && result?.data?.form) {
                const form = this.convertServerResponseToForm(result.data.form);
                return {
                    data: {
                        type: 'form' as const,
                        form,
                    },
                };
            }
            return {
                data: {
                    type: 'ok' as const,
                },
            };
        } catch (error) {
            this.logError('Field refresh failed', {
                error: error instanceof Error ? error.message : String(error),
                fieldName: call?.selected_field || 'unknown',
                sourceUrl: this.props.sourceUrl,
            });
            return {
                error: {
                    type: 'error' as const,
                    text: error instanceof Error ? error.message : this.props.intl.formatMessage({
                        id: 'interactive_dialog.refresh_failed',
                        defaultMessage: 'Field refresh failed',
                    }),
                    data: {
                        errors: {
                            field_refresh: String(error),
                        },
                    },
                },
            };
        }
    };
    private postEphemeralCallResponseForContext = (): void => {
    };
    private isValidLookupURL = (url: string): boolean => {
        if (!url) {
            return false;
        }
        if (url.startsWith('https://')) {
            return true;
        }
        if (url.startsWith('http://')) {
            try {
                const parsedURL = new URL(url);
                const host = parsedURL.hostname;
                if (host === 'localhost' || host === '127.0.0.1') {
                    return true;
                }
            } catch {
                return false;
            }
        }
        if (url.startsWith('/plugins/')) {
            if (url.includes('..') || url.includes('//')) {
                return false;
            }
            return true;
        }
        return false;
    };
    private getSafeErrorMessage = (error: unknown): string => {
        if (error instanceof Error) {
            return error.message;
        }
        return this.props.intl.formatMessage({
            id: 'interactive_dialog.lookup_failed',
            defaultMessage: 'Lookup failed',
        });
    };
    render() {
        const {form, error} = this.convertToAppForm();
        if (error) {
            this.logError('Failed to convert dialog to app form', error);
            return null;
        }
        if (!form) {
            this.logError('No form generated from dialog conversion');
            return null;
        }
        const context = createCallContext(
            'legacy-interactive-dialog',
            'interactive_dialog',
        );
        return (
            <AppsFormContainer
                form={form}
                appContext={context}
                onExited={this.props.onExited || (() => {})}
                onHide={this.cancelAdapter}
                actions={{
                    doAppSubmit: this.submitAdapter,
                    doAppFetchForm: this.refreshOnSelect,
                    doAppLookup: this.performLookupCall,
                    postEphemeralCallResponseForContext: this.postEphemeralCallResponseForContext,
                }}
            />
        );
    }
}
export default injectIntl(InteractiveDialogAdapter);