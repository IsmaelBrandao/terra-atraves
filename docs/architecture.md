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
calcula o antípoda e executa a análise espacial no próprio banco: terra/oceano, país, estado,
localidade e, no oceano, terra firme mais próxima. O resultado é persistido antes do estado
`COMPLETED`; Redis mantém somente progresso temporário. Não há `sleep` nem dataset carregado
em memória no worker.

## Dados geográficos

PostGIS usa SRID 4326. A migration `0003` cria tabelas separadas para land polygons,
countries, states/provinces e populated places, com índices GiST em geometry e índices de
KNN em geography onde há busca por distância. O download e a importação são explícitos;
`backend/scripts/import_natural_earth.py` nunca roda no startup. Veja `docs/spatial.md`.

## Experiência visual

Ao clicar em `CAVAR`, o frontend importa dinamicamente a experiência e o Three.js. Uma
`CustomLayerInterface` compartilha canvas, WebGL2 e matriz de projeção com MapLibre. O módulo
procedural desenha as camadas internas e a trajetória reta origem-centro-antípoda, enquanto
MapLibre continua dono da câmera. A máquina de estados comunica apenas transições semânticas
ao React; progresso contínuo fica no `requestAnimationFrame` e em objetos Three.js.

Conclusão e cancelamento removem a layer, descartam recursos Three.js e restauram câmera,
projeção e controles. Veja `docs/visual-experience.md`.
