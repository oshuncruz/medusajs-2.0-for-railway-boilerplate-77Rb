// product-preview/index.tsx

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Text, Button } from '@medusajs/ui';
import { HttpTypes } from '@medusajs/types';
import { isEqual } from 'lodash';
import { useParams } from 'next/navigation';
import { addToCart } from '@lib/data/cart';
import Thumbnail from '../thumbnail';
import ProductPrice from '../product-price';
import OptionSelect from '@modules/products/components/product-actions/option-select';
import Divider from '@modules/common/components/divider';
import LocalizedClientLink from '@modules/common/components/localized-client-link';

type ProductPreviewProps = {
  productPreview: HttpTypes.StoreProduct;
  isFeatured?: boolean;
};

const optionsAsKeymap = (variantOptions: any) => {
  return variantOptions?.reduce((acc: Record<string, string | undefined>, varopt: any) => {
    if (varopt.option && varopt.value !== null && varopt.value !== undefined) {
      acc[varopt.option.title] = varopt.value;
    }
    return acc;
  }, {});
};

export default function ProductPreview({
  productPreview,
  isFeatured,
}: ProductPreviewProps) {
  const [options, setOptions] = useState<Record<string, string | undefined>>({});
  const [isAdding, setIsAdding] = useState(false);
  const countryCode = (useParams().countryCode as string) || 'us';

  // Initialize product state
  const [product, setProduct] = useState<HttpTypes.StoreProduct | null>(null);

  // Fetch the full product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/store/products/${productPreview.id}`);
        const data = await response.json();
        setProduct(data.product || data);
      } catch (error) {
        console.error('Failed to fetch product:', error);
      }
    };

    fetchProduct();
  }, [productPreview.id]);

  // If there is only 1 variant, preselect the options
  useEffect(() => {
    if (product?.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options);
      setOptions(variantOptions ?? {});
    }
  }, [product]);

  const selectedVariant = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) {
      return;
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options);
      return isEqual(variantOptions, options);
    });
  }, [product, options]);

  // Update the options when a variant is selected
  const setOptionValue = (title: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [title]: value,
    }));
  };

  // Check if the selected variant is in stock
  const inStock = useMemo(() => {
    // If we don't manage inventory, we can always add to cart
    if (selectedVariant && !selectedVariant.manage_inventory) {
      return true;
    }

    // If we allow back orders on the variant, we can add to cart
    if (selectedVariant?.allow_backorder) {
      return true;
    }

    // If there is inventory available, we can add to cart
    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    ) {
      return true;
    }

    // Otherwise, we can't add to cart
    return false;
  }, [selectedVariant]);

  // Add the selected variant to the cart
  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return;

    setIsAdding(true);

    try {
      await addToCart({
        variantId: selectedVariant.id,
        quantity: 1,
        countryCode,
      });
    } catch (error) {
      console.error('Failed to add item to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  if (!product) {
    return null;
  }

  return (
    <div className="group">
      {/* Product Thumbnail and Basic Info */}
      <LocalizedClientLink href={`/products/${productPreview.handle}`}>
        <div>
          <Thumbnail
            thumbnail={productPreview.thumbnail}
            size="full"
            isFeatured={isFeatured}
          />
          <div className="flex txt-compact-medium mt-4 justify-between">
            <Text className="text-ui-fg-subtle">{productPreview.title}</Text>
          </div>
        </div>
      </LocalizedClientLink>

      {/* Display the product price */}
      <ProductPrice product={product} variant={selectedVariant} />

      {/* Option Selection */}
      {(product.variants?.length ?? 0) > 1 && (
        <div className="flex flex-col gap-y-4 mt-4">
          {(product.options || []).map((option) => (
            <div key={option.id}>
              <OptionSelect
                option={option}
                current={options[option.title ?? '']}
                updateOption={setOptionValue}
                title={option.title ?? ''}
                data-testid="product-options"
                disabled={isAdding}
              />
            </div>
          ))}
          <Divider />
        </div>
      )}

      {/* Add to Cart Button */}
      <Button
        onClick={handleAddToCart}
        disabled={!inStock || !selectedVariant || isAdding}
        variant="primary"
        className="mt-2 w-full"
        isLoading={isAdding}
      >
        {!selectedVariant
          ? 'Select variant'
          : !inStock
          ? 'Out of stock'
          : 'Add to cart'}
      </Button>
    </div>
  );
}
