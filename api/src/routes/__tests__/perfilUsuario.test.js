const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'secret_test';

jest.mock('../../services/UsuarioService', () => ({
    obterPerfil: jest.fn(),
    atualizarPerfil: jest.fn(),
}));

const UsuarioService = require('../../services/UsuarioService');
const app = require('../../app');

const token = jwt.sign({ id: 1 }, 'secret_test', { expiresIn: '7d' });
const auth = { Authorization: `Bearer ${token}` };

describe('/api/usuarios/me', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('GET', () => {
        it('sem token → 401', async () => {
            const res = await request(app).get('/api/usuarios/me');
            expect(res.status).toBe(401);
        });

        it('com token → 200 sem senha', async () => {
            UsuarioService.obterPerfil.mockResolvedValue({ id: 1, nome: 'Ana', email: 'a@a.com' });
            const res = await request(app).get('/api/usuarios/me').set(auth);
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual({ id: 1, nome: 'Ana', email: 'a@a.com' });
            expect(JSON.stringify(res.body)).not.toMatch(/senha/i);
        });
    });

    describe('PATCH', () => {
        it('sem token → 401', async () => {
            const res = await request(app).patch('/api/usuarios/me').send({ nome: 'Ana' });
            expect(res.status).toBe(401);
        });

        it.each([
            ['nome curto', { nome: 'A' }],
            ['nome com número', { nome: 'Maria 2026' }],
            ['nome não string', { nome: 123 }],
            ['campo email', { nome: 'Ana', email: 'x@x.com' }],
            ['campo senha', { nome: 'Ana', senha: 'Abcdefg1' }],
            ['só email', { email: 'x@x.com' }],
            ['corpo vazio', {}],
        ])('%s → 400 sem alterar', async (_desc, corpo) => {
            const res = await request(app).patch('/api/usuarios/me').set(auth).send(corpo);
            expect(res.status).toBe(400);
            expect(UsuarioService.atualizarPerfil).not.toHaveBeenCalled();
        });

        it('sucesso → 200 com nome novo (trim aplicado)', async () => {
            UsuarioService.atualizarPerfil.mockResolvedValue({ id: 1, nome: 'Maria', email: 'a@a.com' });
            const res = await request(app).patch('/api/usuarios/me').set(auth).send({ nome: ' Maria ' });
            expect(res.status).toBe(200);
            expect(UsuarioService.atualizarPerfil).toHaveBeenCalledWith(1, 'Maria');
            expect(res.body.data.nome).toBe('Maria');
        });
    });
});