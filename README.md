# Gaveta Digital API

## Como rodar o projeto

### Com Docker (desenvolvimento)

Com Docker e Docker Compose instalados, execute na raiz:

```bash
docker compose up --build
```

A rota de verificação fica disponível em `http://localhost:8080/api/teste`. O Compose define as
variáveis de ambiente, sem precisar criar `.env`, e recarrega a API quando
os arquivos em `src` mudam. O SQLite persiste no volume `sqlite-data`.
Para parar, use `docker compose down`; adicionar `-v` também apaga o banco.
Essa configuração é para desenvolvimento e sincroniza os modelos ao iniciar.

Para executar os testes em um contêiner isolado:

```bash
docker compose run --rm -e NODE_ENV=test -e DB_STORAGE=/tmp/gaveta-digital-test.sqlite api npm test -- --ci --runInBand
```

### CI e proteção de branches

O GitHub Actions roda os testes em cada push e PR. A configuração das proteções
de `develop` e `main` e o roteiro do PR de validação estão em [docs/CI.md](docs/CI.md).

### Pré-requisitos

- Node.js instalado
- npm instalado

### Instalação

Na raiz do projeto, instale as dependências:

```bash
npm install
```

Crie o arquivo `.env` a partir do exemplo:

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

No Linux ou macOS:

```bash
cp .env.example .env
```

### Ambiente de desenvolvimento

Inicie a API com recarregamento automático:

```bash
npm run dev
```

O servidor será iniciado na porta definida em `PORT` no arquivo `.env` (por padrão, `8080`). O banco SQLite será criado no caminho definido em `DB_STORAGE`.

### Ambiente normal

Para iniciar a API sem o modo de desenvolvimento:

```bash
npm start
```

### Testes

Execute a suíte de testes com:

```bash
npm test
```
