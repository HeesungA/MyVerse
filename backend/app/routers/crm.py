from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.services.solapi import send_crm_message

router = APIRouter()

# 기본 메시지 템플릿
DEFAULT_TEMPLATES = {
    "d0": "안녕하세요 {{이름}}님! {{상품명}} 구매해 주셔서 감사합니다 🙏 이용 중 궁금한 점이 있으시면 언제든 연락 주세요.",
    "d3": "{{이름}}님, {{상품명}} 잘 활용하고 계신가요? 더 잘 활용하는 팁을 알려드리고 싶어서 연락드렸어요 😊",
    "d7": "{{이름}}님, 안녕하세요! {{상품명}}과 함께하신 지 일주일이 됐네요. 더 높은 단계로 도약하실 준비가 되셨다면 상위 패키지도 확인해 보세요.",
    "d30": "{{이름}}님! {{상품명}} 구매 후 한 달이 지났어요. 새로운 콘텐츠와 소식이 있어 연락드렸습니다 😄",
    "cart_abandon": "{{이름}}님, 장바구니에 {{상품명}}이 담겨 있어요. 지금 구매하시면 바로 시작하실 수 있습니다!",
    "review": "{{이름}}님, {{상품명}} 어떠셨나요? 솔직한 후기를 남겨주시면 더 좋은 콘텐츠를 만드는 데 큰 도움이 됩니다 🙏",
}


class ScenarioUpsert(BaseModel):
    trigger_type: str
    message_template: str
    is_active: bool


class TriggerRequest(BaseModel):
    order_id: str
    trigger_type: str  # 'd0' | 'd3' | 'd7' | 'd30' | 'cart_abandon' | 'review'


# ── 시나리오 목록 조회 ─────────────────────────────────────
@router.get("/scenarios")
async def list_scenarios(creator_id: Optional[str] = Header(None)):
    if not creator_id:
        raise HTTPException(status_code=401, detail="creator_id 헤더가 필요합니다")

    db = get_db()
    res = db.table("crm_scenarios").select("*").eq("creator_id", creator_id).execute()
    saved = {s["trigger_type"]: s for s in res.data}

    # DB에 없는 트리거는 기본값으로 채워서 반환
    result = []
    for trigger_type, default_template in DEFAULT_TEMPLATES.items():
        if trigger_type in saved:
            result.append(saved[trigger_type])
        else:
            result.append({
                "trigger_type": trigger_type,
                "message_template": default_template,
                "is_active": trigger_type == "d0",  # D+0만 기본 활성화
                "creator_id": creator_id,
            })
    return result


# ── 시나리오 저장 (upsert) ────────────────────────────────
@router.put("/scenarios")
async def upsert_scenario(body: ScenarioUpsert, creator_id: Optional[str] = Header(None)):
    if not creator_id:
        raise HTTPException(status_code=401, detail="creator_id 헤더가 필요합니다")

    db = get_db()
    res = db.table("crm_scenarios").upsert({
        "creator_id": creator_id,
        "trigger_type": body.trigger_type,
        "message_template": body.message_template,
        "is_active": body.is_active,
    }, on_conflict="creator_id,trigger_type").execute()
    return res.data[0]


# ── 발송 트리거 (주문 기반) ───────────────────────────────
@router.post("/trigger")
async def trigger_crm(body: TriggerRequest, creator_id: Optional[str] = Header(None)):
    if not creator_id:
        raise HTTPException(status_code=401, detail="creator_id 헤더가 필요합니다")

    db = get_db()

    # 시나리오 조회 (DB or 기본값)
    scenario_res = db.table("crm_scenarios").select("*").eq("creator_id", creator_id).eq("trigger_type", body.trigger_type).maybeSingle().execute()
    template = (
        scenario_res.data["message_template"]
        if scenario_res.data
        else DEFAULT_TEMPLATES.get(body.trigger_type, "")
    )
    is_active = scenario_res.data["is_active"] if scenario_res.data else (body.trigger_type == "d0")

    if not is_active:
        return {"ok": False, "reason": "시나리오가 비활성화 상태입니다"}

    if not template:
        raise HTTPException(status_code=400, detail="메시지 템플릿이 없습니다")

    # 주문 + 구매자 + 상품 정보 조회
    order_res = db.table("orders").select(
        "id, amount, customers(name, phone), products(title)"
    ).eq("id", body.order_id).eq("creator_id", creator_id).single().execute()

    if not order_res.data:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다")

    order = order_res.data
    customer = order["customers"]
    product = order["products"]

    variables = {
        "이름": customer["name"],
        "상품명": product["title"],
        "가격": f"₩{order['amount']:,}",
    }

    # SMS 발송
    success, msg_id = await send_crm_message(
        to=customer["phone"],
        template=template,
        variables=variables,
    )

    # 발송 내역 저장
    db.table("crm_messages").insert({
        "creator_id": creator_id,
        "customer_id": order_res.data.get("customer_id") or "unknown",
        "trigger_type": body.trigger_type,
        "message": template,
        "status": "sent" if success else "failed",
        "solapi_message_id": msg_id if success else None,
        "sent_at": datetime.now(timezone.utc).isoformat() if success else None,
    }).execute()

    return {
        "ok": success,
        "message_id": msg_id if success else None,
        "error": msg_id if not success else None,
        "recipient": customer["name"],
        "phone": customer["phone"][-4:],  # 보안상 마지막 4자리만
    }


# ── D+N 스케줄 발송 (크리에이터가 수동 실행) ───────────────
@router.post("/batch/{trigger_type}")
async def batch_trigger(trigger_type: str, creator_id: Optional[str] = Header(None)):
    """D+3, D+7, D+30 대상자를 찾아 일괄 발송"""
    if not creator_id:
        raise HTTPException(status_code=401, detail="creator_id 헤더가 필요합니다")

    day_map = {"d3": 3, "d7": 7, "d30": 30}
    if trigger_type not in day_map:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 트리거: {trigger_type}")

    days = day_map[trigger_type]
    db = get_db()

    # 기준 날짜: 구매 후 정확히 N일 ±1일 범위
    now = datetime.now(timezone.utc)
    target_start = (now - timedelta(days=days + 1)).isoformat()
    target_end = (now - timedelta(days=days - 1)).isoformat()

    # 이미 해당 트리거를 발송한 주문 ID 조회
    already_sent = db.table("crm_messages").select("customer_id").eq("creator_id", creator_id).eq("trigger_type", trigger_type).eq("status", "sent").execute()
    sent_customer_ids = {r["customer_id"] for r in already_sent.data}

    # 대상 주문 조회
    orders_res = db.table("orders").select(
        "id, amount, customer_id, customers(name, phone), products(title)"
    ).eq("creator_id", creator_id).eq("status", "completed").gte("created_at", target_start).lte("created_at", target_end).execute()

    results = []
    for order in orders_res.data:
        if order["customer_id"] in sent_customer_ids:
            continue

        success, msg_id = await trigger_crm(
            TriggerRequest(order_id=order["id"], trigger_type=trigger_type),
            creator_id=creator_id,
        )
        results.append({
            "order_id": order["id"],
            "customer": order["customers"]["name"],
            "ok": success,
        })

    return {"sent": len(results), "results": results}


# ── 테스트 발송 (구매 없이 즉시 SMS 전송) ──────────────────
class TestSendRequest(BaseModel):
    phone: str
    message: str


@router.post("/test-send")
async def test_send(body: TestSendRequest, creator_id: Optional[str] = Header(None)):
    """
    CRM 연동 테스트용. 실제 주문 없이 지정한 번호로 즉시 발송.
    """
    if not creator_id:
        raise HTTPException(status_code=401, detail="creator_id 헤더가 필요합니다")

    from app.services.solapi import send_sms

    phone = body.phone.replace("-", "").replace(" ", "")
    if len(phone) < 10:
        raise HTTPException(status_code=400, detail="올바른 전화번호를 입력하세요")

    try:
        result = await send_sms(phone, body.message)
        return {"ok": True, "result": result}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ── 고객 목록 수동 발송 ────────────────────────────────────
class DirectSendRequest(BaseModel):
    phone: str
    text: str


@router.post("/send-direct")
async def send_direct(body: DirectSendRequest, creator_id: Optional[str] = Header(None)):
    """고객 목록에서 선택 발송용"""
    if not creator_id:
        raise HTTPException(status_code=401, detail="creator_id 헤더가 필요합니다")

    from app.services.solapi import send_sms

    phone = body.phone.replace("-", "").replace(" ", "")
    try:
        await send_sms(phone, body.text)
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}
