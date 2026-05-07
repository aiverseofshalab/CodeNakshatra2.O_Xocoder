from fastapi import APIRouter
from pydantic import BaseModel

from app.services.groq_advisor_service import dependency_advice

router = APIRouter()


class AdvisorRequest(BaseModel):
    package_name: str


@router.post("/advisor")
async def advisor(req: AdvisorRequest):

    result = await dependency_advice(req.package_name)

    return {
        "success": True,
        "data": result
    }