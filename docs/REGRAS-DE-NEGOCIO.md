# Regras de Negócio — API

---

## 1. Usuario

**Escopo atual:** cadastro via `POST /usuarios` e autenticação via `POST /login`. Na Etapa 2 entram a consulta do próprio perfil (`GET /usuarios/me`) e a edição do próprio nome (`PATCH /usuarios/me`). Exclusão de conta e alteração de e-mail ou senha não fazem parte desta entrega. Os caminhos são relativos ao prefixo `/api` da aplicação.

| Campo   | Regras                                                                                                                                                                                                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `nome`  | String obrigatória no cadastro. De 2 a 100 caracteres após remover espaços das extremidades. Deve conter pelo menos uma letra e não pode conter números. Não precisa ser único.                                                            |
| `email` | String obrigatória no cadastro e no login, com formato de e-mail válido. Remover espaços das extremidades e normalizar para minúsculas. Único no sistema, sem diferenciar maiúsculas e minúsculas.                                         |
| `senha` | String obrigatória. No cadastro, mínimo de 8 caracteres, incluindo pelo menos uma letra maiúscula, uma letra minúscula e um número. Nunca armazenada em texto puro — sempre com hash (bcrypt). Nunca retornada em nenhuma resposta da API. |

**Validação do nome do usuário no cadastro:**

- Aceitar somente string no JSON, sem converter números, booleanos, arrays ou objetos para texto.
- Remover espaços no início e no fim antes de validar o tamanho e salvar.
- Rejeitar campo ausente, `null`, string vazia e texto composto apenas por espaços.
- Aceitar de 2 a 100 caracteres após remover espaços das extremidades.
- Permitir letras, incluindo acentuadas, espaços, hífen e apóstrofo. Exigir pelo menos uma letra e rejeitar números e demais caracteres.
- Não exigir sobrenome e permitir que usuários diferentes tenham o mesmo nome.
- Retornar `400 Bad Request` quando o nome não atender a essas regras.
- O nome é solicitado no cadastro; a autenticação utiliza e-mail e senha.

**Exemplos de nome do usuário:**

| Valor no JSON                      | Resultado                        |
| ---------------------------------- | -------------------------------- |
| `"Ana"`                            | Aceitar, sem exigir sobrenome.   |
| `"João D'Ávila"` ou `"Anne-Marie"` | Aceitar.                         |
| `" Maria "`                        | Aceitar e salvar como `"Maria"`. |
| `"Maria 2026"` ou `"123"`          | Rejeitar: contém números.        |
| `"A"`                              | Rejeitar: menos de 2 caracteres. |
| `"--"`                             | Rejeitar: não contém letra.      |
| `null`, `""` ou `"   "`            | Rejeitar: nome não preenchido.   |
| `123`, `true`, `[]` ou `{}`        | Rejeitar: não é string.          |

**Validação e normalização do e-mail:**

- Aceitar somente string no JSON, sem converter números, booleanos, arrays ou objetos para texto.
- No cadastro e no login, remover espaços das extremidades e converter o e-mail para minúsculas antes de validar e utilizá-lo.
- Rejeitar campo ausente, `null`, string vazia, texto composto apenas por espaços e endereço em formato inválido, retornando `400 Bad Request`.
- Exigir um endereço com parte local e domínio válidos, separados por `@`. Não permitir espaços no interior do endereço; não removê-los automaticamente para tentar corrigir a entrada.
- Salvar o e-mail normalizado e aplicar a unicidade a esse valor. No cadastro, um e-mail já existente após normalização deve retornar `409 Conflict`.
- No login, localizar a conta pelo e-mail normalizado. `"cauan@gmail.com"`, `"CAUAN@gmail.com"` e `" cauan@gmail.com "` devem identificar a mesma conta.
- A validação de formato não confirma a existência da caixa de e-mail nem a posse do endereço pelo usuário.

**Exemplos de e-mail:**

| Valor no JSON                                     | Resultado                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------- |
| `"cauan@gmail.com"`                               | Formato aceito.                                                                 |
| `" CAUAN@gmail.com "`                             | Normalizar para `"cauan@gmail.com"`; no cadastro, retornar `409` se já existir. |
| `"cauan gmail.com"`, `"cauan@"` ou `"@gmail.com"` | Rejeitar com `400`: formato inválido.                                           |
| `"cau an@gmail.com"`                              | Rejeitar com `400`: espaço no interior do endereço.                             |
| `null`, `""` ou `"   "`                           | Rejeitar com `400`: e-mail não preenchido.                                      |
| `123`, `true`, `[]` ou `{}`                       | Rejeitar com `400`: não é string.                                               |

**Validação da senha no cadastro:**

- Aceitar somente string no JSON.
- Exigir no mínimo 8 caracteres, pelo menos uma letra maiúscula, uma letra minúscula e um número.
- Caracteres especiais não são obrigatórios.
- No cadastro e no login, utilizar a senha exatamente como enviada: não aplicar `trim`, remover espaços nem converter maiúsculas ou minúsculas. Espaços fazem parte da senha e contam para seu tamanho.
- Rejeitar campo ausente, `null`, string vazia, tipos diferentes de string e senhas que não atendam aos requisitos, retornando `400 Bad Request`.
- Armazenar somente o hash bcrypt. Nunca retornar a senha nem seu hash nas respostas da API.

**Exemplos de senha no cadastro:**

| Valor no JSON | Resultado                               |
| ------------- | --------------------------------------- |
| `"Abcdefg1"`  | Aceitar: atende aos requisitos mínimos. |
| `"Abcdef1"`   | Rejeitar: menos de 8 caracteres.        |
| `"abcdefg1"`  | Rejeitar: falta letra maiúscula.        |
| `"ABCDEFG1"`  | Rejeitar: falta letra minúscula.        |
| `"Abcdefgh"`  | Rejeitar: falta número.                 |

**Erros possíveis:**

- E-mail já cadastrado → `409 Conflict`
- Campos obrigatórios ausentes → `400 Bad Request`
- Login com credenciais erradas → `401 Unauthorized`

**Perfil do usuário (Etapa 2):**

- `GET /usuarios/me` e `PATCH /usuarios/me` exigem autenticação e operam sempre sobre o usuário do token; não recebem `id` na rota.
- `GET /usuarios/me` retorna `200 OK` com `id`, `nome` e `email`, sem senha nem hash.
- `PATCH /usuarios/me` aceita somente o campo `nome`, com as mesmas regras de validação do cadastro. Qualquer outro campo (como `email` ou `senha`) ou corpo vazio retorna `400 Bad Request`, sem aplicar alterações.
- Quando a edição for concluída, retornar `200 OK` com `id`, `nome` e `email` atualizados.

**Validade do token (Etapa 2):** o token JWT emitido no login vale 7 dias, para o aplicativo manter o usuário conectado entre usos. Token expirado retorna `401 Unauthorized`.

---

## 2. Categoria

| Campo       | Regras                                                                                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nome`      | String obrigatória na criação e na edição. De 1 a 50 caracteres após remover espaços das extremidades. Deve conter pelo menos uma letra. Único por usuário. |
| `usuarioId` | Obrigatório. Identifica o proprietário da categoria e é preenchido pela API a partir do usuário autenticado, nunca escolhido pelo corpo da requisição.      |

**Categorias por usuário:**

- Cada usuário possui suas próprias categorias e só pode listar, editar ou excluir as suas.
- Usuários diferentes podem ter categorias com o mesmo nome.
- Cada usuário deve ter sua própria categoria padrão `Outros`, criada automaticamente e disponível como fallback.

**Validação de `nome`:**

- Aceitar somente string no JSON. Rejeitar números, booleanos, arrays e objetos, sem convertê-los automaticamente para texto.
- Remover espaços no início e no fim antes de validar o tamanho e salvar o nome.
- Na criação e na edição, rejeitar campo ausente, `null`, string vazia e texto composto apenas por espaços.
- Exigir pelo menos uma letra, incluindo letras acentuadas. Números, espaços e pontuação podem acompanhar as letras.
- Aceitar de 1 a 50 caracteres após remover os espaços das extremidades; rejeitar valores acima desse limite.
- Dados que não atendam a essas validações devem retornar `400 Bad Request`.

**Unicidade de `nome`:**

- Para Categoria, comparar nomes sem diferenciar letras maiúsculas, minúsculas ou acentos, após remover espaços das extremidades.
- `"Material"`, `"material"`, `"MATERIAL"` e `" Material "` representam o mesmo nome de categoria.
- `"Água"`, `"Agua"` e `"agua"` também representam o mesmo nome de categoria.
- Na criação e na edição, se o nome corresponder ao de outra categoria existente do mesmo usuário, retornar `409 Conflict`.
- Na edição, a própria categoria não deve ser considerada uma duplicata.
- Preservar as maiúsculas, minúsculas e acentos do nome salvo para exibição, removendo apenas os espaços das extremidades.

**Exemplos:**

| Valor de `nome` no JSON     | Resultado                           |
| --------------------------- | ----------------------------------- |
| `"Material"`                | Aceitar.                            |
| `"Água 2026"`               | Aceitar.                            |
| `"Manutenção / TI"`         | Aceitar.                            |
| `" Material "`              | Aceitar e salvar como `"Material"`. |
| `"123"` ou `"---"`          | Rejeitar: não contém nenhuma letra. |
| `123`, `true`, `[]` ou `{}` | Rejeitar: não é string.             |
| `null`, `""` ou `"   "`     | Rejeitar: nome não preenchido.      |

**Categorias iniciais de cada usuário:**
`Material`, `Alimentação`, `Transporte`, `Serviços`, `Equipamentos`, `Outros`

- Criar as seis categorias automaticamente na criação da conta, cada uma vinculada ao novo usuário. Não são categorias compartilhadas entre usuários.
- `Material`, `Alimentação`, `Transporte`, `Serviços` e `Equipamentos` são categorias comuns: podem ser renomeadas e excluídas conforme as mesmas regras das categorias criadas manualmente.
- Somente `Outros` é uma categoria padrão fixa e protegida.
- Não recriar categorias comuns que o usuário tenha excluído, nem restaurar seus nomes originais ao reiniciar a aplicação ou executar novamente uma rotina de inicialização.
- A inicialização não deve duplicar categorias existentes. Cada usuário pode criar novas categorias para personalizar sua organização.

**Regra importante:** `Outros` deve sempre existir como categoria padrão de cada usuário — é usada quando a IA não consegue identificar uma categoria válida desse usuário (ver seção 4).

**Proteção da categoria padrão e renomeação:**

- Não permitir renomear nem excluir a categoria padrão `Outros`, mesmo quando ela não tiver comprovantes vinculados. Retornar `400 Bad Request` para essas tentativas.
- Categorias comuns podem ser renomeadas mesmo com comprovantes vinculados, respeitando as validações e a unicidade do nome por usuário. Os vínculos são mantidos pelo `id` da categoria.
- O usuário pode alterar a categoria de seus comprovantes de `Outros` para outra categoria sua. A proteção de `Outros` não impede essa edição do comprovante.

**Erros possíveis:**

- Nome duplicado para o mesmo usuário → `409 Conflict`
- Tentar excluir categoria que tem comprovantes vinculados → `400 Bad Request`.
- Tentar renomear ou excluir a categoria padrão `Outros` → `400 Bad Request`.

**Exclusão de categorias com comprovantes:**

- Considerar vinculado todo comprovante salvo cujo `categoriaId` aponta para a categoria.
- Bloquear a exclusão enquanto existir pelo menos um comprovante vinculado, sem apagar comprovantes ou imagens e sem transferi-los automaticamente.
- Para liberar a exclusão, os comprovantes devem ser transferidos para outra categoria pela edição do comprovante, ou excluídos pela operação própria de exclusão de comprovantes, respeitando suas permissões.
- Quando não houver mais comprovantes vinculados, permitir excluir a categoria comum e retornar `204 No Content`, sem corpo de resposta. A categoria padrão `Outros` continua sujeita à regra de sempre existir.
- A exclusão de comprovantes e o tratamento de suas imagens pertencem às regras de Comprovante.
- Não incluir nesta entrega uma operação automática de mover todos os comprovantes e excluir a categoria.

---

## 3. Comprovante

| Campo             | Tipo           | Regras                                                                                                                                                                                                                          |
| ----------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `estabelecimento` | string ou null | Máximo de 150 caracteres após remover espaços das extremidades. Pode ser `null` se não identificado. Texto vazio ou composto apenas por espaços deve ser normalizado para `null`.                                               |
| `data`            | string ou null | Data real no formato `YYYY-MM-DD`. Pode ser `null` se não identificada. Aceitar hoje ou datas passadas; não permitir data futura, considerando o fuso `America/Fortaleza`.                                                      |
| `valor`           | number ou null | Número maior que zero e menor ou igual a 9.999.999,99, com até duas casas decimais. Pode ser `null` se não identificado. Editável pelo proprietário do comprovante.                                                             |
| `categoriaId`     | FK             | Deve apontar para uma categoria do proprietário do comprovante. Se a IA não retornar uma categoria válida desse usuário, usar a categoria `Outros` dele (nunca salvar `null`). Pode ser alterado manualmente pelo proprietário. |
| `observacoes`     | string ou null | Opcional. Até 500 caracteres após remover espaços das extremidades *(limite da Etapa 2)*. Texto vazio ou só com espaços vira `null`. Preenchido apenas pelo usuário; a IA não preenche este campo. |
| `imagemUrl`       | string         | Referência interna ao arquivo armazenado, preenchida pelo backend a partir do upload. Obrigatória: sem imagem, não existe comprovante. Não é uma URL pública nem um endereço informado pelo cliente.                            |
| `usuarioId`       | FK             | Obrigatório, preenchido automaticamente pelo usuário logado (nunca vem do corpo da requisição, por segurança).                                                                                                                  |

**Regra de negócio chave:** um comprovante pode ser salvo mesmo com campos incompletos (`estabelecimento`, `data` ou `valor` como `null`) — o importante é **nunca perder o registro**. O usuário poderá editar manualmente depois via `PATCH /comprovantes/:id`.

**Edição parcial do comprovante:**

- Utilizar `PATCH /comprovantes/:id`, sob o prefixo `/api`, com autenticação e verificação de propriedade do comprovante.
- Permitir editar um ou vários dos campos `estabelecimento`, `data`, `valor` e `categoriaId` na mesma requisição.
- Manter os campos não enviados com seus valores atuais.
- Permitir enviar `null` explicitamente para limpar `estabelecimento`, `data` ou `valor`. Não permitir `null` em `categoriaId`, que deve apontar para uma categoria existente do mesmo usuário.
- Não permitir alterar o ID, o proprietário nem a referência da imagem por essa operação. A substituição da imagem não faz parte desta edição.
- Rejeitar corpo vazio (`{}`) com `400 Bad Request`.
- Validar todos os campos enviados antes de salvar. Se qualquer campo enviado for inválido, retornar `400 Bad Request` e não aplicar nenhuma das alterações solicitadas.
- Quando a edição for concluída, retornar `200 OK` com o comprovante atualizado.

**Listagem de comprovantes:**

- Listar apenas os comprovantes do usuário autenticado.
- Ordenar pelos cadastrados mais recentemente primeiro, usando a data de criação do registro, não a data extraída da imagem.
- Aplicar paginação com 20 registros por página por padrão e no máximo 100 registros por requisição.
- **Filtro por categoria (Etapa 2):** o parâmetro opcional `categoriaId` restringe a lista a uma categoria. Ela precisa pertencer ao usuário autenticado; `categoriaId` inválido, inexistente ou de outro usuário retorna `400 Bad Request`.
- **Busca (Etapa 2):** o parâmetro opcional `busca` filtra os comprovantes cujo `estabelecimento` ou `observacoes` contenham o texto, sem diferenciar maiúsculas e minúsculas. Remover espaços das extremidades; busca vazia é ignorada; mais de 100 caracteres retorna `400 Bad Request`.
- Filtro, busca e paginação podem ser combinados: a paginação se aplica ao resultado já filtrado.

**Resumo do mês (Etapa 2):**

- `GET /comprovantes/resumo`, com autenticação, considera apenas os comprovantes do usuário autenticado.
- O parâmetro opcional `mes`, no formato `YYYY-MM`, escolhe o mês. Sem ele, usar o mês atual no fuso `America/Fortaleza`. Formato inválido ou mês futuro retorna `400 Bad Request`.
- O mês de cada comprovante é o da sua `data`. Quando `data` for `null`, usar a data de cadastro do registro, no fuso `America/Fortaleza`.
- Retornar `200 OK` com `mes`, `total` (soma dos valores), `quantidade` e `porCategoria`, uma lista com `categoriaId`, `nome`, `total` e `quantidade` de cada categoria que tenha comprovantes no mês, da maior para a menor soma.
- Comprovantes com `valor` `null` contam em `quantidade`, mas não somam em `total`.
- Mês sem comprovantes retorna `total` 0, `quantidade` 0 e `porCategoria` vazia.

```json
{
  "mes": "2026-09",
  "total": 546.7,
  "quantidade": 6,
  "porCategoria": [
    { "categoriaId": "…", "nome": "Material", "total": 295.5, "quantidade": 2 },
    { "categoriaId": "…", "nome": "Alimentação", "total": 106.3, "quantidade": 2 }
  ]
}
```

**Upload e acesso à imagem:**

- O cliente envia o arquivo escolhido ou a foto capturada via `multipart/form-data`. O backend armazena o arquivo e preenche `imagemUrl` com a referência interna; não armazenar o arquivo em si nesse campo.
- Aceitar imagens JPEG (`.jpg` e `.jpeg`), PNG (`.png`) e WebP (`.webp`). Rejeitar outros formatos.
- Validar o formato real do conteúdo, sem confiar apenas na extensão ou no tipo MIME informado pelo cliente.
- Aceitar arquivos de até 10 MiB (10.485.760 bytes), inclusive. Rejeitar arquivos acima desse limite com `413 Payload Too Large` e validar o arquivo antes de aceitá-lo no armazenamento definitivo.
- Não expor os arquivos por uma pasta pública ou por uma URL permanente sem controle de acesso.
- Disponibilizar a imagem por `GET /comprovantes/:id/imagem`, sob o prefixo `/api`, exigindo autenticação e verificação de que o comprovante pertence ao usuário solicitante antes de retornar o arquivo.
- Não expor caminhos internos do armazenamento nas respostas ao cliente.
- A escolha do armazenamento, da biblioteca de upload e uma eventual renomeação de `imagemUrl` para `imagemKey` ou `imagemPath` são decisões técnicas separadas destas regras.

**Erros de upload:**

Todas as respostas abaixo devem seguir o formato `{ "erro": "mensagem" }`.

| Situação                             | Status HTTP                  | Mensagem                                                   |
| ------------------------------------ | ---------------------------- | ---------------------------------------------------------- |
| Nenhum arquivo enviado               | `400 Bad Request`            | Envie uma imagem do comprovante.                           |
| Formato não permitido                | `415 Unsupported Media Type` | Formato não suportado. Envie uma imagem JPEG, PNG ou WebP. |
| Arquivo acima de 10 MiB              | `413 Payload Too Large`      | A imagem deve ter no máximo 10 MiB.                        |
| Arquivo de imagem corrompido         | `400 Bad Request`            | Não foi possível abrir a imagem. Envie outro arquivo.      |
| Falha interna ao armazenar o arquivo | `500 Internal Server Error`  | Não foi possível salvar a imagem. Tente novamente.         |

- Uma imagem válida, mas ilegível para a IA, segue o tratamento de `422 Unprocessable Entity` da seção 4; não se confunde com arquivo corrompido.
- Se a conexão for interrompida, a API pode não conseguir entregar uma resposta. Nesse caso, a apresentação da falha de envio ao usuário cabe ao frontend.

**Fluxo de criação a partir da imagem:**

1. O cliente envia o arquivo da foto e o token de autenticação.
2. A API valida a autenticação e identifica o usuário, sem aceitar que o cliente escolha o proprietário do comprovante.
3. A API valida o formato e o tamanho do arquivo, armazena a imagem e obtém sua referência interna.
4. A API busca as categorias do usuário e envia à IA o conteúdo da imagem junto com essa lista. A referência interna do armazenamento, sozinha, não fornece a imagem à IA.
5. A IA retorna os dados extraídos (`estabelecimento`, `data`, `valor` e `categoriaId`) ou indica imagem ilegível, conforme a seção 4.
6. A API valida os dados retornados e a categoria segundo as regras deste documento; não persiste a resposta da IA sem validação.
7. Em caso de sucesso, a API reúne os dados, a referência interna da imagem e o `usuarioId` autenticado, salva o comprovante e retorna `201 Created`. Campos não identificados podem permanecer `null` conforme suas regras; a categoria usa o fallback definido.

**Limpeza da imagem em caso de falha na criação:**

- Se a imagem já tiver sido armazenada, mas a análise ou a gravação no banco falhar sem criar o comprovante, remover o arquivo desse upload para não manter uma imagem sem registro associado.
- Essa limpeza também se aplica quando a IA indicar imagem ilegível e a API não criar o comprovante.
- Remover apenas o arquivo do upload que falhou. Não remover imagens de comprovantes já salvos, inclusive quando houver falha apenas no envio da resposta ao cliente após a gravação.

**Exclusão do comprovante:**

- Ao solicitar a exclusão pelo aplicativo, o cliente chama `DELETE /comprovantes/:id`, sob o prefixo `/api`, com autenticação.
- A API deve verificar que o comprovante pertence ao usuário autenticado antes de realizar a exclusão.
- Excluir efetivamente o registro do banco e remover sua imagem do armazenamento; não apenas ocultar o comprovante no aplicativo.
- Retornar `204 No Content`, sem corpo de resposta, quando a exclusão do registro e da imagem estiver concluída.
- Se houver falha ao excluir o registro ou a imagem, não responder sucesso. Retornar `500 Internal Server Error` com `{ "erro": "Não foi possível concluir a exclusão do comprovante. Tente novamente." }`.
- Em caso de exclusão parcial, manter informações suficientes para retomar a operação e garantir nova tentativa de limpeza até concluir a exclusão. O mecanismo de recuperação é uma decisão técnica; não considerar registro e imagem como removidos enquanto houver uma etapa pendente.
- A exclusão do comprovante não exclui sua categoria. Se não restarem comprovantes vinculados, a categoria comum poderá ser excluída em uma operação separada, conforme as regras de Categoria.

**Validação e normalização de `estabelecimento`:**

- Aceitar somente string ou `null`, sem converter números, booleanos, arrays ou objetos para texto.
- Para strings, remover espaços no início e no fim antes de validar o tamanho e salvar.
- Normalizar string vazia ou composta apenas por espaços para `null`.
- Aceitar no máximo 150 caracteres após remover os espaços das extremidades.
- A ausência de informação nesse campo não impede salvar o comprovante: manter `estabelecimento` como `null`, desde que as demais regras do comprovante sejam atendidas.

**Validação e edição de `valor`:**

- No JSON, aceitar somente número maior que zero ou `null`. Quando a IA não identificar o valor, permitir salvar `null`.
- O proprietário pode corrigir o valor manualmente, inclusive quando a IA tiver retornado um valor ou quando o campo estiver `null`.
- Aplicar as mesmas regras de tipo, sinal e casas decimais na edição manual.
- Aceitar até duas casas decimais: `10`, `10.5` e `10.50` são válidos. No JSON, `10.5` e `10.50` representam o mesmo número.
- Rejeitar zero, valores negativos e valores com mais de duas casas decimais, sem arredondar silenciosamente.
- O valor máximo aceito é 9.999.999,99, inclusive; no JSON, `9999999.99`. A implementação e o armazenamento devem suportar esse limite sem perda de precisão. Rejeitar entradas manuais acima dele com `400 Bad Request`, sem truncar nem arredondar silenciosamente. Se a IA retornar um valor acima do limite, salvar o campo como `null`, conforme as regras para campos inválidos extraídos.
- Rejeitar strings, inclusive `"10.50"` e `"R$ 10,50"`, booleanos, arrays e objetos. Na entrada manual da API, dados inválidos devem retornar `400 Bad Request`.
- A máscara monetária e a exibição com duas casas decimais são responsabilidades do frontend. A API recebe, por exemplo, `{ "valor": 1234.56 }`, sem símbolo de moeda nem separador de milhares.

**Validação de `data`:**

- No JSON, aceitar uma string no formato exato `YYYY-MM-DD` ou `null`. O campo representa uma data de calendário, sem horário.
- Validar a existência da data no calendário, incluindo dias de cada mês e anos bissextos. Por exemplo, `"2026-02-30"` é inválida.
- Aceitar a data atual e datas passadas. Determinar a data atual pelo fuso `America/Fortaleza`, independentemente do fuso configurado no servidor.
- Não permitir datas futuras.
- Quando a IA não identificar a data, salvar `null`, sem impedir o registro do comprovante por essa ausência de informação.

---

## 4. Comportamento da IA (Groq) — regras de decisão

### Classificação nas categorias do usuário

1. A API identifica o usuário autenticado e busca apenas as categorias dele.
2. Em cada solicitação de leitura, envia à IA a imagem e a lista de IDs e nomes dessas categorias como contexto. Não é necessário treinar o modelo nem conceder acesso direto ao banco.
3. A IA deve escolher uma categoria da lista e retornar seu `categoriaId`, ou retornar `null` quando nenhuma categoria for adequada ou não conseguir classificar.
4. Antes de salvar, a API verifica se a categoria retornada existe e pertence ao usuário. Um ID inexistente, de outro usuário ou uma classificação ausente não deve ser usado; nesses casos, atribuir `Outros` do proprietário do comprovante.
5. O proprietário pode editar a categoria do comprovante depois, mesmo quando a IA tiver classificado com sucesso, escolhendo outra categoria sua.
6. Se a categoria desejada ainda não existir, o usuário pode criá-la pelo CRUD de categorias e depois selecioná-la no comprovante. Selecionar `Outros` não cria uma categoria personalizada automaticamente.

- Alterar a categoria de um comprovante muda apenas o vínculo daquele registro. Renomear uma categoria altera o nome exibido para todos os comprovantes vinculados a ela.
- O fallback de categoria não substitui o tratamento de imagem ilegível ou falha na chamada à IA descrito abaixo.

### Caso 1: Imagem boa, campo específico não identificado

Exemplo: a foto é nítida, mas a data está cortada fora do enquadramento.
→ **Regra:** se o campo não identificado for `estabelecimento`, `data` ou `valor`, salvar `null`. Para categoria não identificada, usar `Outros` do usuário. Os demais campos identificados e válidos são salvos normalmente.

### Campos inválidos retornados pela IA

- Aplicar as normalizações e validações deste documento aos campos extraídos antes de salvar.
- Se `estabelecimento`, `data` ou `valor` retornado pela IA não atender às regras do respectivo campo, salvar esse campo como `null` e preservar os demais dados válidos. Exemplos: estabelecimento acima de 150 caracteres, data futura ou inexistente, valor negativo ou com mais de duas casas decimais.
- Não corrigir por adivinhação, truncar ou arredondar silenciosamente um campo inválido.
- Para `categoriaId` inválido ou não identificado, usar `Outros` do usuário, conforme o fluxo de classificação, nunca `null`.
- Essa tolerância vale para campos extraídos pela IA. Na edição manual, dados inválidos retornam `400 Bad Request`, sem aplicar nenhuma das alterações solicitadas.
- Essa regra não transforma imagem ilegível ou falha na chamada à IA em criação bem-sucedida; esses casos continuam sujeitos aos tratamentos abaixo.

### Caso 2: Imagem ruim/ilegível (borrada, escura, não é um comprovante)

→ **Regra:** a IA deve ser instruída (no prompt) a indicar isso explicitamente, por exemplo devolvendo um campo `"erro": "imagem ilegível"` em vez de inventar dados.
→ A API, ao identificar esse campo de erro na resposta, **não cria o comprovante** e retorna `422 Unprocessable Entity` com uma mensagem clara, tipo:

```json
{
  "erro": "Não foi possível ler o comprovante. Tente novamente com uma foto mais nítida."
}
```

### Caso 3: Falha na chamada à API da IA (fora do ar, timeout, limite excedido)

→ **Regra:** tratar como erro de integração, não repassar o erro técnico bruto pro usuário. Retornar `503 Service Unavailable` com mensagem amigável:

```json
{
  "erro": "Serviço de leitura indisponível no momento. Tente novamente em instantes."
}
```

### Resposta da IA que não pode ser interpretada

- Se a resposta inteira não puder ser interpretada como o resultado esperado, tratar como falha de integração e retornar `503 Service Unavailable`, com a mesma mensagem amigável de indisponibilidade acima.
- Não criar o comprovante e remover a imagem já armazenada daquele upload, conforme a regra de limpeza em caso de falha.
- Distinguir esse caso de uma resposta interpretável com campos individuais inválidos, para os quais se aplicam `null` ou o fallback `Outros`.

### Critério de legibilidade no prompt

- Orientar a IA a indicar imagem ilegível quando estiver tão borrada, escura, cortada ou ilegível que não permita interpretar o comprovante.
- Se o comprovante puder ser interpretado, mas um campo específico não estiver legível, retornar `null` nesse campo, sem rejeitar toda a imagem.
- Se algum dígito do valor ou da data não estiver nítido, retornar `null` nesse campo em vez de adivinhar.
- Não adotar uma porcentagem arbitrária de visibilidade declarada pela IA como critério de aceitação. Usar os critérios de legibilidade acima e não inventar informações.

### Modelos e tentativas

- A lista de modelos fica na variável de ambiente `IA_MODELOS`, em ordem de preferência, separada por vírgulas. Sem a variável, a API usa o modelo padrão `qwen/qwen3.8-27b` *(Etapa 2)*. O endereço do provedor fica em `IA_BASE_URL` (padrão: `https://api.groq.com/openai/v1`) e a chave em `IA_API_KEY`.
- Os modelos precisam aceitar imagem e resposta em JSON.
- Cada tentativa tem tempo limite de 15 segundos. Timeout ou `503` do provedor levam à próxima tentativa, sem espera.
- `429` (limite de requisições): se o cabeçalho `retry-after` indicar até 5 segundos, a API espera e tenta mais uma vez; caso contrário, responde `503` na hora, sem tentar outro modelo.
- Esgotadas as tentativas, a API responde `503`, conforme o Caso 3.
- Cada tentativa gera um registro de uso da IA (seção 9).

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
| 200    | Requisição OK (GET, PUT, PATCH)                                                 |
| 201    | Recurso criado com sucesso (POST)                                               |
| 204    | Recurso removido com sucesso (DELETE)                                           |
| 400    | Dados inválidos / campo obrigatório ausente                                     |
| 401    | Não autenticado (sem token ou token inválido)                                   |
| 403    | Autenticado, mas sem permissão (ex: tentar editar comprovante de outro usuário) |
| 404    | Recurso não encontrado                                                          |
| 409    | Conflito (e-mail duplicado, categoria duplicada)                                |
| 413    | Arquivo enviado excede o limite de tamanho permitido                            |
| 415    | Formato de arquivo enviado não suportado                                        |
| 422    | Dados semanticamente inválidos (ex: imagem ilegível pela IA)                    |
| 503    | Serviço externo (IA) indisponível                                           |
| 500    | Erro interno inesperado                                                         |

---

## 7. Regras de segurança básicas

- Nenhuma rota de `Comprovante` ou `Categoria` deve funcionar sem autenticação (token).
- Um usuário só pode ver, editar ou excluir **seus próprios** comprovantes — nunca de outro usuário, mesmo sabendo o `id`.
- Um usuário só pode acessar e gerenciar suas próprias categorias. Um comprovante só pode ser vinculado a uma categoria do mesmo proprietário.
- A chave da API da IA (`IA_API_KEY`) nunca deve aparecer em nenhuma resposta da API nem em log de erro.
- O aplicativo nunca chama a IA diretamente nem guarda a chave: toda leitura passa pela API.
- No aplicativo, o token fica no armazenamento seguro do dispositivo (`expo-secure-store`) e é apagado ao sair.

---

## 8. Aplicativo mobile (Etapa 2)

O aplicativo valida os dados antes de enviar, para dar retorno imediato ao usuário. A API continua validando tudo e é a fonte da verdade: as regras do app espelham as das seções acima.

### Validações nos formulários

| Formulário | Regras no app |
| ---------- | ------------- |
| Login | E-mail com formato válido; senha preenchida. |
| Cadastro | Nome com as regras da seção 1; e-mail válido; senha com 8 ou mais caracteres, letra maiúscula, letra minúscula e número; confirmação igual à senha (a confirmação não é enviada à API). |
| Categoria | Nome de 1 a 50 caracteres, com pelo menos uma letra. |
| Revisão e edição do comprovante | Valor digitado com vírgula ("150,50") e convertido para número; maior que zero, até duas casas decimais e até 9.999.999,99. Data escolhida em seletor que não permite datas futuras. Estabelecimento até 150 e observações até 500 caracteres. Categoria escolhida entre as do usuário. |
| Perfil | Nome com as regras da seção 1. |

### Comportamento diante das respostas

| Situação | O que o app faz |
| -------- | --------------- |
| Requisição em andamento | Mostra carregamento e desativa o botão que a disparou, evitando envio duplicado. |
| Sucesso ao criar, editar ou excluir | Mostra uma mensagem curta de sucesso e atualiza a tela. |
| `400`, `409`, `413` ou `415` | Mostra a mensagem do campo `erro` junto ao formulário ou à ação. |
| `401` | Apaga o token salvo e volta ao Login com "Sua sessão expirou. Entre novamente." |
| `422` na leitura | Volta à Captura com "Não conseguimos ler o comprovante. Tente uma foto mais nítida." |
| `503` | "Leitura indisponível no momento. Tente novamente em instantes." |
| Sem resposta do servidor | "Sem conexão com o servidor." com a opção de tentar de novo. |
| Resposta fora do formato esperado | "Recebemos uma resposta inválida do servidor." |
| Lista vazia | Explica que ainda não há comprovantes e oferece adicionar o primeiro. |
| Filtro ou busca sem resultado | "Nenhum comprovante encontrado." |
| Excluir comprovante ou categoria | Pede confirmação antes de enviar. |

### Fluxo do comprovante no app

1. Captura pela câmera ou pela galeria. O app reduz a imagem (lado maior com cerca de 1280 px) antes do envio, para economizar tempo e tokens.
2. `POST /comprovantes`: a API lê a imagem e já cria o comprovante.
3. Revisão: **Salvar** envia `PATCH /comprovantes/:id` com os dados confirmados ou corrigidos; **Descartar** envia `DELETE /comprovantes/:id` após confirmação.
4. A lista e o resumo são atualizados ao voltar.

---

## 9. Registro de uso da IA (Etapa 2)

Toda tentativa de leitura na IA (Groq) gera um registro `UsoIA`, inclusive as que falham, porque uma imagem ilegível também consome tokens.

| Campo | Regra |
| ----- | ----- |
| `usuarioId` | Usuário que enviou a imagem. Preenchido pela API. |
| `comprovanteId` | Comprovante criado na leitura; `null` quando nenhum foi criado (`422`, `503` ou tentativa que levou à próxima). |
| `modelo` | Modelo usado na tentativa. |
| `tokensEntrada` | `usage.prompt_tokens` da resposta do provedor. |
| `tokensSaida` | `usage.completion_tokens`. |
| `tokensTotal` | `usage.total_tokens`. |
| `duracaoMs` | Duração da tentativa, em milissegundos. |
| `resultado` | `sucesso`, `ilegivel` ou `erro`. |

- Sem resposta da IA (timeout ou falha de rede), os tokens ficam `0` e o resultado é `erro`.
- Falha ao gravar o registro não pode impedir nem desfazer a criação do comprovante; o problema é apenas registrado em log.
- Excluir um comprovante não apaga seus registros de uso; o `comprovanteId` passa a `null`.
- `GET /uso-ia`, com autenticação, retorna somente os dados do próprio usuário: `totalTentativas`, `tokensEntrada`, `tokensSaida`, `tokensTotal`, a lista `porModelo` (modelo, tentativas e tokens) e as `ultimas` 10 tentativas.
- Os registros de uso não aparecem no aplicativo; são consultados pela API (Swagger ou Postman).
