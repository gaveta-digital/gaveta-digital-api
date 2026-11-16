# Contribuindo com o Gaveta Digital

Este documento define como o time trabalha no repositório: estratégia de branches e padrão de commits. Todo integrante deve seguir essas regras para manter o histórico organizado e as contribuições de cada um identificáveis.

---

## 0. Estrutura do repositório (Etapa 2)

Na Etapa 2 o repositório passa a conter a API e o aplicativo:

```text
gaveta-digital-api/
├── api/       → API REST (Node.js + Express)
├── mobile/    → aplicativo (Expo SDK 58 / React Native, JavaScript)
├── docs/      → documentação
└── .github/   → pipeline de CI
```

Cada pasta tem seu próprio `package.json`; rode os comandos de dentro dela (`cd api` ou `cd mobile`).

Organização do aplicativo:

```text
mobile/
├── app/            → telas e navegação (Expo Router: cada arquivo é uma rota)
└── src/
    ├── components/ → componentes reutilizáveis (botão, campo, card, estado vazio)
    ├── services/   → chamadas à API, uma por recurso
    ├── context/    → sessão do usuário (token e dados)
    ├── hooks/      → lógica reutilizável das telas
    ├── utils/      → validações e formatação (moeda, data)
    └── theme/      → cores e tipografia do protótipo
```

- Tela não faz requisição direto: toda chamada à API passa por `src/services/`.
- Validações e formatações ficam em `src/utils/`, não espalhadas pelas telas.
- Componente usado em mais de uma tela vai para `src/components/`.

---

## 1. Estratégia de Branches

| Branch                   | Papel                                                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `main`                   | Versão **estável**, pronta para apresentação/entrega. Só recebe merge vindo de `develop`, quando testado.  |
| `develop`                | Branch de **homologação/integração** — onde as funcionalidades prontas se juntam antes de ir para `main`.  |
| `feature/nome-da-tarefa` | Uma branch por funcionalidade, criada a partir de `develop`. Aqui é onde o trabalho do dia a dia acontece. |
| `fix/*` e `docs/*`       | Correções e documentação, com o mesmo fluxo das features.                                                  |

Na Etapa 2, use o prefixo da parte do projeto no nome da branch: `feature/api-uso-ia`, `feature/mobile-login`, `feature/mobile-categorias`.

### Fluxo na prática

```
feature/crud-usuario  ──┐
feature/crud-categoria ─┼──►  Pull Request  ──►  develop  ──►  (quando estável)  ──►  main
feature/gemini-service ─┘
```

1. Nunca commitar direto em `main` ou `develop`.
2. Para começar uma tarefa: `git checkout develop` → `git pull` → `git checkout -b feature/nome-da-tarefa`
3. Ao terminar: abrir um **Pull Request** de `feature/nome-da-tarefa` para `develop`.
4. Pelo menos 1 pessoa do time revisa antes do merge (mesmo revisão rápida).
5. `develop → main` só acontece quando a etapa está estável e testada — normalmente perto da entrega.

---

## 2. Padrão de Commits (Conventional Commits)

Formato: `tipo: descrição breve no imperativo`. Na Etapa 2, indique a parte entre parênteses: `tipo(api): …` ou `tipo(mobile): …`.

| Tipo       | Quando usar                                                 |
| ---------- | ----------------------------------------------------------- |
| `feat`     | Nova funcionalidade (ex: nova rota, novo campo)             |
| `fix`      | Correção de bug                                             |
| `docs`     | Alteração em documentação (README, regras de negócio, etc.) |
| `refactor` | Reorganização de código sem mudar comportamento             |
| `test`     | Criação ou ajuste de testes                                 |
| `style`    | Ajuste visual (cores, espaçamento), sem mudar a lógica      |
| `chore`    | Tarefas de manutenção (configuração, dependências, etc.)    |

### Exemplos

```
feat: adiciona rota de cadastro de usuário
fix: corrige validação de valor negativo em comprovante
docs: atualiza regras de negócio da categoria
refactor: extrai lógica de chamada ao Gemini para service separado
test: adiciona testes automatizados da rota de login
chore: adiciona dotenv às dependências
feat(api): registra os tokens de cada chamada ao Gemini
feat(mobile): adiciona tela de login com validação de e-mail
style(mobile): aplica as cores do protótipo na lista
```

### Boas práticas

- Mensagem no **imperativo** ("adiciona", não "adicionado" ou "adicionando")
- Uma ideia por commit — evitar commits gigantes misturando várias mudanças
- Descrição curta e direta; se precisar detalhar mais, usar o corpo do commit (linha em branco + parágrafo explicando)

---

## 3. Pull Requests

- Título do PR deve seguir o mesmo padrão dos commits (ex: `feat: CRUD de categoria`)
- Descrever brevemente o que foi feito e, se aplicável, como testar
- Vincular a issue correspondente com `Closes #número`, para ela fechar no merge
- No aplicativo, anexar um print ou gravação da tela funcionando
- Cada integrante commita com a própria conta do GitHub, para a contribuição aparecer no histórico

### Antes de abrir o PR

- **API:** `npm test` passando.
- **App:** abre no Expo Go sem erro, funciona com a API real (não só com dados de exemplo) e os estados de carregamento, erro e lista vazia da tela foram testados.
