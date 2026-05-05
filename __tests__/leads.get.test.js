const request = require('supertest');
const app = require('../server');
const { clearLeads } = require('./helpers/db');

const KEY = 'test-api-key';
const auth = (req) => req.set('x-api-key', KEY);

async function createLead(data = {}) {
  const base = { nombre: 'Lead', email: `lead${Date.now()}@test.com`, estado: 'nuevo' };
  const res = await auth(request(app).post('/api/leads')).send({ ...base, ...data });
  return res.body;
}

beforeEach(clearLeads);

describe('GET /api/leads — listado y filtros', () => {
  it('BD vacía devuelve array vacío → 200 []', async () => {
    const res = await auth(request(app).get('/api/leads'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('devuelve todos los leads sin filtro → 200', async () => {
    await createLead({ email: 'a@test.com', estado: 'nuevo' });
    await createLead({ email: 'b@test.com', estado: 'contactado' });
    const res = await auth(request(app).get('/api/leads'));
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it('filtra correctamente por ?estado=nuevo', async () => {
    await createLead({ email: 'nuevo@test.com', estado: 'nuevo' });
    await createLead({ email: 'otro@test.com', estado: 'convertido' });
    const res = await auth(request(app).get('/api/leads?estado=nuevo'));
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].estado).toBe('nuevo');
  });

  it('estado inexistente como filtro devuelve array vacío → 200 []', async () => {
    await createLead({ email: 'x@test.com', estado: 'nuevo' });
    const res = await auth(request(app).get('/api/leads?estado=fantasma'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('los campos del lead están en español', async () => {
    await createLead({ nombre: 'María', email: 'maria@test.com', fuente: 'Web', estado: 'calificado' });
    const res = await auth(request(app).get('/api/leads'));
    expect(res.status).toBe(200);
    const lead = res.body[0];
    expect(lead).toHaveProperty('nombre');
    expect(lead).toHaveProperty('email');
    expect(lead).toHaveProperty('fuente');
    expect(lead).toHaveProperty('estado');
    expect(lead).toHaveProperty('creadoEn');
    expect(lead).not.toHaveProperty('name');
    expect(lead).not.toHaveProperty('status');
  });

  it('acepta también el parámetro ?status= (cliente externo)', async () => {
    await createLead({ email: 'ext@test.com', estado: 'perdido' });
    await createLead({ email: 'ext2@test.com', estado: 'nuevo' });
    const res = await auth(request(app).get('/api/leads?status=perdido'));
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].estado).toBe('perdido');
  });
});
