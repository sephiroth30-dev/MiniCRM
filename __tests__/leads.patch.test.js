const request = require('supertest');
const app = require('../server');
const { clearLeads } = require('./helpers/db');

const KEY = 'test-api-key';
const auth = (req) => req.set('x-api-key', KEY);

async function createLead(data = {}) {
  const payload = { nombre: 'Lead Base', email: 'base@test.com', estado: 'nuevo', ...data };
  const res = await auth(request(app).post('/api/leads')).send(payload);
  return res.body;
}

beforeEach(clearLeads);

describe('PATCH /api/leads/:id — validaciones de fallo', () => {
  it('ID inexistente → 404', async () => {
    const res = await auth(request(app).patch('/api/leads/99999'))
      .send({ nombre: 'Nuevo' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/no encontrado/i);
  });

  it('nombre vacío → 400', async () => {
    const lead = await createLead();
    const res = await auth(request(app).patch(`/api/leads/${lead.id}`))
      .send({ nombre: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/nombre/i);
  });

  it('email vacío → 400', async () => {
    const lead = await createLead();
    const res = await auth(request(app).patch(`/api/leads/${lead.id}`))
      .send({ email: '   ' });
    expect(res.status).toBe(400);
  });

  it('email inválido → 400', async () => {
    const lead = await createLead();
    const res = await auth(request(app).patch(`/api/leads/${lead.id}`))
      .send({ email: 'noesvalido' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/formato/i);
  });

  it('estado inválido → 400 con lista de estados válidos', async () => {
    const lead = await createLead();
    const res = await auth(request(app).patch(`/api/leads/${lead.id}`))
      .send({ estado: 'fantasma' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/estado/i);
  });

  it('actualización parcial solo nombre → 200 sin cambiar email ni estado', async () => {
    const lead = await createLead({ email: 'original@test.com', estado: 'contactado' });
    const res = await auth(request(app).patch(`/api/leads/${lead.id}`))
      .send({ nombre: 'Nombre Nuevo' });
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('Nombre Nuevo');
    expect(res.body.email).toBe('original@test.com');
    expect(res.body.estado).toBe('contactado');
  });

  it('actualización parcial solo estado → 200 sin cambiar nombre ni email', async () => {
    const lead = await createLead({ nombre: 'Sin Cambio', email: 'sc@test.com' });
    const res = await auth(request(app).patch(`/api/leads/${lead.id}`))
      .send({ estado: 'convertido' });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('convertido');
    expect(res.body.nombre).toBe('Sin Cambio');
    expect(res.body.email).toBe('sc@test.com');
  });

  it('actualización completa → 200 con todos los campos actualizados', async () => {
    const lead = await createLead();
    const res = await auth(request(app).patch(`/api/leads/${lead.id}`))
      .send({ nombre: 'Actualizado', email: 'nuevo@test.com', estado: 'calificado', fuente: 'Email' });
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('Actualizado');
    expect(res.body.email).toBe('nuevo@test.com');
    expect(res.body.estado).toBe('calificado');
    expect(res.body.fuente).toBe('Email');
  });
});
