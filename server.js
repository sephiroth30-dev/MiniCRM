require("dotenv").config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const db = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS para cliente externo en local (ej. frontend corriendo en otro puerto)
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const requireApiKey = (req, res, next) => {
  if (!process.env.API_KEY) return res.status(500).json({ error: 'API_KEY not configured' });
  if (req.headers['x-api-key'] !== process.env.API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

app.use('/api', requireApiKey);

const VALID_STATES = ['nuevo', 'contactado', 'calificado', 'perdido', 'convertido'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// DB row → shape que espera el frontend (campos en español)
function rowToLead(row) {
  return {
    id:       row.id,
    nombre:   row.name,
    email:    row.email,
    fuente:   row.source,
    estado:   row.status,
    creadoEn: row.created_at,
  };
}

// GET /api/leads?estado=nuevo
app.get('/api/leads', (req, res) => {
  try {
    const { estado, status } = req.query;
    const filter = estado || status;

    const rows = filter
      ? db.prepare('SELECT * FROM leads WHERE status = ? ORDER BY id DESC').all(filter)
      : db.prepare('SELECT * FROM leads ORDER BY id DESC').all();

    res.json(rows.map(rowToLead));
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener leads', detail: err.message });
  }
});

// POST /api/leads
app.post('/api/leads', (req, res) => {
  try {
    // Acepta campos en español (frontend interno) o inglés (cliente externo)
    const nombre = req.body.nombre ?? req.body.name;
    const email  = req.body.email;
    const fuente = req.body.fuente ?? req.body.source;
    const estado = req.body.estado ?? req.body.status;

    if (!nombre?.trim())        return res.status(400).json({ error: 'El nombre es obligatorio' });
    if (!email?.trim())         return res.status(400).json({ error: 'El email es obligatorio' });
    if (!EMAIL_RE.test(email.trim())) return res.status(400).json({ error: 'El email no tiene un formato válido' });

    const result = db.prepare(`
      INSERT INTO leads (name, email, source, status, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      nombre.trim(),
      email.trim().toLowerCase(),
      fuente?.trim() || 'Directo',
      VALID_STATES.includes(estado) ? estado : 'nuevo',
      new Date().toISOString()
    );

    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(rowToLead(lead));
  } catch (err) {
    res.status(500).json({ error: 'Error al crear lead', detail: err.message });
  }
});

// PATCH /api/leads/:id
app.patch('/api/leads/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);

    if (!existing) return res.status(404).json({ error: 'Lead no encontrado' });

    // Acepta campos en español (frontend interno) o inglés (cliente externo)
    const nombre = req.body.nombre ?? req.body.name;
    const { email } = req.body;
    const fuente = req.body.fuente ?? req.body.source;
    const estado = req.body.estado ?? req.body.status;

    if (nombre !== undefined && !nombre.trim())
      return res.status(400).json({ error: 'El nombre no puede estar vacío' });
    if (email !== undefined) {
      if (!email.trim()) return res.status(400).json({ error: 'El email no puede estar vacío' });
      if (!EMAIL_RE.test(email.trim())) return res.status(400).json({ error: 'El email no tiene un formato válido' });
    }
    if (estado !== undefined && !VALID_STATES.includes(estado))
      return res.status(400).json({ error: `Estado inválido. Opciones: ${VALID_STATES.join(', ')}` });

    db.prepare(`
      UPDATE leads SET name = ?, email = ?, source = ?, status = ? WHERE id = ?
    `).run(
      nombre !== undefined ? nombre.trim()              : existing.name,
      email  !== undefined ? email.trim().toLowerCase() : existing.email,
      fuente !== undefined ? fuente.trim()              : existing.source,
      estado !== undefined ? estado                     : existing.status,
      id
    );

    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
    res.json(rowToLead(lead));
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar lead', detail: err.message });
  }
});

// DELETE /api/leads/:id
app.delete('/api/leads/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);

    if (!existing) return res.status(404).json({ error: 'Lead no encontrado' });

    db.prepare('DELETE FROM leads WHERE id = ?').run(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar lead', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`MiniCRM Leads corriendo en http://localhost:${PORT}`);
});
