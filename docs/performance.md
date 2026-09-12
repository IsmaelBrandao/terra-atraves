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
- carregar Three.js somente por `await import("three")` quando a animação existir;
- permitir detalhes 3D apenas em zoom 15/16 ou superior, com opção de desligá-los em low-end;
- nunca carregar grandes datasets geográficos na thread principal do navegador.

O backend, o Redis e o worker são processos separados e não participam do render loop.
