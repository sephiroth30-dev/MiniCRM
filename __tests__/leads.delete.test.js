const request = require('supertest');
const app = require('../server');
const { clearLeads } = require('./helpers/db');

const KEY = 'test-api-key';
const auth = (req) => req.set('x-api-key', KEY);

async function createLead() {
  const res = await auth(request(app).post('/api/leads'))
    .send({ nombre: 'Para Borrar', email: `borrar${Date.now()}@test.com` });
  return res.body;
}

beforeEach(clearLeads);

describe('DELETE /api/leads/:id — validaciones de fallo', () => {
  it('ID inexistente → 404', async () => {
    const res = await auth(request(app).delete('/api/leads/99999'));
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/no encontrado/i);
  });

  it('eliminación exitosa → 204 sin body', async () => {
    const lead = await createLead();
    const res = await auth(request(app).delete(`/api/leads/${lead.id}`));
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  it('segundo DELETE al mismo ID → 404', async () => {
    const lead = await createLead();
    await auth(request(app).delete(`/api/leads/${lead.id}`));
    const res = await auth(request(app).delete(`/api/leads/${lead.id}`));
    expect(res.status).toBe(404);
  });

  it('lead eliminado ya no aparece en GET /api/leads', async () => {
    const lead = await createLead();
    await auth(request(app).delete(`/api/leads/${lead.id}`));
    const listRes = await auth(request(app).get('/api/leads'));
    const ids = listRes.body.map((l) => l.id);
    expect(ids).not.toContain(lead.id);
  });
});
