# Arquitetura

## Fluxo interativo

O navegador baixa estilo e tiles diretamente do OpenFreeMap. Um clique grava apenas o ponto
selecionado no Zustand e um efeito atualiza a source GeoJSON já existente do marcador e de
seu halo. Selecionar novamente substitui os dados; sources e layers nunca são acumuladas. Em
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

Após a primeira seleção, `requestIdleCallback` (com fallback de 750 ms) prepara o chunk da
experiência sem instanciar Three.js. Ao clicar em `CAVAR`, o módulo cacheado é usado. Uma
`CustomLayerInterface` compartilha canvas, WebGL2 e matriz de projeção com MapLibre. O módulo
procedural desenha as camadas internas e a trajetória reta origem-centro-antípoda, enquanto
MapLibre continua dono da câmera. A máquina de estados comunica apenas transições semânticas
ao React; progresso contínuo fica no `requestAnimationFrame` e em objetos Three.js.

Conclusão e cancelamento removem a layer, descartam recursos Three.js e restauram câmera,
projeção e controles. Veja `docs/visual-experience.md`.

O mapa continua sendo criado uma única vez. A ação “Escolher outro local” limpa o Zustand e
as sources, mas preserva a instância MapLibre. Falha de suporte a WebGL2, exceção na criação
do mapa ou perda do contexto exibem um fallback textual recuperável em vez de tela vazia.
