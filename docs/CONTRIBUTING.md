# Contribuindo com o Gaveta Digital

Este documento define como o time trabalha no repositório: estratégia de branches e padrão de commits. Todo integrante deve seguir essas regras para manter o histórico organizado e as contribuições de cada um identificáveis.

---

## 1. Estratégia de Branches

| Branch                   | Papel                                                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `main`                   | Versão **estável**, pronta para apresentação/entrega. Só recebe merge vindo de `develop`, quando testado.  |
| `develop`                | Branch de **homologação/integração** — onde as funcionalidades prontas se juntam antes de ir para `main`.  |
| `feature/nome-da-tarefa` | Uma branch por funcionalidade, criada a partir de `develop`. Aqui é onde o trabalho do dia a dia acontece. |

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

Formato: `tipo: descrição breve no imperativo`

| Tipo       | Quando usar                                                 |
| ---------- | ----------------------------------------------------------- |
| `feat`     | Nova funcionalidade (ex: nova rota, novo campo)             |
| `fix`      | Correção de bug                                             |
| `docs`     | Alteração em documentação (README, regras de negócio, etc.) |
| `refactor` | Reorganização de código sem mudar comportamento             |
| `test`     | Criação ou ajuste de testes                                 |
| `chore`    | Tarefas de manutenção (configuração, dependências, etc.)    |

### Exemplos

```
feat: adiciona rota de cadastro de usuário
fix: corrige validação de valor negativo em comprovante
docs: atualiza regras de negócio da categoria
refactor: extrai lógica de chamada ao Gemini para service separado
test: adiciona testes automatizados da rota de login
chore: adiciona dotenv às dependências
```

### Boas práticas

- Mensagem no **imperativo** ("adiciona", não "adicionado" ou "adicionando")
- Uma ideia por commit — evitar commits gigantes misturando várias mudanças
- Descrição curta e direta; se precisar detalhar mais, usar o corpo do commit (linha em branco + parágrafo explicando)

---

## 3. Pull Requests

- Título do PR deve seguir o mesmo padrão dos commits (ex: `feat: CRUD de categoria`)
- Descrever brevemente o que foi feito e, se aplicável, como testar
- Vincular a issue correspondente do quadro de tarefas, se houver
