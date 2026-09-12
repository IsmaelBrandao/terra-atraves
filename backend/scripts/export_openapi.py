import json
from pathlib import Path

from app.main import app

output = Path(__file__).resolve().parents[2] / "frontend" / "openapi.json"
output.write_text(json.dumps(app.openapi(), indent=2, ensure_ascii=False), encoding="utf-8")
print(output)
