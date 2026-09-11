# Plano de testes — Comprova+ API

## 1. Objetivo e referência

Quem implementa uma funcionalidade é responsável por testar sua entrega. Este plano define como testar; os comportamentos esperados estão em [REGRAS-DE-NEGOCIO.md](REGRAS-DE-NEGOCIO.md).

Os testes devem verificar resultados observáveis, regras de negócio, erros e limites. Uma suíte passando ou uma porcentagem alta de cobertura não comprova, sozinha, que todas as regras foram atendidas.

## 2. Divisão por sprint

### Sprint 1 — Testes unitários obrigatórios

Testar cada unidade isoladamente, usando Jest e mocks para suas dependências. Não utilizar banco real, requisições HTTP, chamadas ao Gemini ou armazenamento real de arquivos nesses testes.

- Controllers: simular models e services; usar `req`, `res` e `next` simulados.
- Services: simular o cliente do Gemini, os models e o armazenamento de arquivos que utilizarem.
- Middlewares: simular suas dependências, a requisição, a resposta e `next`.
- Models: verificar validações locais sem persistir, por exemplo com `build()` e `validate()`. Simular operações de persistência quando testar métodos próprios, como inicialização de categorias.
- Funções de validação e normalização: executar a função real com entradas válidas, inválidas e de limite. Não simular a própria regra que se pretende verificar.

Não usar `create()`, `sync()` ou consultas reais ao banco para preparar ou validar testes unitários. Instanciar um model sem abrir conexão ou persistir dados não equivale a usar banco real.

Um teste com mock de erro de duplicidade comprova o tratamento desse erro. Não comprova que existe uma restrição de unicidade no banco; essa garantia será verificada na Sprint 2.

### Sprint 2 — Integração, API e fluxos completos

Verificar as camadas funcionando juntas, usando banco e armazenamento exclusivos de testes quando necessário:

- Persistência, restrições de unicidade, relações e integridade no banco.
- Requisições HTTP passando por rotas, middlewares, controllers e persistência.
- Cadastro, login, categorias por usuário e criação das categorias iniciais.
- Upload → análise → validação → banco → resposta.
- Leitura protegida da imagem, edição parcial e exclusão do comprovante.
- Falhas e recuperação entre banco e armazenamento.
- Autenticação, autorização e isolamento entre usuários no fluxo completo.

Os testes automatizados de integração devem usar respostas controladas do Gemini, sem depender da disponibilidade, custo ou variabilidade da API externa. Uma verificação manual com Gemini real é complementar e não substitui os testes automatizados nem deve ser requisito de cada execução da CI.

Adiar os testes de integração não adia a implementação das regras de negócio ou da segurança pertencentes à entrega. Na Sprint 1, essas decisões também devem ser verificadas isoladamente na unidade responsável.

## 3. Aplicação do padrão às entregas em andamento

Este padrão também vale para branches e PRs já iniciados.

- Refatorar testes de controller que utilizem banco real para isolar models e services com mocks.
- Separar testes existentes que comprovem persistência ou integração; reaproveitá-los na Sprint 2. Eles não substituem os unitários exigidos na Sprint 1.
- Não apagar uma verificação útil apenas para trocar sua classificação. Adaptar o que for unitário e reservar o restante para a suíte de integração.
- Cada responsável deve atualizar sua entrega conforme as regras de negócio revisadas. O tech lead deve refletir a revisão nas issues para que os critérios de aceite fiquem alinhados.
- Testes antigos com banco não precisam passar a executar na suíte unitária para serem preservados. A separação das suítes deve ser explícita.

## 4. Responsabilidades

| Entrega                           | Responsável previsto no plano | Responsabilidade na Sprint 1                                                                   |
| --------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------- |
| Models                            | João Vitor                    | Validações locais, normalizações implementadas no model e métodos próprios isolados            |
| Cadastro e login                  | Clidenor                      | Fluxo de cadastro/login, tratamento de erros e autenticação na unidade responsável             |
| CRUD Categoria                    | Radlei                        | Operações, proteção de “Outros”, escopo do usuário e tratamento de erros                       |
| CRUD Comprovante                  | Maria                         | Upload, edição, listagem, exclusão e decisões de persistência/armazenamento isoladas           |
| Serviço Gemini                    | Cauan                         | Extração, validação da resposta, classificação, fallback e falhas com cliente externo simulado |
| Integração e revisão de qualidade | Cauan, como QA/tech lead      | Planejar a Sprint 2 e revisar critérios e cobertura das entregas                               |

A atribuição atualizada na issue prevalece se houver mudança de responsável. Cada dev testa a camada que implementou; não é necessário duplicar todos os testes do model no controller.

Middlewares e validadores compartilhados devem ter responsável explícito na issue. Se uma entrega precisar alterar o tratamento global de erros, deve incluir ou coordenar os testes dessa alteração. Autenticação não deve ser atribuída à dev de Categoria quando pertence a outra entrega.

## 5. Organização e isolamento

Manter os unitários próximos da unidade testada:

```text
src/
├── models/__tests__/categoria.test.js
├── controllers/__tests__/CategoriaController.test.js
├── middlewares/__tests__/errorHandler.test.js
└── services/__tests__/geminiService.test.js

tests/
└── integration/                 # Suíte da Sprint 2
```

A pasta `controllers/__tests__` está correta: são testes do controller, não código de produção dentro dele. Os testes unitários chamam suas funções diretamente; testes de API enviam requisições HTTP e pertencem à Sprint 2.

- Criar os dados e mocks necessários em cada teste ou em preparação independente.
- Nenhum teste deve depender da execução de outro ou de sua ordem.
- Limpar chamadas e restaurar mocks entre testes; redefinir as respostas simuladas quando necessário.
- Usar fixtures que satisfaçam todas as regras não relacionadas ao erro testado. Por exemplo, um teste de e-mail duplicado precisa de nome e senha válidos.
- Verificar tipo/código do erro e o efeito esperado. Evitar apenas `rejects.toThrow()` quando qualquer falha poderia fazer o teste passar pelo motivo errado.
- Em operações bloqueadas, verificar também que a escrita, exclusão ou chamada externa não ocorreu.
- Para datas, fixar o relógio do teste e cobrir a virada do dia no fuso definido nas regras.
- Nunca usar credenciais, imagens privadas ou dados reais de usuários como fixtures.

## 6. Cenários mínimos da Sprint 1

Os cenários abaixo devem ser distribuídos entre as unidades que realmente implementam a regra. Mocks simulam dependências; as decisões e validações da unidade em teste são executadas de verdade.

### Usuário — model, validadores, cadastro e login

- Nome: aceitar 2 e 100 caracteres; rejeitar 1 e 101, números, tipos inválidos, ausência, `null`, vazio e apenas espaços. Cobrir trim, acentos, hífen e apóstrofo.
- E-mail: validar formato, obrigatoriedade e tipo; normalizar espaços das pontas e maiúsculas tanto no cadastro quanto no login; rejeitar espaços internos.
- Senha no cadastro: aceitar o mínimo de 8 caracteres com maiúscula, minúscula e número; rejeitar tamanho insuficiente ou requisito ausente. Não aplicar trim nem mudar letras.
- Hash: verificar que o fluxo usa a dependência de hash e persiste seu resultado, não a senha original. Verificar que senha e hash não aparecem na resposta.
- Duplicidade: simular o conflito e verificar `409` e o contrato de erro. A unicidade efetiva no banco fica para a integração.
- Login: sucesso e credenciais incorretas → `401`; dados obrigatórios ausentes → `400`; token e identificação do usuário conforme o contrato da entrega de autenticação.
- Cadastro: verificar a solicitação de criação das seis categorias do novo usuário, usando dependências simuladas na camada responsável.

Consulta, edição de perfil e exclusão de conta não fazem parte do escopo atual.

### Categoria — model e regras locais

- Nome: aceitar 1 e 50 caracteres; rejeitar 51, ausência, `null`, vazio, apenas espaços e tipos diferentes de string.
- Exigir uma letra; aceitar “Água 2026”, rejeitar “123” e texto sem letras.
- Verificar trim e comparação normalizada sem diferenciar maiúsculas ou acentos, preservando a grafia de exibição.
- Verificar que a busca/comparação de duplicidade considera o usuário e, na edição, não considera a própria categoria como duplicata.
- Inicialização: verificar as seis categorias, a propriedade do usuário e a presença de “Outros”, com persistência simulada.
- Verificar as decisões que evitam duplicar a inicialização ou recriar categorias comuns excluídas. Não considerar um mock como prova da integridade real do banco.

### Categoria — controller e serviços associados

- Criação válida → `201`; listagem → `200`; edição → `200`; exclusão permitida → `204` sem corpo.
- Criação e edição com dados inválidos: verificar tratamento direto ou encaminhamento ao middleware que produzirá `400`.
- Duplicidade na criação e edição → `409`.
- Categoria inexistente na edição/exclusão → `404`.
- Categoria comum com comprovantes: bloquear exclusão, mas permitir renomeação.
- “Outros”: bloquear exclusão e renomeação, com ou sem comprovantes.
- Listagem e operações devem usar o usuário autenticado; não aceitar o proprietário escolhido pelo corpo da requisição.
- Simular recurso de outro proprietário e verificar o bloqueio, sem alteração de dados.
- Falhas inesperadas: encaminhar para o tratamento de erro, sem produzir sucesso.

### Comprovante — validação e operações

- Estabelecimento: string ou `null`, trim, vazio → `null`, limite de 150; rejeitar 151 e tipos indevidos na edição manual.
- Data: formato exato, data real, ano bissexto, hoje e passado, futuro inválido, `null` e fuso `America/Fortaleza`.
- Valor: aceitar `0.01`, inteiros, até duas casas decimais, `9999999.99` e `null`; rejeitar zero, negativo, `10000000`, excesso de casas e strings monetárias.
- Criação: vincular imagem e proprietário fornecidos pelo backend, nunca confiar em proprietário enviado pelo cliente.
- Categoria: exigir vínculo com o mesmo proprietário; distinguir fallback da IA de rejeição da entrada manual inválida.
- PATCH: um ou vários campos, manutenção dos omitidos, limpeza com `null` apenas nos permitidos, corpo vazio e tentativa de alterar campos protegidos.
- Se um campo enviado for inválido, não persistir nenhuma alteração solicitada.
- Listagem: escopo do usuário, ordem por criação decrescente, padrão de 20 e máximo de 100 registros.
- Exclusão: verificar propriedade e remoção do registro e da imagem com dependências simuladas; sucesso apenas após concluir ambas.
- Falha parcial na exclusão: verificar erro e acionamento do mecanismo de recuperação escolhido pela implementação, sem falso sucesso.

### Upload, imagem e armazenamento

- Arquivo ausente → `400`; formato proibido → `415`; arquivo corrompido → `400`.
- Aceitar JPEG, PNG e WebP com conteúdo válido; não confiar apenas em extensão ou MIME declarado.
- Aceitar exatamente 10.485.760 bytes; rejeitar 10.485.761 bytes → `413`.
- Verificar mensagens definidas nas regras; falha interna de armazenamento → `500`.
- Simular armazenamento e verificar limpeza se análise ou gravação falhar sem criar o comprovante.
- Não remover imagem de comprovante já salvo quando falhar apenas o envio da resposta ao cliente.
- Acesso à imagem: verificar autenticação/propriedade na unidade responsável e ausência de exposição de caminhos internos.

Usar buffers/fixtures locais controladas para validadores de imagem; simular armazenamento externo. O teste do upload via HTTP fica para a Sprint 2.

### Serviço Gemini

- Enviar o conteúdo da imagem e somente as categorias do usuário ao cliente simulado.
- Resposta válida: preservar dados válidos e categoria autorizada.
- Campos não identificados → `null`; categoria não identificada → “Outros” do usuário.
- Estabelecimento, data ou valor inválidos → `null`, sem truncar, arredondar ou inventar dados.
- Categoria inexistente ou de outro usuário → “Outros”.
- Imagem ilegível → erro correspondente a `422`, sem autorizar criação do comprovante.
- Timeout, indisponibilidade ou limite externo → erro correspondente a `503`.
- Resposta inteira não interpretável → erro correspondente a `503`; distinguir de um campo individual inválido.
- Não expor chave da API nem erro técnico bruto ao cliente.

Se o service não retorna HTTP diretamente, testar seu resultado/erro; o controller ou middleware responsável testa a conversão para status HTTP. Mocks não comprovam a qualidade da leitura real da IA.

### Middlewares e contrato de erros

- Erro de validação → `400`; conflito → `409` na camada responsável; erro inesperado → `500`.
- Respostas no formato `{ "erro": "mensagem" }`.
- `detalhe` técnico somente em desenvolvimento, sem segredos.
- Autenticação: token ausente, inválido ou expirado → `401`; token válido identifica o usuário, com verificador simulado.
- Verificar que uma rejeição interrompe a operação protegida.

## 7. Exemplo de unitário do controller

Exemplo de isolamento e encaminhamento de uma falha. O teste do middleware deve verificar separadamente a conversão da validação para `400`.

```javascript
// src/controllers/__tests__/CategoriaController.test.js
jest.mock("../../models", () => ({
  Categoria: { create: jest.fn() },
  Comprovante: {},
}));

const { Categoria } = require("../../models");
const CategoriaController = require("../CategoriaController");

test("encaminha falha de validação sem responder sucesso", async () => {
  const erro = Object.assign(new Error("Nome inválido"), {
    name: "SequelizeValidationError",
  });
  Categoria.create.mockRejectedValueOnce(erro);

  const req = { body: { nome: "" }, usuario: { id: "usuario-teste" } };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();

  await CategoriaController.create(req, res, next);

  expect(next).toHaveBeenCalledWith(erro);
  expect(res.status).not.toHaveBeenCalled();
  expect(res.json).not.toHaveBeenCalled();
});
```

O nome da propriedade que contém o usuário autenticado deve acompanhar o contrato real do middleware. Se a arquitetura validar antes de chamar o model ou tratar o erro diretamente, adaptar o exemplo à responsabilidade real, mantendo o isolamento.

## 8. Execução e banco de testes

### Suíte unitária após adequação ao padrão

```bash
npm test -- --runInBand --testPathIgnorePatterns=tests/integration

# Apenas os testes unitários do controller de categoria
npm test -- --runInBand --runTestsByPath src/controllers/__tests__/CategoriaController.test.js

# Cobertura dos unitários
npm test -- --runInBand --testPathIgnorePatterns=tests/integration --coverage
```

Esses comandos não transformam testes existentes em unitários: enquanto houver testes em `src` que acessam banco, eles precisam ser refatorados ou separados antes de usar essa suíte sem configuração de banco isolado.

### Suíte existente durante a adequação

O projeto atual possui testes que executam `sync({ force: true })`. Para executá-los, usar um banco separado, como no comando Docker:

```bash
docker compose run --rm \
  -e NODE_ENV=test \
  -e DB_STORAGE=/tmp/gaveta-digital-test.sqlite \
  api npm test -- --ci --runInBand
```

- Não executar testes destrutivos apontando para o SQLite da aplicação.
- `NODE_ENV=test` sozinho não isola o banco: a configuração atual usa `DB_STORAGE`.
- Não usar `docker compose exec api npm test` com o banco padrão do serviço.
- Para a Sprint 2, usar banco exclusivo e testes independentes. Se suítes compartilharem um arquivo e recriarem tabelas, executá-las sequencialmente; alternativamente, dar um banco próprio a cada suíte.
- Na configuração atual, `DB_STORAGE=:memory:` passa por `path.resolve()` e não representa corretamente o modo em memória. Só usar esse modo após adequar a configuração.
- A CI deve executar os unitários na Sprint 1. Ao introduzir a suíte de integração na Sprint 2, configurar sua execução separadamente com os recursos de teste necessários.

Este documento não altera scripts, configuração do Jest ou workflow da CI; a adequação deve acompanhar a separação das suítes.

## 9. Critérios de aceite e revisão do PR

- [ ] Implementação atende às regras de negócio aplicáveis à issue.
- [ ] Unitários isolados cobrem sucesso, erro e limites da unidade entregue.
- [ ] Não há banco, HTTP, Gemini ou armazenamento real nos unitários.
- [ ] Mocks não substituem a lógica que está sendo testada.
- [ ] Casos negativos verificam o erro correto e a ausência de efeitos indevidos.
- [ ] Testes passam sozinhos e em conjunto, sem depender da ordem.
- [ ] Novas regras compartilhadas e suas responsabilidades estão refletidas nas issues.
- [ ] Testes de integração necessários estão identificados para a Sprint 2.
- [ ] Código e testes acompanham o mesmo PR, com destino a `develop`.

A revisão deve cruzar regras, cenários e responsabilidades. Não exigir um percentual arbitrário de cobertura como substituto desse trabalho, nem aprovar uma entrega apenas porque `npm test` passou.
