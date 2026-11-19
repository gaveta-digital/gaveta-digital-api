const validarLogin = require('../validarLogin');

describe('Middleware validarLogin (Zod)', () => {
    let req, res, next;

    beforeEach(() => {
        req = { body: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        next = jest.fn();
    });

    describe('Validações do Login', () => {
        test('normaliza espaços e maiúsculas do email no login', () => {
            req.body = { email: "   TESTE@Exemplo.com   ", senha: "Password1" };
            validarLogin(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(req.body.email).toBe("teste@exemplo.com");
        });

        test('rejeita dados obrigatórios ausentes e retorna 400', () => {
            const casos = [
                { email: "a@a.com" }, // sem senha
                { senha: "123" }, // sem email
                {} // sem nenhum
            ];
            casos.forEach((body) => {
                req.body = body;
                validarLogin(req, res, next);
                expect(res.status).toHaveBeenCalledWith(400);
                res.status.mockClear();
            });
        });

        test('rejeita senha vazia e retorna 400 antes de chamar o controller', () => {
            req.body = { email: "jwt@teste.com", senha: "" };
            validarLogin(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ erro: "Senha é obrigatória" });
            expect(next).not.toHaveBeenCalled();
        });

        test('não aplica regras de tamanho ou complexidade na senha durante o login', () => {
            // A senha no login só precisa ser string, não importa o conteúdo
            req.body = { email: "teste@teste.com", senha: "1" };
            validarLogin(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });
});
