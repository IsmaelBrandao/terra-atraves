# Dados geográficos

Diretório reservado aos arquivos locais do Natural Earth. Datasets grandes não são
versionados, baixados durante o startup nem enviados ao navegador. Todos os temas abaixo
usam escala 1:10m e datum WGS84.

## Datasets

- `ne_10m_land` 5.1.1: `https://naturalearth.s3.amazonaws.com/10m_physical/ne_10m_land.zip`
- `ne_10m_admin_0_countries` 5.1.1: `https://naturalearth.s3.amazonaws.com/10m_cultural/ne_10m_admin_0_countries.zip`
- `ne_10m_admin_1_states_provinces` 5.1.1: `https://naturalearth.s3.amazonaws.com/10m_cultural/ne_10m_admin_1_states_provinces.zip`
- `ne_10m_populated_places` 5.1.2: `https://naturalearth.s3.amazonaws.com/10m_cultural/ne_10m_populated_places.zip`

Extraia os quatro ZIPs abaixo de `data/natural_earth/`, preservando `.shp`, `.shx`, `.dbf` e
`.prj`. O importador localiza os arquivos recursivamente e falha antes de tocar no banco se
algum conjunto estiver ausente, vazio, duplicado ou sem declaração WGS84.

Os dados Natural Earth são de domínio público conforme os termos oficiais:
`https://www.naturalearthdata.com/about/terms-of-use/`.
