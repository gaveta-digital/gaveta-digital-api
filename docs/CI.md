# Integração contínua

O workflow `.github/workflows/ci.yml` instala as dependências com `npm ci`
e executa `npm test -- --ci --runInBand` em cada push e pull request.
Usa Node.js 22 e um SQLite temporário, separado do banco de desenvolvimento.
Uma falha do Jest faz o job `tests` falhar; não há tolerância a falhas nem
opção para aceitar uma suíte sem testes.

## Proteção de develop e main (configuração no GitHub)

O arquivo de workflow sozinho não bloqueia merges. Um administrador deve
configurar as duas branches em Settings → Branches → Add branch protection rule:

1. Criar uma regra para `develop` e outra para `main`.
2. Ativar **Require a pull request before merging**, com uma aprovação,
   conforme o fluxo de contribuição do projeto.
3. Ativar **Require status checks to pass before merging** e selecionar
   o check **tests**, originado do GitHub Actions, após a primeira execução.
4. Ativar **Require branches to be up to date before merging**.
5. Ativar **Do not allow bypassing the above settings**, incluindo administradores.
6. Manter force pushes e exclusão das branches desabilitados e salvar.

Referência: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule

## Validar o bloqueio com um PR

Após publicar o workflow e ativar as regras:

1. Criar `feature/validar-ci` a partir de `develop` com o workflow presente.
2. Adicionar temporariamente `src/models/__tests__/ci-failure.test.js` contendo:

   ```js
   test('falha proposital para validar CI', () => {
     expect(true).toBe(false);
   });
   ```

3. Publicar a branch e abrir um PR para `develop`.
4. Confirmar que `tests` falhou e que o GitHub bloqueia o merge por esse check.
   Registrar o link do PR e da execução como evidência.
5. Remover o teste proposital, publicar a correção e confirmar que o check passa.
6. Fechar o PR de validação sem merge. Verificar também a regra de `main`
   e, para validar o bloqueio nela, repetir o procedimento com um PR destinado a `main`.

Configurar as regras e executar esse PR são etapas remotas; sua documentação
neste arquivo não significa que já foram realizadas.
