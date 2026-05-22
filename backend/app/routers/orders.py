from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from app.database import get_db
from app.models import OrderCreate, OrderResponse

router = APIRouter()


@router.post("", response_model=OrderResponse, status_code=201)
async def create_order(body: OrderCreate):
    """Mock 결제: 버튼 클릭 즉시 구매 완료 처리"""
    db = get_db()

    # 상품 조회
    product_res = db.table("products").select("id, price, creator_id").eq("id", body.product_id).eq("is_active", True).single().execute()
    if not product_res.data:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다")
    product = product_res.data

    # 구매자 upsert (동일 크리에이터 + 전화번호)
    customer_res = db.table("customers").upsert({
        "creator_id": body.creator_id,
        "name": body.customer_name,
        "phone": body.customer_phone,
        "email": body.customer_email,
    }, on_conflict="creator_id,phone").execute()
    customer = customer_res.data[0]

    # 주문 생성
    order_res = db.table("orders").insert({
        "creator_id": body.creator_id,
        "customer_id": customer["id"],
        "product_id": body.product_id,
        "amount": product["price"],
        "status": "completed"
    }).execute()
    order = order_res.data[0]

    # 구매 이벤트 기록 (서버 사이드)
    db.table("events").insert({
        "creator_id": body.creator_id,
        "session_id": f"server_{order['id']}",
        "event_type": "purchase",
        "product_id": body.product_id,
        "metadata": {"order_id": order["id"], "amount": product["price"]}
    }).execute()

    return OrderResponse(
        order_id=order["id"],
        customer_id=customer["id"],
        amount=product["price"],
        status="completed"
    )


@router.get("")
async def list_orders(creator_id: Optional[str] = Header(None)):
    if not creator_id:
        raise HTTPException(status_code=401, detail="creator_id 헤더가 필요합니다")
    db = get_db()
    res = (
        db.table("orders")
        .select("*, customers(name, phone, email), products(title, type)")
        .eq("creator_id", creator_id)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data
