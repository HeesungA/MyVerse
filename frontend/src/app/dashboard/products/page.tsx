"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types";
import { PRODUCT_TYPE_LABELS } from "@/lib/types";
import Link from "next/link";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      setProducts(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function toggleActive(product: Product) {
    const supabase = createClient();
    await supabase
      .from("products")
      .update({ is_active: !product.is_active })
      .eq("id", product.id);
    setProducts((prev) =>
      prev.map((p) => p.id === product.id ? { ...p, is_active: !p.is_active } : p)
    );
  }

  async function deleteProduct(id: string) {
    if (!confirm("상품을 삭제하시겠습니까?")) return;
    const supabase = createClient();
    await supabase.from("products").delete().eq("id", id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  if (loading) {
    return (
      <div className="p-8 max-w-5xl">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">상품 관리</h1>
          <p className="text-gray-500 text-sm mt-1">총 {products.length}개 상품</p>
        </div>
        <Link href="/dashboard/products/new" className="btn-primary">
          + 상품 등록
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-4">📦</p>
          <p className="text-gray-600 font-medium">아직 등록된 상품이 없어요</p>
          <p className="text-gray-400 text-sm mt-2 mb-6">VOD, 디지털 자료, 코칭 등 다양한 상품을 등록해보세요</p>
          <Link href="/dashboard/products/new" className="btn-primary inline-block">
            첫 상품 등록하기
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <div key={product.id} className="card flex items-center gap-4">
              {product.thumbnail_url ? (
                <img src={product.thumbnail_url} alt={product.title}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
                  {product.type === "vod" ? "🎬" : product.type === "coaching" ? "💬" : product.type === "form" ? "📋" : "📄"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">{product.title}</h3>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex-shrink-0">
                    {PRODUCT_TYPE_LABELS[product.type as keyof typeof PRODUCT_TYPE_LABELS]}
                  </span>
                </div>
                <p className="text-brand-600 font-bold mt-1">₩{product.price.toLocaleString()}</p>
                {product.description && (
                  <p className="text-sm text-gray-400 mt-0.5 truncate">{product.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggleActive(product)}
                  className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    product.is_active
                      ? "bg-green-50 text-green-600 hover:bg-green-100"
                      : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                  }`}>
                  {product.is_active ? "판매 중" : "비활성"}
                </button>
                <button onClick={() => deleteProduct(product.id)}
                  className="text-sm px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
