"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface OrderRow {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  customers: { name: string; phone: string; email: string | null } | null;
  products: { title: string; type: string } | null;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("orders")
        .select("id, amount, status, created_at, customers(name, phone, email), products(title, type)")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      setOrders((data as unknown as OrderRow[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-8 max-w-5xl">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">주문 내역</h1>
        <p className="text-gray-500 text-sm mt-1">총 {orders.length}건</p>
      </div>

      {orders.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-4">🛒</p>
          <p className="text-gray-600 font-medium">아직 주문이 없어요</p>
          <p className="text-gray-400 text-sm mt-2">스토어를 공유하면 첫 주문이 들어올 거예요</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">구매자</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">상품</th>
                <th className="text-right px-6 py-3 text-gray-500 font-medium">금액</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">상태</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">일시</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{order.customers?.name}</p>
                    <p className="text-gray-400 text-xs">{order.customers?.phone}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{order.products?.title}</td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900">
                    ₩{order.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-green-50 text-green-600 text-xs font-medium px-2.5 py-1 rounded-full">
                      완료
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {new Date(order.created_at).toLocaleDateString("ko-KR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
