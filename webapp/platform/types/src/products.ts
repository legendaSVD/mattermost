import {isArrayOf} from './utilities';
export type ProductIdentifier = null | string;
export type ProductScope = ProductIdentifier | ProductIdentifier[];
export function isProductScope(v: unknown): v is ProductScope {
    if (v === null || typeof v === 'string') {
        return true;
    }
    return isArrayOf(v, (e) => e === null || typeof v === 'string');
}