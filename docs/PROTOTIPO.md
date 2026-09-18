Protótipo — Gaveta Digital
Link do protótipo: https://www.figma.com/design/EK3DWo4GZUesKuCitrI8Vq/GavetaDigital?node-id=0-1&t=3MUQBYzFg52aRHla-1

Ferramenta: Figma

Telas 
1. Login 
2. Lista de Comprovantes 
3. Câmera (Capturar Recibo)
4. Processamento (IA Processando)
5. Revisão do Recibo (edição pós-IA)

Fluxo de navegação
Login → Lista → Câmera → Processamento → Revisão → Lista Em caso de erro na Revisão: Revisão → Câmera

O que já está implementado na API (Etapa 1)
* Cadastro e login (e-mail + senha, JWT)
* CRUD de Categoria
* CRUD de Comprovante
* Integração real com IA (Gemini): extração de estabelecimento, data, valor e categoria a partir da imagem
* Categoria escolhida pela IA a partir da lista de categorias do próprio usuário (fallback: "Outros")
* Persistência em banco de dados

O que é visão de produto (protótipo, não implementado nesta etapa)

Elementos visuais presentes no protótipo que representam a proposta completa do produto, mas que não fazem parte do escopo da API construída na Etapa 1:
* Login social (Google / Apple)
* Recuperação de senha ("Esqueci minha senha")
* Busca textual de comprovantes
* Filtro por categoria na listagem
* Resumo financeiro do mês (total gasto, contagem) — se implementado no app, pode ser calculado no front a partir da lista já retornada por GET /comprovantes, sem precisar de endpoint novo
* Avatar/foto de perfil do usuário — campo não existe no model Usuario

Elementos visuais sem correspondência funcional direta na API
* Etapas de progresso durante o processamento ("Detectando texto", "Validando campos", "Categorizando"): a API responde em uma única chamada síncrona ao Gemini — essas etapas são uma representação visual de espera (UX), não múltiplas chamadas reais.

Correção aplicada
* Indicador de "% de confiança da IA" (ex: "92% confiança") foi removido da tela de Revisão do Recibo — a API do Gemini não retorna um score de confiança para este tipo de extração; exibir esse número seria apresentar um dado que o sistema não gera de fato.

Fluxo de criação do comprovante (definição)

O comprovante só é persistido no banco (POST /comprovantes) no momento em que o usuário confirma na tela de Revisão ("Salvar no Histórico"). Antes disso, os dados extraídos pela IA ficam apenas em memória no app — não existe conceito de "rascunho" salvo no banco.