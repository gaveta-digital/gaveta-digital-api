const Categoria = require('../Categoria');
const { validarNomeCategoria, normalizarNome } = require('../Categoria');

describe('Model Categoria - Renomeação', () => {
  afterEach(() => jest.restoreAllMocks());

  test.each(['Pet', '  Alimentação  '])(
    'envia o nome e sua normalização juntos à persistência ao renomear para %s',
    async (nome) => {
      // Simula uma instância carregada do banco, sem conectar ou persistir.
      const categoria = Categoria.build(
        { id: 'cat-1', usuarioId: 'usr-1', nome: 'Água', nomeNormalizado: 'agua' },
        { isNewRecord: false, raw: true }
      );
      let valoresEnviados;
      const update = jest.spyOn(Categoria.queryInterface, 'update')
        .mockImplementation(async (instance, tabela, valores) => {
          // O Sequelize modifica esse objeto depois da escrita; capture o envio.
          valoresEnviados = { ...valores };
          return [instance, 1];
        });

      await categoria.update({ nome });

      expect(update).toHaveBeenCalledTimes(1);
      const [, , , where] = update.mock.calls[0];
      expect(valoresEnviados).toEqual(expect.objectContaining({
        nome: nome.trim(),
        nomeNormalizado: normalizarNome(nome),
      }));
      expect(where).toEqual({ id: 'cat-1' });
    }
  );
});

describe('Model Categoria - Validações dos Campos nome e nomeNormalizado', () => {
  test('aceita nome com 1 e 50 caracteres, e preserva a grafia formatada', () => {
    const nome1 = 'A';
    const nome50 = 'A'.repeat(50);

    expect(validarNomeCategoria(nome1)).toBe('A');
    expect(validarNomeCategoria(nome50)).toBe(nome50);
  });

  test('rejeita nome com mais de 50 caracteres (ex: 51 caracteres)', () => {
    const nome51 = 'A'.repeat(51);
    expect(() => validarNomeCategoria(nome51)).toThrow(
      'O nome da categoria deve ter entre 1 e 50 caracteres'
    );
  });

  test('rejeita ausência, null, string vazia e apenas espaços', () => {
    expect(() => validarNomeCategoria(null)).toThrow(
      'O nome da categoria deve ser um texto (string)'
    );
    expect(() => validarNomeCategoria(undefined)).toThrow(
      'O nome da categoria deve ser um texto (string)'
    );
    expect(() => validarNomeCategoria('')).toThrow(
      'O nome da categoria deve ter entre 1 e 50 caracteres'
    );
    expect(() => validarNomeCategoria('   ')).toThrow(
      'O nome da categoria deve ter entre 1 e 50 caracteres'
    );
  });

  test('rejeita tipos diferentes de string (number, boolean, object, array)', () => {
    expect(() => validarNomeCategoria(123)).toThrow(
      'O nome da categoria deve ser um texto (string)'
    );
    expect(() => validarNomeCategoria(true)).toThrow(
      'O nome da categoria deve ser um texto (string)'
    );
    expect(() => validarNomeCategoria({})).toThrow(
      'O nome da categoria deve ser um texto (string)'
    );
    expect(() => validarNomeCategoria([])).toThrow(
      'O nome da categoria deve ser um texto (string)'
    );
  });

  test('aceita "Água 2026"; rejeita sem letras como "123" e "---"', () => {
    expect(validarNomeCategoria('Água 2026')).toBe('Água 2026');

    expect(() => validarNomeCategoria('123')).toThrow(
      'O nome da categoria deve conter pelo menos uma letra'
    );
    expect(() => validarNomeCategoria('---')).toThrow(
      'O nome da categoria deve conter pelo menos uma letra'
    );
  });

  test('campo nome preserva a grafia original e nomeNormalizado remove maiúsculas e acentos para unicidade', () => {
    const entrada = '  Alimentação  ';
    const nomeFormatado = validarNomeCategoria(entrada);
    const nomeNorm = normalizarNome(entrada);

    expect(nomeFormatado).toBe('Alimentação'); // Preservado no campo 'nome'
    expect(nomeNorm).toBe('alimentacao'); // Armazenado no campo 'nomeNormalizado' para unicidade
  });
});

describe('Model Categoria - Proprietário e Inicialização (seedIniciais)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('inicialização sem proprietário (usuarioId ausente) falha e não executa escritas', async () => {
    const createSpy = jest.spyOn(Categoria, 'create');
    const findOneSpy = jest.spyOn(Categoria, 'findOne');

    await expect(Categoria.seedIniciais(null)).rejects.toThrow(
      'É necessário informar o usuarioId do proprietário para inicializar as categorias.'
    );

    expect(createSpy).not.toHaveBeenCalled();
    expect(findOneSpy).not.toHaveBeenCalled();
  });

  test('solicita a criação das seis categorias padrão preenchendo nome e nomeNormalizado', async () => {
    const usuarioId = 'usr-uuid-1234';
    const mockTransaction = { id: 'tx-999' };

    jest.spyOn(Categoria, 'findOne').mockResolvedValue(null);
    const createSpy = jest.spyOn(Categoria, 'create').mockResolvedValue({});

    await Categoria.seedIniciais(usuarioId, { transaction: mockTransaction });

    expect(createSpy).toHaveBeenCalledTimes(6);

    const categoriasEsperadas = [
      'Material',
      'Alimentação',
      'Transporte',
      'Serviços',
      'Equipamentos',
      'Outros',
    ];

    categoriasEsperadas.forEach((nomeOriginal, index) => {
      expect(createSpy).toHaveBeenNthCalledWith(
        index + 1,
        {
          nome: nomeOriginal,
          nomeNormalizado: normalizarNome(nomeOriginal),
          usuarioId,
        },
        { transaction: mockTransaction }
      );
    });
  });

  test('registros existentes simulados não provocam duplicação (verifica por nomeNormalizado)', async () => {
    const usuarioId = 'usr-uuid-1234';

    // Simula que 'Alimentação' (alimentacao) já existe para esse usuário
    jest.spyOn(Categoria, 'findOne').mockImplementation(({ where }) => {
      if (where.nomeNormalizado === 'alimentacao') {
        return Promise.resolve({ id: 'cat-1', nome: 'Alimentação', usuarioId });
      }
      return Promise.resolve(null);
    });

    const createSpy = jest.spyOn(Categoria, 'create').mockResolvedValue({});

    await Categoria.seedIniciais(usuarioId);

    expect(createSpy).toHaveBeenCalledTimes(5);
    expect(createSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Alimentação' }),
      expect.anything()
    );
  });
});
