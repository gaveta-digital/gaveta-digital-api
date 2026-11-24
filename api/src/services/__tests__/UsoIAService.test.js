jest.mock('../../repositories/UsoIARepository');

const UsoIARepository = require('../../repositories/UsoIARepository');
const UsoIAService = require('../UsoIAService');

const tentativa = (sobrescritas = {}) => ({
  modelo: 'modelo-a',
  tokensEntrada: 2000,
  tokensSaida: 65,
  tokensTotal: 2065,
  duracaoMs: 900,
  resultado: 'sucesso',
  ...sobrescritas,
});

describe('UsoIAService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UsoIARepository.criarVarios.mockResolvedValue([]);
  });

  describe('registrarTentativas', () => {
    test('grava uma linha por tentativa com o usuário e os campos da seção 9', async () => {
      await UsoIAService.registrarTentativas('usuario-1', [tentativa()]);

      expect(UsoIARepository.criarVarios).toHaveBeenCalledWith([
        {
          usuarioId: 'usuario-1',
          comprovanteId: null,
          modelo: 'modelo-a',
          tokensEntrada: 2000,
          tokensSaida: 65,
          tokensTotal: 2065,
          duracaoMs: 900,
          resultado: 'sucesso',
        },
      ]);
    });

    test('liga o comprovante só à última tentativa com sucesso', async () => {
      await UsoIAService.registrarTentativas(
        'usuario-1',
        [
          tentativa({ modelo: 'a', resultado: 'erro', tokensEntrada: 0, tokensSaida: 0, tokensTotal: 0 }),
          tentativa({ modelo: 'b', resultado: 'sucesso' }),
        ],
        'comprovante-1'
      );

      const [registros] = UsoIARepository.criarVarios.mock.calls[0];
      expect(registros.map((registro) => registro.comprovanteId)).toEqual([null, 'comprovante-1']);
    });

    test('sem comprovante criado, nenhuma tentativa fica ligada', async () => {
      await UsoIAService.registrarTentativas('usuario-1', [tentativa(), tentativa()]);

      const [registros] = UsoIARepository.criarVarios.mock.calls[0];
      expect(registros.every((registro) => registro.comprovanteId === null)).toBe(true);
    });

    test('com comprovante mas nenhuma tentativa com sucesso, não liga nada', async () => {
      await UsoIAService.registrarTentativas('usuario-1', [tentativa({ resultado: 'ilegivel' })], 'comprovante-1');

      const [registros] = UsoIARepository.criarVarios.mock.calls[0];
      expect(registros[0].comprovanteId).toBeNull();
    });

    test.each([[undefined], [null], [[]]])('sem tentativas (%p) não grava nada', async (tentativas) => {
      await UsoIAService.registrarTentativas('usuario-1', tentativas);

      expect(UsoIARepository.criarVarios).not.toHaveBeenCalled();
    });

    test('falha ao gravar não lança: só vai para o log', async () => {
      const espiao = jest.spyOn(console, 'error').mockImplementation(() => {});
      UsoIARepository.criarVarios.mockRejectedValueOnce(new Error('banco fora do ar'));

      await expect(
        UsoIAService.registrarTentativas('usuario-1', [tentativa()], 'comprovante-1')
      ).resolves.toBeUndefined();

      expect(espiao).toHaveBeenCalledWith(
        expect.stringContaining('Não foi possível gravar o uso da IA'),
        'banco fora do ar'
      );
      espiao.mockRestore();
    });
  });

  describe('resumo', () => {
    test('soma os totais a partir das linhas por modelo e converte para número', async () => {
      UsoIARepository.somarPorModelo.mockResolvedValueOnce([
        { modelo: 'a', tentativas: '2', tokensEntrada: '4000', tokensSaida: '130', tokensTotal: '4130' },
        { modelo: 'b', tentativas: '1', tokensEntrada: '2000', tokensSaida: '65', tokensTotal: '2065' },
      ]);
      UsoIARepository.ultimas.mockResolvedValueOnce([]);

      const resumo = await UsoIAService.resumo('usuario-1');

      expect(resumo.totalTentativas).toBe(3);
      expect(resumo.tokensEntrada).toBe(6000);
      expect(resumo.tokensSaida).toBe(195);
      expect(resumo.tokensTotal).toBe(6195);
      expect(resumo.porModelo).toEqual([
        { modelo: 'a', tentativas: 2, tokensEntrada: 4000, tokensSaida: 130, tokensTotal: 4130 },
        { modelo: 'b', tentativas: 1, tokensEntrada: 2000, tokensSaida: 65, tokensTotal: 2065 },
      ]);
    });

    test('usuário sem uso recebe zeros e listas vazias', async () => {
      UsoIARepository.somarPorModelo.mockResolvedValueOnce([]);
      UsoIARepository.ultimas.mockResolvedValueOnce([]);

      expect(await UsoIAService.resumo('usuario-1')).toEqual({
        totalTentativas: 0,
        tokensEntrada: 0,
        tokensSaida: 0,
        tokensTotal: 0,
        porModelo: [],
        ultimas: [],
      });
    });

    test('só consulta os dados do usuário informado e pede as 10 últimas', async () => {
      UsoIARepository.somarPorModelo.mockResolvedValueOnce([]);
      UsoIARepository.ultimas.mockResolvedValueOnce([]);

      await UsoIAService.resumo('usuario-7');

      expect(UsoIARepository.somarPorModelo).toHaveBeenCalledWith('usuario-7');
      expect(UsoIARepository.ultimas).toHaveBeenCalledWith('usuario-7', 10);
    });

    test('devolve as últimas tentativas só com os campos públicos', async () => {
      const criadoEm = new Date('2026-11-23T10:00:00Z');
      UsoIARepository.somarPorModelo.mockResolvedValueOnce([]);
      UsoIARepository.ultimas.mockResolvedValueOnce([
        {
          id: 'uso-1',
          usuarioId: 'usuario-1',
          comprovanteId: 'comprovante-1',
          modelo: 'a',
          resultado: 'sucesso',
          tokensEntrada: 2000,
          tokensSaida: 65,
          tokensTotal: 2065,
          duracaoMs: 900,
          createdAt: criadoEm,
          updatedAt: criadoEm,
        },
      ]);

      const { ultimas } = await UsoIAService.resumo('usuario-1');

      expect(ultimas).toEqual([
        {
          id: 'uso-1',
          modelo: 'a',
          resultado: 'sucesso',
          tokensEntrada: 2000,
          tokensSaida: 65,
          tokensTotal: 2065,
          duracaoMs: 900,
          comprovanteId: 'comprovante-1',
          criadoEm,
        },
      ]);
    });
  });
});
