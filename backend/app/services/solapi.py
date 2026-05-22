import hashlib
import hmac
import uuid
from datetime import datetime, timezone

import httpx

from app.config import settings

SOLAPI_ENDPOINT = "https://api.solapi.com/messages/v4/send"


def _make_auth_header() -> str:
    # Solapi HMAC-SHA256 인증
    # 참고: https://docs.solapi.com/authentication/hmac
    date = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    salt = str(uuid.uuid4())  # UUID with dashes (e.g. "550e8400-e29b-...")
    message = date + salt
    signature = hmac.new(
        settings.solapi_api_secret.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return (
        f"HMAC-SHA256 apiKey={settings.solapi_api_key},"
        f" date={date}, salt={salt}, signature={signature}"
    )


def _replace_vars(template: str, variables: dict) -> str:
    for key, value in variables.items():
        template = template.replace(f"{{{{{key}}}}}", str(value))
    return template


async def send_sms(to: str, text: str) -> dict:
    """단건 SMS 발송. to는 숫자만 (하이픈 제거)."""
    to_clean = to.replace("-", "").replace(" ", "")

    payload = {
        "message": {
            "to": to_clean,
            "from": settings.solapi_sender,
            "text": text,
        },
        "agent": {
            "sdkVersion": "myverse/1.0.0",
            "osPlatform": "Windows",
        },
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            SOLAPI_ENDPOINT,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": _make_auth_header(),
            },
        )
        # 에러 시 응답 본문까지 포함해서 예외 발생
        if not resp.is_success:
            raise httpx.HTTPStatusError(
                f"{resp.status_code}: {resp.text}",
                request=resp.request,
                response=resp,
            )
        return resp.json()


async def send_crm_message(to: str, template: str, variables: dict) -> tuple[bool, str]:
    """템플릿 변수 치환 후 발송. Returns (success, message_id or error)."""
    text = _replace_vars(template, variables)
    try:
        result = await send_sms(to, text)
        msg_id = result.get("messageId") or result.get("groupId") or "sent"
        return True, msg_id
    except Exception as e:
        return False, str(e)
