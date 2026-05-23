"""
AI 분석 라우터
  ai_router      → /api/ai
    POST /report         — 풀 AI 리포트 생성 (Claude 4회 호출)

  analytics_ai_router → /api/analytics
    GET /funnel          — 퍼널 데이터
    GET /revenue         — 매출 데이터
    GET /crm-stats       — CRM 데이터 (기존 /crm 라우터와 충돌 방지)
"""
import asyncio
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.config import settings
from app.services.analytics import (
    get_funnel_data,
    get_revenue_data,
    get_crm_data,
    get_instagram_mock,
)
from app.services.ai_engine import (
    analyze_funnel,
    analyze_content,
    analyze_crm,
    generate_final_report,
)

# /api/ai/*
ai_router = APIRouter()

# /api/analytics/* (AI 데이터 엔드포인트)
analytics_ai_router = APIRouter()


# ── 요청 모델 ─────────────────────────────────────────────
class ReportRequest(BaseModel):
    creator_id: str


# ── POST /api/ai/report ────────────────────────────────────
@ai_router.post("/report")
async def create_ai_report(req: ReportRequest):
    """AI 풀 리포트 생성 — 데이터 집계 후 Claude 4회 순차 호출"""
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY가 설정되지 않았습니다.")

    try:
        # 1. 데이터 병렬 집계
        funnel, revenue, crm, instagram = await asyncio.gather(
            get_funnel_data(req.creator_id),
            get_revenue_data(req.creator_id),
            get_crm_data(req.creator_id),
            get_instagram_mock(),
        )

        # 2. 개별 분석 (병렬 실행)
        funnel_analysis, content_analysis, crm_analysis = await asyncio.gather(
            analyze_funnel(funnel),
            analyze_content(instagram),
            analyze_crm(crm, revenue),
        )

        # 3. 종합 액션 플랜
        action_plan = await generate_final_report(
            funnel_analysis=funnel_analysis,
            content_analysis=content_analysis,
            crm_analysis=crm_analysis,
            funnel=funnel,
            revenue=revenue,
            crm=crm,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 분석 실패: {str(e)}")

    return {
        "creator_id": req.creator_id,
        "data": {
            "funnel": funnel,
            "revenue": revenue,
            "crm": crm,
            "instagram": instagram,
        },
        "analysis": {
            "funnel": funnel_analysis,
            "content": content_analysis,
            "crm": crm_analysis,
        },
        "action_plan": action_plan,
    }


# ── GET /api/analytics/funnel ──────────────────────────────
@analytics_ai_router.get("/funnel")
async def funnel_endpoint(creator_id: str = Query(..., description="크리에이터 UUID")):
    try:
        return await get_funnel_data(creator_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── GET /api/analytics/revenue ────────────────────────────
@analytics_ai_router.get("/revenue")
async def revenue_endpoint(creator_id: str = Query(..., description="크리에이터 UUID")):
    try:
        return await get_revenue_data(creator_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── GET /api/analytics/crm-stats ──────────────────────────
@analytics_ai_router.get("/crm-stats")
async def crm_stats_endpoint(creator_id: str = Query(..., description="크리에이터 UUID")):
    try:
        return await get_crm_data(creator_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
