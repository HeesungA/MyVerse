"use client";

import { useState, useEffect } from "react";
import { logEvent } from "@/lib/events";
import type { Product } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Step = "detail" | "form" | "success";

interface Props {
  product: Product;
  creatorId: string;
  onClose: () => void;
  onAddToCart: () => void;
}

export default function PurchaseModal({ product, creatorId, onClose, onAddToCart }: Props) {
  const [step, setStep] = useState<Step>("detail");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState("");

  // 장바구니 단계로 넘어갈 때 이벤트 발송
  function handleGoToForm() {
    onAddToCart(); // add_to_cart 이벤트
    setStep("form");
  }

  async function handlePurchase(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 전화번호 정규화
    const phoneClean = phone.replace(/[^0-9]/g, "");
    if (phoneClean.length < 10) {
      setError("올바른 전화번호를 입력해주세요.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creator_id: creatorId,
          product_id: product.id,
          customer_name: name,
          customer_phone: phoneClean,
          customer_email: email || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "구매 처리 중 오류가 발생했습니다.");
      }

      const data = await res.json();
      setOrderId(data.order_id);

      // 구매 완료 이벤트
      logEvent(creatorId, "purchase", product.id, {
        order_id: data.order_id,
        amount: product.price,
      });

      // D+0 CRM 자동 발송 (백엔드)
      fetch(`${API_URL}/api/crm/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "creator-id": creatorId },
        body: JSON.stringify({ order_id: data.order_id, trigger_type: "d0" }),
      }).catch(() => {}); // 발송 실패해도 구매 플로우에 영향 없음

      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // 모달 외부 클릭 닫기
  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            {step === "detail" ? "상품 상세" : step === "form" ? "구매자 정보 입력" : "구매 완료"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ✕
          </button>
        </div>

        {/* 상품 정보 (공통) */}
        <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 border-b border-gray-100">
          <div className="w-12 h-12 bg-brand-50 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
            {product.type === "vod" ? "🎬" : product.type === "coaching" ? "💬" : product.type === "form" ? "📋" : "📄"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{product.title}</p>
            <p className="text-brand-600 font-bold text-sm">₩{product.price.toLocaleString()}</p>
          </div>
        </div>

        {/* Step: 상세 */}
        {step === "detail" && (
          <div className="p-5">
            {product.description && (
              <p className="text-gray-600 text-sm leading-relaxed mb-6">{product.description}</p>
            )}
            <button onClick={handleGoToForm} className="btn-primary w-full">
              구매하기 ₩{product.price.toLocaleString()}
            </button>
          </div>
        )}

        {/* Step: 구매자 정보 */}
        {step === "form" && (
          <form onSubmit={handlePurchase} className="p-5 space-y-4">
            <div>
              <label className="label">이름 *</label>
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
              <label className="label">전화번호 *</label>
              <input
                type="tel"
                className="input"
                placeholder="010-1234-5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">이메일 (선택)</label>
              <input
                type="email"
                className="input"
                placeholder="hello@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

            <div className="pt-2 space-y-2">
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? "처리 중..." : `₩${product.price.toLocaleString()} 결제 완료`}
              </button>
              <p className="text-xs text-gray-400 text-center">
                MVP 테스트 모드 — 실제 결제가 발생하지 않습니다
              </p>
            </div>
          </form>
        )}

        {/* Step: 구매 완료 */}
        {step === "success" && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
              ✅
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">구매가 완료됐어요!</h3>
            <p className="text-gray-500 text-sm mb-2">
              <strong>{name}</strong>님, 감사합니다.
            </p>
            <p className="text-gray-400 text-xs mb-6">주문번호: {orderId.slice(0, 8).toUpperCase()}</p>
            <button onClick={onClose} className="btn-primary w-full">
              스토어로 돌아가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
