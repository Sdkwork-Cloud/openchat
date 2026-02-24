
// This file is kept for backward compatibility if any other component imports ProductBubble directly.
// The new implementation logic resides in ProductSwiper.tsx and ProductItemCard.tsx

import React from 'react';
import { ProductSwiper } from './ProductSwiper';
import { ProductData } from './ProductItemCard';

interface ProductBubbleProps {
    data: ProductData | ProductData[]; 
    onInteract?: (action: string, payload: any) => void;
}

export const ProductBubble: React.FC<ProductBubbleProps> = ({ data, onInteract }) => {
    const products = Array.isArray(data) ? data : [data];
    if (products.length === 0) return null;

    return <ProductSwiper items={products} onInteract={onInteract} />;
};
