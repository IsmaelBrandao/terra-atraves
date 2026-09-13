# Terra Através

Aplicação acadêmica para explorar um globo 3D, selecionar uma coordenada, calcular seu
antípoda e acompanhar uma perfuração visual pelo interior da Terra.

## Executar

1. Copie `.env.example` para `.env` e substitua o contato do `NOMINATIM_USER_AGENT`.
2. Inicie banco, cache, API e worker: `docker compose up --build`.
3. Em outro terminal, execute `cd frontend`, `npm install` e `npm run dev`.
4. Abra `http://localhost:5173`. A documentação da API estará em `http://localhost:8000/docs`.

O frontend roda fora do Docker para preservar o HMR. Celery não precisa ser instalado
nativamente no Windows.

## Natural Earth

Os dados espaciais não são baixados no startup nem enviados ao frontend. Baixe e extraia os
quatro shapefiles 1:10m descritos em `data/README.md`. Depois da migration, importe-os com:

```powershell
docker compose run --rm -v ./data/natural_earth:/data/natural_earth:ro api `
  python -m scripts.import_natural_earth /data/natural_earth
```

O importador valida os arquivos e o SRID, substitui os quatro conjuntos em uma única transação
e pode ser executado novamente sem duplicar registros. Detalhes das consultas e medições estão
em `docs/spatial.md`.

## Variáveis

Veja `.env.example`. As principais são `DATABASE_URL`, `REDIS_URL`,
`NOMINATIM_USER_AGENT`, `API_PORT`, `VITE_API_BASE_URL` e `VITE_MAP_STYLE_URL`. Se a porta
8000 estiver ocupada, altere `API_PORT` e a URL correspondente do frontend. Tiles são
solicitados diretamente pelo navegador. Nenhum secret é mantido no código.

## Qualidade e contratos

Backend: instale `backend/requirements-dev.txt`, então execute `ruff check .` e `pytest`.

Frontend: execute `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:e2e`.
O perfil reproduzível, mais demorado, roda com `npm run test:profile`; as capturas de revisão
visual, com o backend real no ar, com `npm run test:visual`. Para atualizar os tipos
da API, execute `python -m scripts.export_openapi` dentro de `backend` e depois
`npm run generate:api` em `frontend`.

## Experiência visual

Depois que o job chega a `COMPLETED`, o botão `CAVAR` inicia a sequência visual. Three.js
permanece fora do bundle inicial e seu chunk é preparado em tempo ocioso após a seleção. A
experiência oferece pausa, continuação, cancelamento, repetição e escolha de outro local,
adapta a geometria a dispositivos low-end e reduz a sequência quando o sistema solicita
menos movimento. Arquitetura, proporções e medições estão em `docs/visual-experience.md`.

## Estado desta etapa

Implementado: globo MapLibre performático, seleção e marcadores, reverse geocoding,
PostGIS, Celery/Redis, análise Natural Earth e experiência procedural MapLibre + Three.js da
origem ao antípoda. Permanecem fora do escopo: terrain, áudio, autenticação e histórico
complexo.

A interface foi validada em 1920×1080, 1366×768, 1024×768, 390×844 e 360×800. Há
tratamento para falhas de WebGL, geocodificação, criação e consulta do job e timeout. Decisões
de UX e limitações estão em `docs/ux.md`.
