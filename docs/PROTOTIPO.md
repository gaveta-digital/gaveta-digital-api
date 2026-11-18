# Protótipo — Gaveta Digital

**Link do protótipo:** https://www.figma.com/design/EK3DWo4GZUesKuCitrI8Vq/GavetaDigital?t=5UgEUgDg0k5EXWAP-1
**Ferramenta:** Figma

---

## Identidade Visual
- **Cor primária:** Azul-marinho (`#1A237E`)
- **Cor de destaque / acento:** Ciano (`#5CD6EB`)
- **Confirmação / Ações principais:** Verde (`#2E7D32`)

---

## Telas (Etapa 2)

### Autenticação
1. **Login** (`POST /auth/login`) — E-mail e senha, com estado de erro (`"E-mail ou senha inválidos"`) e acesso para cadastro.
2. **Cadastro** (`POST /auth/register`) — Nome, e-mail, senha, confirmar senha, botão *"Criar conta"*, link *"Já tenho conta"* e validação de campo (ex.: `"E-mail já cadastrado"`).

### Navegação Principal (Barra inferior com 3 abas)
3. **Lista de Comprovantes** (`GET /comprovantes`) — Avatar com iniciais do usuário, card de resumo clicável (*"Ver por categoria ›"*), busca, filtro por categoria e botão flutuante da câmera.
4. **Categorias** (`GET /categorias`, `POST /categorias`, `PATCH /categorias/:id`, `DELETE /categorias/:id`) — Lista de categorias do usuário com edição e exclusão, categoria padrão `"Outros"` bloqueada com cadeado e modal `"+ Nova categoria"`.
5. **Perfil** (`GET /usuarios/me`, `PATCH /usuarios/me`) — Círculo com iniciais do nome, exibição de nome e e-mail, edição de nome e botão *"Sair"* em vermelho.

### Telas Sobrepostas (Sem barra inferior)
6. **Resumo do Mês** (`GET /comprovantes/resumo`) — Seletor de mês (`‹ Novembro 2026 ›`), total gasto, contagem de comprovantes, barras horizontais por categoria (valor e porcentagem) e estado vazio (`"Nenhum gasto neste mês"`).
7. **Detalhe do Comprovante** (`GET /comprovantes/:id`, `PATCH /comprovantes/:id`, `DELETE /comprovantes/:id`) — Foto no topo, estabelecimento, data, valor, categoria, observações e ações de *"Editar"* e *"Excluir"*.
8. **Captura (Câmera)** (`POST /comprovantes`) — Moldura de captura e estado de erro para imagem ilegível.
9. **Processando (IA Processando)** (`POST /comprovantes/ocr`) — Animação de espera com etapas visuais.
10. **Revisão do Recibo** (`PATCH /comprovantes/:id`, `DELETE /comprovantes/:id`) — Selo *"Dados extraídos via IA"*, seletor de data, edição dos campos extraídos, observações e botões *"Salvar no Histórico"* e *"Descartar"*.

---

## Fluxos de Navegação
- **Autenticação:** `Login` → `Lista de Comprovantes` | `Login` ↔ `Cadastro` → `Lista de Comprovantes`
- **Abas Inferiores:** `Comprovantes` ↔ `Categorias` ↔ `Perfil` (`Sair` → `Login`)
- **Análise e Detalhes:**
    - `Lista` (card de resumo) → `Resumo do Mês` → `Lista`
    - `Lista` (item) → `Detalhe do Comprovante` → `Edição` ou `Modal Excluir` → `Lista`
- **Captura e Extração IA:**
    - `Lista` (FAB Câmera) → `Captura` → `Processando` → `Revisão` → `Lista`
    - Em caso de descarte na Revisão: `Revisão` → `Modal Excluir` → `Lista` (ou nova captura)

---

## Estados Cobertos no Protótipo
- **Lista vazia:** `"Você ainda não tem comprovantes"` + botão para adicionar o primeiro.
- **Busca/filtro sem resultado:** `"Nenhum comprovante encontrado"`.
- **Sem conexão:** Ícone de offline, `"Sem conexão com o servidor"` + botão `"Tentar de novo"`.
- **Imagem ilegível (Captura):** `"Não conseguimos ler o comprovante. Tente uma foto mais nítida."`
- **Confirmação de exclusão / descarte:** `"Excluir este comprovante?"` com opções *Cancelar* / *Excluir*.
- **Feedback de sucesso:** Toast curto (ex.: `"Comprovante salvo"`).
- **Carregamento:** Estado de *loading* na listagem de comprovantes.
- **Erros de autenticação:** `"E-mail ou senha inválidos"` no Login e `"E-mail já cadastrado"` abaixo do campo no Cadastro.

---

## Alinhamento com a API (Etapa 1 → Etapa 2)

### O que já está implementado na API
- Cadastro e login (e-mail + senha, JWT)
- CRUD de Categoria e CRUD de Comprovante
- Integração real com IA (Gemini): extração de estabelecimento, data, valor e categoria a partir da imagem, com fallback para `"Outros"`
- Persistência em banco de dados

### Ajustes de Escopo Aplicados na Etapa 2
- **Autenticação simplificada:** Removidos botões de login social (Google / Apple), divisor *"ou continue com"* e *"Esqueci minha senha"* para alinhar 100% ao fluxo de e-mail/senha da API.
- **Identidade do usuário sem foto:** Substituída a foto de perfil por círculo com as iniciais do nome do usuário na Lista e no Perfil (campo de foto não existe no model `Usuario`).
- **Indicador de confiança removido:** Removida a barra `"92% confiança"` da Revisão (a API do Gemini não gera esse score), mantendo apenas o selo `"Dados extraídos via IA"`.
- **Padronização de endpoints:** A revisão pós-IA e a edição no Detalhe utilizam `PATCH /comprovantes/:id` (em vez de `PUT`), enquanto o descarte e a exclusão utilizam `DELETE /comprovantes/:id`.

### Elementos Visuais sem Correspondência Direta de Múltiplas Chamadas
- **Etapas de progresso no processamento** (*"Detectando texto"*, *"Validando campos"*, *"Categorizando"*): a API responde em uma única chamada síncrona ao Gemini — essas etapas funcionam apenas como feedback visual de espera (UX).
- **Resumo financeiro do mês:** Pode ser calculado diretamente no front-end a partir dos dados de `GET /comprovantes` ou consumido via agregação por mês/categoria.