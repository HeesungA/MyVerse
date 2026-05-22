"use client";

import { useEffect, useState } from "react";
import { logEvent } from "@/lib/events";
import type { Product } from "@/lib/types";
import { PRODUCT_TYPE_LABELS } from "@/lib/types";
import PurchaseModal from "@/components/store/PurchaseModal";

interface StoreCreator {
  creator_id: string;
  creator_name: string;
  instagram_handle: string | null;
  store_slug: string;
}

interface Props {
  creator: StoreCreator;
  products: Product[];
}

export default function StoreClient({ creator, products }: Props) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // 스토어 방문 이벤트
  useEffect(() => {
    logEvent(creator.creator_id, "page_view");
  }, [creator.creator_id]);

  function handleProductClick(product: Product) {
    logEvent(creator.creator_id, "view_content", product.id, { product_title: product.title });
    setSelectedProduct(product);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-100 py-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{creator.creator_name}</h1>
            {creator.instagram_handle && (
              <p className="text-sm text-gray-400 mt-0.5">@{creator.instagram_handle}</p>
            )}
          </div>
          <span className="text-xs bg-brand-50 text-brand-600 font-medium px-3 py-1.5 rounded-full">
            MyVerse 스토어
          </span>
        </div>
      </div>

      {/* 상품 목록 */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        {products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🏪</p>
            <p className="text-gray-600 font-medium">아직 등록된 상품이 없어요</p>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-gray-700 mb-6">
              상품 ({products.length}개)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => handleProductClick(product)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* 구매 모달 */}
      {selectedProduct && (
        <PurchaseModal
          product={selectedProduct}
          creatorId={creator.creator_id}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={() => {
            logEvent(creator.creator_id, "add_to_cart", selectedProduct.id);
          }}
        />
      )}
    </div>
  );
}

function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const icons: Record<string, string> = { vod: "🎬", digital: "📄", coaching: "💬", form: "📋" };

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-brand-200 transition-all text-left overflow-hidden group"
    >
      {product.thumbnail_url ? (
        <img
          src={product.thumbnail_url}
          alt={product.title}
          className="w-full h-44 object-cover group-hover:opacity-95 transition-opacity"
        />
      ) : (
        <div className="w-full h-44 bg-gradient-to-br from-brand-50 to-purple-50 flex items-center justify-center text-5xl">
          {icons[product.type] ?? "📦"}
        </div>
      )}

      <div className="p-4">
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
          {PRODUCT_TYPE_LABELS[product.type as keyof typeof PRODUCT_TYPE_LABELS]}
        </span>
        <h3 className="font-semibold text-gray-900 mt-2 leading-snug line-clamp-2">
          {product.title}
        </h3>
        {product.description && (
          <p className="text-sm text-gray-400 mt-1.5 line-clamp-2">{product.description}</p>
        )}
        <p className="text-brand-600 font-bold text-lg mt-3">
          ₩{product.price.toLocaleString()}
        </p>
      </div>
    </button>
  );
}
