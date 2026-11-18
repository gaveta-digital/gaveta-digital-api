# Protótipo — Gaveta Digital

**Link do protótipo:** https://www.figma.com/design/EK3DWo4GZUesKuCitrI8Vq/GavetaDigital?node-id=0-1&t=3MUQBYzFg52aRHla-1  
**Ferramenta:** Figma — protótipo elaborado por Maria Barros.

---

## Identidade Visual
- **Cor primária:** Azul-marinho (`#1A237E`)
- **Cor de destaque / acento:** Ciano (`#5CD6EB`)
- **Confirmação / Ações principais:** Verde (`#2E7D32`)

---

## Telas da Etapa 1

1. Login
2. Lista de Comprovantes
3. Câmera (Capturar Recibo)
4. Processamento (IA Processando)
5. Revisão do Recibo (edição pós-IA)

---

## Telas adicionadas na Etapa 2

A Etapa 2 exige cadastro, consulta, edição e exclusão pela interface do aplicativo. Para isso, o protótipo ganha cinco telas novas:

6. **Cadastro** (`POST /auth/register`) — aberta pelo link "Criar Conta" do Login (inclui validação de erro de e-mail abaixo do campo).
7. **Resumo do mês** (`GET /comprovantes/resumo`) — seletor de mês, total gasto, contagem de comprovantes e barras horizontais por categoria, aberta pelo card de resumo da Lista (com estado `"Nenhum gasto neste mês"`).
8. **Detalhe do comprovante** (`GET /comprovantes/:id`, `PATCH /comprovantes/:id`, `DELETE /comprovantes/:id`) — foto original, dados, botões de editar e excluir.
9. **Categorias** (`GET /categorias`, `POST /categorias`, `PATCH /categorias/:id`, `DELETE /categorias/:id`) — listar, criar, renomear e excluir categorias; a categoria `"Outros"` aparece protegida com cadeado.
10. **Perfil** (`GET /usuarios/me`, `PATCH /usuarios/me`) — círculo com as iniciais do nome, exibição de nome e e-mail, botão de editar nome e botão de sair em vermelho.

O protótipo também cobre todos os estados exigidos: **lista vazia**, **busca sem resultado**, **falha de conexão**, **imagem ilegível**, **confirmação de exclusão/descarte**, **mensagem curta de sucesso (toast)** e **carregamento (loading)**.

---

## Navegação

```text
Login ⇄ Cadastro
  ↓
Abas: [Comprovantes] [Categorias] [Perfil]

Comprovantes → Resumo do mês
Comprovantes → Detalhe → (Editar | Excluir)
Comprovantes → Captura → Processando → Revisão → Comprovantes
                              ↓ (imagem ilegível)
                           Captura