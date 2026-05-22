"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface KakaoChannel {
  id: string;
  channel_search_id: string;
  channel_name: string;
  status: "pending" | "active" | "inactive";
}

const STATUS_LABEL = {
  pending: { text: "수락 대기 중", color: "bg-amber-50 text-amber-700 border-amber-200" },
  active: { text: "연동 완료", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  inactive: { text: "연동 실패", color: "bg-red-50 text-red-600 border-red-200" },
};

function KakaoConnectCard() {
  const [channel, setChannel] = useState<KakaoChannel | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function getUser() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  async function loadStatus() {
    setLoading(true);
    try {
      const user = await getUser();
      if (!user) return;
      const res = await fetch(`${API_URL}/api/kakao/channel/status`, {
        headers: { "creator-id": user.id },
      });
      if (res.ok) {
        const data = await res.json();
        setChannel(data.channel);
      }
    } catch {
      // 백엔드 미실행 시 무시
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStatus(); }, []);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!searchId.startsWith("@")) {
      setMessage({ ok: false, text: "채널 검색 ID는 @로 시작해야 합니다 (예: @홍길동코치)" });
      return;
    }
    setSending(true);
    setMessage(null);
    try {
      const user = await getUser();
      if (!user) return;
      const res = await fetch(`${API_URL}/api/kakao/channel/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "creator-id": user.id },
        body: JSON.stringify({ channel_search_id: searchId, phone_number: phone.replace(/-/g, "") }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ ok: true, text: data.message });
        await loadStatus();
      } else {
        setMessage({ ok: false, text: data.detail ?? "요청 중 오류가 발생했습니다" });
      }
    } catch {
      setMessage({ ok: false, text: "백엔드 서버가 꺼져 있습니다. localhost:8000을 먼저 실행하세요." });
    } finally {
      setSending(false);
    }
  }

  async function handleCheckStatus() {
    setChecking(true);
    await loadStatus();
    setChecking(false);
    setMessage({ ok: true, text: "상태를 새로고침했습니다." });
  }

  async function handleDisconnect() {
    if (!confirm("카카오 채널 연동을 해제할까요?")) return;
    const user = await getUser();
    if (!user) return;
    await fetch(`${API_URL}/api/kakao/channel`, {
      method: "DELETE",
      headers: { "creator-id": user.id },
    });
    setChannel(null);
    setMessage({ ok: true, text: "연동이 해제됐습니다." });
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center text-xl">💬</div>
          <div>
            <p className="text-sm font-semibold text-gray-900">카카오 알림톡</p>
            <p className="text-xs text-gray-400 mt-0.5">비즈니스 채널을 연동하면 알림톡으로 자동 발송됩니다</p>
          </div>
        </div>
        {channel && (
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_LABEL[channel.status].color}`}>
            {STATUS_LABEL[channel.status].text}
          </span>
        )}
      </div>

      {/* 연동 완료 상태 */}
      {channel?.status === "active" && (
        <div className="space-y-3">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-emerald-800 mb-1">연동된 채널</p>
            <p className="text-sm text-emerald-700 font-medium">{channel.channel_search_id}</p>
            {channel.channel_name && channel.channel_name !== channel.channel_search_id && (
              <p className="text-xs text-emerald-600 mt-0.5">{channel.channel_name}</p>
            )}
          </div>
          <p className="text-xs text-gray-400">
            ✅ 카카오 알림톡 발송이 가능합니다. CRM 자동화에서 발송 채널을 "카카오 알림톡"으로 선택하세요.
          </p>
          <button type="button" onClick={handleDisconnect}
            className="text-xs text-red-400 hover:text-red-600 transition-colors">
            연동 해제
          </button>
        </div>
      )}

      {/* 대기 중 상태 */}
      {channel?.status === "pending" && (
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-amber-800">수락 대기 중: {channel.channel_search_id}</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              카카오 채널 관리자 페이지에서 대행사(Solapi) 초대를 수락하면 연동이 완료됩니다.
            </p>
            <ol className="text-xs text-amber-700 list-decimal list-inside space-y-1">
              <li>카카오 비즈니스 → 채널 관리자 접속</li>
              <li>설정 → 대행사 초대 → 수락 클릭</li>
              <li>아래 "상태 새로고침" 버튼으로 확인</li>
            </ol>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleCheckStatus} disabled={checking}
              className="btn-primary text-sm">
              {checking ? "확인 중..." : "상태 새로고침"}
            </button>
            <button type="button" onClick={handleDisconnect}
              className="btn-secondary text-sm">취소</button>
          </div>
        </div>
      )}

      {/* 미연동 상태: 연동 폼 */}
      {!channel && (
        <form onSubmit={handleConnect} className="space-y-4">
          {/* 연동 4단계 안내 */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2">
            <p className="text-xs font-semibold text-gray-700 mb-2">연동 순서</p>
            {[
              { step: "1", text: "business.kakao.com 에서 카카오 비즈니스 채널 개설" },
              { step: "2", text: "아래 채널 정보 입력 후 \"대행사 초대 발송\" 클릭" },
              { step: "3", text: "카카오 채널 관리자 페이지에서 대행사 초대 수락" },
              { step: "4", text: "연동 완료 → MyVerse가 해당 채널로 알림톡 발송" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-violet-100 text-violet-700 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-semibold">
                  {item.step}
                </span>
                <p className="text-xs text-gray-600">{item.text}</p>
              </div>
            ))}
          </div>

          <div>
            <label className="label">카카오 채널 검색 ID</label>
            <input type="text" className="input" placeholder="@홍길동코치"
              value={searchId} onChange={(e) => setSearchId(e.target.value)} required />
            <p className="text-xs text-gray-400 mt-1.5">카카오 채널 관리자 → 채널 정보에서 확인</p>
          </div>
          <div>
            <label className="label">채널 대표 전화번호</label>
            <input type="tel" className="input" placeholder="010-1234-5678"
              value={phone} onChange={(e) => setPhone(e.target.value)} required />
            <p className="text-xs text-gray-400 mt-1.5">Solapi 대행사 초대 인증에 사용됩니다</p>
          </div>

          {message && (
            <div className={`p-3 rounded-xl text-xs ${message.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
              {message.text}
            </div>
          )}

          <button type="submit" disabled={sending || !searchId || !phone} className="btn-primary w-full">
            {sending ? "초대 발송 중..." : "대행사 초대 발송"}
          </button>
        </form>
      )}

      {message && channel && (
        <p className={`mt-3 text-xs ${message.ok ? "text-emerald-600" : "text-red-500"}`}>{message.text}</p>
      )}
    </div>
  );
}

const SMS_CONNECTIONS = [
  { name: "Solapi SMS", desc: "CRM 자동화 문자 발송", status: "active", emoji: "📱" },
];

export default function ConnectPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">연동 관리</h1>
        <p className="text-sm text-gray-400 mt-1">외부 서비스를 연결하면 더 많은 기능을 사용할 수 있습니다</p>
      </div>

      <div className="space-y-4">
        {/* SMS */}
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-xl">📱</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">Solapi SMS</p>
              <p className="text-xs text-gray-400 mt-0.5">CRM 자동화 문자 발송 · 발신번호: 010-8571-1007</p>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
              연동 완료
            </span>
          </div>
        </div>

        {/* 카카오 알림톡 */}
        <KakaoConnectCard />

        {/* Instagram (미연동) */}
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-xl">📸</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">Instagram</p>
              <p className="text-xs text-gray-400 mt-0.5">Reels 인사이트, 프로필 방문자 분석</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-gray-50 text-gray-400 border-gray-200">
                Meta 심사 대기
              </span>
              <button className="text-xs text-gray-400 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                연동하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
