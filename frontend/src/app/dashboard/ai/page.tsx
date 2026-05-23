"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, BarChart3, Mail, Users } from "lucide-react";

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

// ── 타입 ──────────────────────────────────────────────────
interface ActionItem {
  title: string;
  description: string;
  expected_impact: string;
}

interface ActionPlan {
  summary: string;
  score: { funnel: number; content: number; crm: number; overall: number };
  actions: {
    urgent: ActionItem[];
    this_week: ActionItem[];
    next_week: ActionItem[];
  };
  key_insight: string;
}

interface ReportData {
  creator_id: string;
  data: {
    funnel: Record<string, number>;
    revenue: Record<string, number>;
    crm: Record<string, number>;
  };
  analysis: { funnel: string; content: string; crm: string };
  action_plan: ActionPlan;
}

// ── 점수 색상 ─────────────────────────────────────────────
function scoreColor(score: number) {
  if (score >= 75) return { bg: "bg-green-50", text: "text-green-600", bar: "bg-green-500" };
  if (score >= 50) return { bg: "bg-amber-50", text: "text-amber-600", bar: "bg-amber-500" };
  return { bg: "bg-red-50", text: "text-red-600", bar: "bg-red-500" };
}

function ScoreCard({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) {
  const c = scoreColor(score);
  return (
    <div className={`card flex flex-col items-center py-5 gap-2 ${c.bg}`}>
      <div className="text-gray-500">{icon}</div>
      <p className={`text-3xl font-bold ${c.text}`}>{score}</p>
      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${score}%` }} />
      </div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
    </div>
  );
}

// ── 액션 카드 ──────────────────────────────────────────────
function ActionCard({ item, accent }: { item: ActionItem; accent: string }) {
  return (
    <div className={`rounded-xl border p-4 space-y-2 ${accent}`}>
      <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
      <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
      <div className="pt-1">
        <span className="inline-block text-xs font-medium bg-white/70 text-gray-700 border border-gray-200 rounded-full px-2.5 py-0.5">
          예상 효과: {item.expected_impact}
        </span>
      </div>
    </div>
  );
}

// ── 분석 섹션 (펼치기) ────────────────────────────────────
function AnalysisSection({ title, content, icon }: { title: string; content: string; icon: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="text-gray-400">{icon}</div>
          <span className="font-semibold text-gray-800 text-sm">{title}</span>
        </div>
        <span className="text-gray-400 text-lg">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600 leading-7 whitespace-pre-wrap">{content}</p>
        </div>
      )}
    </div>
  );
}

// ── 로딩 스텝 ─────────────────────────────────────────────
const STEPS = [
  "데이터 집계 중...",
  "퍼널 분석 중...",
  "콘텐츠 전략 분석 중...",
  "CRM 효과 분석 중...",
  "최종 액션 플랜 생성 중...",
];

function LoadingView({ step }: { step: number }) {
  return (
    <div className="card py-16 flex flex-col items-center gap-6">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
          <Sparkles size={28} className="text-violet-500 animate-pulse" strokeWidth={1.5} />
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="font-semibold text-gray-800">Claude AI가 분석하고 있어요</p>
        <p className="text-sm text-violet-600 font-medium">{STEPS[Math.min(step, STEPS.length - 1)]}</p>
      </div>
      <div className="w-64 space-y-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
              i < step ? "bg-violet-500 text-white" :
              i === step ? "bg-violet-200 border-2 border-violet-500" :
              "bg-gray-100"
            }`}>
              {i < step ? "✓" : ""}
            </div>
            <p className={`text-xs ${i <= step ? "text-gray-700" : "text-gray-400"}`}>{s}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400">약 20-30초 소요됩니다</p>
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────
export default function AiPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"urgent" | "this_week" | "next_week">("urgent");
  const [openAnalysis, setOpenAnalysis] = useState(false);

  async function generateReport() {
    setLoading(true);
    setError(null);
    setReport(null);
    setLoadingStep(0);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("로그인이 필요합니다."); setLoading(false); return; }

    // 단계별 UI 업데이트
    const stepTimer = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, STEPS.length - 1));
    }, 5000);

    try {
      const res = await fetch(`${API}/api/ai/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creator_id: user.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? `HTTP ${res.status}`);
      }
      const data: ReportData = await res.json();
      setReport(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      clearInterval(stepTimer);
      setLoading(false);
    }
  }

  const plan = report?.action_plan;
  const TABS: { key: "urgent" | "this_week" | "next_week"; label: string; emoji: string; accent: string }[] = [
    { key: "urgent",    label: "오늘 당장",  emoji: "🔥", accent: "border-red-200 bg-red-50/50"    },
    { key: "this_week", label: "이번 주",    emoji: "📅", accent: "border-blue-200 bg-blue-50/50"  },
    { key: "next_week", label: "다음 주",    emoji: "🎯", accent: "border-green-200 bg-green-50/50"},
  ];

  return (
    <div className="p-8 max-w-4xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 처방</h1>
          <p className="text-sm text-gray-400 mt-1">
            Claude AI가 퍼널·콘텐츠·CRM 데이터를 종합해 액션 플랜을 생성합니다
          </p>
        </div>
        <button
          onClick={generateReport}
          disabled={loading}
          className="btn-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Sparkles size={16} strokeWidth={1.75} />
          {loading ? "분석 중..." : report ? "리포트 재생성" : "AI 리포트 생성"}
        </button>
      </div>

      {/* 에러 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          ⚠️ {error}
        </div>
      )}

      {/* 로딩 */}
      {loading && <LoadingView step={loadingStep} />}

      {/* 결과 */}
      {!loading && plan && (
        <div className="space-y-6">

          {/* Key Insight 배너 */}
          <div className="p-5 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-2xl flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles size={16} className="text-violet-600" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-xs font-semibold text-violet-500 uppercase tracking-wide mb-1">핵심 인사이트</p>
              <p className="text-sm text-violet-900 font-medium leading-relaxed">{plan.key_insight}</p>
            </div>
          </div>

          {/* 요약 */}
          <div className="card">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">종합 요약</p>
            <p className="text-sm text-gray-700 leading-relaxed">{plan.summary}</p>
          </div>

          {/* 점수 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ScoreCard label="퍼널 전환"   score={plan.score.funnel}   icon={<BarChart3 size={18} strokeWidth={1.75} />} />
            <ScoreCard label="콘텐츠 전략" score={plan.score.content}  icon={<Users size={18} strokeWidth={1.75} />} />
            <ScoreCard label="CRM 효과"    score={plan.score.crm}      icon={<Mail size={18} strokeWidth={1.75} />} />
            <ScoreCard label="종합 점수"   score={plan.score.overall}  icon={<Sparkles size={18} strokeWidth={1.75} />} />
          </div>

          {/* 액션 플랜 탭 */}
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-900">액션 플랜</h2>
            <div className="flex gap-2 border-b border-gray-100 pb-3">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    activeTab === t.key
                      ? "bg-violet-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {plan.actions[activeTab].length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">해당 기간 액션이 없습니다.</p>
              ) : (
                plan.actions[activeTab].map((item, i) => (
                  <ActionCard
                    key={i}
                    item={item}
                    accent={TABS.find((t) => t.key === activeTab)!.accent}
                  />
                ))
              )}
            </div>
          </div>

          {/* 세부 분석 (접기/펼치기) */}
          <div>
            <button
              onClick={() => setOpenAnalysis((o) => !o)}
              className="w-full text-left text-sm font-medium text-gray-500 hover:text-gray-800 flex items-center gap-2 mb-3"
            >
              <span>{openAnalysis ? "▼" : "▶"}</span>
              Claude 세부 분석 {openAnalysis ? "접기" : "펼치기"}
            </button>

            {openAnalysis && (
              <div className="space-y-3">
                <AnalysisSection
                  title="퍼널 전환율 분석"
                  content={report!.analysis.funnel}
                  icon={<BarChart3 size={16} strokeWidth={1.75} />}
                />
                <AnalysisSection
                  title="콘텐츠 전략 분석"
                  content={report!.analysis.content}
                  icon={<Users size={16} strokeWidth={1.75} />}
                />
                <AnalysisSection
                  title="CRM 효과 분석"
                  content={report!.analysis.crm}
                  icon={<Mail size={16} strokeWidth={1.75} />}
                />
              </div>
            )}
          </div>

          {/* 데이터 요약 */}
          {report!.data && (
            <div className="card">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">분석 기반 데이터 (최근 30일)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-400">스토어 방문</p>
                  <p className="text-lg font-bold text-gray-900">{(report!.data.funnel.page_view ?? 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">구매</p>
                  <p className="text-lg font-bold text-gray-900">{(report!.data.funnel.purchase ?? 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">월 매출</p>
                  <p className="text-lg font-bold text-gray-900">₩{(report!.data.revenue.total_revenue ?? 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">재구매율</p>
                  <p className="text-lg font-bold text-gray-900">{report!.data.crm.repeat_purchase_rate ?? 0}%</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 초기 상태 (리포트 없음) */}
      {!loading && !report && !error && (
        <div className="card text-center py-20 space-y-4">
          <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto">
            <Sparkles size={24} className="text-violet-400" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-2">AI 리포트를 생성해보세요</h2>
            <p className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
              Claude AI가 퍼널 전환율, 인스타 콘텐츠, CRM 효과를 종합 분석해
              지금 당장 실행할 수 있는 액션 플랜을 만들어드립니다.
            </p>
          </div>
          <button onClick={generateReport} className="btn-primary mt-2 inline-flex items-center gap-2">
            <Sparkles size={16} strokeWidth={1.75} />
            지금 분석 시작하기
          </button>
        </div>
      )}
    </div>
  );
}
