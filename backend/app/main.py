from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import products, events, orders, analytics, crm, kakao
from app.routers.ai import ai_router, analytics_ai_router

app = FastAPI(title="MyVerse API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(orders.router, prefix="/api/orders", tags=["orders"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(crm.router, prefix="/api/crm", tags=["crm"])
app.include_router(kakao.router, prefix="/api/kakao", tags=["kakao"])
# AI 엔진: /api/ai/report
app.include_router(ai_router, prefix="/api/ai", tags=["ai"])
# AI 데이터: /api/analytics/{funnel|revenue|crm-stats}
app.include_router(analytics_ai_router, prefix="/api/analytics", tags=["analytics-ai"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "myverse-api"}
