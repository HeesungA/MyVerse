from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime
from uuid import UUID


# ── Products ──────────────────────────────────────────────
class ProductCreate(BaseModel):
    title: str
    description: Optional[str] = None
    price: int
    type: str  # 'vod' | 'digital' | 'coaching' | 'form'
    thumbnail_url: Optional[str] = None
    content_url: Optional[str] = None

class ProductUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[int] = None
    type: Optional[str] = None
    thumbnail_url: Optional[str] = None
    content_url: Optional[str] = None
    is_active: Optional[bool] = None

class Product(BaseModel):
    id: UUID
    creator_id: UUID
    title: str
    description: Optional[str]
    price: int
    type: str
    thumbnail_url: Optional[str]
    content_url: Optional[str]
    is_active: bool
    created_at: datetime


# ── Events ────────────────────────────────────────────────
class EventCreate(BaseModel):
    creator_id: str
    session_id: str
    event_type: str  # 'page_view' | 'view_content' | 'add_to_cart' | 'purchase'
    product_id: Optional[str] = None
    metadata: Optional[dict[str, Any]] = {}


# ── Orders (Mock 결제) ────────────────────────────────────
class OrderCreate(BaseModel):
    creator_id: str
    product_id: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None

class OrderResponse(BaseModel):
    order_id: str
    customer_id: str
    amount: int
    status: str


# ── Store ─────────────────────────────────────────────────
class StoreSetup(BaseModel):
    store_slug: str
    name: str
    instagram_handle: Optional[str] = None


# ── Analytics ─────────────────────────────────────────────
class FunnelData(BaseModel):
    period_days: int
    page_views: int
    view_contents: int
    add_to_carts: int
    purchases: int
    revenue: int
    conversion_rates: dict[str, float]
    bottleneck: str
