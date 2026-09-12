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
- carregar a experiência/Three.js somente após `CAVAR`, por import dinâmico;
- permitir detalhes 3D apenas em zoom 15/16 ou superior, com opção de desligá-los em low-end;
- nunca carregar grandes datasets geográficos na thread principal do navegador.

O backend, o Redis e o worker são processos separados e não participam do render loop.

## Fase 3

O build separa `DrillingExperience` e Three.js em um chunk tardio de 534,02 kB minificado e
134,32 kB gzip. A entrada inicial passou de 376,97 kB para 379,74 kB gzip, aumento de 2,77 kB.
O primeiro carregamento dinâmico medido em desenvolvimento levou 175,3 ms.

Em Chrome/Playwright com AMD Radeon via ANGLE/D3D11, a rotação automatizada mediu cerca de
37,5 FPS sem long tasks e a animação completa 48,4 FPS, com uma long task de 89 ms. A
automação de entrada adiciona overhead, portanto estes valores servem como referência local,
não como garantia para outros dispositivos.

Após mais de cinco execuções na mesma página e coleta forçada, o heap aquecido ficou na faixa
de 58,4–59,4 MB, sem crescimento monotônico. O perfil low-end reduz segmentos de 40 para 20,
remove o brilho decorativo e diminui transparências. Detalhes em `docs/visual-experience.md`.
