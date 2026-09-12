# Arquitetura

## Fluxo interativo

O navegador baixa estilo e tiles diretamente do OpenFreeMap. Um clique atualiza a source
GeoJSON do marcador imediatamente e grava apenas o ponto selecionado no Zustand. Em
seguida, o TanStack Query solicita reverse geocoding à API. Navegar no globo não dispara
requests nem renderizações React.

## Reverse geocoding

`Frontend → FastAPI → Redis → Nominatim`. O processo da API mantém um `HTTPX AsyncClient`
reutilizável durante todo o lifespan. O rate limiter também usa Redis, permitindo manter o
limite do servidor público em mais de uma instância da API.

## Perfuração

O `POST` persiste o job e entrega o UUID ao Celery. O worker Linux lê a origem no PostGIS,
calcula e persiste o antípoda e mantém progresso temporário no Redis. Não há `sleep` para
simular processamento. Classificação terra/oceano, limites administrativos e lugar mais
próximo dependem da futura importação do Natural Earth e permanecem explicitamente
pendentes no estágio final atual.

## Dados geográficos

PostGIS usa SRID 4326 e índices GiST para origem e antípoda. A próxima migração de dados
criará tabelas separadas para land polygons, countries, states/provinces e populated places.
O download será manual; `backend/scripts/import_natural_earth.py` nunca roda no startup.

## Renderização futura

Three.js não é dependência desta entrega. A animação futura deverá usar import dinâmico,
preferencialmente uma `CustomLayer` que compartilhe o contexto WebGL do MapLibre, com
`requestAnimationFrame` e `triggerRepaint`, sem estado React por frame.
