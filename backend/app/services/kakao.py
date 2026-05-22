"""
Solapi를 통한 카카오 알림톡 서비스.
채널 연동 → 템플릿 등록 → 알림톡 발송 (실패 시 SMS 폴백)
"""
import httpx
from app.services.solapi import _make_auth_header, send_sms

SOLAPI_BASE = "https://api.solapi.com"
KAKAO_CHANNEL_API = f"{SOLAPI_BASE}/kakao/v2/channels"
KAKAO_TEMPLATE_API = f"{SOLAPI_BASE}/kakao/v2/templates"
SEND_API = f"{SOLAPI_BASE}/messages/v4/send"

# ── MyVerse 기본 제공 알림톡 템플릿 5종 ───────────────────
# Kakao/Solapi 심사 후 실제 template_code 발급됨
# 현재는 구조 정의 + 등록 요청용
DEFAULT_TEMPLATES = [
    {
        "code": "MV_PURCHASE_V1",
        "name": "구매 확인",
        "content": "안녕하세요 #{이름}님!\n#{상품명} 구매해 주셔서 감사합니다.\n\n#{메시지}",
        "variables": ["이름", "상품명", "메시지"],
        "trigger_hint": "purchase",
    },
    {
        "code": "MV_UPSELL_V1",
        "name": "업셀 / 후속 안내",
        "content": "안녕하세요 #{이름}님!\n#{상품명} 잘 활용하고 계신가요?\n\n#{메시지}",
        "variables": ["이름", "상품명", "메시지"],
        "trigger_hint": "days_after",
    },
    {
        "code": "MV_REMINDER_V1",
        "name": "D+N 리마인더",
        "content": "안녕하세요 #{이름}님!\n#{상품명} 구매 후 #{N}일이 지났습니다.\n\n#{메시지}",
        "variables": ["이름", "상품명", "N", "메시지"],
        "trigger_hint": "days_after",
    },
    {
        "code": "MV_CART_ABANDON_V1",
        "name": "장바구니 이탈",
        "content": "안녕하세요 #{이름}님!\n장바구니에 #{상품명}이 남아있어요.\n\n#{메시지}",
        "variables": ["이름", "상품명", "메시지"],
        "trigger_hint": "cart_abandon",
    },
    {
        "code": "MV_REVIEW_V1",
        "name": "후기 요청",
        "content": "안녕하세요 #{이름}님!\n#{상품명} 이용해 보셨나요?\n\n#{메시지}",
        "variables": ["이름", "상품명", "메시지"],
        "trigger_hint": "review",
    },
]


async def _kakao_get(path: str) -> dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{SOLAPI_BASE}{path}",
            headers={"Authorization": _make_auth_header()},
        )
        return resp.json()


async def _kakao_post(path: str, payload: dict) -> dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{SOLAPI_BASE}{path}",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": _make_auth_header(),
            },
        )
        return resp.json()


# ── 채널 연동 요청 ─────────────────────────────────────────
async def request_channel_connection(channel_search_id: str, phone_number: str) -> dict:
    """
    Solapi에 카카오 채널 대행사 초대 요청.
    channel_search_id: '@홍길동코치' 형식
    phone_number: 채널 대표 전화번호 (하이픈 없이)
    """
    result = await _kakao_post("/kakao/v2/channels", {
        "searchId": channel_search_id,
        "phoneNumber": phone_number.replace("-", ""),
    })
    return result


# ── 채널 상태 확인 ─────────────────────────────────────────
async def check_channel_status(solapi_channel_id: str) -> str:
    """
    Solapi에서 채널 연동 상태 조회.
    Returns: 'pending' | 'active' | 'inactive'
    """
    result = await _kakao_get(f"/kakao/v2/channels/{solapi_channel_id}")
    raw_status = result.get("status", "").upper()

    if raw_status in ("ACTIVE", "APPROVED"):
        return "active"
    elif raw_status in ("PENDING", "WAITING"):
        return "pending"
    else:
        return "inactive"


# ── 템플릿 등록 요청 ───────────────────────────────────────
async def register_templates(solapi_channel_id: str) -> list[dict]:
    """
    채널 연동 완료 후 MyVerse 기본 템플릿 5종 등록 요청.
    Kakao 심사는 24~48시간 소요.
    """
    results = []
    for tmpl in DEFAULT_TEMPLATES:
        result = await _kakao_post("/kakao/v2/templates", {
            "channelId": solapi_channel_id,
            "name": tmpl["name"],
            "content": tmpl["content"],
            "templateCode": tmpl["code"],
        })
        results.append({
            "code": tmpl["code"],
            "name": tmpl["name"],
            "solapi_result": result,
        })
    return results


# ── 알림톡 발송 (SMS 폴백 포함) ────────────────────────────
async def send_alimtalk(
    to: str,
    pfId: str,
    template_code: str,
    variables: dict,
    fallback_text: str,
    sender_number: str,
) -> tuple[bool, str, str]:
    """
    알림톡 발송. 실패 시 SMS 폴백.
    Returns (success, channel_used, message_id_or_error)
    channel_used: 'kakao' | 'sms'
    """
    to_clean = to.replace("-", "").replace(" ", "")

    # 변수 포맷: #{이름} → Solapi는 #{}로 감싼 형식
    formatted_vars = {f"#{{{k}}}": v for k, v in variables.items()}

    payload = {
        "message": {
            "to": to_clean,
            "from": sender_number,
            "type": "ATA",
            "kakaoOptions": {
                "pfId": pfId,
                "templateId": template_code,
                "variables": formatted_vars,
            },
        }
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                SEND_API,
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": _make_auth_header(),
                },
            )
            if resp.is_success:
                data = resp.json()
                msg_id = data.get("messageId") or data.get("groupId") or "sent"
                return True, "kakao", msg_id
            # 알림톡 실패 → SMS 폴백
    except Exception:
        pass

    # SMS 폴백
    try:
        await send_sms(to_clean, fallback_text)
        return True, "sms", "fallback"
    except Exception as e:
        return False, "sms", str(e)
