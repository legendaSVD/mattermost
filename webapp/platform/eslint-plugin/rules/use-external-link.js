const astUtils = require('jsx-ast-utils')
const getElementType = require('eslint-plugin-jsx-a11y/lib/util/getElementType')
module.exports =  {
    meta: {
        docs: {
            description: 'Enforce all anchors with target="_blank" to use ExternalLink component',
        },
    },
    create: (context) => {
        const elementType = getElementType(context);
        return {
            JSXOpeningElement: (node) => {
                const { attributes } = node;
                const typeCheck = 'a';
                const nodeType = elementType(node);
                if (!nodeType || typeCheck !== nodeType) {
                    return;
                }
                const propsToValidate = ['target'];
                const values = propsToValidate.map((prop) => astUtils.getPropValue(astUtils.getProp(node.attributes, prop)));
                const hasBlankTarget = values.some((value) => value != null && value === '_blank');
                if (!hasBlankTarget) {
                    return;
                }
                context.report({
                    node,
                    message: 'Use ExternalLink component (components/external_link) for _blank target link-outs',
                });
                return
            },
        };
    },
};