"use client";

import { useState, useEffect, useMemo } from "react";
import { Button, Text } from "@medusajs/ui";
import { HttpTypes } from "@medusajs/types";
import { addToCart } from "@lib/data/cart";
import { getProductPrice } from "@lib/util/get-product-price";
import Thumbnail from "../thumbnail";
import OptionSelect from "@modules/products/components/product-actions/option-select";
import Divider from "@modules/common/components/divider";

type ProductPreviewProps = {
  productPreview: HttpTypes.StoreProduct;
  region: HttpTypes.StoreRegion;
  isFeatured?: boolean;
};

export default function ProductPreview({
  productPreview,
  region,
  isFeatured,
}: ProductPreviewProps) {
  const [options, setOptions] = useState<Record<string, string | undefined>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [product, setProduct] = useState<HttpTypes.StoreProduct | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      const productData = await fetch(`/store/products/${productPreview.id}`).then(
        (res) => res.json()
      );
      setProduct(productData);
    };

    fetchProduct();
  }, [productPreview.id]);

  useEffect(() => {
    if (!product?.options) return;

    const initialOptions: Record<string, string | undefined> = {};
    product.options.forEach((option) => {
      initialOptions[option.id] = undefined;
    });

    setOptions(initialOptions);
  }, [product]);

  const variants = useMemo(() => product?.variants || [], [product]);

  const selectedVariant = useMemo(() => {
    return variants.find((variant) =>
      variant.options?.every((opt) => options[opt.option_id] === opt.value)
    );
  }, [options, variants]);

  const inStock = selectedVariant
    ? !selectedVariant.manage_inventory ||
      selectedVariant.inventory_quantity > 0 ||
      selectedVariant.allow_backorder
    : false;

  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return;

    setIsAdding(true);
    try {
      await addToCart({ variantId: selectedVariant.id, quantity: 1 });
    } catch (error) {
      console.error("Failed to add to cart:", error);
    } finally {
      setIsAdding(false);
    }
  };

  if (!product) return null;

  const { cheapestPrice } = getProductPrice({ product, region });

  return (
    <div className="group">
      <div>
        <Thumbnail
          thumbnail={productPreview.thumbnail}
          size="full"
          isFeatured={isFeatured}
        />
        <Text className="mt-2">{productPreview.title}</Text>
        {cheapestPrice && <Text>{cheapestPrice}</Text>}
      </div>

      {product.options && (
        <div className="mt-4">
          {product.options.map((option) => (
            <OptionSelect
              key={option.id}
              option={option}
              current={options[option.id]}
              updateOption={(value) =>
                setOptions((prev) => ({ ...prev, [option.id]: value }))
              }
              title={option.title}
            />
          ))}
          <Divider />
        </div>
      )}

      <Button
        onClick={handleAddToCart}
        disabled={!inStock || !selectedVariant || isAdding}
        isLoading={isAdding}
        variant="primary"
        className="mt-4"
      >
        {!selectedVariant ? "Select variant" : inStock ? "Add to Cart" : "Out of Stock"}
      </Button>
    </div>
  );
}