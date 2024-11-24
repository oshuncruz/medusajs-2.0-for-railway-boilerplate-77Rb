// product-preview/index.tsx


'use client';

import { useState, useEffect, useMemo } from "react";
import { Text, Button } from "@medusajs/ui";
import { HttpTypes } from "@medusajs/types";
import { isEqual } from "lodash";
import { useParams } from "next/navigation";
import { addToCart } from "@lib/data/cart";
import Thumbnail from "../thumbnail";
import ProductPrice from "../product-price";
import OptionSelect from "@modules/products/components/product-actions/option-select";
import Divider from "@modules/common/components/divider";
import LocalizedClientLink from "@modules/common/components/localized-client-link";

type ProductPreviewProps = {
  productPreview: HttpTypes.StoreProduct;
  isFeatured?: boolean;
};

export default function ProductPreview({
  productPreview,
  isFeatured,
}: ProductPreviewProps) {
  const [options, setOptions] = useState<Record<string, string | undefined>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [product, setProduct] = useState<HttpTypes.StoreProduct | null>(null);

  const params = useParams();
  const countryCode = (params.countryCode as string) || "us";

  // Fetch the full product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/store/products/${productPreview.id}`);
        const data = await response.json();
        setProduct(data.product || data);
      } catch (error) {
        console.error("Failed to fetch product:", error);
      }
    };

    fetchProduct();
  }, [productPreview.id]);

  // Initialize options
  useEffect(() => {
    if (!product) return;

    const initialOptions: Record<string, string | undefined> = {};

    for (const option of product.options || []) {
      initialOptions[option.id] = undefined;
    }

    setOptions(initialOptions);
  }, [product]);

  const variants = useMemo(() => product?.variants || [], [product]);

  const variantRecord = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};

    for (const variant of variants) {
      if (!variant.options || !variant.id) continue;

      const temp: Record<string, string> = {};

      for (const option of variant.options) {
        temp[option.option_id || option.id] = option.value;
      }

      map[variant.id] = temp;
    }

    return map;
  }, [variants]);

  const selectedVariant = useMemo(() => {
    let variantId: string | undefined = undefined;

    for (const key of Object.keys(variantRecord)) {
      if (isEqual(variantRecord[key], options)) {
        variantId = key;
        break;
      }
    }

    return variants.find((v) => v.id === variantId);
  }, [options, variantRecord, variants]);

  // Auto-select variant if only one exists
  useEffect(() => {
    if (variants.length === 1 && variants[0].id) {
      setOptions(variantRecord[variants[0].id]);
    }
  }, [variants, variantRecord]);

  const inStock = useMemo(() => {
    if (!selectedVariant) return false;

    if (!selectedVariant.manage_inventory) {
      return true;
    }

    if ((selectedVariant.inventory_quantity ?? 0) > 0) {
      return true;
    }

    if (selectedVariant.allow_backorder) {
      return true;
    }

    return false;
  }, [selectedVariant]);

  const handleAddToCart = async () => {
    if (!selectedVariant?.id) {
      console.error("No variant selected");
      return;
    }

    setIsAdding(true);

    try {
      await addToCart({
        variantId: selectedVariant.id,
        quantity: 1,
        countryCode,
      });
    } catch (error) {
      console.error("Failed to add item to cart:", error);
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
      {product.variants.length > 1 && (
        <div className="flex flex-col gap-y-4 mt-4">
          {(product.options || []).map((option) => (
            <div key={option.id}>
              <OptionSelect
                option={option}
                current={options[option.id]}
                updateOption={(value) =>
                  setOptions((prev) => ({ ...prev, [option.id]: value }))
                }
                title={option.title}
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
          ? "Select variant"
          : !inStock
          ? "Out of stock"
          : "Add to cart"}
      </Button>
    </div>
  );
}
