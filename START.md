# MyVerse 로컬 실행 가이드

## 1. Supabase 세팅

1. [supabase.com](https://supabase.com) → 새 프로젝트 생성
2. **SQL Editor**에 `supabase/schema.sql` 전체 붙여넣기 → 실행
3. **Project Settings → API**에서 아래 값 복사:
   - `Project URL` → `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

## 2. 환경변수 설정

### frontend/.env.local
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### backend/.env
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
FRONTEND_URL=http://localhost:3000
```

## 3. 백엔드 실행

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

→ http://localhost:8000/docs 에서 API 확인

## 4. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

→ http://localhost:3000

## 5. 플로우 테스트

1. `/signup` → 크리에이터 계정 생성
2. `/dashboard/store` → 스토어 슬러그 설정 (예: `my-store`)
3. `/dashboard/products/new` → 상품 등록 (가격 39000)
4. `/store/my-store` → 퍼블릭 스토어에서 구매 테스트
5. `/dashboard/analytics` → 퍼널 전환율 확인

## 파일 구조

```
MyVerse/
├── supabase/schema.sql     # DB 스키마 (Supabase에 실행)
├── backend/                # FastAPI
│   ├── app/main.py
│   ├── app/routers/        # products, events, orders, analytics
│   └── requirements.txt
└── frontend/               # Next.js 14
    └── src/
        ├── app/
        │   ├── login/      # 로그인
        │   ├── signup/     # 회원가입
        │   ├── dashboard/  # 크리에이터 대시보드
        │   └── store/[slug]/ # 퍼블릭 스토어
        ├── components/
        │   ├── dashboard/Sidebar.tsx
        │   └── store/PurchaseModal.tsx
        └── lib/
            ├── supabase/   # client/server
            ├── events.ts   # 이벤트 로깅
            ├── api.ts      # FastAPI 클라이언트
            └── types.ts    # TypeScript 타입
```
