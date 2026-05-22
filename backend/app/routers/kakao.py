from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timezone

from app.database import get_db
from app.services.kakao import (
    request_channel_connection,
    check_channel_status,
    register_templates,
    send_alimtalk,
    DEFAULT_TEMPLATES,
)
from app.config import settings

router = APIRouter()


class ChannelConnectRequest(BaseModel):
    channel_search_id: str   # "@홍길동코치"
    phone_number: str        # "01012345678"


class AlimtalkSendRequest(BaseModel):
    to: str
    template_code: str
    variables: dict
    fallback_text: str


# ── 채널 연동 요청 ─────────────────────────────────────────
@router.post("/channel/connect")
async def connect_channel(body: ChannelConnectRequest, creator_id: Optional[str] = Header(None)):
    if not creator_id:
        raise HTTPException(status_code=401, detail="creator_id 헤더가 필요합니다")

    if not body.channel_search_id.startswith("@"):
        raise HTTPException(status_code=400, detail="채널 검색 ID는 @로 시작해야 합니다")

    db = get_db()

    # 기존 연동 확인
    existing = db.table("kakao_channels").select("*").eq("creator_id", creator_id).maybeSingle().execute()

    try:
        result = await request_channel_connection(body.channel_search_id, body.phone_number)
        solapi_channel_id = result.get("channelId") or result.get("id")
        channel_name = result.get("name") or result.get("channelName") or body.channel_search_id
    except Exception as e:
        # Solapi 연동 실패해도 pending으로 저장 (나중에 수동 확인)
        solapi_channel_id = None
        channel_name = body.channel_search_id

    channel_data = {
        "creator_id": creator_id,
        "channel_search_id": body.channel_search_id,
        "channel_name": channel_name,
        "solapi_channel_id": solapi_channel_id,
        "status": "pending",
    }

    if existing.data:
        res = db.table("kakao_channels").update(channel_data).eq("creator_id", creator_id).execute()
    else:
        res = db.table("kakao_channels").insert(channel_data).execute()

    return {
        "ok": True,
        "status": "pending",
        "message": f"{body.channel_search_id} 채널에 대행사 초대를 발송했습니다. 카카오 채널 관리자 페이지에서 수락해주세요.",
        "channel": res.data[0] if res.data else channel_data,
    }


# ── 연동 상태 조회 ─────────────────────────────────────────
@router.get("/channel/status")
async def get_channel_status(creator_id: Optional[str] = Header(None)):
    if not creator_id:
        raise HTTPException(status_code=401, detail="creator_id 헤더가 필요합니다")

    db = get_db()
    res = db.table("kakao_channels").select("*").eq("creator_id", creator_id).maybeSingle().execute()

    if not res.data:
        return {"connected": False, "status": None, "channel": None}

    channel = res.data

    # Solapi에서 실제 상태 확인 (solapi_channel_id가 있을 때만)
    if channel.get("solapi_channel_id") and channel["status"] == "pending":
        try:
            real_status = await check_channel_status(channel["solapi_channel_id"])
            if real_status != channel["status"]:
                db.table("kakao_channels").update({"status": real_status}).eq("id", channel["id"]).execute()
                channel["status"] = real_status

                # 활성화되면 템플릿 자동 등록
                if real_status == "active":
                    try:
                        await register_templates(channel["solapi_channel_id"])
                    except Exception:
                        pass
        except Exception:
            pass

    return {"connected": channel["status"] == "active", "status": channel["status"], "channel": channel}


# ── 채널 연동 해제 ─────────────────────────────────────────
@router.delete("/channel")
async def disconnect_channel(creator_id: Optional[str] = Header(None)):
    if not creator_id:
        raise HTTPException(status_code=401, detail="creator_id 헤더가 필요합니다")

    db = get_db()
    db.table("kakao_channels").delete().eq("creator_id", creator_id).execute()
    return {"ok": True}


# ── 알림톡 발송 ────────────────────────────────────────────
@router.post("/send")
async def send(body: AlimtalkSendRequest, creator_id: Optional[str] = Header(None)):
    if not creator_id:
        raise HTTPException(status_code=401, detail="creator_id 헤더가 필요합니다")

    db = get_db()
    channel_res = db.table("kakao_channels").select("*").eq("creator_id", creator_id).eq("status", "active").maybeSingle().execute()

    if not channel_res.data:
        raise HTTPException(status_code=400, detail="연동된 카카오 채널이 없습니다")

    channel = channel_res.data
    pfId = channel.get("solapi_channel_id", "")

    success, channel_used, msg_id = await send_alimtalk(
        to=body.to,
        pfId=pfId,
        template_code=body.template_code,
        variables=body.variables,
        fallback_text=body.fallback_text,
        sender_number=settings.solapi_sender,
    )

    return {
        "ok": success,
        "channel_used": channel_used,
        "message_id": msg_id if success else None,
        "error": msg_id if not success else None,
    }


# ── 사용 가능한 템플릿 목록 ────────────────────────────────
@router.get("/templates")
async def list_templates(creator_id: Optional[str] = Header(None)):
    if not creator_id:
        raise HTTPException(status_code=401, detail="creator_id 헤더가 필요합니다")

    db = get_db()

    # 채널 연동 여부 확인
    channel_res = db.table("kakao_channels").select("status").eq("creator_id", creator_id).maybeSingle().execute()
    channel_status = channel_res.data["status"] if channel_res.data else None

    # DB에 저장된 템플릿 (승인 완료된 것)
    tmpl_res = db.table("kakao_templates").select("*").eq("creator_id", creator_id).execute()
    db_templates = {t["template_code"]: t for t in (tmpl_res.data or [])}

    # 기본 템플릿 목록과 DB 상태 병합
    result = []
    for tmpl in DEFAULT_TEMPLATES:
        db_tmpl = db_templates.get(tmpl["code"])
        result.append({
            **tmpl,
            "status": db_tmpl["status"] if db_tmpl else ("pending" if channel_status == "active" else "not_registered"),
            "channel_status": channel_status,
        })

    return result
