import pytest

from app.services.antipode import calculate_antipode


@pytest.mark.parametrize(
    ("latitude", "longitude", "expected_lat", "expected_lon"),
    [
        (-3.7319, -38.5267, 3.7319, 141.4733),  # Fortaleza
        (10, 30, -10, -150),
        (10, -30, -10, 150),
        (0, 179.9, 0, -0.1),
        (0, -179.9, 0, 0.1),
        (0, 0, 0, -180),
        (90, 45, -90, -135),
        (-90, -45, 90, 135),
    ],
)
def test_calculate_antipode(
    latitude: float,
    longitude: float,
    expected_lat: float,
    expected_lon: float,
) -> None:
    result = calculate_antipode(latitude, longitude)
    assert result.latitude == pytest.approx(expected_lat)
    assert result.longitude == pytest.approx(expected_lon)


@pytest.mark.parametrize("latitude,longitude", [(91, 0), (-91, 0), (0, 181), (0, -181)])
def test_rejects_invalid_coordinates(latitude: float, longitude: float) -> None:
    with pytest.raises(ValueError):
        calculate_antipode(latitude, longitude)
