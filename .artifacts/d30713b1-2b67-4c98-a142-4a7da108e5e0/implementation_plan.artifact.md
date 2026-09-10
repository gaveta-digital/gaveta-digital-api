# Implementação das Rotas de Categoria

Este plano descreve a implementação das rotas de CRUD para a entidade `Categoria`, seguindo as regras de negócio e o contrato definido.

## Mudanças Propostas

### Backend

#### [NEW] [Comprovante.js](file:///C:/Users/pinho/StudioProjects/gaveta-digital-api/src/models/Comprovante.js)
- Criação do modelo `Comprovante` para permitir a validação de exclusão de categorias vinculadas.
- Campos: `id`, `estabelecimento`, `data`, `valor`, `imagemUrl`, `usuarioId`, `categoriaId`.

#### [MODIFY] [index.js](file:///C:/Users/pinho/StudioProjects/gaveta-digital-api/src/models/index.js)
- Importar `Comprovante`.
- Definir associações entre `Categoria`, `Usuario` e `Comprovante`.

#### [NEW] [CategoriaController.js](file:///C:/Users/pinho/StudioProjects/gaveta-digital-api/src/controllers/CategoriaController.js)
- Implementar `create`: Lógica para retornar 409 em caso de nome duplicado.
- Implementar `list`: Retorna todas as categorias.
- Implementar `update`: Edita o nome da categoria.
- Implementar `delete`: Verifica se existem comprovantes vinculados antes de remover, retornando 400 se houver.

#### [NEW] [categoriaRoutes.js](file:///C:/Users/pinho/StudioProjects/gaveta-digital-api/src/routes/categoriaRoutes.js)
- Definição das rotas `POST /`, `GET /`, `PUT /:id`, `DELETE /:id`.

#### [MODIFY] [index.js](file:///C:/Users/pinho/StudioProjects/gaveta-digital-api/src/routes/index.js)
- Registrar as rotas de categoria sob o prefixo `/categorias`.

## Plano de Verificação

### Testes Automatizados
- Criar `src/routes/__tests__/categoriaRoutes.test.js` para testar os critérios de aceite:
  - Criar categoria válida → 201
  - Criar categoria duplicada → 409
  - Excluir categoria com comprovantes vinculados → 400
  - Listar e editar categorias.

### Verificação Manual
- Utilizar `curl` ou uma ferramenta de API (como Postman/Insomnia) para validar as rotas manualmente após subir o servidor.
