"use client";

import { useState, useEffect, useMemo } from "react";
import { Button, Text } from "@medusajs/ui";
import { isEqual } from "lodash";
import { useParams } from "next/navigation";

import { addToCart } from "@lib/data/cart";
import { getProductPrice } from "@lib/util/get-product-price";
import Thumbnail from "../thumbnail";
import OptionSelect from "@modules/products/components/product-actions/option-select";
import Divider from "@modules/common/components/divider";
import { HttpTypes } from "@medusajs/types";

type ProductPreviewProps = {
  productPreview: HttpTypes.StoreProduct;
  isFeatured?: boolean;
  region: HttpTypes.StoreRegion;
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
      const productData = await fetch(`/store/products/${productPreview.id}`).then(
        (res) => res.json()
      );
      setProduct(productData);
    };

    fetchProduct();
  }, [productPreview.id]);

  // Initialize option state
  useEffect(() => {
    if (!product?.variants) return;

    if (product.variants.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options);
      setOptions(variantOptions ?? {});
    } else {
      const initialOptions: Record<string, string | undefined> = {};
      product.options?.forEach((option) => {
        initialOptions[option.title] = undefined;
      });
      setOptions(initialOptions);
    }
  }, [product]);

  const selectedVariant = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) {
      return null;
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options);
      return isEqual(variantOptions, options);
    });
  }, [product?.variants, options]);

  // Update the options when a variant is selected
  const setOptionValue = (title: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [title]: value,
    }));
  };

  // Check if the selected variant is in stock
  const inStock = useMemo(() => {
    if (!selectedVariant) return false;

    if (!selectedVariant.manage_inventory) {
      return true;
    }

    if (selectedVariant?.allow_backorder) {
      return true;
    }

    if ((selectedVariant?.inventory_quantity || 0) > 0) {
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
      // Optionally, provide user feedback or refresh cart state
    } catch (error) {
      console.error("Failed to add item to cart:", error);
    } finally {
      setIsAdding(false);
    }
  };

  if (!product) {
    return null; // Or a loading indicator
  }

  const { cheapestPrice } = getProductPrice({
    product,
    region,
  });

  return (
    <div className="group">
      {/* Product Thumbnail and Basic Info */}
      <div>
        <Thumbnail
          thumbnail={productPreview.thumbnail}
          size="full"
          isFeatured={isFeatured}
        />
        <Text className="mt-2">{productPreview.title}</Text>
        {cheapestPrice && <Text>{cheapestPrice}</Text>}
      </div>

      {/* Options for Variants */}
      {(product.variants?.length ?? 0) > 1 && (
        <div className="flex flex-col gap-y-4 mt-4">
          {(product.options || []).map((option) => (
            <div key={option.id}>
              <OptionSelect
                option={option}
                current={options[option.title ?? ""]}
                updateOption={setOptionValue}
                title={option.title ?? ""}
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
        isLoading={isAdding}
        variant="primary"
        className="mt-4 w-full"
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
