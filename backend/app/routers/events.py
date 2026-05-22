from fastapi import APIRouter
from app.database import get_db
from app.models import EventCreate

router = APIRouter()


@router.post("", status_code=201)
async def log_event(body: EventCreate):
    db = get_db()
    res = db.table("events").insert({
        "creator_id": body.creator_id,
        "session_id": body.session_id,
        "event_type": body.event_type,
        "product_id": body.product_id,
        "metadata": body.metadata or {}
    }).execute()
    return {"ok": True, "id": res.data[0]["id"]}
