from dataclasses import dataclass


@dataclass(frozen=True)
class CountryInfo:
    name: str
    iso_a2: str | None
    iso_a3: str | None


@dataclass(frozen=True)
class StateInfo:
    name: str
    admin: str | None
    admin_iso_a3: str | None
    iso_3166_2: str | None


@dataclass(frozen=True)
class PlaceInfo:
    name: str
    country: str | None
    admin1: str | None
    latitude: float
    longitude: float
    distance_m: float


@dataclass(frozen=True)
class NearestLandInfo:
    latitude: float
    longitude: float
    distance_m: float
