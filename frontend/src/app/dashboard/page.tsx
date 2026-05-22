"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  TrendingUp, TrendingDown, ChevronDown,
  ArrowRight, AlertCircle,
  ShoppingBag, Users, CreditCard,
} from "lucide-react";

interface DashboardData {
  creatorName: string;
  storeSlug: string | null;
  totalRevenue: number;
  pageViews: number;
  purchases: number;
  totalCustomers: number;
  funnel: { label: string; value: number; rate?: number; status: "good" | "warn" | "ok" }[];
  crmItems: { label: string; desc: string; active: boolean; count: number }[];
}

const STATUS_COLOR = {
  good: "bg-emerald-500",
  warn: "bg-amber-400",
  ok: "bg-violet-500",
};

function StatCard({
  icon: Icon, label, value, sub, trend,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
          <Icon size={15} className="text-gray-400" strokeWidth={1.75} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      <p className={`text-xs mt-1.5 flex items-center gap-1 ${
        trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-500" : "text-gray-400"
      }`}>
        {trend === "up" && <TrendingUp size={11} />}
        {trend === "down" && <TrendingDown size={11} />}
        {sub}
      </p>
    </div>
  );
}

function FunnelRow({ label, value, max, rate, status }: {
  label: string; value: number; max: number; rate?: number; status: "good" | "warn" | "ok";
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-600 w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${STATUS_COLOR[status]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-right w-28 flex-shrink-0">
        <span className="text-sm font-semibold text-gray-800">{value.toLocaleString()}</span>
        {rate !== undefined && (
          <span className={`text-xs ml-1.5 ${status === "warn" ? "text-amber-600" : "text-gray-400"}`}>
            {(rate * 100).toFixed(1)}%{status === "warn" ? " ↓" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

function Toggle({ active, onChange }: { active: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        active ? "bg-violet-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          active ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [period, setPeriod] = useState(30);
  const [showPeriod, setShowPeriod] = useState(false);
  const [crmActive, setCrmActive] = useState([true, true, true, false]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const since = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString();

      const [creatorRes, ordersRes, customersRes, eventsRes] = await Promise.all([
        supabase.from("creators").select("name, store_slug").eq("id", user.id).single(),
        supabase.from("orders").select("amount").eq("creator_id", user.id).eq("status", "completed").gte("created_at", since),
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("creator_id", user.id),
        supabase.from("events").select("event_type").eq("creator_id", user.id).gte("created_at", since),
      ]);

      const events = eventsRes.data ?? [];
      const count = (t: string) => events.filter((e) => e.event_type === t).length;

      const pageViews = count("page_view");
      const viewContents = count("view_content");
      const addToCarts = count("add_to_cart");
      const purchases = count("purchase");
      const totalRevenue = (ordersRes.data ?? []).reduce((s, r) => s + r.amount, 0);

      const funnelMax = pageViews || 1;

      setData({
        creatorName: creatorRes.data?.name ?? "크리에이터",
        storeSlug: creatorRes.data?.store_slug ?? null,
        totalRevenue,
        pageViews,
        purchases,
        totalCustomers: customersRes.count ?? 0,
        funnel: [
          { label: "스토어 방문", value: pageViews, status: "ok" },
          { label: "상품 조회", value: viewContents, rate: pageViews > 0 ? viewContents / pageViews : 0, status: viewContents / Math.max(pageViews, 1) < 0.45 ? "warn" : "good" },
          { label: "장바구니", value: addToCarts, rate: viewContents > 0 ? addToCarts / viewContents : 0, status: addToCarts / Math.max(viewContents, 1) < 0.2 ? "warn" : "good" },
          { label: "구매 완료", value: purchases, rate: addToCarts > 0 ? purchases / addToCarts : 0, status: purchases / Math.max(addToCarts, 1) < 0.6 ? "warn" : "good" },
        ],
        crmItems: [
          { label: "구매 확인 (D+0)", desc: "구매 직후 자동 발송", active: true, count: purchases },
          { label: "사용 가이드 (D+3)", desc: "후속 콘텐츠 안내", active: true, count: Math.floor(purchases * 0.9) },
          { label: "업셀 제안 (D+7)", desc: "상위 패키지 추천", active: true, count: Math.floor(purchases * 0.7) },
          { label: "장바구니 이탈", desc: "1시간 후 리마인더", active: false, count: addToCarts - purchases },
        ],
      });
    }
    load();
  }, [period]);

  const conversionRate = data && data.pageViews > 0
    ? ((data.purchases / data.pageViews) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="p-8 max-w-[1400px]">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            안녕하세요, {data?.creatorName ?? "..."}님
          </h1>
          <p className="text-sm text-gray-400 mt-1">지난 {period}일 성과 요약입니다.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* 인스타 연동 상태 */}
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-white border border-gray-200 px-3 py-2 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            Instagram 미연동
          </div>
          {/* 기간 선택 */}
          <div className="relative">
            <button
              onClick={() => setShowPeriod(!showPeriod)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50"
            >
              최근 {period}일
              <ChevronDown size={14} />
            </button>
            {showPeriod && (
              <div className="absolute right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-10 w-32">
                {[7, 14, 30].map((d) => (
                  <button key={d} onClick={() => { setPeriod(d); setShowPeriod(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${period === d ? "text-violet-600 font-medium" : "text-gray-700"}`}>
                    최근 {d}일
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 스토어 미설정 안내 */}
      {data && !data.storeSlug && (
        <div className="mb-6 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="text-amber-500" />
            <div>
              <p className="text-sm font-medium text-amber-800">스토어 주소를 설정해주세요</p>
              <p className="text-xs text-amber-600 mt-0.5">설정 후 고객이 스토어를 방문할 수 있습니다</p>
            </div>
          </div>
          <Link href="/dashboard/store" className="btn-primary text-xs">설정하기 →</Link>
        </div>
      )}

      {/* 지표 카드 4개 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon={CreditCard} label="총 매출" value={`₩${(data?.totalRevenue ?? 0).toLocaleString()}`} sub="기간 누적" />
        <StatCard icon={ShoppingBag} label="스토어 방문" value={(data?.pageViews ?? 0).toLocaleString()} sub="방문자 수" />
        <StatCard icon={TrendingUp} label="구매 전환율" value={`${conversionRate}%`}
          sub={parseFloat(conversionRate) < 6.1 ? "업계 평균 6.1% 미달" : "업계 평균 초과"}
          trend={parseFloat(conversionRate) < 6.1 ? "down" : "up"} />
        <StatCard icon={Users} label="총 구매자" value={`${(data?.totalCustomers ?? 0).toLocaleString()}명`} sub="누적 구매자" />
      </div>

      {/* 메인 3열 */}
      <div className="grid grid-cols-12 gap-4">

        {/* 퍼널 차트 */}
        <div className="col-span-5 card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-800">퍼널 단계별 전환</h2>
            <Link href="/dashboard/analytics"
              className="text-xs text-violet-600 hover:text-violet-700 flex items-center gap-1">
              상세 보기 <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-4">
            {(data?.funnel ?? []).map((f) => (
              <FunnelRow key={f.label} label={f.label} value={f.value}
                max={data?.pageViews || 1} rate={f.rate} status={f.status} />
            ))}
            {(!data || data.pageViews === 0) && (
              <p className="text-sm text-gray-400 text-center py-8">
                스토어에 방문자가 생기면 퍼널이 표시됩니다
              </p>
            )}
          </div>
          {data && data.pageViews > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-50 flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-500" />정상</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />개선 필요</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />우수</span>
            </div>
          )}
        </div>

        {/* AI 처방 */}
        <div className="col-span-4 card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-800">AI 처방</h2>
            <span className="text-xs text-gray-400">오늘 업데이트</span>
          </div>
          <div className="space-y-3">
            {data && data.pageViews === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-400">데이터가 쌓이면 AI가 처방을 제안합니다</p>
              </div>
            ) : (
              <>
                <AiCard
                  status="warn"
                  title="병목 감지 — 상품 조회율"
                  desc={`스토어 방문 대비 상품 조회율이 낮습니다. 상품 썸네일과 제목을 개선하면 전환율 향상이 예상됩니다.`}
                />
                <AiCard
                  status="good"
                  title="게시 시간 최적화"
                  desc="팔로워 피크에 맞춰 게시하면 초기 노출이 증가합니다."
                />
              </>
            )}
          </div>
          <Link href="/dashboard/ai"
            className="mt-4 w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-violet-600 border border-dashed border-gray-200 rounded-xl py-3 transition-colors">
            전체 AI 리포트 보기 <ArrowRight size={14} />
          </Link>
        </div>

        {/* CRM 자동화 */}
        <div className="col-span-3 card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-800">CRM 자동화</h2>
            <Link href="/dashboard/crm" className="text-xs text-violet-600 hover:text-violet-700">
              편집
            </Link>
          </div>
          <div className="space-y-3">
            {(data?.crmItems ?? [
              { label: "구매 확인 (D+0)", desc: "구매 직후 자동 발송", active: true, count: 0 },
              { label: "사용 가이드 (D+3)", desc: "후속 콘텐츠 안내", active: true, count: 0 },
              { label: "업셀 제안 (D+7)", desc: "상위 패키지 추천", active: true, count: 0 },
              { label: "장바구니 이탈", desc: "1시간 후 리마인더", active: false, count: 0 },
            ]).map((item, i) => (
              <div key={i} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-800">{item.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                  {item.count > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">발송 {item.count}건</p>
                  )}
                  {!item.active && (
                    <p className="text-xs text-red-400 mt-0.5 font-medium">미설정</p>
                  )}
                </div>
                <Toggle
                  active={crmActive[i] ?? item.active}
                  onChange={() => setCrmActive((prev) => prev.map((v, j) => j === i ? !v : v))}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AiCard({ status, title, desc }: { status: "warn" | "good"; title: string; desc: string }) {
  return (
    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
      <div className="flex items-start gap-2.5 mb-2">
        <span className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${status === "warn" ? "bg-amber-400" : "bg-emerald-500"}`} />
        <p className="text-xs font-semibold text-gray-800">{title}</p>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed pl-4">{desc}</p>
      <button className="mt-3 ml-4 text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1">
        적용하기 <ArrowRight size={11} />
      </button>
    </div>
  );
}
