# Experiência visual da perfuração

## Arquitetura

A experiência fica isolada em `frontend/src/features/drilling-animation`. O provider React
recebe apenas estados semânticos e comandos. `DrillingExperience` coordena a câmera, a
timeline e o ciclo de vida. `EarthInteriorLayer` implementa `CustomLayerInterface` e entrega
a renderização aos módulos `EarthInteriorRenderer` e `DrillRenderer`.

Não existe segundo canvas. Three.js cria um `WebGLRenderer` sobre o canvas e o contexto
WebGL2 entregues pelo MapLibre. A layer usa `defaultProjectionData.mainMatrix` para compor a
matriz do modelo. MapLibre continua sendo o único proprietário da câmera e executa as
transições por `easeTo` e `flyTo`; React nunca recebe posição de câmera por frame.

Durante o raio-X, a projeção muda temporariamente para Mercator e uma esfera procedural
representa o planeta em corte. Ao revelar o destino, a layer é removida, a projeção `globe`
é restaurada e a câmera aponta para o antípoda. Isso mantém a representação interna
independente de datasets geográficos e evita um segundo contexto gráfico.

## Máquina de estados e timeline

A máquina explícita aceita avanço somente para a frente, pausa, retomada, cancelamento e
reset. Estados usados:

`idle → preparing → zooming_out → showing_route → entering_earth → crossing_crust →
crossing_mantle → crossing_outer_core → crossing_inner_core → crossing_center → ascending
→ exiting_earth → revealing_destination → completed`.

`paused` guarda o estado de retomada e `cancelled` é terminal para aquela execução. A
timeline normal dura aproximadamente 12,4 segundos. `FrameLoop` usa somente
`requestAnimationFrame`; pausa e cancelamento removem o frame pendente. Cada frame altera
objetos Three.js e chama `triggerRepaint()`. React recebe somente mudanças de estado. A
telemetria é emitida no máximo a cada 125 ms e atualiza referências DOM diretamente.

## Trajetória e profundidade

A trajetória é um diâmetro reto, não um arco sobre a superfície. Para progresso `t` entre
zero e um e raio médio `R = 6.371 km`:

`profundidade = 2 × R × min(t, 1 - t)`.

Assim, a profundidade começa em zero, chega a 6.371 km no centro e volta a zero no antípoda.
A distância restante aponta para o centro na descida e para o destino na subida. Não há
números aleatórios.

Limites de cálculo simplificados:

| Camada | Profundidade final |
| --- | ---: |
| Crosta representativa | 35 km |
| Manto | 2.890 km |
| Núcleo externo | 5.150 km |
| Núcleo interno/centro | 6.371 km |

## Representação visual

As esferas são geradas proceduralmente, sem modelos ou texturas. Os raios visuais são:

| Superfície | Raio relativo |
| --- | ---: |
| Superfície | 1,0000 |
| Limite visual interno da crosta | 0,9400 |
| Limite manto/núcleo externo | 0,5464 |
| Limite núcleo externo/interno | 0,1917 |

A crosta real seria fina demais para leitura nesse tamanho. Somente sua espessura visual é
exagerada; os números da telemetria continuam usando os limites de cálculo. Iluminação é
ambiente mais uma luz direcional, sem sombras, pós-processamento, bloom ou partículas.

## Lazy loading e qualidade

O clique em `CAVAR` executa `import("./DrillingExperience")`. Esse módulo carrega Three.js e
os renderizadores; nada deles participa da entrada inicial. O build validado gerou:

| Artefato | Minificado | Gzip |
| --- | ---: | ---: |
| Entrada anterior à Fase 3 | 1.345,79 kB | 376,97 kB |
| Entrada após a Fase 3 | 1.353,95 kB | 379,71 kB |
| Chunk tardio da experiência/Three.js | 534,02 kB | 134,31 kB |

O custo adicional gzip no caminho inicial foi 2,74 kB. O primeiro import dinâmico medido no
servidor de desenvolvimento levou 175,3 ms.

`NORMAL` usa 40 segmentos, transparência moderada e brilho central. `LOW_END` usa 20
segmentos, menor transparência e remove o brilho decorativo. A detecção reutiliza o perfil
do globo; a trajetória, as camadas e os controles permanecem funcionais.

## Movimento reduzido

Com `prefers-reduced-motion: reduce`, a timeline cai para 620 ms e mantém apenas preparação,
trajetória e revelação. A execução real automatizada terminou em 928 ms incluindo interação
e renderização do navegador. Transições CSS também são reduzidas.

## Cleanup e repetição

Finalizar ou cancelar executa:

- cancelamento do `requestAnimationFrame`;
- remoção da custom layer;
- `dispose()` de geometries, materials e eventuais textures;
- limpeza da scene e descarte do renderer Three.js;
- restauração dos handlers, projeção e câmera;
- remoção dos listeners DOM pelo ciclo React.

Não é usado `forceContextLoss()`, pois o contexto pertence ao MapLibre. Mais de cinco ciclos
foram executados na mesma SPA. Após aquecimento e coleta de lixo forçada, as amostras ficaram
entre 58,4 MB e 59,4 MB; houve uma queda de 1,78 MB em um ciclo e aumento de 0,93 MB no
seguinte, sem crescimento monotônico.

## Medição no navegador

Chrome/Playwright em Windows, WebGL2 por ANGLE/D3D11 sobre AMD Radeon Graphics:

| Cenário | FPS aproximado | Long tasks |
| --- | ---: | ---: |
| Rotação conduzida pela automação | 37,5 | 0 |
| Sequência visual completa | 48,4 | 1 de 89 ms |

A sequência completa medida durou 12.457,7 ms. Os números incluem a sobrecarga do navegador
automatizado e da geração sintética de entrada; não substituem profiling em aparelhos reais.

## Responsividade, acessibilidade e limitações

Em mobile, o painel tem altura limitada, rolagem própria e conteúdo compacto durante a
sequência. Os controles possuem nomes acessíveis, não dependem de hover, e o estado semântico
usa `aria-live`. Camadas são identificadas por texto, não apenas por cor.

O corte interno é uma representação didática, não um modelo geofísico volumétrico. A esfera
procedural fica ancorada à posição da origem em coordenadas do mapa, mas a trajetória interna
é uma visualização abstrata do diâmetro. FPS e memória variam conforme GPU, driver, tiles e
tamanho da viewport. Não foram adicionados terrain, áudio, partículas, prédios 3D ou efeitos
de pós-processamento.
