# Gaveta Digital — Visão Geral do Projeto

### Programação para Dispositivos Móveis | UFC — Etapa 1

---

## 1. O Problema

Prestadores de serviço autônomos e MEIs acumulam recibos, notas fiscais e boletos de despesas ao longo do mês, geralmente fotografados no celular ou guardados em papel. Na hora de declarar imposto de renda ou enviar informações para o contador, esse processo é manual, demorado e sujeito a erro, e muitos gastos acabam esquecidos ou mal categorizados.

**Público-alvo:** MEIs e profissionais autônomos que não têm tempo nem paciência para organizar financeiro manualmente.

---

## 2. A Solução

Um aplicativo onde o usuário **tira uma foto do comprovante** e uma Inteligência Artificial extrai automaticamente os dados relevantes (estabelecimento, data, valor, categoria), organizando tudo num histórico consultável por usuário. A geração de relatórios consolidados é uma evolução futura, fora do escopo atual.

**Diferencial:** não é "só usar o Gemini direto". O valor do produto está em tudo ao redor da IA, como persistência organizada por usuário, histórico consultável, validação de dados e possibilidade de correção manual. A IA é uma peça do sistema, não o produto em si.

---

## 3. Como o Sistema Funciona

```text
App Mobile (fora do escopo desta frente; testes manuais podem usar Postman)
      │  envia foto ou arquivo de imagem + token
      ▼
API (Node.js + Express)
      │  1. autentica o usuário e valida o arquivo
      │  2. armazena a imagem de forma privada e obtém sua referência
      │  3. busca as categorias do usuário
      │  4. envia a imagem ao Gemini com instruções e essas categorias
      │  5. valida e normaliza os dados retornados
      │  6. resolve a categoria válida ou usa “Outros” do usuário
      │  7. salva o comprovante com a referência da imagem e o proprietário
      │  8. responde ao cliente
      ▼
Banco de dados + armazenamento privado de imagens
```

O fluxo é **síncrono**: o cliente aguarda a resposta da API na mesma requisição. A implementação deve tratar timeout, indisponibilidade e respostas inválidas do Gemini, sem prometer um tempo fixo de leitura. Processamento assíncrono por fila fica para uma evolução futura.

Campos individuais não identificados ou inválidos podem ficar `null`, conforme suas regras; a categoria usa “Outros” do usuário. Imagem ilegível impede a criação e retorna `422`; falha de integração com Gemini retorna `503`. Se a criação falhar, a imagem armazenada daquele upload deve ser removida.

O proprietário pode corrigir os dados depois, inclusive a categoria identificada pela IA. As imagens são acessadas por rota protegida, sem exposição pública do armazenamento.

---

## 4. Entidades do Sistema

| Entidade | Principais campos | Relação |
| -------- | ----------------- | ------- |
| **Usuario** | id, nome, email, senha (armazenada somente como hash) | 1 usuário → N categorias e N comprovantes |
| **Categoria** | id, nome, usuarioId | pertence a 1 usuário; 1 categoria → N comprovantes |
| **Comprovante** | id, estabelecimento, data, valor, imagemUrl, usuarioId, categoriaId | pertence a 1 usuário e a 1 categoria desse usuário |

Cada usuário recebe seis categorias iniciais ao criar a conta e pode personalizar as categorias comuns. “Outros” é o fallback fixo de cada usuário e não pode ser renomeada nem excluída. Uma categoria comum com comprovantes pode ser renomeada, mas sua exclusão é bloqueada enquanto houver vínculos.

`imagemUrl` representa uma referência interna ao arquivo, preenchida pelo backend; não é uma URL pública nem um campo escolhido pelo cliente. Excluir um comprovante remove seu registro e sua imagem, preservando a categoria.

As validações, limites, mensagens e regras de recuperação estão em [REGRAS-DE-NEGOCIO.md](REGRAS-DE-NEGOCIO.md). A estratégia e os cenários de testes estão em [TEST-PLAN.md](TEST-PLAN.md). Esta visão geral resume o produto sem substituir esses documentos.

---

## 5. Rotas da API (planejadas)

Todos os caminhos abaixo usam o prefixo `/api`. As rotas de Categoria e Comprovante exigem autenticação e acesso restrito aos dados do proprietário.

### Usuario / Auth

| Método | Rota        | Função                 |
| ------ | ----------- | ---------------------- |
| POST   | `/usuarios` | Cadastrar novo usuário |
| POST   | `/login`    | Autenticar usuário     |

### Categoria

| Método | Rota              | Função            |
| ------ | ----------------- | ----------------- |
| POST   | `/categorias`     | Criar categoria   |
| GET    | `/categorias`     | Listar categorias |
| PUT    | `/categorias/:id` | Editar categoria  |
| DELETE | `/categorias/:id` | Remover categoria |

### Comprovante

| Método | Rota                | Função                                  |
| ------ | ------------------- | --------------------------------------- |
| POST   | `/comprovantes`     | Enviar imagem → IA extrai dados → salva |
| GET    | `/comprovantes`     | Listar comprovantes do usuário com paginação, mais recentes por cadastro primeiro |
| GET    | `/comprovantes/:id` | Detalhar um comprovante                 |
| PATCH  | `/comprovantes/:id` | Editar parcialmente os dados de um comprovante |
| GET    | `/comprovantes/:id/imagem` | Obter a imagem após verificar o proprietário |
| DELETE | `/comprovantes/:id` | Remover um comprovante                  |

---

## 6. Escopo do MVP (Etapa 1)

**Dentro do escopo agora:**

- Cadastro e login de usuários
- CRUD de categorias por usuário e CRUD de comprovantes, com edição parcial via PATCH
- Upload, armazenamento privado e leitura protegida das imagens
- Integração com a API do Gemini para extração e classificação nas categorias do usuário
- Persistência em banco de dados, validação e tratamento de erros
- Testes unitários na Sprint 1 e testes de integração/API na Sprint 2

**Fora do escopo por enquanto:**

- Consulta/edição de perfil e exclusão de conta
- Substituição da imagem na edição do comprovante
- Filtros avançados por período (ex: últimos 6 meses)
- Geração de relatório consolidado em PDF
- Processamento assíncrono / fila de imagens
- Categorização com aprendizado contínuo
- Protótipo das telas principais (Figma)

---

## 7. Estratégia de testes por sprint

- **Sprint 1:** testes unitários isolados em Jest, com mocks das dependências. Sem banco real, requisições HTTP, chamadas reais ao Gemini ou armazenamento real. O padrão também deve ser aplicado às entregas já iniciadas.
- **Sprint 2:** integração com banco e armazenamento exclusivos de teste, testes HTTP e fluxos completos, incluindo autenticação e isolamento entre usuários. O Gemini é simulado nos testes automatizados; a validação manual com a API real é complementar.
- A separação dos testes por sprint não adia as regras de negócio nem a segurança necessárias a cada funcionalidade.

Responsabilidades, exemplos e critérios de aceite estão no [TEST-PLAN.md](TEST-PLAN.md).

---

## 8. Organização no GitHub

- **Organização:** `gaveta-digital`
- **Repositório:** `gaveta-digital-api`
- **Branches:** `main` (estável) e `develop` (integração das funcionalidades)
- Cada funcionalidade relevante em sua própria branch, com commits identificáveis por integrante
