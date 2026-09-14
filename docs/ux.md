# UX e validação visual

## Etapa de produto (entrada, descoberta e compartilhamento)

Esta etapa mudou apenas a camada de interface; antípoda, API, worker, PostGIS, timeline,
sonda e classificação das camadas permanecem iguais.

- **Entrada.** `index.html` pinta uma tela de abertura com CSS crítico antes do bundle. O React
  assume a mesma marcação e `trackMapReadiness` segue eventos reais do MapLibre:
  `style.load` → `load` (projeção globe e camadas) → primeiro `idle` depois do `load`. A tela
  fica no mínimo 1,6 s desde o início da navegação, sai com fade de 500 ms e tem timeout de
  segurança de 12 s. Enquanto carrega, `main` fica `inert`.
- **Câmera inicial.** Sem parâmetros, o globo abre em `[-54, -12]` com zoom calculado pela
  viewport (`getInitialGlobeZoom`), mantendo o planeta inteiro visível. `?lat=&lon=` válidos
  substituem o centro, marcam a origem e resolvem o endereço, sem iniciar a perfuração; valores
  inválidos são ignorados e removidos da barra de endereço.
- **Espaço.** Gradiente radial e duas camadas de estrelas em `background-image` de
  pseudo-elementos (nenhum nó DOM por estrela, sem animação). A atmosfera usa `setSky` do
  MapLibre com `atmosphere-blend` baixo que some ao aproximar.
- **Revelação progressiva.** Sem seleção: só a orientação. Com seleção: nome, região,
  coordenadas e `CAVAR` (um toque calcula o destino e inicia a travessia quando o job termina).
  Durante a perfuração: camada, profundidade, distância relevante, Pausar e Cancelar; cabeçalho
  e controles do mapa somem. Após a chegada: modal de descoberta e, ao fechar, uma barra
  discreta “Ver descoberta”.
- **Modal.** `role="dialog"`, `aria-modal`, título associado, focus trap, Esc, clique no fundo
  e retorno de foco. Conteúdo adapta-se a oceano (destino direto, terra firme e localidade
  habitada) ou terra (país, estado, localidade). Campos ausentes são omitidos ou descritos em
  linguagem humana. “Como calculamos?” usa `<details>` e não mostra SQL.
- **Imagem.** `DiscoveryImageProvider` isolado; a implementação Wikimedia usa apenas APIs
  oficiais com CORS (`pageimages` + `coordinates` para rejeitar homônimos, depois `imageinfo`
  no Commons para miniatura, autor e licença). Descarta bandeiras, brasões, mapas e retratos.
  A busca só começa com o modal aberto; falhas viram uma ilustração ortográfica do antípoda.
- **Compartilhar.** Copiar link (Clipboard API → `execCommand` → campo para cópia manual),
  Web Share API quando existir (com o PNG se `canShare({ files })`) e download do cartão
  1080×1350 desenhado em Canvas, carregado sob demanda.

Validação: `npm run test:e2e` cobre entrada, prontidão, câmera, URL, modal, imagem, fallback,
compartilhamento e mobile com APIs simuladas. `npm run test:visual` gera as capturas de revisão
em `output/ui-ux/screenshots` contra o backend real. Para rodar um segundo checkout em outra
porta sem mudar o CORS da API: `TERRA_API_PROXY_TARGET=http://localhost:8000
VITE_API_BASE_URL=http://127.0.0.1:5174/api/v1 npx vite --port 5174` e `E2E_PORT=5174`.

## Direção visual (Fase 4)

A Fase 4 preserva o globo como superfície principal. O painel usa uma única superfície escura,
sem coleção de cards, e combina verde profundo, âmbar de seleção e ciano de destino. A
tipografia foi unificada em Manrope; monospace fica restrito a coordenadas e telemetria.

Na entrada há somente a instrução “Explore o planeta e selecione um ponto”. Depois do clique,
aparecem local, coordenadas e preparação. O processamento assíncrono é identificado como
status do cálculo. `CAVAR` surge somente quando o resultado real está pronto e nunca inicia
automaticamente. (Substituído pela etapa de produto acima.)

## Breakpoints verificados

Foram renderizados e inspecionados 1920×1080, 1366×768, 1024×768, 390×844 e 360×800. O
teste automatizado verifica ausência de overflow horizontal e limites do painel. Em 1920 px,
o zoom inicial maior elimina o vazio excessivo; em 360 px, o painel inicial permanece compacto
abaixo do globo. Os controles da animação têm alvo mínimo de 44 px e continuam acessíveis por
touch e teclado.

## Estados e recuperação

- geocodificação indisponível preserva as coordenadas e oferece nova tentativa;
- falha ao criar job informa indisponibilidade sem expor detalhes internos;
- job com falha pode ser criado novamente;
- consulta indisponível e timeout de 45 s oferecem retomada;
- ausência, falha de inicialização ou perda do WebGL2 mostra fallback com recarga;
- campos opcionais ausentes são omitidos ou apresentados como “Não determinada”.

## Acessibilidade

A jornada completa foi auditada com axe-core no Chromium: nenhuma violação séria ou crítica.
Botões possuem nomes discerníveis, foco visível e estado disabled; mudanças de backend e etapa
visual usam `aria-live`. Camadas são diferenciadas por texto, geometria e cor. A preferência
`prefers-reduced-motion` mantém origem, trajetória e destino em 620 ms sem remover o resultado.
O perfil `LOW_END` foi confirmado em execução com CPU throttling 4×, não apenas por teste
unitário do número de núcleos.

## Cenários reais

Com API, PostGIS, Redis e Celery reais, foram concluídos: Fortaleza para destino oceânico,
o antípoda de Fortaleza para destino terrestre no Brasil, Lisboa como ponto costeiro e o
Golfo da Guiné como segundo caso oceânico. A validação de dispositivo físico não fez parte
desta execução; mobile foi testado por viewport, touch emulado e Chromium.
