"use client";

import { useState, useEffect, useMemo } from "react";
import { Text, Button } from "@medusajs/ui";
import { HttpTypes } from "@medusajs/types";
import { isEqual } from "lodash";
import { useParams } from "next/navigation";
import { addToCart } from "@lib/data/cart";
import { getProductPrice } from "@lib/util/get-product-price";
import LocalizedClientLink from "@modules/common/components/localized-client-link";
import Thumbnail from "../thumbnail";
import PreviewPrice from "./price";
import OptionSelect from "@modules/products/components/option-select";
import Divider from "@modules/common/components/divider";

type ProductPreviewProps = {
  productPreview: HttpTypes.StoreProduct;
  isFeatured?: boolean;
  region: HttpTypes.StoreRegion;
};

export default function ProductPreview({
  productPreview,
  isFeatured,
  region,
}: ProductPreviewProps) {
  const [options, setOptions] = useState<Record<string, string | undefined>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [product, setProduct] = useState<HttpTypes.StoreProduct | null>(null);

  const params = useParams();
  const countryCode = (params.countryCode as string) || "us"; // Adjust as needed

  // Fetch the full product data
  useEffect(() => {
    const fetchProduct = async () => {
      // Replace with your method for fetching product data
      const productData = await fetch(
        `/store/products/${productPreview.id}`
      ).then((res) => res.json());
      setProduct(productData);
    };

    fetchProduct();
  }, [productPreview.id]);

  // Initialize option state
  useEffect(() => {
    if (!product) return;

    const optionObj: Record<string, string | undefined> = {};

    for (const option of product.options || []) {
      optionObj[option.id] = undefined;
    }

    setOptions(optionObj);
  }, [product]);

  const variants = product?.variants || [];

  const variantRecord = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};

    for (const variant of variants) {
      if (!variant.options || !variant.id) continue;

      const temp: Record<string, string> = {};

      for (const option of variant.options) {
        temp[option.option_id] = option.value;
      }

      map[variant.id] = temp;
    }

    return map;
  }, [variants]);

  const variant = useMemo(() => {
    let variantId: string | undefined = undefined;

    for (const key of Object.keys(variantRecord)) {
      if (isEqual(variantRecord[key], options)) {
        variantId = key;
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
    if (!variant) return false;

    if (!variant.manage_inventory) {
      return true;
    }

    if ((variant.inventory_quantity ?? 0) > 0) {
      return true;
    }

    if (variant.allow_backorder) {
      return true;
    }

    return false;
  }, [variant]);

  if (!product) {
    return null; // Or a loading indicator
  }

  const { cheapestPrice } = getProductPrice({
    product,
    region,
  });

  const updateOptions = (update: Record<string, string | undefined>) => {
    setOptions({ ...options, ...update });
  };

  const handleAddToCart = async () => {
    if (!variant?.id) {
      console.error("No variant selected");
      return;
    }

    setIsAdding(true);

    try {
      await addToCart({
        variantId: variant.id,
        quantity: 1,
        countryCode,
      });
      // Optionally, provide user feedback or refresh cart state
    } catch (error) {
      console.error("Failed to add item to cart:", error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="group">
      <LocalizedClientLink href={`/products/${productPreview.handle}`}>
        <div>
          <Thumbnail
            thumbnail={productPreview.thumbnail}
            size="full"
            isFeatured={isFeatured}
          />
          <div className="flex txt-compact-medium mt-4 justify-between">
            <Text className="text-ui-fg-subtle">{productPreview.title}</Text>
            <div className="flex items-center gap-x-2">
              {cheapestPrice && <PreviewPrice price={cheapestPrice} />}
            </div>
          </div>
        </div>
      </LocalizedClientLink>

      {product.variants.length > 1 && (
        <div className="flex flex-col gap-y-4 mt-4">
          {(product.options || []).map((option) => {
            return (
              <div key={option.id}>
                <OptionSelect
                  option={option}
                  current={options[option.id]}
                  updateOption={updateOptions}
                  title={option.title}
                />
              </div>
            );
          })}
          <Divider />
        </div>
      )}

      <Button
        onClick={handleAddToCart}
        disabled={!inStock || !variant}
        variant="primary"
        className="mt-2 w-full"
        isLoading={isAdding}
      >
        {!variant
          ? "Select variant"
          : !inStock
          ? "Out of stock"
          : "Add to cart"}
      </Button>
    </div>
  );
}
