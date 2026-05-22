"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface OrderRow { id: string; amount: number; created_at: string; products: { id: string; title: string } | null; }
interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  created_at: string;
  orders: OrderRow[];
}
interface Product { id: string; title: string; }

const VARIABLES = ["{{이름}}", "{{상품명}}", "{{가격}}"];

function previewMessage(template: string, customer: Customer) {
  const lastOrder = customer.orders[customer.orders.length - 1];
  return template
    .replace(/{{이름}}/g, customer.name)
    .replace(/{{상품명}}/g, lastOrder?.products?.title ?? "상품")
    .replace(/{{가격}}/g, lastOrder ? `₩${lastOrder.amount.toLocaleString()}` : "");
}

function SendModal({ customers, onClose }: { customers: Customer[]; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  function insertVar(v: string) {
    setMessage((m) => m + v);
  }

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSending(false); return; }

    let sent = 0;
    let failed = 0;

    for (const customer of customers) {
      const text = previewMessage(message, customer);
      try {
        const res = await fetch(`${API_URL}/api/crm/send-direct`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "creator-id": user.id },
          body: JSON.stringify({ phone: customer.phone, text }),
        });
        if (res.ok) sent++; else failed++;
      } catch { failed++; }
    }

    setResult({ sent, failed });
    setSending(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">수동 발송</h2>
            <p className="text-xs text-gray-400 mt-0.5">{customers.length}명에게 발송합니다</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        {result ? (
          <div className="p-6 text-center">
            <p className="text-3xl mb-3">{result.failed === 0 ? "✅" : "⚠️"}</p>
            <p className="text-sm font-semibold text-gray-900">발송 완료</p>
            <p className="text-xs text-gray-500 mt-2">성공 {result.sent}건 · 실패 {result.failed}건</p>
            <button type="button" onClick={onClose} className="btn-primary mt-5 w-full">확인</button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-2">변수 삽입</p>
              <div className="flex gap-1.5 flex-wrap">
                {VARIABLES.map((v) => (
                  <button key={v} type="button" onClick={() => insertVar(v)}
                    className="text-xs bg-violet-50 text-violet-600 border border-violet-200 px-2 py-1 rounded-lg hover:bg-violet-100 font-mono">
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)}
              rows={5} className="input resize-none text-sm leading-relaxed"
              placeholder="발송할 메시지를 입력하세요..." />
            <p className="text-xs text-gray-400">{message.length}자{message.length > 80 && <span className="text-amber-500 ml-2">· LMS 요금</span>}</p>
            {message && customers[0] && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs font-medium text-gray-400 mb-1">미리보기 ({customers[0].name}님 기준)</p>
                <p className="text-sm text-gray-700 leading-relaxed">{previewMessage(message, customers[0])}</p>
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={handleSend}
                disabled={sending || !message.trim()}
                className="btn-primary flex-1">
                {sending ? `발송 중...` : `${customers.length}명에게 발송`}
              </button>
              <button type="button" onClick={onClose} className="btn-secondary">취소</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showSend, setShowSend] = useState(false);

  // 필터
  const [filterProduct, setFilterProduct] = useState("");
  const [filterCount, setFilterCount] = useState("all");
  const [filterDays, setFilterDays] = useState("all");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [customersRes, productsRes] = await Promise.all([
        supabase.from("customers")
          .select("id, name, phone, email, created_at, orders(id, amount, created_at, products(id, title))")
          .eq("creator_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("products").select("id, title").eq("creator_id", user.id).eq("is_active", true),
      ]);

      setCustomers((customersRes.data as unknown as Customer[]) ?? []);
      setProducts(productsRes.data ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = customers.filter((c) => {
    if (filterProduct) {
      const hasProd = c.orders.some((o) => o.products?.id === filterProduct);
      if (!hasProd) return false;
    }
    if (filterCount === "1") { if (c.orders.length !== 1) return false; }
    if (filterCount === "2+") { if (c.orders.length < 2) return false; }
    if (filterCount === "3+") { if (c.orders.length < 3) return false; }
    if (filterDays !== "all") {
      const days = parseInt(filterDays);
      const cutoff = new Date(Date.now() - days * 86400000);
      const hasRecent = c.orders.some((o) => new Date(o.created_at) >= cutoff);
      if (!hasRecent) return false;
    }
    return true;
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  }

  const selectedCustomers = customers.filter((c) => selected.has(c.id));
  const totalRevenue = (c: Customer) => c.orders.reduce((s, o) => s + o.amount, 0);
  const lastProduct = (c: Customer) => c.orders[0]?.products?.title ?? "-";

  if (loading) {
    return (
      <div className="p-8 max-w-6xl">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">고객 관리</h1>
          <p className="text-sm text-gray-400 mt-1">총 {customers.length}명의 구매자</p>
        </div>
        {selected.size > 0 && (
          <button type="button" onClick={() => setShowSend(true)} className="btn-primary">
            선택 {selected.size}명에게 발송
          </button>
        )}
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 flex items-center gap-3 flex-wrap">
        <select className="input w-auto text-sm" value={filterProduct}
          onChange={(e) => setFilterProduct(e.target.value)}>
          <option value="">전체 상품</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>

        <select className="input w-auto text-sm" value={filterCount}
          onChange={(e) => setFilterCount(e.target.value)}>
          <option value="all">전체 구매횟수</option>
          <option value="1">1회 구매</option>
          <option value="2+">2회 이상</option>
          <option value="3+">3회 이상 (VIP)</option>
        </select>

        <select className="input w-auto text-sm" value={filterDays}
          onChange={(e) => setFilterDays(e.target.value)}>
          <option value="all">전체 기간</option>
          <option value="7">최근 7일</option>
          <option value="30">최근 30일</option>
          <option value="90">최근 90일</option>
        </select>

        <span className="text-sm text-gray-400 ml-auto">{filtered.length}명 표시 중</span>
      </div>

      {/* 테이블 */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <p className="text-3xl mb-3">👥</p>
          <p className="text-sm text-gray-600">조건에 맞는 구매자가 없어요</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">이름</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">연락처</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">최근 구매 상품</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">구매횟수</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">총 구매액</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">첫 구매일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((c) => (
                <tr key={c.id}
                  className={`hover:bg-gray-50/50 transition-colors ${selected.has(c.id) ? "bg-violet-50/30" : ""}`}>
                  <td className="px-4 py-3.5">
                    <input type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggleSelect(c.id)}
                      className="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-violet-600">{c.name[0]}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{c.name}</p>
                        {c.orders.length >= 3 && (
                          <span className="text-xs text-amber-600 font-medium">VIP</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-500">
                    <p>{c.phone}</p>
                    {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 max-w-[200px] truncate">{lastProduct(c)}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`text-sm font-semibold ${c.orders.length >= 3 ? "text-violet-600" : "text-gray-700"}`}>
                      {c.orders.length}회
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium text-gray-900">
                    ₩{totalRevenue(c).toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-gray-400 text-xs">
                    {new Date(c.created_at).toLocaleDateString("ko-KR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showSend && (
        <SendModal customers={selectedCustomers} onClose={() => { setShowSend(false); setSelected(new Set()); }} />
      )}
    </div>
  );
}
