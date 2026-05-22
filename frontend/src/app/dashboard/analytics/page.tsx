"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const BENCHMARK = {
  page_to_content: 0.45,
  content_to_cart: 0.20,
  cart_to_purchase: 0.60,
};

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

interface FunnelState {
  pageViews: number;
  viewContents: number;
  addToCarts: number;
  purchases: number;
  revenue: number;
}

function FunnelBar({ label, count, rate, benchmark }: {
  label: string; count: number; rate: number; benchmark: number;
}) {
  const isLow = rate > 0 && rate < benchmark;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-900">{count.toLocaleString()}명</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isLow ? "bg-red-400" : "bg-brand-500"}`}
          style={{ width: `${Math.min(rate * 200, 100)}%` }}
        />
      </div>
      {rate > 0 && (
        <p className={`text-xs ${isLow ? "text-red-500" : "text-green-600"}`}>
          전환율 {pct(rate)} (벤치마크: {pct(benchmark)})
        </p>
      )}
    </div>
  );
}

function findBottleneck(rates: { page_to_content: number; content_to_cart: number; cart_to_purchase: number }) {
  const gaps = {
    "스토어 방문 → 상품 조회 (콘텐츠 매력도 개선 필요)": BENCHMARK.page_to_content - rates.page_to_content,
    "상품 조회 → 장바구니 (가격/설명 설득력 개선 필요)": BENCHMARK.content_to_cart - rates.content_to_cart,
    "장바구니 → 구매 (결제 허들 낮추기 필요)": BENCHMARK.cart_to_purchase - rates.cart_to_purchase,
  };
  const worst = Object.entries(gaps).sort((a, b) => b[1] - a[1])[0];
  return worst[1] > 0 ? worst[0] : "모든 단계가 벤치마크를 초과합니다 🎉";
}

export default function AnalyticsPage() {
  const [funnel, setFunnel] = useState<FunnelState | null>(null);
  const [period, setPeriod] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const since = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString();

      const countEvent = async (eventType: string) => {
        const { count } = await supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", user.id)
          .eq("event_type", eventType)
          .gte("created_at", since);
        return count ?? 0;
      };

      const [pageViews, viewContents, addToCarts, purchases, ordersRes] = await Promise.all([
        countEvent("page_view"),
        countEvent("view_content"),
        countEvent("add_to_cart"),
        countEvent("purchase"),
        supabase.from("orders").select("amount")
          .eq("creator_id", user.id).eq("status", "completed").gte("created_at", since),
      ]);

      const revenue = (ordersRes.data ?? []).reduce((s, r) => s + r.amount, 0);
      setFunnel({ pageViews, viewContents, addToCarts, purchases, revenue });
      setLoading(false);
    }
    load();
  }, [period]);

  const rates = funnel ? {
    page_to_content: funnel.pageViews > 0 ? funnel.viewContents / funnel.pageViews : 0,
    content_to_cart: funnel.viewContents > 0 ? funnel.addToCarts / funnel.viewContents : 0,
    cart_to_purchase: funnel.addToCarts > 0 ? funnel.purchases / funnel.addToCarts : 0,
    overall: funnel.pageViews > 0 ? funnel.purchases / funnel.pageViews : 0,
  } : null;

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">퍼널 분석</h1>
          <p className="text-gray-500 text-sm mt-1">방문부터 구매까지의 전환율을 확인하세요</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(Number(e.target.value))}
          className="input w-auto text-sm">
          <option value={7}>최근 7일</option>
          <option value={14}>최근 14일</option>
          <option value={30}>최근 30일</option>
        </select>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-gray-100 rounded-xl" />)}
        </div>
      ) : funnel && rates ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "스토어 방문", value: funnel.pageViews, icon: "👁" },
              { label: "상품 조회", value: funnel.viewContents, icon: "🔍" },
              { label: "장바구니", value: funnel.addToCarts, icon: "🛒" },
              { label: "구매 완료", value: funnel.purchases, icon: "✅" },
            ].map((s) => (
              <div key={s.label} className="card text-center">
                <p className="text-xl mb-1">{s.icon}</p>
                <p className="text-2xl font-bold text-gray-900">{s.value.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="card mb-6 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">기간 매출</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">₩{funnel.revenue.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-sm">전체 전환율</p>
              <p className="text-2xl font-bold text-brand-600 mt-1">{pct(rates.overall)}</p>
            </div>
          </div>

          <div className="card space-y-6 mb-6">
            <h2 className="font-semibold text-gray-900">단계별 전환율</h2>
            <FunnelBar label="스토어 방문 → 상품 조회" count={funnel.viewContents}
              rate={rates.page_to_content} benchmark={BENCHMARK.page_to_content} />
            <FunnelBar label="상품 조회 → 장바구니" count={funnel.addToCarts}
              rate={rates.content_to_cart} benchmark={BENCHMARK.content_to_cart} />
            <FunnelBar label="장바구니 → 구매" count={funnel.purchases}
              rate={rates.cart_to_purchase} benchmark={BENCHMARK.cart_to_purchase} />
          </div>

          {funnel.pageViews > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="font-medium text-amber-800">🔍 병목 구간</p>
              <p className="text-sm text-amber-600 mt-1">{findBottleneck(rates)}</p>
            </div>
          )}

          {funnel.pageViews === 0 && (
            <div className="card text-center py-10">
              <p className="text-gray-500">아직 데이터가 없어요. 스토어에 방문자가 생기면 분석이 시작됩니다.</p>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
