"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type TriggerType = "purchase" | "days_after" | "cart_abandon";
type TargetType = "auto" | "all" | "product";
type ChannelType = "sms" | "kakao";

interface Automation {
  id: string;
  title: string;
  trigger_type: TriggerType;
  days_after: number | null;
  message_template: string;
  is_active: boolean;
  target_type: TargetType;
  target_product_id: string | null;
  channel_type: ChannelType;
  kakao_template_code: string | null;
}

interface FormState {
  title: string;
  trigger_type: TriggerType;
  days_after: string;
  message_template: string;
  is_active: boolean;
  target_type: TargetType;
  target_product_id: string;
  channel_type: ChannelType;
  kakao_template_code: string;
  kakao_custom_message: string;
}

interface Product { id: string; title: string; }

interface KakaoTemplate {
  code: string;
  name: string;
  content: string;
  variables: string[];
  status: string;
  channel_status: string | null;
}

const TRIGGER_OPTIONS = [
  { value: "purchase" as TriggerType, label: "구매 완료 즉시", desc: "결제가 완료되는 순간 발송", emoji: "✅" },
  { value: "days_after" as TriggerType, label: "구매 후 N일", desc: "구매일 기준 N일 후 발송", emoji: "📅" },
  { value: "cart_abandon" as TriggerType, label: "장바구니 이탈", desc: "장바구니 담은 후 1시간 미구매 시", emoji: "🛒" },
];

const SMS_VARIABLES = ["{{이름}}", "{{상품명}}", "{{가격}}"];
const VARIABLES = SMS_VARIABLES;

function triggerLabel(a: Automation) {
  if (a.trigger_type === "days_after") return `구매 후 ${a.days_after ?? "?"}일`;
  return TRIGGER_OPTIONS.find((t) => t.value === a.trigger_type)?.label ?? a.trigger_type;
}

function triggerEmoji(t: TriggerType) {
  return TRIGGER_OPTIONS.find((o) => o.value === t)?.emoji ?? "📩";
}

function previewMessage(template: string) {
  return template
    .replace(/{{이름}}/g, "김민지")
    .replace(/{{상품명}}/g, "릴스 마스터 클래스")
    .replace(/{{가격}}/g, "₩39,000");
}

function Toggle({ active, onChange }: { active: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
        active ? "bg-violet-600" : "bg-gray-200"
      }`}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
        active ? "translate-x-[18px]" : "translate-x-[2px]"
      }`} />
    </button>
  );
}

function SegmentSection({ form, set, products }: {
  form: FormState;
  set: <K extends keyof FormState>(key: K, val: FormState[K]) => void;
  products: Product[];
}) {
  if (form.trigger_type === "purchase") {
    return (
      <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
        <p className="text-xs font-medium text-gray-600">📌 수신 대상 (자동)</p>
        <p className="text-xs text-gray-400 mt-1">결제를 완료한 해당 구매자에게 자동 발송됩니다</p>
      </div>
    );
  }

  if (form.trigger_type === "cart_abandon") {
    return (
      <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
        <p className="text-xs font-medium text-gray-600">📌 수신 대상 (자동)</p>
        <p className="text-xs text-gray-400 mt-1">장바구니에 담고 1시간 내 미구매한 고객에게 자동 발송됩니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {[
        { value: "all" as TargetType, label: "전체 구매자", desc: "모든 구매 고객에게 발송" },
        { value: "product" as TargetType, label: "특정 상품 구매자", desc: "선택한 상품을 구매한 고객만" },
      ].map((opt) => {
        const selected = form.target_type === opt.value;
        return (
          <button key={opt.value} type="button" onClick={() => set("target_type", opt.value)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
              selected ? "border-violet-400 bg-violet-50" : "border-gray-200 bg-white hover:bg-gray-50"
            }`}>
            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
              selected ? "border-violet-600 bg-violet-600" : "border-gray-300"
            }`}>
              {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <div>
              <p className={`text-sm font-medium ${selected ? "text-violet-700" : "text-gray-700"}`}>{opt.label}</p>
              <p className="text-xs text-gray-400">{opt.desc}</p>
            </div>
          </button>
        );
      })}

      {form.target_type === "product" && (
        <select className="input text-sm mt-1"
          value={form.target_product_id}
          onChange={(e) => set("target_product_id", e.target.value)}>
          <option value="">상품을 선택하세요</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      )}
    </div>
  );
}

function AutomationForm({ initial, onSave, onClose }: {
  initial?: Automation;
  onSave: (form: FormState) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>({
    title: initial?.title ?? "",
    trigger_type: initial?.trigger_type ?? "purchase",
    days_after: initial?.days_after?.toString() ?? "7",
    message_template: initial?.message_template ?? "",
    is_active: initial?.is_active ?? true,
    target_type: initial?.target_type ?? "auto",
    target_product_id: initial?.target_product_id ?? "",
    channel_type: initial?.channel_type ?? "sms",
    kakao_template_code: initial?.kakao_template_code ?? "",
    kakao_custom_message: "",
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [kakaoTemplates, setKakaoTemplates] = useState<KakaoTemplate[]>([]);
  const [kakaoConnected, setKakaoConnected] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [productsRes, kakaoStatusRes, kakaoTemplatesRes] = await Promise.allSettled([
        supabase.from("products").select("id, title").eq("creator_id", user.id).eq("is_active", true),
        fetch(`${API_URL}/api/kakao/channel/status`, { headers: { "creator-id": user.id } }),
        fetch(`${API_URL}/api/kakao/templates`, { headers: { "creator-id": user.id } }),
      ]);

      if (productsRes.status === "fulfilled") setProducts(productsRes.value.data ?? []);

      if (kakaoStatusRes.status === "fulfilled" && kakaoStatusRes.value.ok) {
        const data = await kakaoStatusRes.value.json();
        setKakaoConnected(data.connected);
      } else {
        setKakaoConnected(false);
      }

      if (kakaoTemplatesRes.status === "fulfilled" && kakaoTemplatesRes.value.ok) {
        const data = await kakaoTemplatesRes.value.json();
        setKakaoTemplates(data);
      }
    })();
  }, []);

  useEffect(() => {
    if (form.trigger_type === "purchase" || form.trigger_type === "cart_abandon") {
      setForm((f) => ({ ...f, target_type: "auto" }));
    } else if (form.target_type === "auto") {
      setForm((f) => ({ ...f, target_type: "all" }));
    }
  }, [form.trigger_type]);

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function insertVar(v: string) {
    const el = textareaRef.current;
    if (!el) { set("message_template", form.message_template + v); return; }
    const s = el.selectionStart ?? form.message_template.length;
    const e = el.selectionEnd ?? form.message_template.length;
    set("message_template", form.message_template.slice(0, s) + v + form.message_template.slice(e));
    setTimeout(() => { el.selectionStart = el.selectionEnd = s + v.length; el.focus(); }, 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.message_template.trim()) return;
    if (form.trigger_type === "days_after" && form.target_type === "product" && !form.target_product_id) {
      alert("특정 상품을 선택해주세요.");
      return;
    }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">
            {initial ? "자동화 편집" : "자동화 추가"}
          </h2>
          <button type="button" onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto">
          <div className="px-6 py-5 space-y-5">

            {/* 제목 */}
            <div>
              <label className="label">자동화 이름 *</label>
              <input type="text" className="input"
                placeholder="예: 구매 감사 메시지, VIP 재구매 유도"
                value={form.title} onChange={(e) => set("title", e.target.value)} required />
            </div>

            {/* 발송 조건 */}
            <div>
              <label className="label">발송 조건 *</label>
              <div className="space-y-2">
                {TRIGGER_OPTIONS.map((opt) => {
                  const selected = form.trigger_type === opt.value;
                  return (
                    <button key={opt.value} type="button"
                      onClick={() => set("trigger_type", opt.value)}
                      className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-colors ${
                        selected ? "border-violet-400 bg-violet-50" : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}>
                      <span className="text-lg flex-shrink-0">{opt.emoji}</span>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${selected ? "text-violet-700" : "text-gray-700"}`}>{opt.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                      </div>
                      {selected && <span className="text-violet-600 text-xs font-medium self-center">선택됨</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* D+N 일수 */}
            {form.trigger_type === "days_after" && (
              <div>
                <label className="label">구매 후 며칠 뒤?</label>
                <div className="flex items-center gap-3">
                  <input type="number" className="input w-28" min="1" max="365"
                    value={form.days_after}
                    onChange={(e) => set("days_after", e.target.value)} required />
                  <span className="text-sm text-gray-500">일 후 발송</span>
                </div>
              </div>
            )}

            {/* 수신 대상 */}
            <div>
              <label className="label">수신 대상</label>
              <SegmentSection form={form} set={set} products={products} />
            </div>

            {/* 발송 채널 선택 */}
            <div>
              <label className="label">발송 채널</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "sms" as ChannelType, label: "📱 SMS", desc: "즉시 발송 가능" },
                  { value: "kakao" as ChannelType, label: "💬 카카오 알림톡", desc: "채널 연동 필요" },
                ].map((ch) => {
                  const selected = form.channel_type === ch.value;
                  return (
                    <button key={ch.value} type="button" onClick={() => set("channel_type", ch.value)}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        selected ? "border-violet-400 bg-violet-50" : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}>
                      <p className={`text-sm font-medium ${selected ? "text-violet-700" : "text-gray-700"}`}>{ch.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{ch.desc}</p>
                    </button>
                  );
                })}
              </div>

              {/* 카카오 미연동 안내 */}
              {form.channel_type === "kakao" && kakaoConnected === false && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2">
                  <span className="text-base flex-shrink-0">⚠️</span>
                  <div>
                    <p className="text-xs font-medium text-amber-800">카카오 채널 연동이 필요합니다</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      연동 관리 페이지에서 카카오 비즈니스 채널을 먼저 연동해주세요.
                    </p>
                    <a href="/dashboard/connect" className="text-xs text-violet-600 font-medium mt-1 block">
                      연동 관리 바로가기 →
                    </a>
                  </div>
                </div>
              )}

              {/* 카카오 연동 완료: 템플릿 선택 */}
              {form.channel_type === "kakao" && kakaoConnected === true && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="label">알림톡 템플릿</label>
                    <select className="input text-sm" value={form.kakao_template_code}
                      onChange={(e) => set("kakao_template_code", e.target.value)} required={form.channel_type === "kakao"}>
                      <option value="">템플릿을 선택하세요</option>
                      {kakaoTemplates.map((t) => (
                        <option key={t.code} value={t.code}>
                          {t.name} {t.status !== "approved" ? "(심사 중)" : ""}
                        </option>
                      ))}
                    </select>
                    {form.kakao_template_code && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-xs text-gray-500 font-mono leading-relaxed">
                          {kakaoTemplates.find((t) => t.code === form.kakao_template_code)?.content}
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="label">{"#{메시지} 내용 (자유 입력)"}</label>
                    <textarea value={form.kakao_custom_message}
                      onChange={(e) => set("kakao_custom_message", e.target.value)}
                      rows={3} className="input resize-none text-sm"
                      placeholder="템플릿의 #{메시지} 자리에 들어갈 내용을 입력하세요" />
                  </div>
                </div>
              )}
            </div>

            {/* SMS 메시지 (SMS 채널일 때) */}
            {form.channel_type === "sms" && (
              <div>
                <label className="label">메시지 *</label>
                <div className="flex gap-1.5 mb-2 flex-wrap">
                  {SMS_VARIABLES.map((v) => (
                    <button key={v} type="button" onClick={() => insertVar(v)}
                      className="text-xs bg-violet-50 text-violet-600 border border-violet-200 px-2 py-1 rounded-lg hover:bg-violet-100 font-mono">
                      {v}
                    </button>
                  ))}
                  <span className="text-xs text-gray-400 self-center ml-1">← 클릭하면 삽입</span>
                </div>
                <textarea ref={textareaRef} value={form.message_template}
                  onChange={(e) => set("message_template", e.target.value)}
                  rows={4} className="input resize-none text-sm leading-relaxed"
                  placeholder="발송할 메시지를 입력하세요..." required={form.channel_type === "sms"} />
                <p className="text-xs text-gray-400 mt-1.5">
                  {form.message_template.length}자
                  {form.message_template.length > 80 && <span className="text-amber-500 ml-2">· 80자 초과 시 LMS 요금</span>}
                </p>
              </div>
            )}

            {/* 미리보기 */}
            {form.channel_type === "sms" && form.message_template && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs font-medium text-gray-400 mb-2">미리보기</p>
                <p className="text-sm text-gray-700 leading-relaxed">{previewMessage(form.message_template)}</p>
              </div>
            )}

            {/* 활성화 */}
            <div className="flex items-center justify-between py-3 border-t border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-800">저장 후 즉시 활성화</p>
                <p className="text-xs text-gray-400 mt-0.5">비활성화 시 발송되지 않습니다</p>
              </div>
              <Toggle active={form.is_active} onChange={() => set("is_active", !form.is_active)} />
            </div>
          </div>

          <div className="flex gap-2 px-6 pb-6 flex-shrink-0">
            <button type="submit"
              disabled={saving || !form.title.trim() || (form.channel_type === "sms" && !form.message_template.trim()) || (form.channel_type === "kakao" && !form.kakao_template_code)}
              className="btn-primary flex-1">
              {saving ? "저장 중..." : initial ? "수정 저장" : "자동화 추가"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">취소</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TestSendPanel() {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("안녕하세요 {{이름}}님, CRM 테스트 메시지입니다.");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  async function handleTest() {
    setSending(true);
    setResult(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setResult({ ok: false, msg: "로그인이 필요합니다" }); setSending(false); return; }

      const res = await fetch(`${API_URL}/api/crm/test-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "creator-id": user.id },
        body: JSON.stringify({ phone: phone.replace(/-/g, ""), message }),
      });
      const data = await res.json();
      setResult(data.ok
        ? { ok: true, msg: `발송 성공! ` }
        : { ok: false, msg: `실패: ${data.error ?? "알 수 없는 오류"}` }
      );
    } catch {
      setResult({ ok: false, msg: "백엔드 서버가 꺼져 있습니다. localhost:8000을 먼저 실행하세요." });
    }
    setSending(false);
  }

  return (
    <div className="mt-4 bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-base">🧪</span>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-800">SMS 연동 테스트</p>
            <p className="text-xs text-gray-400">백엔드 서버 + Solapi 연동이 정상인지 확인합니다</p>
          </div>
        </div>
        <span className="text-gray-400 text-sm">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-50 pt-4 space-y-3">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 leading-relaxed">
            <p className="font-semibold mb-1">테스트 전 확인사항</p>
            <p>1. 백엔드 실행: <code className="bg-blue-100 px-1 rounded">cd backend → uvicorn app.main:app --reload --port 8000</code></p>
            <p className="mt-1">2. 수신 번호를 입력하고 발송 버튼 클릭</p>
            <p className="mt-1">3. SMS 수신 확인 → Solapi 정상 연동 완료</p>
          </div>

          <div>
            <label className="label">수신 번호</label>
            <input type="tel" className="input" placeholder="010-1234-5678"
              value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="label">테스트 메시지</label>
            <textarea className="input resize-none text-sm" rows={3}
              value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>

          {result && (
            <div className={`p-3 rounded-xl text-xs font-medium ${
              result.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
            }`}>
              {result.ok ? "✅ " : "❌ "}{result.msg}
            </div>
          )}

          <button type="button" onClick={handleTest}
            disabled={sending || !phone || !message}
            className="btn-primary w-full">
            {sending ? "발송 중..." : "테스트 SMS 발송"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function CrmPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Automation | null>(null);
  const [toast, setToast] = useState("");

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }

  async function getUser() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  useEffect(() => {
    (async () => {
      const user = await getUser();
      if (!user) return;
      const supabase = createClient();
      const { data } = await supabase.from("crm_scenarios").select("*")
        .eq("creator_id", user.id).order("created_at", { ascending: true });
      setAutomations((data as Automation[]) ?? []);
    })();
  }, []);

  async function handleSave(form: FormState) {
    const user = await getUser();
    if (!user) return;
    const supabase = createClient();

    const payload = {
      creator_id: user.id,
      title: form.title.trim(),
      trigger_type: form.trigger_type,
      days_after: form.trigger_type === "days_after" ? parseInt(form.days_after) || 7 : null,
      message_template: form.message_template.trim(),
      is_active: form.is_active,
      target_type: form.target_type,
      target_product_id: form.target_type === "product" && form.target_product_id ? form.target_product_id : null,
      channel_type: form.channel_type,
      kakao_template_code: form.channel_type === "kakao" ? form.kakao_template_code : null,
    };

    if (editTarget) {
      const { data } = await supabase.from("crm_scenarios").update(payload)
        .eq("id", editTarget.id).eq("creator_id", user.id).select().single();
      if (data) setAutomations((prev) => prev.map((a) => a.id === editTarget.id ? data as Automation : a));
      flash("수정됐습니다");
      setEditTarget(null);
    } else {
      const { data } = await supabase.from("crm_scenarios").insert(payload).select().single();
      if (data) setAutomations((prev) => [...prev, data as Automation]);
      flash("자동화가 추가됐습니다");
    }
    setShowForm(false);
  }

  async function handleToggle(automation: Automation) {
    const next = !automation.is_active;
    setAutomations((prev) => prev.map((a) => a.id === automation.id ? { ...a, is_active: next } : a));
    const user = await getUser();
    if (!user) return;
    const supabase = createClient();
    await supabase.from("crm_scenarios").update({ is_active: next })
      .eq("id", automation.id).eq("creator_id", user.id);
    flash(next ? "활성화됐습니다" : "비활성화됐습니다");
  }

  async function handleDelete(automation: Automation) {
    if (!confirm(`"${automation.title}" 자동화를 삭제할까요?`)) return;
    setAutomations((prev) => prev.filter((a) => a.id !== automation.id));
    const user = await getUser();
    if (!user) return;
    const supabase = createClient();
    await supabase.from("crm_scenarios").delete().eq("id", automation.id).eq("creator_id", user.id);
    flash("삭제됐습니다");
  }

  function targetLabel(a: Automation) {
    if (a.target_type === "auto") return "자동";
    if (a.target_type === "all") return "전체 구매자";
    if (a.target_type === "product") return "특정 상품 구매자";
    return "";
  }

  const activeCount = automations.filter((a) => a.is_active).length;

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM 자동화</h1>
          <p className="text-sm text-gray-400 mt-1">구매자에게 자동 발송되는 메시지를 직접 만들고 관리합니다</p>
        </div>
        <div className="flex items-center gap-3">
          {toast && (
            <span className="text-sm text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg font-medium">✓ {toast}</span>
          )}
          <button type="button" onClick={() => { setEditTarget(null); setShowForm(true); }}
            className="btn-primary">+ 자동화 추가</button>
        </div>
      </div>

      {automations.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "전체", value: automations.length },
            { label: "활성화", value: activeCount },
            { label: "비활성", value: automations.length - activeCount },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {automations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <p className="text-3xl mb-3">📩</p>
          <p className="text-sm font-medium text-gray-700">아직 자동화가 없어요</p>
          <p className="text-xs text-gray-400 mt-1 mb-5">구매 완료 메시지, 리마인더 등을 직접 만들어 보세요</p>
          <button type="button" onClick={() => setShowForm(true)} className="btn-primary">+ 첫 자동화 만들기</button>
        </div>
      ) : (
        <div className="space-y-3">
          {automations.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start gap-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${
                  a.is_active ? "bg-violet-50" : "bg-gray-50"
                }`}>
                  {triggerEmoji(a.trigger_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{triggerLabel(a)}</span>
                    <span className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full">{targetLabel(a)}</span>
                    {!a.is_active && <span className="text-xs text-gray-400">비활성</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {previewMessage(a.message_template)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button type="button" onClick={() => { setEditTarget(a); setShowForm(true); }}
                    className="text-xs text-gray-400 hover:text-violet-600 px-2 py-1 rounded-lg hover:bg-violet-50 transition-colors">
                    편집
                  </button>
                  <button type="button" onClick={() => handleDelete(a)}
                    className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                    삭제
                  </button>
                  <Toggle active={a.is_active} onChange={() => handleToggle(a)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
        <p className="text-xs font-semibold text-amber-800 mb-1">발신번호: 010-8571-1007</p>
        <p className="text-xs text-amber-600">구매 완료 즉시 자동화는 구매 시 바로 발송됩니다. D+N은 백엔드 서버 실행 시 일괄 발송됩니다.</p>
      </div>

      {/* SMS 연동 테스트 */}
      <TestSendPanel />

      {showForm && (
        <AutomationForm
          initial={editTarget ?? undefined}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}
    </div>
  );
}
