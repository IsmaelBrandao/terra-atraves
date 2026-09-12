import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_X, ST_Y
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.drilling import Drilling, DrillingStatus
from app.schemas.drilling import (
    CountryResult,
    DestinationResult,
    DrillingAccepted,
    DrillingCreate,
    DrillingResponse,
    NearestLandResult,
    PlaceResult,
    StateResult,
)
from app.schemas.location import Coordinates
from app.worker import process_drilling

router = APIRouter(prefix="/drillings", tags=["drillings"])


def place_result(
    name: str | None,
    country: str | None,
    latitude: float | None,
    longitude: float | None,
    distance_m: float | None,
) -> PlaceResult | None:
    if name is None or latitude is None or longitude is None or distance_m is None:
        return None
    return PlaceResult(
        name=name,
        country=country,
        coordinates=Coordinates(latitude=latitude, longitude=longitude),
        distance_km=distance_m / 1000,
    )


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
        ST_Y(Drilling.nearest_place_point).label("nearest_place_lat"),
        ST_X(Drilling.nearest_place_point).label("nearest_place_lon"),
        ST_Y(Drilling.nearest_land_point).label("nearest_land_lat"),
        ST_X(Drilling.nearest_land_point).label("nearest_land_lon"),
        ST_Y(Drilling.nearest_land_place_point).label("nearest_land_place_lat"),
        ST_X(Drilling.nearest_land_place_point).label("nearest_land_place_lon"),
    ).where(Drilling.id == drilling_id)
    row = (await session.execute(statement)).one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drilling not found")

    drilling = row[0]
    antipode = None
    if row.antipode_lat is not None and row.antipode_lon is not None:
        antipode = Coordinates(latitude=row.antipode_lat, longitude=row.antipode_lon)
    destination = None
    if drilling.destination_is_land is not None:
        country = None
        if drilling.destination_country_name is not None:
            country = CountryResult(
                name=drilling.destination_country_name,
                iso_a2=drilling.destination_country_iso_a2,
                iso_a3=drilling.destination_country_iso_a3,
            )
        state = None
        if drilling.destination_state_name is not None:
            state = StateResult(
                name=drilling.destination_state_name,
                admin=drilling.destination_state_admin,
            )
        nearest_place = place_result(
            drilling.nearest_place,
            drilling.nearest_place_country,
            row.nearest_place_lat,
            row.nearest_place_lon,
            drilling.nearest_place_distance_m,
        )
        nearest_land = None
        if (
            not drilling.destination_is_land
            and row.nearest_land_lat is not None
            and row.nearest_land_lon is not None
            and drilling.nearest_land_distance_m is not None
        ):
            nearest_land_country = None
            if drilling.nearest_land_country_name is not None:
                nearest_land_country = CountryResult(
                    name=drilling.nearest_land_country_name,
                    iso_a2=drilling.nearest_land_country_iso_a2,
                    iso_a3=drilling.nearest_land_country_iso_a3,
                )
            nearest_land = NearestLandResult(
                coordinates=Coordinates(
                    latitude=row.nearest_land_lat,
                    longitude=row.nearest_land_lon,
                ),
                distance_km=drilling.nearest_land_distance_m / 1000,
                country=nearest_land_country,
                nearest_place=place_result(
                    drilling.nearest_land_place,
                    drilling.nearest_land_place_country,
                    row.nearest_land_place_lat,
                    row.nearest_land_place_lon,
                    drilling.nearest_land_place_distance_m,
                ),
            )
        destination = DestinationResult(
            type="land" if drilling.destination_is_land else "ocean",
            country=country,
            state=state,
            nearest_place=nearest_place,
            nearest_land=nearest_land,
        )
    return DrillingResponse(
        id=drilling.id,
        status=drilling.status.lower(),
        progress=drilling.progress,
        stage=drilling.stage,
        origin=Coordinates(latitude=row.origin_lat, longitude=row.origin_lon),
        antipode=antipode,
        destination=destination,
        origin_label=drilling.origin_label,
        destination_label=drilling.destination_label,
        destination_is_land=drilling.destination_is_land,
        nearest_place=drilling.nearest_place,
        nearest_place_distance_m=drilling.nearest_place_distance_m,
        error=drilling.error,
        created_at=drilling.created_at,
        completed_at=drilling.completed_at,
    )
