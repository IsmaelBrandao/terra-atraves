# API

Base local: `http://localhost:8000/api/v1`. O FastAPI é a fonte de verdade dos contratos.
O arquivo TypeScript é gerado de `frontend/openapi.json` com `npm run generate:api`.

## Endpoints

- `GET /health`: disponibilidade básica da API.
- `GET /locations/reverse?lat=&lon=`: endereço via cache Redis e Nominatim.
- `POST /drillings`: persiste um job `QUEUED`, publica no Celery e responde `202` com `Location`.
- `GET /drillings/{id}`: status, progresso, estágio e resultado persistido.

O reverse geocoding arredonda a chave de cache para cinco casas, mantém dados por sete
dias e limita o Nominatim público a no máximo uma chamada por segundo entre instâncias
que compartilham o Redis. Latitude e longitude são validadas nos contratos.

Estados de job: `QUEUED`, `PROCESSING`, `COMPLETED` e `FAILED`. A resposta HTTP usa os
equivalentes em minúsculas.
