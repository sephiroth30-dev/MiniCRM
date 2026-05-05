const request = require('supertest');
const app = require('../server');

const VALID_KEY = 'test-api-key';

describe('Autenticación — middleware requireApiKey', () => {
  it('rechaza sin header x-api-key → 401', async () => {
    const res = await request(app).get('/api/leads');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('rechaza con API Key incorrecta → 401', async () => {
    const res = await request(app)
      .get('/api/leads')
      .set('x-api-key', 'clave-incorrecta');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('rechaza con header vacío → 401', async () => {
    const res = await request(app)
      .get('/api/leads')
      .set('x-api-key', '');
    expect(res.status).toBe(401);
  });

  it('permite acceso con API Key válida → 200', async () => {
    const res = await request(app)
      .get('/api/leads')
      .set('x-api-key', VALID_KEY);
    expect(res.status).toBe(200);
  });

  it('retorna 500 cuando API_KEY no está configurada', async () => {
    const original = process.env.API_KEY;
    delete process.env.API_KEY;

    const res = await request(app).get('/api/leads');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('API_KEY not configured');

    process.env.API_KEY = original;
  });

  it('GET /api/version no requiere autenticación → 200', async () => {
    const res = await request(app).get('/api/version');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name');
    expect(res.body).toHaveProperty('version');
  });
});
