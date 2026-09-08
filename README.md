# Gaveta Digital API

## Como rodar o projeto

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
