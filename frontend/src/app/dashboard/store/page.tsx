"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function StoreSettingsPage() {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("creators")
        .select("name, store_slug, instagram_handle")
        .eq("id", user.id)
        .single();

      if (data) {
        setSlug(data.store_slug ?? "");
        setName(data.name ?? "");
        setInstagram(data.instagram_handle ?? "");
      }
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    const slugClean = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (slugClean.length < 3) {
      setError("슬러그는 영문 소문자, 숫자, 하이픈으로 3자 이상 입력하세요.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 슬러그 중복 확인
    const { data: existing } = await supabase
      .from("creators")
      .select("id")
      .eq("store_slug", slugClean)
      .neq("id", user.id)
      .maybeSingle();

    if (existing) {
      setError("이미 사용 중인 슬러그입니다. 다른 주소를 입력하세요.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("creators")
      .update({
        store_slug: slugClean,
        name,
        instagram_handle: instagram || null,
      })
      .eq("id", user.id);

    if (updateError) {
      setError("저장 중 오류가 발생했습니다: " + updateError.message);
    } else {
      setSlug(slugClean);
      setSuccess(true);
    }
    setLoading(false);
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">스토어 설정</h1>
      <p className="text-gray-500 text-sm mb-8">고객이 방문할 스토어 주소와 기본 정보를 설정하세요</p>

      <form onSubmit={handleSave} className="card space-y-6">
        <div>
          <label className="label">스토어 주소 (슬러그)</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 whitespace-nowrap">
              localhost:3000/store/
            </span>
            <input
              type="text"
              className="input"
              placeholder="my-store"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">영문 소문자, 숫자, 하이픈만 사용 (3자 이상)</p>
        </div>

        <div>
          <label className="label">활동명 / 이름</label>
          <input
            type="text"
            className="input"
            placeholder="홍길동"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label">인스타그램 아이디 (선택)</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">@</span>
            <input
              type="text"
              className="input"
              placeholder="instagram_id"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
        {success && (
          <p className="text-green-600 text-sm bg-green-50 p-3 rounded-lg">
            ✅ 저장되었습니다! 스토어 주소: <strong>/store/{slug}</strong>
          </p>
        )}

        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "저장 중..." : "저장하기"}
          </button>
          {slug && (
            <a href={`/store/${slug}`} target="_blank" className="btn-secondary">
              스토어 미리보기 →
            </a>
          )}
        </div>
      </form>
    </div>
  );
}
