"""
AI 분석 엔진 — Claude API 연동, 4개 분석 프롬프트
"""
import json
from anthropic import AsyncAnthropic
from app.config import settings

MODEL = "claude-sonnet-4-20250514"


def _client() -> AsyncAnthropic:
    return AsyncAnthropic(api_key=settings.anthropic_api_key)


async def analyze_funnel(funnel: dict) -> str:
    """퍼널 전환율 분석 — 병목 구간과 개선 전략 도출"""
    prompt = f"""당신은 인스타그램 크리에이터 커머스 전문 AI 분석가입니다.

아래는 최근 {funnel['period_days']}일간의 퍼널 전환 데이터입니다:
- 스토어 방문: {funnel['page_view']:,}회
- 상품 조회: {funnel['product_view']:,}회 (전환율 {funnel['view_to_product_rate']}%)
- 장바구니 추가: {funnel['add_to_cart']:,}회 (전환율 {funnel['product_to_cart_rate']}%)
- 최종 구매: {funnel['purchase']:,}건 (전환율 {funnel['cart_to_purchase_rate']}%)
- 전체 전환율: {funnel['overall_conversion_rate']}%

분석 요청:
1. 가장 큰 이탈이 발생하는 병목 구간을 정확히 짚어주세요
2. 해당 구간의 이탈 원인을 구체적으로 추론해주세요 (인스타 크리에이터 쇼핑몰 맥락 기반)
3. 전환율을 20% 이상 끌어올릴 수 있는 실행 가능한 개선 전략 3가지를 제안해주세요

응답은 한국어로 작성하고, 구체적 수치와 근거를 포함해 실무자가 바로 적용할 수 있게 해주세요."""

    client = _client()
    response = await client.messages.create(
        model=MODEL,
        max_tokens=800,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text


async def analyze_content(instagram: dict) -> str:
    """콘텐츠 전략 분석 — 팔로워→구매 전환 최적화"""
    top_types = "\n".join(
        f"  - {t['type']}: 평균 도달 {t['avg_reach']:,}, 참여율 {t['avg_engagement']}%"
        for t in instagram["top_content_types"]
    )
    best_times = ", ".join(instagram["best_posting_times"])

    prompt = f"""당신은 인스타그램 크리에이터 커머스 전문 AI 분석가입니다.

아래는 Instagram Insights 데이터입니다:
- 팔로워: {instagram['followers']:,}명 (최근 30일 +{instagram['follower_growth_30d']:,}명)
- 게시물 평균 도달: {instagram['avg_reach_per_post']:,}명
- 평균 참여율: {instagram['avg_engagement_rate']}%
- 프로필 방문: {instagram['profile_visits_30d']:,}회
- 링크 클릭: {instagram['link_clicks_30d']:,}회

콘텐츠 유형별 성과:
{top_types}

최적 게시 시간대: {best_times}

분석 요청:
1. 팔로워 대비 링크 클릭 전환율({round(instagram['link_clicks_30d']/instagram['followers']*100,2)}%)을 평가해주세요
2. 스토어 매출로 연결하는 데 가장 효과적인 콘텐츠 포맷과 전략을 제안해주세요
3. 이번 달 실행해야 할 콘텐츠 캘린더 핵심 3가지를 알려주세요

응답은 한국어로, 크리에이터가 즉시 실행할 수 있는 구체적 액션으로 작성해주세요."""

    client = _client()
    response = await client.messages.create(
        model=MODEL,
        max_tokens=800,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text


async def analyze_crm(crm: dict, revenue: dict) -> str:
    """CRM 효과 분석 — 재구매 유도 및 자동화 최적화"""
    scenario_summary = "\n".join(
        f"  - [{('ON' if s['active'] else 'OFF')}] {s['title']} ({s['trigger']})"
        for s in crm["scenario_list"]
    ) or "  (설정된 시나리오 없음)"

    growth_text = f"{revenue['growth_rate_percent']:+.1f}%" \
        if revenue["growth_rate_percent"] is not None else "데이터 부족"

    prompt = f"""당신은 인스타그램 크리에이터 커머스 전문 AI 분석가입니다.

[CRM 발송 현황 — 최근 30일]
- 총 발송: {crm['total_sent']:,}건 (성공 {crm['delivered']:,}, 실패 {crm['failed']:,}, 도달률 {crm['delivery_rate']}%)
- 전체 고객: {crm['total_customers']:,}명
- 재구매 고객: {crm['repeat_buyers']:,}명 (재구매율 {crm['repeat_purchase_rate']}%)
- 활성 자동화: {crm['active_scenarios']}개 / 비활성: {crm['inactive_scenarios']}개

[자동화 시나리오]
{scenario_summary}

[매출 현황]
- 최근 30일 매출: {revenue['total_revenue']:,}원 (전기 대비 {growth_text})
- 주문수: {revenue['order_count']:,}건, 평균 주문금액: {revenue['average_order_value']:,}원

분석 요청:
1. 현재 CRM 자동화의 효과와 개선이 필요한 부분을 진단해주세요
2. 재구매율을 10%p 이상 높이기 위한 CRM 시나리오를 추천해주세요 (구체적 메시지 예시 포함)
3. 매출 성장을 위해 지금 당장 켜야 할 자동화 액션을 우선순위 순으로 알려주세요

응답은 한국어로, 실무 적용 가능한 수준으로 작성해주세요."""

    client = _client()
    response = await client.messages.create(
        model=MODEL,
        max_tokens=900,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text


async def generate_final_report(
    funnel_analysis: str,
    content_analysis: str,
    crm_analysis: str,
    funnel: dict,
    revenue: dict,
    crm: dict,
) -> dict:
    """종합 액션 플랜 생성 — JSON만 반환"""
    prompt = f"""당신은 인스타그램 크리에이터 커머스 전문 AI 분석가입니다.

아래 3가지 분석 결과를 종합해서 JSON 액션 플랜을 생성해주세요.

[퍼널 분석]
{funnel_analysis}

[콘텐츠 전략 분석]
{content_analysis}

[CRM 분석]
{crm_analysis}

[핵심 지표 요약]
- 전체 전환율: {funnel['overall_conversion_rate']}%
- 월 매출: {revenue['total_revenue']:,}원
- 재구매율: {crm['repeat_purchase_rate']}%

반드시 아래 JSON 형식만 반환하세요. 설명 텍스트나 마크다운 없이 순수 JSON만 출력하세요:

{{
  "summary": "2-3문장으로 전체 상황 요약",
  "score": {{
    "funnel": 0~100 사이 정수,
    "content": 0~100 사이 정수,
    "crm": 0~100 사이 정수,
    "overall": 0~100 사이 정수
  }},
  "actions": {{
    "urgent": [
      {{"title": "액션 제목", "description": "구체적 실행 방법", "expected_impact": "예상 효과"}}
    ],
    "this_week": [
      {{"title": "액션 제목", "description": "구체적 실행 방법", "expected_impact": "예상 효과"}}
    ],
    "next_week": [
      {{"title": "액션 제목", "description": "구체적 실행 방법", "expected_impact": "예상 효과"}}
    ]
  }},
  "key_insight": "가장 중요한 인사이트 한 문장"
}}

urgent는 오늘 당장, this_week는 이번 주, next_week는 다음 주 액션으로 각 2~3개씩 채워주세요.
모든 텍스트는 한국어로 작성하세요."""

    client = _client()
    response = await client.messages.create(
        model=MODEL,
        max_tokens=1200,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text.strip()
    # JSON 블록이 있을 경우 추출
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw)
