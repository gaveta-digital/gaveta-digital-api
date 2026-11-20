function obrigatorio(valor, campo) {
  if (typeof valor !== 'string' || !valor.trim()) {
    return `${campo} é obrigatório.`;
  }

  return null;
}

export function validarNome(valor) {
  if (typeof valor !== 'string') {
    return 'Nome inválido.';
  }

  const nome = valor.trim();

  if (!nome) {
    return 'Nome é obrigatório.';
  }

  if (nome.length < 2 || nome.length > 100) {
    return 'Nome deve ter entre 2 e 100 caracteres.';
  }

  if (!/^\p{L}[\p{L}\s'-]*$/u.test(nome)) {
    return 'Nome inválido.';
  }

  return null;
}

export function validarEmail(valor) {
  const erroObrigatorio = obrigatorio(valor, 'E-mail');

  if (erroObrigatorio) {
    return erroObrigatorio;
  }

  const email = valor.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'E-mail inválido.';
  }

  return null;
}

export function validarSenha(valor) {
  if (typeof valor !== 'string') {
    return 'Senha inválida.';
  }

  if (
    valor.length < 8
    || !/[a-z]/.test(valor)
    || !/[A-Z]/.test(valor)
    || !/[0-9]/.test(valor)
  ) {
    return 'Senha deve ter 8 caracteres, maiúscula, minúscula e número.';
  }

  return null;
}

export function validarCategoria(valor) {
  const erroObrigatorio = obrigatorio(valor, 'Categoria');

  if (erroObrigatorio) {
    return erroObrigatorio;
  }

  const categoria = valor.trim();

  if (categoria.length > 50) {
    return 'Categoria deve ter no máximo 50 caracteres.';
  }

  if (!/\p{L}/u.test(categoria)) {
    return 'Categoria deve conter pelo menos uma letra.';
  }

  return null;
}

export function validarValor(valor) {
  if (valor === null || typeof valor === 'undefined') {
    return null;
  }

  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    return 'Valor inválido.';
  }

  if (valor <= 0 || valor > 9999999.99) {
    return 'Valor inválido.';
  }

  const texto = String(valor);
  const casasDecimais = texto.includes('.')
    ? texto.split('.')[1].length
    : 0;

  if (casasDecimais > 2) {
    return 'Valor deve ter no máximo duas casas decimais.';
  }

  return null;
}

export function validarObservacoes(valor) {
  if (valor === null || typeof valor === 'undefined') {
    return null;
  }

  if (typeof valor !== 'string') {
    return 'Observações devem ser um texto ou null.';
  }

  return null;
}

export function validarCadastro(dados) {
  return (
    validarNome(dados?.nome)
    || validarEmail(dados?.email)
    || validarSenha(dados?.senha)
  );
}
