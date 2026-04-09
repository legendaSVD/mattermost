import PropTypes from 'prop-types';
export const intlConfigPropTypes = {
    locale: PropTypes.string,
    timeZone: PropTypes.string,
    formats: PropTypes.object,
    messages: PropTypes.object,
    textComponent: PropTypes.any,
    defaultLocale: PropTypes.string,
    defaultFormats: PropTypes.object,
    wrapRichTextChunksInFragment: PropTypes.bool,
    onError: PropTypes.func,
};
export const intlFormatPropTypes = {
    formatDate: PropTypes.func.isRequired,
    formatTime: PropTypes.func.isRequired,
    formatRelativeTime: PropTypes.func.isRequired,
    formatNumber: PropTypes.func.isRequired,
    formatPlural: PropTypes.func.isRequired,
    formatMessage: PropTypes.func.isRequired,
};
export const intlShape = PropTypes.shape({
    ...intlConfigPropTypes,
    ...intlFormatPropTypes,
    formatters: PropTypes.object,
});