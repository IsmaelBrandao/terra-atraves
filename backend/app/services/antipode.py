from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Antipode:
    latitude: float
    longitude: float


def calculate_antipode(latitude: float, longitude: float) -> Antipode:
    """Return the diametrically opposite WGS84 coordinate."""
    if not -90 <= latitude <= 90:
        raise ValueError("latitude must be between -90 and 90")
    if not -180 <= longitude <= 180:
        raise ValueError("longitude must be between -180 and 180")

    antipode_longitude = ((longitude + 360) % 360) - 180
    return Antipode(latitude=-latitude, longitude=antipode_longitude)
