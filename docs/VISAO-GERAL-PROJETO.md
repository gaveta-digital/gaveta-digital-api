# Gaveta Digital — Visão Geral do Projeto

### Programação para Dispositivos Móveis | UFC — Etapa 1

---

## 1. O Problema

Prestadores de serviço autônomos e MEIs acumulam recibos, notas fiscais e boletos de despesas ao longo do mês, geralmente fotografados no celular ou guardados em papel. Na hora de declarar imposto de renda ou enviar informações para o contador, esse processo é manual, demorado e sujeito a erro, e muitos gastos acabam esquecidos ou mal categorizados.

**Público-alvo:** MEIs e profissionais autônomos que não têm tempo nem paciência para organizar financeiro manualmente.

---

## 2. A Solução

Um aplicativo onde o usuário **tira uma foto do comprovante** e uma Inteligência Artificial extrai automaticamente os dados relevantes (estabelecimento, data, valor, categoria), organizando tudo num histórico consultável, pronto para gerar relatórios ao contador ou para a declaração de IR.

**Diferencial:** não é "só usar o Gemini direto". O valor do produto está em tudo ao redor da IA, como persistência organizada por usuário, histórico consultável, validação de dados, e relatórios consolidados. A IA é uma peça do sistema, não o produto em si.

---

## 3. Como o Sistema Funciona

```
App Mobile (protótipo — fora do escopo desta frente)
      │  usuário tira foto do comprovante
      ▼
API (Node.js + Express)
      │  1. recebe a imagem
      │  2. envia para o Gemini com um prompt fixo
      │  3. recebe os dados extraídos em JSON
      │  4. valida os dados (data, valor, campos obrigatórios)
      │  5. resolve a categoria (identificada ou "Outros")
      │  6. salva no banco, vinculado ao usuário
      │  7. responde ao app confirmando
      ▼
Banco de Dados  +  Gemini API (Google)
```

O fluxo é **síncrono**: o app espera a resposta da API em uma única requisição. O Gemini Flash responde em poucos segundos, o que é suficiente para essa etapa do projeto. (Uma versão futura, com muito mais usuários simultâneos, poderia evoluir para processamento assíncrono via fila.)

---

## 4. Entidades do Sistema

| Entidade        | Principais campos                                                   | Relação                              |
| --------------- | ------------------------------------------------------------------- | ------------------------------------ |
| **Usuario**     | id, nome, email, senha                                              | 1 usuário → N comprovantes           |
| **Categoria**   | id, nome                                                            | 1 categoria → N comprovantes         |
| **Comprovante** | id, estabelecimento, data, valor, imagemUrl, usuarioId, categoriaId | pertence a 1 usuário e a 1 categoria |

Regras detalhadas de cada campo (limites de caractere, obrigatoriedade, comportamento quando a IA não identifica um valor) estão documentadas em `regras-de-negocio.md` — este documento evita duplicar essa informação.

---

## 5. Rotas da API (planejadas)

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
| GET    | `/comprovantes`     | Listar comprovantes do usuário          |
| GET    | `/comprovantes/:id` | Detalhar um comprovante                 |
| PUT    | `/comprovantes/:id` | Editar dados de um comprovante          |
| DELETE | `/comprovantes/:id` | Remover um comprovante                  |

---

## 6. Escopo do MVP (Etapa 1)

**Dentro do escopo agora:**

- API funcionando com CRUD completo das 3 entidades (Usuario, Categoria, Comprovante)
- API com testes unitários e integração
- Integração real com a API do Gemini (testada e validada)
- Persistência em banco de dados
- Validação de dados e tratamento de erros

**Fora do escopo por enquanto:**

- Filtros avançados por período (ex: últimos 6 meses)
- Geração de relatório consolidado em PDF
- Processamento assíncrono / fila de imagens
- Categorização com aprendizado contínuo
- Protótipo das telas principais (Figma)

---

## 7. Organização no GitHub

- **Organização:** `gaveta-digital`
- **Repositório:** `gaveta-digital-api`
- **Branches:** `main` (estável) e `develop` (integração das funcionalidades)
- Cada funcionalidade relevante em sua própria branch, com commits identificáveis por integrante
