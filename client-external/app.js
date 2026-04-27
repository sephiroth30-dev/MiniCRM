const API = 'http://localhost:3000/api/leads';
const API_KEY = 'minicrm_86c4b5fd9a9221e04a7dedaf3996dbf5563b29010d106df2';

const btnLoad   = document.getElementById('btn-load');
const btnCreate = document.getElementById('btn-create');
const tbody     = document.getElementById('leads-body');
const alertEl   = document.getElementById('alert');

btnLoad.addEventListener('click', loadLeads);
btnCreate.addEventListener('click', createTestLead);

// ── Cargar leads ──────────────────────────────────────────────────────────────
async function loadLeads() {
  btnLoad.disabled = true;
  btnLoad.textContent = 'Cargando…';

  try {
    const res = await fetch(API, { headers: { 'x-api-key': API_KEY } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const leads = await res.json();
    renderTable(leads);
    showAlert(`${leads.length} lead(s) cargado(s)`, 'success');
  } catch (err) {
    showAlert('Error al cargar leads: ' + err.message, 'error');
  } finally {
    btnLoad.disabled = false;
    btnLoad.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="1 4 1 1 4 1"/><polyline points="13 10 13 13 10 13"/>
        <path d="M1 1 C3 3 11 3 13 7"/><path d="M13 13 C11 11 3 11 1 7"/>
      </svg>
      Cargar leads`;
  }
}

// ── Crear lead de prueba ──────────────────────────────────────────────────────
async function createTestLead() {
  btnCreate.disabled = true;
  btnCreate.textContent = 'Creando…';

  const payload = {
    name:   'Lead desde Cliente',
    email:  `leadcliente+${Date.now()}@example.com`,
    source: 'external-client',
    status: 'nuevo',
  };

  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

    showAlert(`Lead creado → ID ${data.id} · ${data.email}`, 'success');
    await loadLeads();
  } catch (err) {
    showAlert('Error al crear lead: ' + err.message, 'error');
  } finally {
    btnCreate.disabled = false;
    btnCreate.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <line x1="6.5" y1="1" x2="6.5" y2="12"/><line x1="1" y1="6.5" x2="12" y2="6.5"/>
      </svg>
      Crear lead de prueba`;
  }
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderTable(leads) {
  if (leads.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">No hay leads en el servidor</td></tr>';
    return;
  }

  tbody.innerHTML = leads.map(l => `
    <tr>
      <td class="id-cell">#${l.id}</td>
      <td><strong>${esc(l.nombre)}</strong></td>
      <td style="color:#64748b">${esc(l.email)}</td>
      <td style="color:#64748b">${esc(l.fuente)}</td>
      <td><span class="badge badge-${l.estado}">${l.estado}</span></td>
      <td style="color:#94a3b8;font-size:12px">${formatDate(l.creadoEn)}</td>
    </tr>
  `).join('');
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function showAlert(msg, type) {
  alertEl.textContent = msg;
  alertEl.className = `alert ${type}`;
  clearTimeout(showAlert._t);
  showAlert._t = setTimeout(() => alertEl.className = 'alert hidden', 4000);
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}
