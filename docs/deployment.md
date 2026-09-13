# Deploy em produção

Arquitetura prevista: frontend React/Vite na Vercel e, no Railway, uma API FastAPI, um
worker Celery, Redis e PostgreSQL com PostGIS. Este documento prepara o deploy, mas não o
executa.

## Antes de começar

- Use o repositório GitHub `IsmaelBrandao/terra-atraves` e a branch de produção aprovada.
- Não copie `.env` para nenhuma plataforma. Cadastre cada variável nos painéis.
- Não gere domínio público para worker, Redis ou PostGIS.
- Confirme que o serviço PostgreSQL escolhido oferece PostGIS. A migration `0003` executa
  `CREATE EXTENSION IF NOT EXISTS postgis` e deve falhar claramente se a imagem não suportar
  a extensão.
- O healthcheck da API é `GET /api/v1/health`. Ele retorna apenas `{"status":"ok"}` e não
  consulta banco, Redis, Nominatim ou qualquer outro serviço.

## Railway

### 1. Criar os serviços

1. Crie um projeto e selecione o ambiente `production`.
2. No marketplace, crie um serviço **PostGIS**. Não use PostgreSQL sem suporte a PostGIS.
3. Crie um serviço **Redis**.
4. Crie o serviço **api** a partir do repositório GitHub.
5. Crie o serviço **worker** a partir do mesmo repositório GitHub.
6. Em **Settings > Source**, configure a branch de produção nos dois serviços.
7. Em **Settings > Root Directory**, use `/backend` em `api` e `worker`. O Railway detectará
   o `backend/Dockerfile` em ambos.

### 2. Configurar a API

Em **Settings > Deploy**:

- **Start Command**:

  ```sh
  /bin/sh -c 'exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"'
  ```

- **Pre-Deploy Command**:

  ```sh
  alembic upgrade head
  ```

- **Healthcheck Path**: `/api/v1/health`
- **Healthcheck Timeout**: `120` segundos

O processo executado é `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Como o serviço usa
Dockerfile, o Railway executa um Start Command sobrescrito em formato `exec`; o invólucro
`/bin/sh -c` acima é necessário para expandir `$PORT`. Não substitua por uma porta fixa.

Em **Variables**, configure:

| Variável | Valor |
| --- | --- |
| `DATABASE_URL` | `${{PostGIS.DATABASE_URL}}` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |
| `CORS_ORIGINS` | `https://<dominio-vercel>` |
| `NOMINATIM_BASE_URL` | `https://nominatim.openstreetmap.org` |
| `NOMINATIM_USER_AGENT` | `TerraAtraves/0.1 (academic project; contact=<email-real>)` |
| `NOMINATIM_TIMEOUT_SECONDS` | `10` |
| `REVERSE_GEOCODING_CACHE_TTL_SECONDS` | `604800` |

Use o autocomplete do Railway para selecionar os nomes reais dos serviços. Se eles forem
renomeados, ajuste `PostGIS` e `Redis` nas referências. A aplicação aceita a `DATABASE_URL`
fornecida como `postgres://`, `postgresql://` ou `postgresql+asyncpg://` e sempre a normaliza
para o driver assíncrono `asyncpg`. Não use `CORS_ORIGINS=*`; a configuração é rejeitada.

No primeiro deploy, antes de conhecer o domínio Vercel, pode-se usar temporariamente o URL de
preview/produção já reservado na Vercel. Se ele ainda não existir, conclua primeiro o deploy
da Vercel, cadastre o domínio exato e redeploye a API antes do smoke test no navegador.

### 3. Configurar o worker

Em **Settings > Deploy**:

- **Start Command**:

  ```sh
  celery -A app.worker.celery_app worker --loglevel=INFO --concurrency=2
  ```

- Não configure healthcheck, domínio público nem bootstrap.
- Não repita `alembic upgrade head` no worker; a API é a única responsável pela migration de
  cada release.

Em **Variables**, configure exatamente:

| Variável | Valor |
| --- | --- |
| `DATABASE_URL` | `${{PostGIS.DATABASE_URL}}` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |

API e worker devem apontar para os mesmos serviços. O código dos dois lê apenas essas chaves;
não depende dos nomes `postgres` ou `redis` usados pelo Docker Compose local.

### 4. Publicar somente a API

Na API, abra **Settings > Networking** e gere um domínio público. Valide no navegador ou com:

```sh
curl --fail https://<railway-api>/api/v1/health
```

O resultado esperado é HTTP 200 com `{"status":"ok"}`. Não gere domínio para os demais
serviços.

### 5. Bootstrap único do Natural Earth

O bootstrap não roda no startup, no worker ou no pre-deploy. Ele baixa exatamente os quatro
arquivos/versionamentos descritos em `data/README.md` para um diretório temporário, reutiliza
as validações e a transação do importador existente e apaga os arquivos ao terminar.

Depois que a API estiver ativa e a migration tiver concluído, instale/autentique a Railway CLI,
vincule o projeto e execute o comando dentro do container da API:

```sh
railway login
railway link
railway ssh --service api -- python -m scripts.bootstrap_natural_earth
```

O comando pode demorar por causa do download e da importação. Qualquer download inválido,
arquivo ausente, projeção incorreta, erro de banco ou tabela vazia encerra com código diferente
de zero. A importação substitui os quatro conjuntos numa única transação, portanto uma nova
execução é idempotente e não duplica linhas. Ainda assim, execute-a somente na implantação
inicial ou quando houver decisão explícita de atualizar/recarregar os datasets.

Verifique as quatro tabelas no mesmo container:

```sh
railway ssh --service api -- python -m scripts.verify_natural_earth
```

O comando deve imprimir uma contagem maior que zero para:

- `natural_earth_land`
- `natural_earth_countries`
- `natural_earth_states`
- `natural_earth_populated_places`

A ordem operacional é: `alembic upgrade head` no pre-deploy da API, bootstrap uma vez,
verificação das contagens e somente então liberação do produto.

## Vercel

1. Importe `IsmaelBrandao/terra-atraves` pelo GitHub.
2. Configure **Root Directory** como `frontend`.
3. Selecione **Framework Preset** `Vite`.
4. Use **Build Command** `npm run build`.
5. Use **Output Directory** `dist`.
6. Em **Environment Variables**, cadastre para `Production` (e para `Preview` se ele precisar
   consumir a mesma API):

   | Variável | Valor |
   | --- | --- |
   | `VITE_API_BASE_URL` | `https://<railway-api>/api/v1` |
   | `VITE_MAP_STYLE_URL` | `https://tiles.openfreemap.org/styles/liberty` |

7. Faça o deploy e copie o domínio HTTPS definitivo.
8. Atualize `CORS_ORIGINS` na API com esse domínio, sem barra final e sem `*`, e redeploye a
   API.

Com `VITE_API_BASE_URL` definido, o frontend não usa `localhost`, `127.0.0.1` nem proxy Vite.
Os tiles são carregados por HTTPS diretamente do OpenFreeMap.

## Itens auditados sem implementação nesta versão

O código atual não contém URL compartilhável por `?lat=&lon=`, share card, modal de resultado
nem provider Wikimedia. Por isso não há domínio hardcoded, proxy localhost ou heurística de
imagens a corrigir, mas também não é possível validar essas experiências antes que existam.
Elas não foram adicionadas nesta preparação porque seriam features e alterariam o escopo do
produto.

## Smoke test de produção

Execute depois do domínio Vercel entrar no CORS. Registre o horário e os URLs testados.

- [ ] Frontend abre sem erro no console.
- [ ] Loading desaparece.
- [ ] Globo abre no Brasil.
- [ ] Tiles carregam por HTTPS.
- [ ] Selecionar um ponto funciona.
- [ ] Reverse geocoding responde ou apresenta fallback controlado.
- [ ] `CAVAR` envia o `POST /api/v1/drillings` com sucesso.
- [ ] Worker Celery recebe o job.
- [ ] Job chega a `COMPLETED`.
- [ ] Resultado contém dados derivados do PostGIS.
- [ ] Animação completa, incluindo passagem pelo centro.
- [ ] Pausa e continuação preservam a progressão.
- [ ] Repetir perfuração funciona.
- [ ] Escolher outro local funciona.
- [ ] Layout e fluxo funcionam em viewport mobile.
- [ ] Fluxo funciona com `prefers-reduced-motion`.
- [ ] Modal abre — **pendente: não existe nesta versão**.
- [ ] Wikimedia carrega ou usa fallback — **pendente: não existe nesta versão**.
- [ ] Copiar link preserva `?lat=&lon=` — **pendente: não existe nesta versão**.
- [ ] Link abre em aba anônima — **pendente: não existe nesta versão**.

Se API ou worker falharem, confirme primeiro se ambos receberam as mesmas referências de
`DATABASE_URL` e `REDIS_URL`. Se a API subir mas o job falhar na análise espacial, execute a
verificação do Natural Earth e confira os logs do worker.
