import dynamic from "next/dynamic";
import { getProductsList } from "@lib/data/products";
import { HttpTypes } from "@medusajs/types";

const Product = dynamic(() => import("../product-preview"), {
  ssr: false,
});

type RelatedProductsProps = {
  product: HttpTypes.StoreProduct;
  countryCode: string;
};

type StoreProductParamsWithTags = HttpTypes.StoreProductParams & {
  tags?: string[];
};

type StoreProductWithTags = HttpTypes.StoreProduct & {
  tags?: { value: string }[];
};

export default async function RelatedProducts({
  product,
  countryCode,
}: RelatedProductsProps) {
  // Define your related products logic
  const queryParams: StoreProductParamsWithTags = {};
  if (product.collection_id) {
    queryParams.collection_id = [product.collection_id];
  }
  const productWithTags = product as StoreProductWithTags;
  if (productWithTags.tags) {
    queryParams.tags = productWithTags.tags
      .map((t) => t.value)
      .filter(Boolean) as string[];
  }
  queryParams.is_giftcard = false;

  const products = await getProductsList({
    queryParams,
    countryCode,
  }).then(({ response }) => {
    return response.products.filter(
      (responseProduct) => responseProduct.id !== product.id
    );
  });

  if (!products.length) {
    return null;
  }

  return (
    <div className="product-page-constraint">
      <div className="flex flex-col items-center text-center mb-16">
        <span className="text-base-regular text-gray-600 mb-6">
          Related products
        </span>
        <p className="text-2xl-regular text-ui-fg-base max-w-lg">
          You might also want to check out these products.
        </p>
      </div>

      <ul className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8">
        {products.map((product) => (
          <li key={product.id}>
            <Product productPreview={product} />
          </li>
        ))}
      </ul>
    </div>
  );
}
