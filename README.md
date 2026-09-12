# Terra Através

Aplicação acadêmica para explorar um globo 3D, selecionar uma coordenada, identificar o
local e calcular o ponto antípoda por meio de um job assíncrono.

## Executar

1. Copie `.env.example` para `.env` e substitua o contato do `NOMINATIM_USER_AGENT`.
2. Inicie banco, cache, API e worker: `docker compose up --build`.
3. Em outro terminal, execute `cd frontend`, `npm install` e `npm run dev`.
4. Abra `http://localhost:5173`. A documentação da API estará em `http://localhost:8000/docs`.

O frontend roda fora do Docker para preservar o HMR. Celery não precisa ser instalado
nativamente no Windows.

## Variáveis

Veja `.env.example`. As principais são `DATABASE_URL`, `REDIS_URL`,
`NOMINATIM_USER_AGENT`, `API_PORT`, `VITE_API_BASE_URL` e `VITE_MAP_STYLE_URL`. Se a porta
8000 estiver ocupada, altere `API_PORT` e a URL correspondente do frontend. Tiles são
solicitados diretamente pelo navegador. Nenhum secret é mantido no código.

## Qualidade e contratos

Backend: instale `backend/requirements-dev.txt`, então execute `ruff check .` e `pytest`.

Frontend: execute `npm run lint`, `npm run typecheck` e `npm test`. Para atualizar os tipos
da API, execute `python -m scripts.export_openapi` dentro de `backend` e depois
`npm run generate:api` em `frontend`.

## Estado desta etapa

Implementado: globo MapLibre performático, seleção e marcador imediatos, reverse geocoding
com cache/rate limit, PostGIS, migração, Celery/Redis, criação e consulta de jobs e antípoda
testado. Pendente: importação efetiva do Natural Earth, terra/oceano, país/estado/cidade,
terra firme mais próxima, animação, Three.js, terrain, autenticação e histórico complexo.
