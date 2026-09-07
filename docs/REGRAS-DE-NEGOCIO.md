# Regras de Negócio — Comprova+ API

---

## 1. Usuario

| Campo   | Regras                                                                                                                                   |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `nome`  | Obrigatório. Mínimo 2, máximo 100 caracteres.                                                                                            |
| `email` | Obrigatório. Formato de e-mail válido. Único no sistema (não pode cadastrar duas vezes).                                                 |
| `senha` | Obrigatório. Mínimo 6 caracteres. Nunca armazenada em texto puro — sempre com hash (bcrypt). Nunca retornada em nenhuma resposta da API. |

**Erros possíveis:**

- E-mail já cadastrado → `409 Conflict`
- Campos obrigatórios ausentes → `400 Bad Request`
- Login com credenciais erradas → `401 Unauthorized`

---

## 2. Categoria

| Campo  | Regras                                                                         |
| ------ | ------------------------------------------------------------------------------ |
| `nome` | Obrigatório. Máximo 50 caracteres. Único (não pode repetir nome de categoria). |

**Categorias sugeridas para popular o sistema (seed inicial):**
`Material`, `Alimentação`, `Transporte`, `Serviços`, `Equipamentos`, `Outros`

**Regra importante:** `Outros` deve sempre existir como categoria padrão — é usada quando a IA não consegue identificar uma categoria clara (ver seção 4).

**Erros possíveis:**

- Nome duplicado → `409 Conflict`
- Tentar excluir categoria que tem comprovantes vinculados → `400 Bad Request` (bloquear, ou perguntar se quer mover os comprovantes pra "Outros" — decisão do time)

---

## 3. Comprovante

| Campo             | Tipo    | Regras                                                                                                         |
| ----------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| `estabelecimento` | string  | Máximo 150 caracteres. **Pode ser `null`** se a IA não conseguir identificar.                                  |
| `data`            | date    | Formato `YYYY-MM-DD`. **Pode ser `null`** se não identificada. Não pode ser uma data futura.                   |
| `valor`           | decimal | Deve ser maior que 0 se identificado. **Pode ser `null`** se não identificado.                                 |
| `categoriaId`     | FK      | Se a IA não conseguir classificar, usar a categoria `Outros` (nunca deixar `null`).                            |
| `imagemUrl`       | string  | **Obrigatório sempre** — sem imagem, não existe comprovante.                                                   |
| `usuarioId`       | FK      | Obrigatório, preenchido automaticamente pelo usuário logado (nunca vem do corpo da requisição, por segurança). |

**Regra de negócio chave:** um comprovante pode ser salvo mesmo com campos incompletos (`estabelecimento`, `data` ou `valor` como `null`) — o importante é **nunca perder o registro**. O usuário poderá editar manualmente depois via `PUT /comprovantes/:id`.

---

## 4. Comportamento da IA (Gemini) — regras de decisão

### Caso 1: Imagem boa, campo específico não identificado

Exemplo: a foto é nítida, mas a data está cortada fora do enquadramento.
→ **Regra:** o campo específico retorna `null`. Os demais campos identificados são salvos normalmente.

### Caso 2: Imagem ruim/ilegível (borrada, escura, não é um comprovante)

→ **Regra:** o Gemini deve ser instruído (no prompt) a indicar isso explicitamente, por exemplo devolvendo um campo `"erro": "imagem ilegível"` em vez de inventar dados.
→ A API, ao identificar esse campo de erro na resposta, **não cria o comprovante** e retorna `422 Unprocessable Entity` com uma mensagem clara, tipo:

```json
{
  "erro": "Não foi possível ler o comprovante. Tente novamente com uma foto mais nítida."
}
```

### Caso 3: Falha na chamada à API do Gemini (fora do ar, timeout, limite excedido)

→ **Regra:** tratar como erro de integração, não repassar o erro técnico bruto pro usuário. Retornar `503 Service Unavailable` com mensagem amigável:

```json
{
  "erro": "Serviço de leitura indisponível no momento. Tente novamente em instantes."
}
```

### Regra geral de ouro

**A IA nunca deve "inventar" (alucinar) um dado.** É preferível `null` a um dado errado — isso deve estar explícito no prompt do sistema.

---

## 5. Padrão de resposta de erro (usado em toda a API)

Todas as rotas devem seguir o mesmo formato de erro, pra facilitar tratamento no front/app:

```json
{
  "erro": "mensagem legível para o usuário",
  "detalhe": "informação técnica opcional (só em ambiente de desenvolvimento)"
}
```

## 6. Tabela de status HTTP usados no projeto

| Código | Quando usar                                                                     |
| ------ | ------------------------------------------------------------------------------- |
| 200    | Requisição OK (GET, PUT)                                                        |
| 201    | Recurso criado com sucesso (POST)                                               |
| 204    | Recurso removido com sucesso (DELETE)                                           |
| 400    | Dados inválidos / campo obrigatório ausente                                     |
| 401    | Não autenticado (sem token ou token inválido)                                   |
| 403    | Autenticado, mas sem permissão (ex: tentar editar comprovante de outro usuário) |
| 404    | Recurso não encontrado                                                          |
| 409    | Conflito (e-mail duplicado, categoria duplicada)                                |
| 422    | Dados semanticamente inválidos (ex: imagem ilegível pela IA)                    |
| 503    | Serviço externo (Gemini) indisponível                                           |
| 500    | Erro interno inesperado                                                         |

---

## 7. Regras de segurança básicas

- Nenhuma rota de `Comprovante` ou `Categoria` deve funcionar sem autenticação (token).
- Um usuário só pode ver, editar ou excluir **seus próprios** comprovantes — nunca de outro usuário, mesmo sabendo o `id`.
- A chave da API do Gemini nunca deve aparecer em nenhuma resposta da API nem em log de erro.
