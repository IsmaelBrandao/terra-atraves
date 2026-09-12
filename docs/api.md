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

Quando concluído, `GET /drillings/{id}` inclui `destination.type` (`land` ou `ocean`), país,
estado e localidade mais próxima. Para oceano, `destination.nearest_land` contém coordenadas,
distância geodésica em quilômetros e país/localidade associados quando o dataset permite.
Campos administrativos podem ser `null` em áreas disputadas, ilhas sem associação e países
sem admin-1; isso não transforma o job em falha.

Os contratos TypeScript não são mantidos manualmente. Após mudar schemas FastAPI:

```powershell
cd backend
python -m scripts.export_openapi
cd ../frontend
npm run generate:api
```
