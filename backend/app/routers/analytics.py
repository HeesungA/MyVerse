from fastapi import APIRouter, HTTPException, Header, Query
from typing import Optional
from datetime import datetime, timedelta, timezone
from app.database import get_db
from app.models import FunnelData

router = APIRouter()

BENCHMARK = {
    "page_to_content": 0.45,
    "content_to_cart": 0.20,
    "cart_to_purchase": 0.60,
}


def _count_events(db, creator_id: str, event_type: str, since: datetime) -> int:
    res = (
        db.table("events")
        .select("id", count="exact")
        .eq("creator_id", creator_id)
        .eq("event_type", event_type)
        .gte("created_at", since.isoformat())
        .execute()
    )
    return res.count or 0


def _find_bottleneck(rates: dict) -> str:
    """벤치마크 대비 가장 낮은 단계를 병목으로 반환"""
    gaps = {
        "page_to_content": BENCHMARK["page_to_content"] - rates.get("page_to_content", 0),
        "content_to_cart": BENCHMARK["content_to_cart"] - rates.get("content_to_cart", 0),
        "cart_to_purchase": BENCHMARK["cart_to_purchase"] - rates.get("cart_to_purchase", 0),
    }
    bottleneck = max(gaps, key=gaps.get)
    labels = {
        "page_to_content": "스토어 방문 → 상품 조회 (콘텐츠 매력도 개선 필요)",
        "content_to_cart": "상품 조회 → 장바구니 (가격/설명 설득력 개선 필요)",
        "cart_to_purchase": "장바구니 → 구매 (결제 허들 낮추기 필요)",
    }
    return labels[bottleneck] if gaps[bottleneck] > 0 else "병목 없음 (모든 단계 벤치마크 초과)"


@router.get("/funnel", response_model=FunnelData)
async def get_funnel(
    creator_id: Optional[str] = Header(None),
    period_days: int = Query(7, ge=1, le=90)
):
    if not creator_id:
        raise HTTPException(status_code=401, detail="creator_id 헤더가 필요합니다")

    db = get_db()
    since = datetime.now(timezone.utc) - timedelta(days=period_days)

    page_views = _count_events(db, creator_id, "page_view", since)
    view_contents = _count_events(db, creator_id, "view_content", since)
    add_to_carts = _count_events(db, creator_id, "add_to_cart", since)
    purchases = _count_events(db, creator_id, "purchase", since)

    # 매출 합계
    revenue_res = (
        db.table("orders")
        .select("amount")
        .eq("creator_id", creator_id)
        .eq("status", "completed")
        .gte("created_at", since.isoformat())
        .execute()
    )
    revenue = sum(row["amount"] for row in revenue_res.data)

    rates = {
        "page_to_content": round(view_contents / page_views, 4) if page_views > 0 else 0.0,
        "content_to_cart": round(add_to_carts / view_contents, 4) if view_contents > 0 else 0.0,
        "cart_to_purchase": round(purchases / add_to_carts, 4) if add_to_carts > 0 else 0.0,
        "overall": round(purchases / page_views, 4) if page_views > 0 else 0.0,
    }

    return FunnelData(
        period_days=period_days,
        page_views=page_views,
        view_contents=view_contents,
        add_to_carts=add_to_carts,
        purchases=purchases,
        revenue=revenue,
        conversion_rates=rates,
        bottleneck=_find_bottleneck(rates),
    )


@router.get("/summary")
async def get_summary(creator_id: Optional[str] = Header(None)):
    if not creator_id:
        raise HTTPException(status_code=401, detail="creator_id 헤더가 필요합니다")
    db = get_db()

    # 전체 매출
    revenue_res = db.table("orders").select("amount").eq("creator_id", creator_id).eq("status", "completed").execute()
    total_revenue = sum(r["amount"] for r in revenue_res.data)
    total_orders = len(revenue_res.data)

    # 총 구매자
    customers_res = db.table("customers").select("id", count="exact").eq("creator_id", creator_id).execute()
    total_customers = customers_res.count or 0

    # 활성 상품
    products_res = db.table("products").select("id", count="exact").eq("creator_id", creator_id).eq("is_active", True).execute()
    active_products = products_res.count or 0

    # 최근 7일 퍼널
    since = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_orders_res = db.table("orders").select("amount").eq("creator_id", creator_id).eq("status", "completed").gte("created_at", since).execute()
    weekly_revenue = sum(r["amount"] for r in recent_orders_res.data)

    return {
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "total_customers": total_customers,
        "active_products": active_products,
        "weekly_revenue": weekly_revenue,
    }


@router.get("/store")
async def get_store_settings(creator_id: Optional[str] = Header(None)):
    if not creator_id:
        raise HTTPException(status_code=401, detail="creator_id 헤더가 필요합니다")
    db = get_db()
    res = db.table("creators").select("*").eq("id", creator_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="크리에이터를 찾을 수 없습니다")
    return res.data


@router.patch("/store")
async def update_store(body: dict, creator_id: Optional[str] = Header(None)):
    if not creator_id:
        raise HTTPException(status_code=401, detail="creator_id 헤더가 필요합니다")
    db = get_db()

    allowed = {"store_slug", "name", "instagram_handle"}
    update_data = {k: v for k, v in body.items() if k in allowed}

    if "store_slug" in update_data:
        existing = db.table("creators").select("id").eq("store_slug", update_data["store_slug"]).neq("id", creator_id).execute()
        if existing.data:
            raise HTTPException(status_code=409, detail="이미 사용 중인 슬러그입니다")

    res = db.table("creators").update(update_data).eq("id", creator_id).execute()
    return res.data[0]
