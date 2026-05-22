"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PRODUCT_TYPE_LABELS } from "@/lib/types";
import type { ProductType } from "@/lib/types";

const TYPE_ICONS: Record<ProductType, string> = {
  vod: "🎬",
  digital: "📄",
  coaching: "💬",
  form: "📋",
};

export default function NewProductPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [type, setType] = useState<ProductType>("digital");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: insertError } = await supabase.from("products").insert({
      creator_id: user.id,
      title,
      description: description || null,
      price: parseInt(price) || 0,
      type,
      thumbnail_url: thumbnailUrl || null,
      content_url: contentUrl || null,
    });

    if (insertError) {
      setError("상품 등록 중 오류가 발생했습니다: " + insertError.message);
      setLoading(false);
    } else {
      router.push("/dashboard/products");
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/products" className="text-gray-400 hover:text-gray-600">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">상품 등록</h1>
          <p className="text-gray-500 text-sm mt-1">새 상품을 스토어에 추가합니다</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div>
          <label className="label">상품 유형</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(PRODUCT_TYPE_LABELS) as ProductType[]).map((t) => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                  type === t
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}>
                <span>{TYPE_ICONS[t]}</span>
                {PRODUCT_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">상품명 *</label>
          <input type="text" className="input" placeholder="인스타 릴스 마스터 클래스"
            value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div>
          <label className="label">설명</label>
          <textarea className="input resize-none" rows={4}
            placeholder="상품 소개, 포함 내용, 대상 등을 작성하세요"
            value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div>
          <label className="label">가격 (원) *</label>
          <input type="number" className="input" placeholder="39000"
            value={price} onChange={(e) => setPrice(e.target.value)} min="0" required />
          {price && (
            <p className="text-xs text-gray-400 mt-1.5">
              표시 가격: ₩{parseInt(price || "0").toLocaleString()}
            </p>
          )}
        </div>

        <div>
          <label className="label">썸네일 URL (선택)</label>
          <input type="url" className="input" placeholder="https://..."
            value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} />
        </div>

        {(type === "vod" || type === "digital") && (
          <div>
            <label className="label">콘텐츠 URL (선택)</label>
            <input type="url" className="input" placeholder="구매 후 전달할 파일/영상 링크"
              value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} />
          </div>
        )}

        {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "등록 중..." : "상품 등록"}
          </button>
          <Link href="/dashboard/products" className="btn-secondary">취소</Link>
        </div>
      </form>
    </div>
  );
}
