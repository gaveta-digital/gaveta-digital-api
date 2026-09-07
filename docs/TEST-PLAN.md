**Título:** [IMPORTANTE] Estratégia de Testes — Leia antes de começar

**Descrição:**

Esta issue explica como vocês devem abordar testes no projeto. Não é uma tarefa de código, é uma **orientação para todo o time**. Leiam antes de começar a implementar.

---

## 🎯 Princípio: Qualidade desde o começo

Não fazemos testes "no final". Testes são parte da implementação, não um extra. Quem implementa uma feature é responsável por testar essa feature.

---

## 📋 Estratégia por Sprint

### Sprint 1: Testes Unitários (cada um testa o próprio)

**Cada pessoa testa a peça que construiu:**

- **João Vitor** (Models) → testa validações, relações, regras de banco
- **Maria** (CRUD Usuario) → testa rotas de cadastro e login
- **Radlei** (CRUD Categoria) → testa rotas de categoria
- **Clidenor** (CRUD Comprovante) → testa rotas de comprovante
- **Cauan** (geminiService) → testa o service de IA isolado

O teste unitário valida se **aquela peça específica funciona corretamente** conforme as regras definidas em `regras-de-negocio.md`.

### Sprint 2: Testes de Integração (Cauan testa o fluxo completo)

Depois que tudo está junto, **Cauan** faz testes que verificam se as peças conversam entre si:

- Fluxo completo: foto → IA → banco → resposta
- Segurança: usuário só vê seus próprios dados
- Casos de borda: imagem ilegível, dados faltando, etc.

---

## 🛠️ Como implementar testes

### Tecnologia: Jest

Usamos **Jest** como framework de testes (é padrão em Node/JavaScript).

### Estrutura de pastas

```
src/
├── models/
│   ├── Usuario.js
│   └── __tests__/
│       └── usuario.test.js     ← testes da modelo
├── controllers/
│   ├── usuarioController.js
│   └── __tests__/
│       └── usuarioController.test.js  ← testes da rota
└── services/
    ├── geminiService.js
    └── __tests__/
        └── geminiService.test.js      ← testes do service
```

### Exemplo de teste (Jest)

```javascript
// src/models/__tests__/usuario.test.js
const { Usuario } = require("../Usuario");

describe("Model Usuario", () => {
  test("deve criar usuário com dados válidos", async () => {
    const usuario = await Usuario.create({
      nome: "João Silva",
      email: "joao@teste.com",
      senha: "senha123",
    });
    expect(usuario.id).toBeDefined();
    expect(usuario.email).toBe("joao@teste.com");
  });

  test("não deve permitir e-mail duplicado", async () => {
    await Usuario.create({
      nome: "João",
      email: "joao@teste.com",
      senha: "123456",
    });

    await expect(
      Usuario.create({
        nome: "Outro",
        email: "joao@teste.com",
        senha: "123456",
      }),
    ).rejects.toThrow();
  });

  test("deve rejeitar nome com menos de 2 caracteres", async () => {
    await expect(
      Usuario.create({
        nome: "J",
        email: "teste@teste.com",
        senha: "123456",
      }),
    ).rejects.toThrow();
  });
});
```

### Rodar os testes

```bash
# Rodar todos os testes
npm test

# Rodar testes de um arquivo específico
npm test usuario.test.js

# Rodar com cobertura (mostra % de código testado)
npm test -- --coverage
```

---

## ✅ Critério de Aceite pra cada issue

Toda issue de implementação deve ter:

```
**Testes unitários (obrigatório):**
- [ ] Arquivo de teste criado em src/[pasta]/__tests__/[nome].test.js
- [ ] Cobre os casos definidos em regras-de-negocio.md
- [ ] `npm test` passa sem erros
- [ ] Commitado junto com o código (mesma branch/PR)
```

Isso significa: **não é uma feature "pronta" se não tiver teste**.

---

## 🔍 O que testar

**Teste sempre:**

- Casos de sucesso (dados válidos → funciona)
- Casos de erro (dados inválidos → erro correto)
- Casos de borda (limite de caractere, valor zero, null, etc.)
- Regras de negócio específicas (email único, categoria "Outros" existe, etc.)

**Referência:** veja `regras-de-negocio.md` pra saber exatamente o que cada campo deve aceitar/rejeitar.

---

## 📝 Checklist pra cada pessoa

Antes de abrir um Pull Request:

- [ ] Código implementado
- [ ] Testes unitários escrito e passando (`npm test`)
- [ ] Seguiu as regras de negócio conforme `regras-de-negocio.md`
- [ ] Commit com mensagem clara (ex: `feat: CRUD Usuario com testes`)
- [ ] PR aberto pra `develop` (nunca direto pra `main`)

---

## ❓ Dúvidas?

Se alguém ficar em dúvida sobre o que testar, manda mensagem no grupo — melhor esclarecer cedo do que descobrir no final que faltou teste.

**Lembrem:** testes são investimento em qualidade. 15 minutos testando agora = 2 horas economizadas debugando depois.
