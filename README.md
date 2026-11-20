## Identificação da Equipe

Disciplina: Programação para Dispositivos Móveis
Período: 2026.2
Projeto: Gaveta Digital
Equipe: [Número da equipe]

| Nome completo | Matrícula | Turma | Turno | GitHub |
|---|---|---|---|---|
| Cauan Ricardo Ribeiro | 569566 | [Turma] | Tarde | [@cauanrricardo] |
| Clidenor Lopes Martins Filho | [Matrícula] | [Turma] | Noite | [@ClidenorFilho] |
| João Vitor Rodrigues | 567428 | [Turma] | Noite | [@Joao-Vitor-Rd] |
| Maria José Pinho Barros | 556324 | [Turma] | Noite | [@dev-mariab] |
| Radlei Eugenio Doroth | 568379 | [Turma] | Tarde | [@radleidoroth] |

### Descrição do projeto

MEIs e profissionais autônomos acumulam recibos, notas fiscais e boletos ao longo do mês: papel na gaveta, fotos soltas no celular, notas perdidas no e-mail. Na hora do imposto de renda ou de mandar tudo ao contador, precisam digitar cada gasto numa planilha, e muitas despesas acabam esquecidas ou mal categorizadas.

O **Gaveta Digital** é um aplicativo em que o usuário fotografa o comprovante e uma IA (Google Gemini) preenche estabelecimento, data, valor e categoria. O usuário confere e corrige os dados numa tela de revisão, e tudo fica salvo num histórico organizado, com busca, filtro por categoria e resumo dos gastos do mês.

**Caso de uso:** João, mecânico autônomo, compra uma câmara de ar e um kit de remendo numa loja de pneus. Ainda no balcão, fotografa o recibo no app. Em poucos segundos aparecem o nome da loja, a data, R$ 150,50 e a categoria "Material". Ele confirma e salva. No fim do mês, abre o resumo e vê quanto gastou com material, sem procurar papel nenhum.

**Funcionalidades:**
- Cadastro e login, com o usuário mantido conectado ao reabrir o app
- Captura do comprovante pela câmera ou galeria, com extração automática dos dados pela IA
- Revisão e correção dos dados antes de salvar, com campo de observações
- Lista de comprovantes com resumo do mês, busca e filtro por categoria
- Resumo dos gastos do mês por categoria
- Detalhe do comprovante com a foto original, edição e exclusão
- Gerenciamento das categorias próprias de cada usuário
- Perfil com edição do nome

Documentação completa: [`docs/VISAO-GERAL-PROJETO.md`](docs/VISAO-GERAL-PROJETO.md) e [`docs/REGRAS-DE-NEGOCIO.md`](docs/REGRAS-DE-NEGOCIO.md).

### API REST

**Tecnologias:** Node.js 22, Express, Sequelize + SQLite, JWT e bcrypt, Zod (validação), Multer (upload de imagens), Google Gemini API, Swagger, Jest + Supertest, Docker / Docker Compose e GitHub Actions.

**Execução:**

1. Entre na pasta da API (`cd api`; todos os comandos abaixo rodam de dentro dela) e crie o `.env` a partir do exemplo: `cp .env.example .env` (no PowerShell: `Copy-Item .env.example .env`).
2. Preencha as variáveis:

| Variável | Descrição |
|---|---|
| `PORT` | Porta da API (padrão `8080`) |
| `NODE_ENV` | `development` sincroniza as tabelas do banco ao iniciar |
| `DB_DIALECT` / `DB_STORAGE` | Banco SQLite e o caminho do arquivo |
| `JWT_SECRET` | Chave usada para assinar os tokens de login |
| `GEMINI_API_KEY` | Chave da API do Gemini, gerada em https://aistudio.google.com/apikey |

3. Suba a API, com Docker (recomendado) ou localmente:

```bash
docker compose up --build      # com Docker; banco e imagens ficam no volume sqlite-data

npm install                    # localmente
npm run dev                    # com recarregamento automático
```

A API responde em `http://localhost:8080`. Rota de saúde: `/api/teste`. Documentação interativa (Swagger): `/api-docs` — faça login em `POST /login`, copie o `token` e clique em **Authorize**.

4. Testes: `npm test`. Os testes de integração usam banco e uploads temporários, e o Gemini é simulado. Estratégia e cenários em [`docs/TEST-PLAN.md`](docs/TEST-PLAN.md).

**Entidades:**

| Entidade | Atributos principais |
|---|---|
| Usuario | id, nome, email, senha (somente hash) |
| Categoria | id, nome, usuarioId |
| Comprovante | id, estabelecimento, data, valor, observacoes, imagemUrl (referência interna), usuarioId, categoriaId |

**Endpoints:** todas as rotas usam o prefixo `/api`. As marcadas com 🔒 exigem `Authorization: Bearer <token>`.

| Método | Rota | Finalidade |
|---|---|---|
| POST | `/usuarios` | Cadastra usuário e cria as 6 categorias iniciais |
| POST | `/login` | Autentica e retorna o token JWT |
| GET | `/categorias` 🔒 | Lista as categorias do usuário |
| POST | `/categorias` 🔒 | Cria categoria |
| PUT | `/categorias/:id` 🔒 | Renomeia categoria (exceto "Outros") |
| DELETE | `/categorias/:id` 🔒 | Exclui categoria sem comprovantes (exceto "Outros") |
| POST | `/comprovantes` 🔒 | Envia a foto (`multipart/form-data`, campo `imagem`); a IA extrai os dados e o comprovante é salvo |
| GET | `/comprovantes` 🔒 | Lista os comprovantes do usuário (`pagina`, `limite`) |
| GET | `/comprovantes/:id` 🔒 | Detalha um comprovante |
| PATCH | `/comprovantes/:id` 🔒 | Edita só os campos enviados |
| DELETE | `/comprovantes/:id` 🔒 | Exclui o comprovante e sua imagem |
| GET | `/comprovantes/:id/imagem` 🔒 | Retorna a imagem, só para o dono |

Exemplo — login:

```http
POST /api/login
Content-Type: application/json

{ "email": "joao@email.com", "senha": "Senha123" }
```

```json
200 OK
{
  "status": "sucesso",
  "data": {
    "usuario": { "id": "…", "nome": "João", "email": "joao@email.com" },
    "token": "eyJhbGciOi…"
  }
}
```

Exemplo — envio de comprovante (`POST /api/comprovantes`, `multipart/form-data` com o campo `imagem`):

```json
201 Created
{
  "id": "…",
  "estabelecimento": "Barrichello Pneus Senna",
  "data": "2026-09-30",
  "valor": 150.5,
  "observacoes": null,
  "categoriaId": "…"
}
```

Exemplo — edição parcial (`PATCH /api/comprovantes/:id`):

```json
{ "valor": 152.9, "observacoes": "Peças do carro do cliente Pedro" }
```

**Validações:**

| Situação | Resposta |
|---|---|
| Campo ausente, tipo errado ou fora do limite | `400` |
| Sem token ou token inválido | `401` |
| Acesso a dado de outro usuário | `403` |
| Recurso inexistente | `404` |
| E-mail ou categoria duplicados | `409` |
| Imagem acima de 10 MiB | `413` |
| Formato de imagem não suportado (aceita JPEG, PNG e WebP) | `415` |
| Imagem ilegível pela IA (o comprovante não é criado) | `422` |
| Gemini indisponível após tentar outros modelos | `503` |

Erros seguem o formato `{ "erro": "mensagem para o usuário" }`. Regras completas em [`docs/REGRAS-DE-NEGOCIO.md`](docs/REGRAS-DE-NEGOCIO.md).

**Persistência:** banco SQLite gerenciado pelo Sequelize, no arquivo definido em `DB_STORAGE`. As imagens ficam num armazenamento privado da API, acessível só pela rota autenticada. No Docker, banco e imagens ficam no volume `sqlite-data`.

### Aplicação mobile

**Protótipo:** [Figma — Gaveta Digital](https://www.figma.com/design/EK3DWo4GZUesKuCitrI8Vq/GavetaDigital?node-id=0-1&t=3MUQBYzFg52aRHla-1) — telas, navegação e decisões em [`docs/PROTOTIPO.md`](docs/PROTOTIPO.md).

**Tecnologias:** Expo SDK 58 (React Native 0.88), JavaScript e Expo Router.

**Situação:** em desenvolvimento na Etapa 2. O escopo das telas está em [`docs/VISAO-GERAL-PROJETO.md`](docs/VISAO-GERAL-PROJETO.md), seção 6.1. A base do app (navegação, sessão, cliente da API, componentes e utilitários) está pronta; as telas são preenchidas por tarefa.

**Execução:**

1. Suba a API (veja "Execução" em API REST) e descubra o IPv4 do computador na rede local (`ipconfig` no Windows, `ip addr` no Linux, `ipconfig getifaddr en0` no macOS). O celular precisa estar na mesma rede Wi-Fi.
2. Entre na pasta do app, crie o `.env` e aponte para a API:

```bash
cd mobile
cp .env.example .env          # no PowerShell: Copy-Item .env.example .env
# edite o .env: EXPO_PUBLIC_API_URL=http://SEU-IPV4:8080
npm install
npx expo start
```

3. Escaneie o QR Code com o **Expo Go** (SDK 58) no iPhone ou no Android.

**API e app juntos com Docker:** na raiz do repositório, com `api/.env` preenchido (`GEMINI_API_KEY` e `JWT_SECRET`):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-docker.ps1   # Windows: detecta o IPv4 e sobe tudo
```

```bash
HOST_IP=SEU-IPV4 docker compose up --build                            # Linux/macOS
```

A API fica em `http://SEU-IPV4:8080` e o Expo em `http://SEU-IPV4:8081`; escaneie o QR Code exibido no terminal. O `compose.yml` da raiz inclui o `api/compose.yml`, que continua servindo para subir só a API.

**Estrutura:** `app/` (telas e rotas do Expo Router), `src/services/` (chamadas à API), `src/context/` (sessão), `src/components/`, `src/utils/` (validações e formatação) e `src/theme/`. Detalhes em [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md), seção 0.

### Organização Git

**main:** versão estável e entregável; só recebe merge de `develop`.
**develop:** integração das funcionalidades em desenvolvimento; recebe os pull requests das branches de tarefa.
**feature/\*:** uma branch por tarefa, por exemplo `feature/api-uso-ia` ou `feature/mobile-login`. Correções usam `fix/*` e documentação usa `docs/*`.

Fluxo, padrão de commits e pull requests em [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md). Integração contínua em [`docs/CI.md`](docs/CI.md).

**Contribuições:**

| Integrante | Etapa 1 (API) | Etapa 2 (App) |
|---|---|---|
| Cauan Ricardo Ribeiro | Camada Repository, integração com o Gemini, Docker, CI, Swagger e testes de integração | [a definir] |
| Clidenor Lopes Martins Filho | Cadastro, login e autenticação (JWT) | [a definir] |
| João Vitor Rodrigues | Arquitetura, banco de dados e models | [a definir] |
| Maria José Pinho Barros | CRUD de Categoria e protótipo no Figma | [a definir] |
| Radlei Eugenio Doroth | CRUD de Comprovante | [a definir] |
