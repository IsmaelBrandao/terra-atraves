# UX e validação visual

## Direção visual

A Fase 4 preserva o globo como superfície principal. O painel usa uma única superfície escura,
sem coleção de cards, e combina verde profundo, âmbar de seleção e ciano de destino. A
tipografia foi unificada em Manrope; monospace fica restrito a coordenadas e telemetria.

Na entrada há somente a instrução “Explore o planeta e selecione um ponto”. Depois do clique,
aparecem local, coordenadas e preparação. O processamento assíncrono é identificado como
status do cálculo. `CAVAR` surge somente quando o resultado real está pronto e nunca inicia
automaticamente.

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
