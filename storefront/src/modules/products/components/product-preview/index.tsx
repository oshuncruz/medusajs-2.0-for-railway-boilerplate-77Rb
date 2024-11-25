'use client';

import { useState, useEffect, useMemo } from 'react';
import { Text, Button } from '@medusajs/ui';
import { HttpTypes } from '@medusajs/types';
import { isEqual } from 'lodash';
import { useParams } from 'next/navigation';
import Thumbnail from '../thumbnail';
import ProductPrice from '../product-price';
import OptionSelect from '../product-actions/option-select';
import Divider from "@modules/common/components/divider";
import LocalizedClientLink from "@modules/common/components/localized-client-link";
import { addToCart } from '@lib/data/cart';

type ProductPreviewProps = {
  product: HttpTypes.StoreProduct;
  region: HttpTypes.StoreRegion;
  isFeatured?: boolean;
};

const optionsAsKeymap = (variantOptions: any) => {
  return variantOptions?.reduce(
    (acc: Record<string, string | undefined>, varopt: any) => {
      if (varopt.option && varopt.value !== null && varopt.value !== undefined) {
        acc[varopt.option.title] = varopt.value;
      }
      return acc;
    },
    {}
  );
};

export default function ProductPreview({
  product,
  region,
  isFeatured,
}: ProductPreviewProps) {
  const [options, setOptions] = useState<Record<string, string | undefined>>({});
  const [isAdding, setIsAdding] = useState(false);
  const countryCode = (useParams().countryCode as string) || 'us';

  // Preselect options if there's only one variant
  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options);
      setOptions(variantOptions ?? {});
    }
  }, [product.variants]);

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return undefined;
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options);
      return isEqual(variantOptions, options);
    });
  }, [product.variants, options]);

  // Update options when a variant is selected
  const setOptionValue = (title: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [title]: value,
    }));
  };

  // Check if the selected variant is in stock
  const inStock = useMemo(() => {
    if (!selectedVariant) {
      return false;
    }

    // If inventory management is disabled, it's always in stock
    if (!selectedVariant.manage_inventory) {
      return true;
    }

    // Allow backorders
    if (selectedVariant.allow_backorder) {
      return true;
    }

    // Check inventory quantity
    if ((selectedVariant.inventory_quantity || 0) > 0) {
      return true;
    }

    // Out of stock otherwise
    return false;
  }, [selectedVariant]);

  // Handle adding to cart
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

  return (
    <div className="group">
      {/* Product Thumbnail and Basic Info */}
      <LocalizedClientLink href={`/products/${product.handle}`}>
        <div>
          <Thumbnail
            thumbnail={product.thumbnail}
            size="full"
            isFeatured={isFeatured}
          />
          <div className="flex txt-compact-medium mt-4 justify-between">
            <Text className="text-ui-fg-subtle">{product.title}</Text>
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
