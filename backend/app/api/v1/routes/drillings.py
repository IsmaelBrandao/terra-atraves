import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_X, ST_Y
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.drilling import Drilling, DrillingStatus
from app.schemas.drilling import DrillingAccepted, DrillingCreate, DrillingResponse
from app.schemas.location import Coordinates
from app.worker import process_drilling

router = APIRouter(prefix="/drillings", tags=["drillings"])


@router.post(
    "",
    response_model=DrillingAccepted,
    status_code=status.HTTP_202_ACCEPTED,
    operation_id="createDrilling",
)
async def create_drilling(
    body: DrillingCreate,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> DrillingAccepted:
    drilling = Drilling(
        id=uuid.uuid4(),
        origin=WKTElement(f"POINT({body.longitude} {body.latitude})", srid=4326),
        status=DrillingStatus.QUEUED.value,
        progress=0,
        stage="queued",
        origin_label=body.origin_label,
    )
    session.add(drilling)
    await session.commit()
    process_drilling.delay(str(drilling.id))

    status_url = f"/api/v1/drillings/{drilling.id}"
    response.headers["Location"] = status_url
    return DrillingAccepted(id=drilling.id, status="queued", status_url=status_url)


@router.get("/{drilling_id}", response_model=DrillingResponse, operation_id="getDrilling")
async def get_drilling(
    drilling_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> DrillingResponse:
    statement = select(
        Drilling,
        ST_Y(Drilling.origin).label("origin_lat"),
        ST_X(Drilling.origin).label("origin_lon"),
        ST_Y(Drilling.antipode).label("antipode_lat"),
        ST_X(Drilling.antipode).label("antipode_lon"),
    ).where(Drilling.id == drilling_id)
    row = (await session.execute(statement)).one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drilling not found")

    drilling = row[0]
    antipode = None
    if row.antipode_lat is not None and row.antipode_lon is not None:
        antipode = Coordinates(latitude=row.antipode_lat, longitude=row.antipode_lon)
    return DrillingResponse(
        id=drilling.id,
        status=drilling.status.lower(),
        progress=drilling.progress,
        stage=drilling.stage,
        origin=Coordinates(latitude=row.origin_lat, longitude=row.origin_lon),
        antipode=antipode,
        origin_label=drilling.origin_label,
        destination_label=drilling.destination_label,
        destination_is_land=drilling.destination_is_land,
        nearest_place=drilling.nearest_place,
        nearest_place_distance_m=drilling.nearest_place_distance_m,
        error=drilling.error,
        created_at=drilling.created_at,
        completed_at=drilling.completed_at,
    )
