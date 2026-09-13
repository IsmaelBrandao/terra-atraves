# Performance do globo

A câmera, zoom, bearing, pitch, WebGL e tiles pertencem exclusivamente à instância do
MapLibre. Ela é criada uma única vez, guardada em `useRef` e não é espelhada no React ou
no Zustand.

Regras obrigatórias:

- não atualizar React ou Zustand durante `move`, `zoom`, `rotate` ou `pitch`;
- MapLibre controla sua própria câmera;
- usar somente eventos discretos como `click`, `moveend` e `zoomend`;
- zero requisições de API durante pan ou zoom;
- acessar tiles diretamente no provider, nunca através do FastAPI;
- limitar `pixelRatio` a 1,5 em máquinas comuns e 1 em dispositivos de menor capacidade;
- configurar workers conservadoramente antes do mapa e executar `prewarm()`;
- manter terrain desabilitado inicialmente;
- manter a experiência/Three.js fora da entrada e preparar seu chunk apenas em idle após seleção;
- permitir detalhes 3D apenas em zoom 15/16 ou superior, com opção de desligá-los em low-end;
- nunca carregar grandes datasets geográficos na thread principal do navegador.

O backend, o Redis e o worker são processos separados e não participam do render loop.

## Fase 3

O build separa `DrillingExperience` e Three.js em um chunk tardio de 534,02 kB minificado e
134,31 kB gzip. A entrada inicial passou de 376,97 kB para 379,71 kB gzip, aumento de 2,74 kB.
O primeiro carregamento dinâmico medido em desenvolvimento levou 175,3 ms.

Em Chrome/Playwright com AMD Radeon via ANGLE/D3D11, a rotação automatizada mediu cerca de
37,5 FPS sem long tasks e a animação completa 48,4 FPS, com uma long task de 89 ms. A
automação de entrada adiciona overhead, portanto estes valores servem como referência local,
não como garantia para outros dispositivos.

Após mais de cinco execuções na mesma página e coleta forçada, o heap aquecido ficou na faixa
de 58,4–59,4 MB, sem crescimento monotônico. O perfil low-end reduz segmentos de 40 para 20,
remove o brilho decorativo e diminui transparências. Detalhes em `docs/visual-experience.md`.

## Fase 4 e orçamento

| Artefato | Minificado | Gzip |
| --- | ---: | ---: |
| Entrada | 1.356,61 kB | 380,75 kB |
| Experiência + Three.js | 536,87 kB | 135,07 kB |

A entrada cresceu 1,04 kB gzip sobre a Fase 3. O chunk 3D continua separado. O primeiro
acesso após preload em idle caiu de 175,3 ms para 7,3–12,4 ms no servidor de desenvolvimento.

Em Chromium visível no monitor local de alta frequência, a execução final marcou 81,4 FPS;
com CPU throttling 4×, 33,1 FPS. O headless por software marcou 18 FPS e por isso foi mantido
apenas como controle, não como comparação direta. O mapa continuou interativo no perfil 4×
e os controles responderam.

O caminho `LOW_END` também foi ativado e verificado pelo texto “qualidade adaptativa”, junto
de throttling real de CPU: 57 FPS sem limitação e 25,2 FPS em 4×, com três long tasks entre
70 e 88 ms. Assim, a validação não dependeu apenas de alterar o número declarado de CPUs.

O perfil de CPU inicial relacionou as tarefas longas principalmente à compilação e consulta
de programas WebGL (`getProgramParameter`, `getProgramInfoLog` e `getProgram`). Depois de
antecipar `renderer.compile()` em `PREPARING`, as chamadas de inspeção de shader deixaram os
maiores consumidores e o pior evento da mesma medição caiu de 268 ms para 198 ms. Restaram
cinco eventos de 56–198 ms, associados a programa WebGL, download/cache e render do MapLibre
e medição de labels. React não apareceu entre os oito maiores consumidores. Um frame é cedido
antes da compilação para o feedback visual aparecer sem disputar o primeiro frame da viagem.

Após aquecimento, dez ciclos completos na mesma SPA e coleta explícita entre amostras
registraram 24,04–25,47 MB, delta líquido de 1,31 MB. A série teve quedas intermediárias e
estabilização gradual, sem crescimento estritamente monotônico. Havia um único canvas
MapLibre no fim. O teste E2E também confirmou zero chamadas à API durante pan/zoom.

Metas vigentes:

- entrada gzip próxima de 380 kB e Three.js fora do caminho inicial;
- zero state update React contínuo de câmera e zero API durante pan/zoom;
- reduzir trabalho da aplicação acima de 50 ms, aceitando variação por GPU, driver e tiles;
- nenhuma tendência monotônica sustentada de heap após ciclos aquecidos;
- um canvas, uma instância de mapa e uma custom layer temporária por execução.
