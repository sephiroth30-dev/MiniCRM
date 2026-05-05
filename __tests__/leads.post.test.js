const request = require('supertest');
const app = require('../server');
const { clearLeads } = require('./helpers/db');

const KEY = 'test-api-key';
const auth = (req) => req.set('x-api-key', KEY);

const validPayload = { nombre: 'Ana García', email: 'ana@example.com', estado: 'nuevo' };

beforeEach(clearLeads);

describe('POST /api/leads — validaciones de fallo', () => {
  it('rechaza sin nombre → 400', async () => {
    const res = await auth(request(app).post('/api/leads'))
      .send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/nombre/i);
  });

  it('rechaza con nombre vacío → 400', async () => {
    const res = await auth(request(app).post('/api/leads'))
      .send({ nombre: '   ', email: 'x@x.com' });
    expect(res.status).toBe(400);
  });

  it('rechaza sin email → 400', async () => {
    const res = await auth(request(app).post('/api/leads'))
      .send({ nombre: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('rechaza con email vacío → 400', async () => {
    const res = await auth(request(app).post('/api/leads'))
      .send({ nombre: 'Test', email: '   ' });
    expect(res.status).toBe(400);
  });

  it('rechaza email sin @ → 400', async () => {
    const res = await auth(request(app).post('/api/leads'))
      .send({ nombre: 'Test', email: 'noesvalido' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/formato/i);
  });

  it('rechaza email con espacios internos → 400', async () => {
    const res = await auth(request(app).post('/api/leads'))
      .send({ nombre: 'Test', email: 'a @b.com' });
    expect(res.status).toBe(400);
  });

  it('estado inválido hace fallback a "nuevo" → 201', async () => {
    const res = await auth(request(app).post('/api/leads'))
      .send({ nombre: 'Test', email: 'test@x.com', estado: 'invalido' });
    expect(res.status).toBe(201);
    expect(res.body.estado).toBe('nuevo');
  });

  it('acepta campos en español → 201', async () => {
    const res = await auth(request(app).post('/api/leads'))
      .send({ nombre: 'Carlos', email: 'carlos@test.com', fuente: 'Web', estado: 'contactado' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ nombre: 'Carlos', email: 'carlos@test.com', fuente: 'Web', estado: 'contactado' });
  });

  it('acepta campos en inglés (cliente externo) → 201', async () => {
    const res = await auth(request(app).post('/api/leads'))
      .send({ name: 'Bob', email: 'bob@test.com', source: 'API', status: 'calificado' });
    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe('Bob');
    expect(res.body.estado).toBe('calificado');
  });

  it('creación exitosa incluye todos los campos esperados', async () => {
    const res = await auth(request(app).post('/api/leads'))
      .send(validPayload);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('nombre');
    expect(res.body).toHaveProperty('email');
    expect(res.body).toHaveProperty('fuente');
    expect(res.body).toHaveProperty('estado');
    expect(res.body).toHaveProperty('creadoEn');
  });

  it('el email se guarda en minúsculas', async () => {
    const res = await auth(request(app).post('/api/leads'))
      .send({ nombre: 'Test', email: 'UPPER@EXAMPLE.COM' });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('upper@example.com');
  });

  it('fuente tiene valor por defecto "Directo" si no se envía', async () => {
    const res = await auth(request(app).post('/api/leads'))
      .send({ nombre: 'Sin fuente', email: 'sf@test.com' });
    expect(res.status).toBe(201);
    expect(res.body.fuente).toBe('Directo');
  });
});
