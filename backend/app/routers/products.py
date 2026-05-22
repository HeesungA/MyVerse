from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from app.database import get_db
from app.models import ProductCreate, ProductUpdate

router = APIRouter()


def _require_creator(creator_id: Optional[str]) -> str:
    if not creator_id:
        raise HTTPException(status_code=401, detail="creator_id 헤더가 필요합니다")
    return creator_id


@router.get("")
async def list_products(creator_id: Optional[str] = Header(None)):
    cid = _require_creator(creator_id)
    db = get_db()
    res = db.table("products").select("*").eq("creator_id", cid).order("created_at", desc=True).execute()
    return res.data


@router.post("", status_code=201)
async def create_product(body: ProductCreate, creator_id: Optional[str] = Header(None)):
    cid = _require_creator(creator_id)
    db = get_db()
    res = db.table("products").insert({
        "creator_id": cid,
        **body.model_dump(exclude_none=True)
    }).execute()
    return res.data[0]


@router.patch("/{product_id}")
async def update_product(
    product_id: str,
    body: ProductUpdate,
    creator_id: Optional[str] = Header(None)
):
    cid = _require_creator(creator_id)
    db = get_db()
    res = (
        db.table("products")
        .update(body.model_dump(exclude_none=True))
        .eq("id", product_id)
        .eq("creator_id", cid)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다")
    return res.data[0]


@router.delete("/{product_id}", status_code=204)
async def delete_product(product_id: str, creator_id: Optional[str] = Header(None)):
    cid = _require_creator(creator_id)
    db = get_db()
    db.table("products").delete().eq("id", product_id).eq("creator_id", cid).execute()


# 퍼블릭: slug로 스토어 상품 목록
@router.get("/public/{store_slug}")
async def get_store_products(store_slug: str):
    db = get_db()
    creator_res = db.table("creators").select("id, name, instagram_handle, store_slug").eq("store_slug", store_slug).single().execute()
    if not creator_res.data:
        raise HTTPException(status_code=404, detail="스토어를 찾을 수 없습니다")

    creator = creator_res.data
    products_res = db.table("products").select("*").eq("creator_id", creator["id"]).eq("is_active", True).order("created_at", desc=True).execute()

    return {
        "creator": creator,
        "products": products_res.data
    }


# 퍼블릭: 단일 상품 조회
@router.get("/public/product/{product_id}")
async def get_product(product_id: str):
    db = get_db()
    res = db.table("products").select("*, creators(name, store_slug, instagram_handle)").eq("id", product_id).eq("is_active", True).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다")
    return res.data
