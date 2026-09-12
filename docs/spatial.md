# Inteligência espacial

## Fonte e importação

O projeto usa Natural Earth 1:10m como fonte principal. Land, admin-0 countries e admin-1
states/provinces são versão 5.1.1; populated places é 5.1.2. Todos são WGS84 e de domínio
público. Os arquivos não são versionados nem baixados no startup.

`python -m scripts.import_natural_earth <diretório>` valida os quatro shapefiles e executa
`TRUNCATE ... RESTART IDENTITY` seguido da importação em uma única transação. Uma falha
reverte toda a operação. Reexecução substitui o snapshot e não cria duplicatas.

O tema land possui 11 registros de origem, mas contém 6.837 partes poligonais. Cada parte é
persistida separadamente para tornar o índice de proximidade seletivo. A orientação dos anéis
é normalizada com `ST_ForcePolygonCCW`, necessária antes do cast para geography.

Contagem do snapshot validado:

| Tabela | Registros |
| --- | ---: |
| `natural_earth_land` | 6.837 |
| `natural_earth_countries` | 258 |
| `natural_earth_states` | 4.596 |
| `natural_earth_populated_places` | 7.342 |
| **Total** | **19.033** |

## Armazenamento e índices

Polígonos são `MULTIPOLYGON`, localidades são `POINT` e todas as geometrias usam SRID 4326.
As quatro tabelas possuem índice GiST em `geom`. Land e populated places também possuem
índice GiST funcional em `(geom::geography)` para busca KNN geodésica.

`geometry` é usado em contenção/interseção e retorna rapidamente candidatos pela bounding
box. `geography` é usado para distância e vizinho mais próximo em metros sobre o elipsoide.
Distâncias em graus nunca são apresentadas como metros.

## Estratégias

- Terra/oceano: `geom && point` mais `ST_Covers` sobre `natural_earth_land`.
- País e admin-1: mesma filtragem indexada nas respectivas tabelas; ausência retorna `null`.
- Localidade: KNN com `geom::geography <-> point::geography` e `ST_Distance`.
- Terra firme: KNN geography escolhe o polígono e `ST_ClosestPoint(geography, geography)`
  calcula o ponto costeiro; `ST_Distance` retorna metros.

Toda a análise ocorre no worker Celery e no PostGIS. O navegador recebe apenas o resultado
compacto e navegação do MapLibre não dispara consultas espaciais.

## EXPLAIN ANALYZE

Medição local em PostgreSQL 16/PostGIS 3.4.3, com dados em cache, usando Fortaleza e seu
antípoda `(3.7319, 141.4733)`:

| Consulta | Tempo de execução | Plano relevante |
| --- | ---: | --- |
| Terra/oceano | 6,575 ms | `ix_natural_earth_land_geom` |
| País | 4,098 ms | `ix_natural_earth_countries_geom` |
| Localidade mais próxima | 15,610 ms | `ix_natural_earth_populated_places_geography` KNN |
| Terra firme mais próxima | 132,655 ms | `ix_natural_earth_land_geography` KNN |

A primeira modelagem armazenava os 6.837 polígonos em 11 multipolígonos e fazia sequential
scan; nearest land levou 762,468 ms. A divisão das partes reduziu a execução para 132,655 ms
e eliminou o scan sequencial. Não foram aplicadas outras otimizações sem evidência.

## Limitações

Natural Earth 1:10m é cartográfico e generalizado; não representa uma linha costeira cadastral
nem garante a presença de ilhas muito pequenas. Admin-0 adota limites de facto e regiões
disputadas podem não ter ISO. Populated places não é uma base exaustiva de assentamentos.
Consequentemente, país, estado ou país da terra firme podem ser `null` sem indicar erro.
