"""
데이터 집계 서비스 — AI 엔진이 소비할 raw data 생성
"""
from datetime import datetime, timedelta
from typing import Any
from supabase import create_client
from app.config import settings

def _client():
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


async def get_funnel_data(creator_id: str) -> dict[str, Any]:
    """퍼널 전환율 데이터: 방문 → 상품조회 → 장바구니 → 구매"""
    db = _client()

    # 최근 30일 이벤트 집계
    since = (datetime.utcnow() - timedelta(days=30)).isoformat()

    events_res = db.table("events") \
        .select("event_type") \
        .eq("creator_id", creator_id) \
        .gte("created_at", since) \
        .execute()

    events = events_res.data or []
    counts = {}
    for e in events:
        t = e["event_type"]
        counts[t] = counts.get(t, 0) + 1

    page_view    = counts.get("page_view", 0)
    product_view = counts.get("product_view", 0)
    add_to_cart  = counts.get("add_to_cart", 0)
    purchase     = counts.get("purchase", 0)

    def rate(a, b):
        return round(a / b * 100, 1) if b > 0 else 0.0

    return {
        "period_days": 30,
        "page_view": page_view,
        "product_view": product_view,
        "add_to_cart": add_to_cart,
        "purchase": purchase,
        "view_to_product_rate": rate(product_view, page_view),
        "product_to_cart_rate": rate(add_to_cart, product_view),
        "cart_to_purchase_rate": rate(purchase, add_to_cart),
        "overall_conversion_rate": rate(purchase, page_view),
    }


async def get_revenue_data(creator_id: str) -> dict[str, Any]:
    """매출 데이터: 총매출, 주문수, AOV, 상품별 매출"""
    db = _client()

    since_30 = (datetime.utcnow() - timedelta(days=30)).isoformat()
    since_60 = (datetime.utcnow() - timedelta(days=60)).isoformat()

    # 최근 30일 주문
    orders_res = db.table("orders") \
        .select("id, total_amount, product_id, created_at") \
        .eq("creator_id", creator_id) \
        .eq("status", "paid") \
        .gte("created_at", since_30) \
        .execute()

    orders = orders_res.data or []
    total_revenue = sum(o["total_amount"] for o in orders)
    order_count   = len(orders)
    aov           = round(total_revenue / order_count, 0) if order_count > 0 else 0

    # 상품별 매출 집계
    by_product: dict[str, dict] = {}
    for o in orders:
        pid = o["product_id"]
        if pid not in by_product:
            by_product[pid] = {"product_id": pid, "revenue": 0, "orders": 0}
        by_product[pid]["revenue"] += o["total_amount"]
        by_product[pid]["orders"]  += 1

    # 상품명 조회
    if by_product:
        pids = list(by_product.keys())
        prod_res = db.table("products").select("id, name").in_("id", pids).execute()
        for p in (prod_res.data or []):
            if p["id"] in by_product:
                by_product[p["id"]]["name"] = p["name"]

    # 이전 30일 매출 (성장률 계산)
    prev_res = db.table("orders") \
        .select("total_amount") \
        .eq("creator_id", creator_id) \
        .eq("status", "paid") \
        .gte("created_at", since_60) \
        .lt("created_at", since_30) \
        .execute()

    prev_revenue = sum(o["total_amount"] for o in (prev_res.data or []))
    growth_rate  = round((total_revenue - prev_revenue) / prev_revenue * 100, 1) \
                   if prev_revenue > 0 else None

    return {
        "period_days": 30,
        "total_revenue": total_revenue,
        "order_count": order_count,
        "average_order_value": aov,
        "prev_period_revenue": prev_revenue,
        "growth_rate_percent": growth_rate,
        "top_products": sorted(by_product.values(), key=lambda x: x["revenue"], reverse=True)[:5],
    }


async def get_crm_data(creator_id: str) -> dict[str, Any]:
    """CRM 효과 데이터: 발송수, 응답률, 재구매율, 자동화 현황"""
    db = _client()

    since = (datetime.utcnow() - timedelta(days=30)).isoformat()

    # 발송 메시지 집계
    msg_res = db.table("crm_messages") \
        .select("id, status, sent_at") \
        .eq("creator_id", creator_id) \
        .gte("sent_at", since) \
        .execute()

    messages = msg_res.data or []
    total_sent = len(messages)
    delivered  = sum(1 for m in messages if m["status"] == "delivered")
    failed     = sum(1 for m in messages if m["status"] == "failed")

    # 자동화 시나리오 현황
    scen_res = db.table("crm_scenarios") \
        .select("id, title, is_active, trigger_type") \
        .eq("creator_id", creator_id) \
        .execute()

    scenarios   = scen_res.data or []
    active_cnt  = sum(1 for s in scenarios if s["is_active"])
    inactive_cnt = len(scenarios) - active_cnt

    # 고객 수
    cust_res = db.table("customers") \
        .select("id, total_spent, order_count") \
        .eq("creator_id", creator_id) \
        .execute()

    customers = cust_res.data or []
    repeat_buyers = sum(1 for c in customers if (c.get("order_count") or 0) > 1)
    repeat_rate   = round(repeat_buyers / len(customers) * 100, 1) if customers else 0.0

    return {
        "period_days": 30,
        "total_sent": total_sent,
        "delivered": delivered,
        "failed": failed,
        "delivery_rate": round(delivered / total_sent * 100, 1) if total_sent > 0 else 0.0,
        "total_customers": len(customers),
        "repeat_buyers": repeat_buyers,
        "repeat_purchase_rate": repeat_rate,
        "active_scenarios": active_cnt,
        "inactive_scenarios": inactive_cnt,
        "scenario_list": [
            {"title": s.get("title", ""), "trigger": s["trigger_type"], "active": s["is_active"]}
            for s in scenarios
        ],
    }


async def get_instagram_mock() -> dict[str, Any]:
    """Instagram Insights Mock 데이터 (Meta 승인 전 임시)"""
    return {
        "source": "mock",
        "followers": 12400,
        "follower_growth_30d": 340,
        "avg_reach_per_post": 3800,
        "avg_engagement_rate": 4.2,
        "profile_visits_30d": 2100,
        "link_clicks_30d": 870,
        "top_content_types": [
            {"type": "Reel",      "avg_reach": 5200, "avg_engagement": 5.1},
            {"type": "Carousel",  "avg_reach": 3900, "avg_engagement": 4.8},
            {"type": "Image",     "avg_reach": 2400, "avg_engagement": 3.2},
        ],
        "best_posting_times": ["화요일 저녁 7시", "목요일 오전 11시", "토요일 오전 10시"],
    }
