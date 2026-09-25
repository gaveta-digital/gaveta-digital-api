# Gaveta Digital — API

**Disciplina:** Programação para Dispositivos Móveis — UFC | Etapa 1
**Repositório:** https://github.com/gaveta-digital/gaveta-digital-api

---

## Sobre o projeto

Uma API REST para automatizar a organização de comprovantes financeiros de MEIs e autônomos: o usuário envia a foto de um recibo/nota fiscal, e uma IA (Google Gemini) extrai automaticamente estabelecimento, data, valor e categoria, salvando tudo organizado e pronto para consulta ou envio ao contador.

Veja a proposta completa em [`docs/VISAO-GERAL-PROJETO.md`](docs/VISAO-GERAL-PROJETO.md).

---

## Equipe

| Integrante | Principais responsabilidades |
|---|---|
| João Vitor Rodrigues | Arquitetura, banco de dados, models |
| Maria Barros | CRUD de Categoria, protótipo do app |
| Radlei | CRUD de Comprovante |
| Clidenor | CRUD de Usuário e autenticação (JWT) |
| Cauan Ricardo | Camada de Repository, integração com IA (Gemini), Docker, pipeline CI, Swagger, testes de integração |

---

## Protótipo da Aplicação Mobile

**Link:** [Figma — Gaveta Digital](https://www.figma.com/design/EK3DWo4GZUesKuCitrI8Vq/GavetaDigital?node-id=0-1&t=3MUQBYzFg52aRHla-1)

Protótipo elaborado por Maria Barros.

5 telas: Login, Lista de Comprovantes, Câmera, Processamento (IA), Revisão do Recibo.

Detalhes sobre o que está implementado na API vs. o que é visão de produto: [`docs/PROTOTIPO.md`](docs/PROTOTIPO.md).

---

## Tecnologias

- Node.js 22 + Express
- Sequelize + SQLite
- JWT (autenticação) e bcrypt (hash de senha)
- Zod (validação de dados)
- Google Gemini API (extração de dados via IA)
- Multer (upload de imagens)
- Swagger (documentação interativa da API)
- Jest + Supertest (testes unitários e de integração)
- Docker / Docker Compose
- GitHub Actions (CI)

---

## Como rodar o projeto

### Configuração (necessária nos dois modos)

Crie o arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

No Windows PowerShell: `Copy-Item .env.example .env`

Depois edite o `.env`:

| Variável | Descrição |
|---|---|
| `PORT` | Porta da API (padrão `8080`) |
| `NODE_ENV` | `development` sincroniza as tabelas do banco ao iniciar |
| `DB_DIALECT` / `DB_STORAGE` | Banco SQLite e o caminho do arquivo |
| `JWT_SECRET` | Chave usada para assinar os tokens de login |
| `GEMINI_API_KEY` | Chave da API do Gemini, gerada em https://aistudio.google.com/apikey |

O `.env` não é versionado. Nunca coloque chaves reais no `.env.example`.

### Com Docker (recomendado)

```bash
docker compose up --build
```

A API sobe em `http://localhost:8080`. O código em `src` é recarregado automaticamente ao ser alterado, e o banco e as imagens ficam no volume `sqlite-data`. Para parar: `docker compose down` (com `-v` o banco e as imagens também são apagados).

### Localmente

```bash
npm install
npm run dev    # desenvolvimento, com recarregamento automático
npm start      # sem recarregamento
```

### Verificando se está no ar

- Rota de saúde: `http://localhost:8080/api/teste`
- **Documentação interativa (Swagger):** `http://localhost:8080/api-docs`

No Swagger, faça login em `POST /login`, copie o `token` e clique em **Authorize** para testar as rotas protegidas.

### Rodando os testes

```bash
npm test
```

Os testes de integração usam um banco e uma pasta de uploads temporários, e o Gemini é simulado: nenhuma chamada real é feita e nada do seu ambiente de desenvolvimento é alterado.

Para rodar os testes em um contêiner isolado:

```bash
docker compose run --rm -e NODE_ENV=test -e DB_STORAGE=/tmp/gaveta-digital-test.sqlite api npm test -- --ci --runInBand
```

---

## Rotas da API

Todas as rotas têm o prefixo `/api`. As marcadas com 🔒 exigem o header `Authorization: Bearer <token>`.

| Método | Rota | Descrição |
|---|---|---|
| POST | `/usuarios` | Cadastra usuário (cria as 6 categorias iniciais) |
| POST | `/login` | Autentica e retorna o token JWT |
| GET | `/categorias` 🔒 | Lista as categorias do usuário |
| POST | `/categorias` 🔒 | Cria categoria |
| PUT | `/categorias/:id` 🔒 | Renomeia categoria (exceto "Outros") |
| DELETE | `/categorias/:id` 🔒 | Exclui categoria sem comprovantes (exceto "Outros") |
| POST | `/comprovantes` 🔒 | Envia a foto (`multipart/form-data`, campo `imagem`) e a IA extrai os dados |
| GET | `/comprovantes` 🔒 | Lista os comprovantes do usuário (`pagina`, `limite`) |
| GET | `/comprovantes/:id` 🔒 | Detalha um comprovante |
| PATCH | `/comprovantes/:id` 🔒 | Edita parcialmente o comprovante (só os campos enviados) |
| DELETE | `/comprovantes/:id` 🔒 | Exclui o comprovante |
| GET | `/comprovantes/:id/imagem` 🔒 | Retorna a imagem do comprovante |

---

## Funcionalidades implementadas

- Cadastro e login de usuário (JWT)
- CRUD completo de Categoria, com categorias próprias de cada usuário
- CRUD completo de Comprovante, com campo de observações
- Upload de imagem de comprovante (JPEG, PNG ou WebP, até 10 MiB) com extração automática de dados via IA
- Categoria escolhida dinamicamente entre as categorias do próprio usuário (fallback: "Outros")
- Consulta protegida da imagem: só o dono do comprovante acessa o arquivo
- Tratamento de indisponibilidade do Gemini: tentativas automáticas em outros modelos, com limite de tempo por tentativa
- Validação de dados e tratamento de erros padronizado
- Persistência em banco de dados
- Documentação interativa com Swagger

## Cenários cobertos pelos testes

- Cadastro e login (sucesso, e-mail duplicado, credenciais inválidas)
- CRUD de Categoria e Comprovante (sucesso, acesso negado a dados de outro usuário, recurso não encontrado)
- Extração de dados via IA: imagem completa, imagem com campo ilegível, imagem totalmente ilegível, categoria não identificada
- Falha de conexão com o serviço de IA (tratada sem quebrar a API)
- Regras de dado: valor negativo rejeitado, data futura rejeitada, campos nulos aceitos sem perder o registro

---

## Integração contínua

O GitHub Actions roda os testes em cada push e pull request. A configuração das proteções de `develop` e `main` e o roteiro do PR de validação estão em [`docs/CI.md`](docs/CI.md).

---

## Documentação completa

- [`docs/VISAO-GERAL-PROJETO.md`](docs/VISAO-GERAL-PROJETO.md) — problema, solução, arquitetura, entidades e rotas
- [`docs/REGRAS-DE-NEGOCIO.md`](docs/REGRAS-DE-NEGOCIO.md) — validações, limites de campo e comportamento da IA
- [`docs/TEST-PLAN.md`](docs/TEST-PLAN.md) — estratégia de testes unitários e de integração
- [`docs/PROTOTIPO.md`](docs/PROTOTIPO.md) — protótipo e escopo do app
- [`docs/CI.md`](docs/CI.md) — integração contínua e proteção de branches
- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — fluxo de branches e padrão de commits
