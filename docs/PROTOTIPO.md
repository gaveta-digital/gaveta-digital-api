# Protótipo — Gaveta Digital

**Link do protótipo:** https://www.figma.com/design/EK3DWo4GZUesKuCitrI8Vq/GavetaDigital?node-id=0-1&t=3MUQBYzFg52aRHla-1

**Ferramenta:** Figma — protótipo elaborado por Maria Barros.

---

## Telas da Etapa 1

1. Login
2. Lista de Comprovantes
3. Câmera (Capturar Recibo)
4. Processamento (IA Processando)
5. Revisão do Recibo (edição pós-IA)

## Telas adicionadas na Etapa 2

A Etapa 2 exige cadastro, consulta, edição e exclusão pela interface do aplicativo. Para isso, o protótipo ganha cinco telas:

6. **Cadastro** — aberta pelo link "Criar Conta" do Login
7. **Resumo do mês** — gastos por categoria em barras, aberta pelo card de resumo da Lista
8. **Detalhe do comprovante** — foto original, dados, editar e excluir
9. **Categorias** — listar, criar, renomear e excluir; "Outros" aparece protegida
10. **Perfil** — iniciais do nome, nome, e-mail, editar nome e sair

E também os estados de lista vazia, busca sem resultado, falha de conexão, imagem ilegível, confirmação de exclusão, mensagem de sucesso e carregamento.

As telas novas seguem a identidade visual do protótipo: azul-marinho `#1A237E`, ciano `#5CD6EB` nos destaques e verde `#2E7D32` nos botões de confirmação.

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
```

---

## Decisões sobre os elementos do protótipo

| Elemento | Etapa 1 | Decisão na Etapa 2 |
|---|---|---|
| Login com Google / Apple | Visão de produto | **Removido** da tela: exigiria integração OAuth. |
| "Esqueci minha senha" | Visão de produto | **Removido** da tela: exigiria envio de e-mail e fluxo de redefinição. |
| Busca de comprovantes | Visão de produto | **Implementada** pela API (`GET /comprovantes?busca=`). |
| Filtro por categoria | Visão de produto | **Implementado** pela API (`GET /comprovantes?categoriaId=`). |
| Resumo do mês | Visão de produto | **Implementado** pela rota `GET /comprovantes/resumo`, que também alimenta a tela Resumo do mês. A listagem é paginada, por isso o total não é calculado no app. |
| Escolha de imagem pela galeria | Visão de produto | **Implementada** na tela de Captura, ao lado da câmera. |
| Foto de perfil | Visão de produto | **Substituída** por um círculo com as iniciais do nome; o model `Usuario` não tem campo de foto. |
| Etapas de progresso no processamento | Só visual | **Mantidas como animação.** A API responde em uma única chamada síncrona; as etapas apenas comunicam espera. |
| "% de confiança da IA" | Removido | **Continua removido.** O Gemini não fornece esse número para esta extração. |
| Campo "Observações" | Planejado | **Implementado.** O campo `observacoes` existe no comprovante. |

---

## Fluxo de criação do comprovante

1. **Captura:** o usuário fotografa o comprovante ou escolhe uma imagem da galeria.
2. **Processando:** o app envia a imagem em `POST /comprovantes`. A API lê a imagem com o Gemini e **já cria** o comprovante, devolvendo `201`.
3. **Revisão:** o app mostra os dados preenchidos pela IA, editáveis.
   - **Salvar no Histórico** → `PATCH /comprovantes/:id` com os dados confirmados ou corrigidos.
   - **Descartar** → `DELETE /comprovantes/:id`, após confirmação.
4. O usuário volta para a Lista, já atualizada.

Esse fluxo substitui a definição da Etapa 1 ("o comprovante só é salvo ao clicar em Salvar"), porque a API implementada persiste o comprovante no `POST`. Assim, um único fluxo demonstra criação, consulta, edição e exclusão.
