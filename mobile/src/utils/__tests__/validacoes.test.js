import {
  normalizarEmail,
  normalizarNome,
  validarCamposCadastro,
  validarCamposLogin,
  validarCategoria,
  validarConfirmarSenha,
  validarEmail,
  validarNome,
  validarSenha,
  validarSenhaLogin,
} from '../validacoes';

// As regras do app espelham as da API (REGRAS-DE-NEGOCIO, seção 1). Os casos de
// e-mail, nome e senha abaixo foram conferidos contra os middlewares da API
// (validarUsuario e validarLogin): o app aceita e recusa exatamente o mesmo.

describe('normalizarEmail', () => {
  test.each([
    ['  caunRRicardo@Gmail.COM  ', 'caunrricardo@gmail.com'],
    ['CAUAN@GMAIL.COM', 'cauan@gmail.com'],
    ['\tcauan@gmail.com\n', 'cauan@gmail.com'],
    ['cauan@gmail.com', 'cauan@gmail.com'],
  ])('%j vira %j', (entrada, esperado) => {
    expect(normalizarEmail(entrada)).toBe(esperado);
  });

  test('mantém espaços e símbolos do meio (quem recusa é a validação)', () => {
    expect(normalizarEmail(' Cau An@X.com ')).toBe('cau an@x.com');
  });

  test.each([[null], [undefined], [123], [['a@b.com']]])('valor que não é texto (%p) passa direto', (valor) => {
    expect(normalizarEmail(valor)).toBe(valor);
  });
});

describe('normalizarNome', () => {
  test('tira os espaços das pontas e mantém os do meio', () => {
    expect(normalizarNome('  Maria   da Silva  ')).toBe('Maria   da Silva');
  });

  test('não altera maiúsculas e minúsculas', () => {
    expect(normalizarNome(" João D'Ávila ")).toBe("João D'Ávila");
  });

  test('valor que não é texto passa direto', () => {
    expect(normalizarNome(null)).toBeNull();
  });
});

describe('validarEmail', () => {
  const ACEITOS = [
    ['normal', 'cauan@gmail.com'],
    ['domínio em maiúsculas', 'cauan@GMAIL.COM'],
    ['caixa mista', 'caunRRicardo@gmail.com'],
    ['erro de digitação no domínio (.coom): o formato é válido', 'caunRRicardo@gmail.coom'],
    ['espaços nas pontas', '  cauan@gmail.com  '],
    ['espaços e maiúsculas juntos', ' CAUAN@Gmail.com '],
    ['tabulação e quebra de linha nas pontas', '\tcauan@gmail.com\n'],
    ['com +tag', 'cauan+teste@gmail.com'],
    ['subdomínios', 'a@mail.empresa.com.br'],
    ['apóstrofo na parte local', "o'brien@x.com"],
    ['underline na parte local', 'a_b@x.com'],
    ['hífen no domínio', 'a-b@x-y.com'],
    ['número no começo', '1@2.com'],
    ['TLD duplo', 'a@b.co.uk'],
  ];

  const RECUSADOS = [
    ['espaço no meio', 'cau an@gmail.com'],
    ['sem @', 'cauan.gmail.com'],
    ['sem domínio', 'cauan@'],
    ['sem parte local', '@gmail.com'],
    ['sem ponto no domínio', 'cauan@gmail'],
    ['dois @', 'a@b@c.com'],
    ['ponto duplo na parte local', 'a..b@gmail.com'],
    ['parte local começa com ponto', '.a@gmail.com'],
    ['parte local termina com ponto', 'a.@gmail.com'],
    ['ponto duplo no domínio', 'a@gmail..com'],
    ['domínio começa com ponto', 'a@.com'],
    ['domínio termina com ponto', 'a@gmail.com.'],
    ['domínio começa com hífen', 'a@-gmail.com'],
    ['TLD de 1 letra', 'a@gmail.c'],
    ['TLD numérico', 'a@gmail.123'],
    ['IP entre colchetes', 'a@[1.2.3.4]'],
    ['letra acentuada', 'joão@gmail.com'],
    ['underline no domínio', 'a@g_mail.com'],
    ['aspas', '"a b"@gmail.com'],
    ['vírgula', 'a,b@gmail.com'],
    ['emoji', '😀@gmail.com'],
    ['ponto de exclamação', 'a!b@gmail.com'],
    ['caractere invisível (largura zero) no fim', 'a@x.com\u200b'],
  ];

  test.each(ACEITOS)('aceita: %s (%j)', (_descricao, email) => {
    expect(validarEmail(email)).toBeNull();
  });

  test.each(RECUSADOS)('recusa: %s (%j)', (_descricao, email) => {
    expect(validarEmail(email)).toBe('E-mail inválido.');
  });

  test.each([[''], ['   '], ['\t\n']])('vazio ou só espaços (%j) é "obrigatório"', (email) => {
    expect(validarEmail(email)).toBe('E-mail é obrigatório.');
  });

  test.each([[null], [undefined], [123], [true], [['a@b.com']], [{}]])('valor que não é texto (%p) é "obrigatório"', (valor) => {
    expect(validarEmail(valor)).toBe('E-mail é obrigatório.');
  });

  test('só valida o formato depois de aparar e passar para minúsculas, como a API', () => {
    expect(validarEmail(`  ${'A'.repeat(10)}@EXEMPLO.COM  `)).toBeNull();
  });
});

describe('validarNome', () => {
  test.each([
    ['normal', 'Cauan Ricardo'],
    ['com espaços nas pontas', '  Maria  '],
    ['acentuado e apóstrofo', "João D'Ávila"],
    ['com hífen', 'Anne-Marie'],
    ['duas letras (mínimo)', 'Al'],
    ['100 caracteres (máximo)', 'a'.repeat(100)],
    ['100 caracteres com espaços nas pontas', ` ${'a'.repeat(100)} `],
    ['espaços internos', 'Ana    Maria'],
  ])('aceita: %s', (_descricao, nome) => {
    expect(validarNome(nome)).toBeNull();
  });

  test.each([
    ['1 letra', 'A', 'Nome deve ter entre 2 e 100 caracteres.'],
    ['101 caracteres', 'a'.repeat(101), 'Nome deve ter entre 2 e 100 caracteres.'],
    ['com número', 'Maria 2026', 'Nome contém caracteres inválidos.'],
    ['só números', '123', 'Nome contém caracteres inválidos.'],
    ['com ponto', 'J. Silva', 'Nome contém caracteres inválidos.'],
    ['com underline', 'a_b', 'Nome contém caracteres inválidos.'],
    ['com emoji', 'Ana 😀', 'Nome contém caracteres inválidos.'],
    ['só hífens', '--', 'Nome deve conter pelo menos uma letra.'],
    ['só apóstrofos e espaços', "' '", 'Nome deve conter pelo menos uma letra.'],
    ['vazio', '', 'Nome é obrigatório.'],
    ['só espaços', '   ', 'Nome é obrigatório.'],
  ])('recusa: %s', (_descricao, nome, mensagem) => {
    expect(validarNome(nome)).toBe(mensagem);
  });

  test.each([[null], [undefined], [123], [['Ana']], [{}]])('valor que não é texto (%p) é inválido', (valor) => {
    expect(validarNome(valor)).toBe('Nome inválido.');
  });
});

describe('validarSenha (cadastro)', () => {
  const MENSAGEM = 'Senha deve ter no mínimo 8 caracteres, maiúscula, minúscula e número.';

  test.each([
    ['válida', 'Abcdefg1'],
    ['com símbolo', 'Abcdefg1!'],
    ['espaço no começo conta como caractere', ' Abcdefg1'],
    ['espaço no fim conta como caractere', 'Abcdefg1 '],
    ['espaços no meio', 'A b 1 c d'],
    ['100 caracteres', `Aa1${'x'.repeat(97)}`],
    ['com emoji', 'Abcdef1😀'],
  ])('aceita: %s', (_descricao, senha) => {
    expect(validarSenha(senha)).toBeNull();
  });

  test.each([
    ['7 caracteres', 'Abcdef1'],
    ['sem maiúscula', 'abcdefg1'],
    ['sem minúscula', 'ABCDEFG1'],
    ['sem número', 'Abcdefgh'],
    ['só espaços', '        '],
    ['maiúscula acentuada não vale como maiúscula', 'Ábcdefg1'],
    ['só letras acentuadas', 'Áççççççç1'],
  ])('recusa: %s', (_descricao, senha) => {
    expect(validarSenha(senha)).toBe(MENSAGEM);
  });

  test('vazia é "obrigatória"', () => {
    expect(validarSenha('')).toBe('Senha é obrigatória.');
  });

  test.each([[null], [undefined], [12345678]])('valor que não é texto (%p) é inválido', (valor) => {
    expect(validarSenha(valor)).toBe('Senha inválida.');
  });

  test('a senha não é aparada: "Abcdef1 " tem 8 caracteres e passa, "Abcdef1" não', () => {
    expect(validarSenha('Abcdef1 ')).toBeNull();
    expect(validarSenha('Abcdef1')).toBe(MENSAGEM);
  });
});

describe('validarSenhaLogin', () => {
  test.each([['a'], [' a '], ['   '], ['123'], ['Senha1234']])('aceita qualquer texto preenchido (%j), sem exigir senha forte', (senha) => {
    expect(validarSenhaLogin(senha)).toBeNull();
  });

  test.each([[''], [null], [undefined], [123]])('recusa vazia ou sem ser texto (%p)', (senha) => {
    expect(validarSenhaLogin(senha)).toBe('Senha é obrigatória.');
  });
});

describe('validarConfirmarSenha', () => {
  test('aceita quando é igual', () => {
    expect(validarConfirmarSenha('Senha1234', 'Senha1234')).toBeNull();
  });

  test.each([
    ['uma letra diferente', 'Senha1234', 'Senha1235'],
    ['só a caixa diferente', 'Senha1234', 'senha1234'],
    ['espaço a mais no fim', 'Senha1234', 'Senha1234 '],
    ['espaço a mais no começo', 'Senha1234', ' Senha1234'],
  ])('recusa: %s', (_descricao, senha, confirmacao) => {
    expect(validarConfirmarSenha(senha, confirmacao)).toBe('As senhas não conferem.');
  });

  test.each([[''], [null], [undefined]])('confirmação vazia (%p) pede para confirmar', (confirmacao) => {
    expect(validarConfirmarSenha('Senha1234', confirmacao)).toBe('Confirme sua senha.');
  });
});

describe('validarCamposLogin', () => {
  test('dados válidos não geram erro, mesmo com espaços e maiúsculas no e-mail', () => {
    expect(validarCamposLogin({ email: '  CAUAN@Gmail.com ', senha: 'qualquer' })).toEqual({});
  });

  test('campos vazios geram um erro por campo', () => {
    expect(validarCamposLogin({ email: '', senha: '' })).toEqual({
      email: 'E-mail é obrigatório.',
      senha: 'Senha é obrigatória.',
    });
  });

  test('só o campo com problema recebe erro', () => {
    expect(validarCamposLogin({ email: 'cauan@gmail', senha: 'abc' })).toEqual({
      email: 'E-mail inválido.',
    });
  });

  test('objeto ausente não quebra', () => {
    expect(validarCamposLogin(undefined)).toEqual({
      email: 'E-mail é obrigatório.',
      senha: 'Senha é obrigatória.',
    });
  });
});

describe('validarCamposCadastro', () => {
  const valido = {
    nome: 'Cauan Ricardo',
    email: 'caunRRicardo@Gmail.com',
    senha: 'Senha1234',
    confirmarSenha: 'Senha1234',
  };

  test('dados válidos não geram erro', () => {
    expect(validarCamposCadastro(valido)).toEqual({});
  });

  test('dados válidos com espaços no nome e no e-mail não geram erro', () => {
    expect(validarCamposCadastro({ ...valido, nome: '  Cauan  ', email: '  caunrricardo@gmail.com ' })).toEqual({});
  });

  test('tudo vazio gera um erro em cada campo', () => {
    expect(validarCamposCadastro({ nome: '', email: '', senha: '', confirmarSenha: '' })).toEqual({
      nome: 'Nome é obrigatório.',
      email: 'E-mail é obrigatório.',
      senha: 'Senha é obrigatória.',
      confirmarSenha: 'Confirme sua senha.',
    });
  });

  test('cada campo inválido recebe a própria mensagem', () => {
    expect(
      validarCamposCadastro({ nome: 'A', email: 'a..b@x.com', senha: 'fraca', confirmarSenha: 'outra' })
    ).toEqual({
      nome: 'Nome deve ter entre 2 e 100 caracteres.',
      email: 'E-mail inválido.',
      senha: 'Senha deve ter no mínimo 8 caracteres, maiúscula, minúscula e número.',
      confirmarSenha: 'As senhas não conferem.',
    });
  });

  test('senha forte com confirmação diferente só marca a confirmação', () => {
    expect(validarCamposCadastro({ ...valido, confirmarSenha: 'Senha12345' })).toEqual({
      confirmarSenha: 'As senhas não conferem.',
    });
  });
});

describe('validarCategoria', () => {
  test.each([
    ['Alimentação'],
    ['Transporte'],
    ['Saúde & Lazer'],
    [' A '],
    ['50 caracteres', 'a'.repeat(50)],
  ])('aceita nome de categoria válido: %j', (categoria) => {
    expect(validarCategoria(categoria)).toBeNull();
  });

  test.each([
    ['', 'Categoria é obrigatório.'],
    ['   ', 'Categoria é obrigatório.'],
    [null, 'Categoria é obrigatório.'],
    [undefined, 'Categoria é obrigatório.'],
    ['123', 'Categoria deve conter pelo menos uma letra.'],
    ['---', 'Categoria deve conter pelo menos uma letra.'],
    ['a'.repeat(51), 'Categoria deve ter no máximo 50 caracteres.'],
  ])('recusa nome de categoria inválido: %j', (categoria, erroEsperado) => {
    expect(validarCategoria(categoria)).toBe(erroEsperado);
  });
});
