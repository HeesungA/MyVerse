"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = sessionStorage.getItem("mv_session");
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem("mv_session", id);
  }
  return id;
}

export type EventType = "page_view" | "view_content" | "add_to_cart" | "purchase";

export async function logEvent(
  creatorId: string,
  eventType: EventType,
  productId?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await fetch(`${API_URL}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creator_id: creatorId,
        session_id: getSessionId(),
        event_type: eventType,
        product_id: productId ?? null,
        metadata: metadata ?? {},
      }),
    });
  } catch {
    // 이벤트 로깅 실패는 조용히 무시 (UX 영향 없어야 함)
  }
}
