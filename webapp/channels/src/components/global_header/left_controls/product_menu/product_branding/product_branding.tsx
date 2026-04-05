import React from 'react';
import styled from 'styled-components';
import glyphMap, {ProductChannelsIcon} from '@mattermost/compass-icons/components';
import type {IconGlyphTypes} from '@mattermost/compass-icons/IconGlyphs';
import {useCurrentProduct} from 'utils/products';
const ProductBrandingContainer = styled.span`
    display: flex;
    align-items: center;
`;
const ProductBrandingHeading = styled.span`
    font-family: 'Metropolis';
    font-size: 16px;
    line-height: 24px;
    font-weight: bold;
    margin: 0;
    color: inherit;
    margin-left: 8px;
`;
const ProductBranding = (): JSX.Element => {
    const currentProduct = useCurrentProduct();
    const renderIcon = () => {
        if (!currentProduct?.switcherIcon) {
            return <ProductChannelsIcon size={24}/>;
        }
        if (typeof currentProduct.switcherIcon === 'string') {
            const Icon = glyphMap[currentProduct.switcherIcon as IconGlyphTypes];
            if (Icon) {
                return <Icon size={24}/>;
            }
            return <ProductChannelsIcon size={24}/>;
        }
        return <>{currentProduct.switcherIcon}</>;
    };
    return (
        <ProductBrandingContainer tabIndex={-1}>
            {renderIcon()}
            <h1 className='sr-only'>
                {currentProduct ? currentProduct.switcherText : 'Channels'}
            </h1>
            <ProductBrandingHeading>
                {currentProduct ? currentProduct.switcherText : 'Channels'}
            </ProductBrandingHeading>
        </ProductBrandingContainer>
    );
};
export default ProductBranding;