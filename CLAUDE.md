# MyVerse — Claude Code 프로젝트 컨텍스트

## 한 줄 정의
인스타그램 크리에이터가 팔로워를 실질 매출로 전환하고 재구매까지 이어지도록,
스토어 개설 + CRM 자동화 + AI 매출 최적화를 한 곳에서 제공하는 사인원 SaaS.

---

## 핵심 철학
- 크리에이터가 팔로워를 보유해도 수익화 인프라가 없으면 매출로 이어지지 않는다
- 기존 플랫폼(클래스101, 하비)은 수수료 50~80% + 구매자 데이터 없음
- MyVerse는 그 인프라 전체를 제공하고, AI가 최적화한다

---

## 기술 스택

- **Frontend**: Next.js 14 (App Router) — `frontend/`
- **Backend**: FastAPI (Python) — `backend/`
- **DB**: Supabase (PostgreSQL)
- **AI 엔진**: Anthropic Claude API (claude-sonnet-4-20250514)
- **CRM 발송**: Solapi API
- **배포**: Railway

## 환경변수
- 모든 API 키는 .env 파일로 관리 (.env.example 참고)
- frontend: .env.local / backend: .env

## MVP 주의사항
- 결제는 Mock 처리 (버튼 클릭 = 구매 완료)
- Meta Pixel은 무관, 자체 이벤트 로깅으로 대체
- 알림톡은 나중에, MVP는 Solapi SMS로 대체
- Instagram Insights는 Mock 데이터로 시작 (Meta 승인 후 실데이터)
