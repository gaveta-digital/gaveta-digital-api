import { mensagemDeErro, mensagemDeErroLogin, tratarErroCadastro } from '../erros';

const resposta = (status, data = {}) => ({ response: { status, data } });

describe('mensagemDeErroLogin', () => {
  test('401 vira a mensagem de credenciais incorretas, sem revelar qual campo errou', () => {
    expect(mensagemDeErroLogin(resposta(401, { erro: 'Email ou senha incorreta' }))).toBe(
      'E-mail ou senha incorretos'
    );
  });

  test.each([[undefined], [null], [{ message: 'Network Error' }], [{ code: 'ECONNABORTED' }]])(
    'sem resposta do servidor (%p) é "Sem conexão com o servidor."',
    (erro) => {
      expect(mensagemDeErroLogin(erro)).toBe('Sem conexão com o servidor.');
    }
  );

  test('400 mostra a mensagem que a API enviou', () => {
    expect(mensagemDeErroLogin(resposta(400, { erro: 'E-mail em formato inválido' }))).toBe(
      'E-mail em formato inválido'
    );
  });

  test('500 vira a mensagem de serviço indisponível', () => {
    expect(mensagemDeErroLogin(resposta(500))).toBe(
      'Serviço indisponível no momento. Tente novamente em instantes.'
    );
  });
});

describe('tratarErroCadastro', () => {
  test('409 aparece embaixo do campo de e-mail, sem banner', () => {
    expect(tratarErroCadastro(resposta(409, { erro: 'E-mail já cadastrado' }))).toEqual({
      geral: null,
      campos: { email: 'E-mail já cadastrado' },
    });
  });

  test('sem conexão aparece no banner', () => {
    expect(tratarErroCadastro({ message: 'Network Error' })).toEqual({
      geral: 'Sem conexão com o servidor.',
      campos: {},
    });
  });

  test('erro sem objeto de erro não quebra', () => {
    expect(tratarErroCadastro(undefined)).toEqual({ geral: 'Sem conexão com o servidor.', campos: {} });
  });

  describe('400 da API: a mensagem vai embaixo do campo a que se refere', () => {
    test.each([
      ['E-mail em formato inválido', 'email'],
      ['E-mail é obrigatório', 'email'],
      ['O nome deve ter no mínimo 2 caracteres', 'nome'],
      ['O nome contém caracteres inválidos', 'nome'],
      ['O nome deve conter pelo menos uma letra', 'nome'],
      ['A senha deve ter no mínimo 8 caracteres', 'senha'],
      ['A senha deve conter pelo menos uma letra maiúscula', 'senha'],
      ['A senha deve conter pelo menos um número', 'senha'],
    ])('%j → campo %s', (mensagem, campo) => {
      expect(tratarErroCadastro(resposta(400, { erro: mensagem }))).toEqual({
        geral: null,
        campos: { [campo]: mensagem },
      });
    });

    test('mensagem que não cita um campo conhecido vai para o banner', () => {
      expect(tratarErroCadastro(resposta(400, { erro: 'Requisição inválida' }))).toEqual({
        geral: 'Requisição inválida',
        campos: {},
      });
    });
  });

  test('500 vai para o banner com a mensagem de serviço indisponível', () => {
    expect(tratarErroCadastro(resposta(500))).toEqual({
      geral: 'Serviço indisponível no momento. Tente novamente em instantes.',
      campos: {},
    });
  });

  test('um 500 que cita "e-mail" no texto não vira erro de campo (só o 400 vira)', () => {
    expect(tratarErroCadastro(resposta(500, { erro: 'Falha ao enviar e-mail' }))).toEqual({
      geral: 'Falha ao enviar e-mail',
      campos: {},
    });
  });
});

describe('mensagemDeErro', () => {
  test.each([
    [409, 'Você já tem uma categoria com esse nome'],
    [422, 'Não conseguimos ler o comprovante. Tente uma foto mais nítida.'],
    [503, 'Leitura indisponível no momento. Tente novamente em instantes.'],
  ])('%i segue a tabela da seção 8', (status, mensagem) => {
    expect(mensagemDeErro(resposta(status))).toBe(mensagem);
  });
});
