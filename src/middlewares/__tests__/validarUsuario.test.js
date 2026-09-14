const validarUsuario = require('../validarUsuario');

describe('Middleware validarUsuario (Zod)', () => {
    let req, res, next;

    beforeEach(() => {
        req = { body: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        next = jest.fn();
    });

    const str = (tamanho) => 'A'.repeat(tamanho);

    describe('Regras do Nome', () => {
        test('aceita 2 a 100 caracteres com trim, acentos, hífen e apóstrofo', () => {
            req.body = { nome: "  João D'Ávila-Silva  ", email: "a@a.com", senha: "Password1" };
            validarUsuario(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(req.body.nome).toBe("João D'Ávila-Silva");
        });

        test('aceita exatos 2 e exatos 100 caracteres', () => {
            req.body = { nome: "Zé", email: "a@a.com", senha: "Password1" };
            validarUsuario(req, res, next);
            expect(next).toHaveBeenCalled();

            req.body = { nome: str(100), email: "a@a.com", senha: "Password1" };
            validarUsuario(req, res, next);
            expect(next).toHaveBeenCalledTimes(2);
        });

        test('rejeita 1 caractere ou 101 caracteres', () => {
            req.body = { nome: "A", email: "a@a.com", senha: "Password1" };
            validarUsuario(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);

            req.body = { nome: str(101), email: "a@a.com", senha: "Password1" };
            validarUsuario(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('rejeita números, tipos inválidos, ausência, null, vazio e apenas espaços', () => {
            const casos = ["Ana 123", null, undefined, "", "   ", 123, {}, []];
            casos.forEach((nome) => {
                req.body = { nome, email: "a@a.com", senha: "Password1" };
                validarUsuario(req, res, next);
                expect(res.status).toHaveBeenCalledWith(400);
                res.status.mockClear();
            });
        });
    });

    describe('Regras do E-mail', () => {
        test('valida formato, obrigatoriedade e normaliza espaços e maiúsculas', () => {
            req.body = { nome: "Ana", email: "   TESTE@Exemplo.com   ", senha: "Password1" };
            validarUsuario(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(req.body.email).toBe("teste@exemplo.com");
        });

        test('rejeita formato inválido e espaços internos', () => {
            const casos = ["teste", "teste@", "@teste.com", "teste @exemplo.com", "teste@ exemplo.com", null, undefined, 123];
            casos.forEach((email) => {
                req.body = { nome: "Ana", email, senha: "Password1" };
                validarUsuario(req, res, next);
                expect(res.status).toHaveBeenCalledWith(400);
                res.status.mockClear();
            });
        });
    });

    describe('Regras de Senha', () => {
        test('aceita mínimo 8 caracteres com maiúscula, minúscula e número sem aplicar trim', () => {
            req.body = { nome: "Ana", email: "a@a.com", senha: "  Pass1234  " };
            validarUsuario(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(req.body.senha).toBe("  Pass1234  ");
        });

        test('rejeita tamanho insuficiente ou requisito ausente', () => {
            const casos = [
                "Pass123", // 7 chars
                "password123", // sem maiúscula
                "PASSWORD123", // sem minúscula
                "Passwordxxx", // sem número
                null, undefined, 123
            ];
            casos.forEach((senha) => {
                req.body = { nome: "Ana", email: "a@a.com", senha };
                validarUsuario(req, res, next);
                expect(res.status).toHaveBeenCalledWith(400);
                res.status.mockClear();
            });
        });
    });
});
