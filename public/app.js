const API = '/api/leads';

let currentFilter = localStorage.getItem('crm_filter') ?? '';
let editingId = null;
let viewMode = localStorage.getItem('crm_view') ?? 'table';
let draggedLeadId = null;
let draggedLeadEstado = null;

const KANBAN_COLS = [
  { estado: 'nuevo',      label: 'Nuevos',      color: '#3b82f6' },
  { estado: 'contactado', label: 'Contactados',  color: '#f59e0b' },
  { estado: 'calificado', label: 'Calificados',  color: '#22c55e' },
  { estado: 'convertido', label: 'Convertidos',  color: '#d946ef' },
  { estado: 'perdido',    label: 'Perdidos',     color: '#f43f5e' },
];

const STATUS_META = KANBAN_COLS.map(({ estado, label, color }) => ({ estado, label, color }));

// ── DOM refs ──────────────────────────────────────────────────────────────────
const overlay     = document.getElementById('modal-overlay');
const modalTitle  = document.getElementById('modal-title');
const form        = document.getElementById('lead-form');
const leadIdInput = document.getElementById('lead-id');
const inputNombre = document.getElementById('input-nombre');
const inputEmail  = document.getElementById('input-email');
const inputFuente = document.getElementById('input-fuente');
const inputEstado = document.getElementById('input-estado');
const errNombre   = document.getElementById('err-nombre');
const errEmail    = document.getElementById('err-email');
const tbody       = document.getElementById('leads-body');
const emptyRow    = document.getElementById('empty-row');
const statsEl     = document.getElementById('stats');
const btnSubmit   = document.getElementById('btn-submit');

// ── Avatar colors ─────────────────────────────────────────────────────────────
const AVATAR_GRADIENTS = [
  ['#a21caf', '#ec4899'],
  ['#86198f', '#f472b6'],
  ['#be185d', '#d946ef'],
  ['#7e22ce', '#db2777'],
  ['#c026d3', '#f43f5e'],
  ['#9333ea', '#ec4899'],
];

function getAvatarGradient(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function getInitials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (currentFilter) {
    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.estado === currentFilter);
    });
  }

  updateViewMode();
  fetchLeads();

  document.getElementById('btn-new-lead').addEventListener('click', openNewModal);
  document.getElementById('btn-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  form.addEventListener('submit', handleSubmit);

  document.getElementById('filters').addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.estado;
    localStorage.setItem('crm_filter', currentFilter);
    fetchLeads();
  });

  document.getElementById('view-toggle').addEventListener('click', e => {
    const btn = e.target.closest('.view-btn');
    if (!btn) return;
    viewMode = btn.dataset.view;
    localStorage.setItem('crm_view', viewMode);
    updateViewMode();
    fetchLeads();
  });

  document.getElementById('kanban-view').addEventListener('dragstart', handleKanbanDragStart);
  document.getElementById('kanban-view').addEventListener('dragover', handleKanbanDragOver);
  document.getElementById('kanban-view').addEventListener('dragleave', handleKanbanDragLeave);
  document.getElementById('kanban-view').addEventListener('drop', handleKanbanDrop);
  document.getElementById('kanban-view').addEventListener('dragend', clearKanbanDragState);
});

function updateViewMode() {
  document.querySelectorAll('.view-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.view === viewMode)
  );
  document.getElementById('table-view').style.display  = viewMode === 'table'  ? '' : 'none';
  document.getElementById('kanban-view').style.display = viewMode === 'kanban' ? '' : 'none';
  document.getElementById('filters').style.display     = viewMode === 'table'  ? '' : 'none';
}

// ── API calls ─────────────────────────────────────────────────────────────────
async function fetchLeads() {
  const url = (viewMode === 'kanban' || !currentFilter) ? API : `${API}?estado=${currentFilter}`;
  const leads = await apiFetch(url);
  if (leads) {
    if (viewMode === 'table') renderTable(leads);
    else renderKanban(leads);
    document.getElementById('card-count').textContent = leads.length;
  }
  fetchStats();
}

async function fetchStats() {
  const all = await apiFetch(API);
  if (!all) return;

  const c = { total: all.length, nuevo: 0, contactado: 0, calificado: 0, convertido: 0, perdido: 0 };
  all.forEach(l => { if (c[l.estado] !== undefined) c[l.estado]++; });

  const navBadge = document.getElementById('nav-badge');
  if (navBadge) navBadge.textContent = c.total;

  statsEl.innerHTML = `
    ${dashboardCharts(c)}
    ${statCard('Total Leads',  c.total,      '#a21caf')}
    ${statCard('Nuevos',       c.nuevo,      '#ec4899')}
    ${statCard('Contactados',  c.contactado, '#d946ef')}
    ${statCard('Calificados',  c.calificado, '#be185d')}
    ${statCard('Convertidos',  c.convertido, '#7e22ce')}
    ${statCard('Perdidos',     c.perdido,    '#f43f5e')}
  `;
}

async function handleSubmit(e) {
  e.preventDefault();
  clearErrors();

  const nombre = inputNombre.value.trim();
  const email  = inputEmail.value.trim();
  let valid = true;

  if (!nombre) { showError(errNombre, inputNombre, 'El nombre es obligatorio'); valid = false; }
  if (!email)  { showError(errEmail, inputEmail, 'El email es obligatorio'); valid = false; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError(errEmail, inputEmail, 'Introduce un email válido'); valid = false;
  }
  if (!valid) return;

  const payload = { nombre, email, fuente: inputFuente.value, estado: inputEstado.value };

  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Guardando…';

  let result;
  if (editingId) {
    result = await apiFetch(`${API}/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
    if (result) toast('Lead actualizado correctamente', 'success');
  } else {
    result = await apiFetch(API, { method: 'POST', body: JSON.stringify(payload) });
    if (result) toast('Lead creado correctamente', 'success');
  }

  btnSubmit.disabled = false;
  btnSubmit.textContent = editingId ? 'Actualizar Lead' : 'Guardar Lead';

  if (result) { closeModal(); fetchLeads(); }
}

async function deleteLead(id, nombre) {
  if (!confirm(`¿Eliminar el lead "${nombre}"? Esta acción no se puede deshacer.`)) return;
  const ok = await apiFetch(`${API}/${id}`, { method: 'DELETE' });
  if (ok !== null) { toast('Lead eliminado', 'success'); fetchLeads(); }
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderTable(leads) {
  [...tbody.querySelectorAll('tr:not(#empty-row)')].forEach(r => r.remove());

  if (leads.length === 0) {
    emptyRow.style.display = '';
    return;
  }

  emptyRow.style.display = 'none';

  leads.forEach(lead => {
    const [a, b] = getAvatarGradient(lead.nombre);
    const initials = getInitials(lead.nombre);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="lead-cell">
          <div class="avatar" style="--avatar-a:${a};--avatar-b:${b}">${initials}</div>
          <div>
            <div class="lead-name">${esc(lead.nombre)}</div>
            <div class="lead-email">${esc(lead.email)}</div>
          </div>
        </div>
      </td>
      <td><span class="source-chip">${esc(lead.fuente)}</span></td>
      <td><span class="badge badge-${lead.estado}">${lead.estado}</span></td>
      <td><span class="date-text">${formatDate(lead.creadoEn)}</span></td>
      <td>
        <div class="row-actions">
          <button class="action-btn edit" onclick="openEditModal(${lead.id})">Editar</button>
          <button class="action-btn del" onclick="deleteLead(${lead.id}, '${esc(lead.nombre).replace(/'/g, "\\'")}')">Eliminar</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function statCard(label, value, color) {
  return `
    <div class="stat-card" style="--stat-color:${color}">
      <div class="stat-value">${value}</div>
      <div class="stat-label">
        <span class="stat-dot"></span>
        ${label}
      </div>
    </div>
  `;
}

function dashboardCharts(counts) {
  const active = counts.total - counts.perdido;
  const activePercent = counts.total ? Math.round((active / counts.total) * 100) : 0;
  const totalRing = counts.total ? 'conic-gradient(#a21caf 0 360deg)' : 'conic-gradient(#e2e8f0 0 360deg)';
  const statusRing = statusSegments(counts);
  const legend = STATUS_META.map(({ estado, label, color }) => `
    <div class="chart-legend-item">
      <span class="chart-legend-dot" style="background:${color}"></span>
      <span>${label}</span>
      <strong>${counts[estado]}</strong>
    </div>
  `).join('');

  return `
    <div class="dashboard-charts">
      <div class="chart-card chart-card-total">
        <div class="chart-copy">
          <span class="chart-kicker">Vista rápida</span>
          <h2 class="chart-title">Leads en pipeline</h2>
          <p class="chart-note">${active} activos · ${counts.perdido} perdidos</p>
        </div>
        <div class="donut" style="--donut:${totalRing}">
          <div class="donut-center">
            <strong>${counts.total}</strong>
            <span>Total</span>
          </div>
        </div>
        <div class="chart-metric">
          <strong>${activePercent}%</strong>
          <span>activos</span>
        </div>
      </div>
      <div class="chart-card chart-card-status">
        <div class="donut donut-status" style="--donut:${statusRing}">
          <div class="donut-center">
            <strong>${counts.total}</strong>
            <span>Estados</span>
          </div>
        </div>
        <div class="chart-copy chart-copy-status">
          <span class="chart-kicker">Estado de leads</span>
          <h2 class="chart-title">Distribución actual</h2>
          <div class="chart-legend">${legend}</div>
        </div>
      </div>
    </div>
  `;
}

function statusSegments(counts) {
  if (!counts.total) return 'conic-gradient(#e2e8f0 0 360deg)';

  let cursor = 0;
  const segments = STATUS_META
    .filter(({ estado }) => counts[estado] > 0)
    .map(({ estado, color }) => {
      const start = cursor;
      const end = cursor + (counts[estado] / counts.total) * 360;
      cursor = end;
      return `${color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`;
    });

  return `conic-gradient(${segments.join(', ')})`;
}

function renderKanban(leads) {
  const kanbanEl = document.getElementById('kanban-view');
  kanbanEl.innerHTML = KANBAN_COLS.map(({ estado, label, color }) => {
    const colLeads = leads.filter(l => l.estado === estado);
    const cards = colLeads.length === 0
      ? `<div class="kanban-empty">Sin leads en esta etapa</div>`
      : colLeads.map(lead => {
          const [ga, gb] = getAvatarGradient(lead.nombre);
          const initials  = getInitials(lead.nombre);
          const safeName  = esc(lead.nombre).replace(/'/g, '&#39;');
          return `
            <div class="kanban-card" draggable="true" data-lead-id="${lead.id}" data-estado="${lead.estado}">
              <div class="kanban-card-top">
                <div class="avatar avatar-sm" style="--avatar-a:${ga};--avatar-b:${gb}">${initials}</div>
                <div class="kanban-card-info">
                  <div class="kanban-name">${esc(lead.nombre)}</div>
                  <div class="kanban-email">${esc(lead.email)}</div>
                </div>
              </div>
              <span class="source-chip">${esc(lead.fuente)}</span>
              <div class="kanban-footer">
                <span class="kanban-date">${formatDate(lead.creadoEn)}</span>
                <div class="kanban-actions">
                  <button class="action-btn edit" onclick="openEditModal(${lead.id})">Editar</button>
                  <button class="action-btn del" onclick="deleteLead(${lead.id}, '${safeName}')">Eliminar</button>
                </div>
              </div>
            </div>
          `;
        }).join('');

    return `
      <div class="kanban-col kanban-col-${estado}" data-estado="${estado}">
        <div class="kanban-col-header">
          <div class="kanban-col-title">
            <span class="kanban-col-dot" style="background:${color}"></span>
            ${label}
          </div>
          <span class="kanban-col-count">${colLeads.length}</span>
        </div>
        ${cards}
      </div>
    `;
  }).join('');
}

function handleKanbanDragStart(e) {
  const card = e.target.closest('.kanban-card');
  if (!card) return;

  draggedLeadId = card.dataset.leadId;
  draggedLeadEstado = card.dataset.estado;
  card.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedLeadId);
}

function handleKanbanDragOver(e) {
  const col = e.target.closest('.kanban-col');
  if (!col || !draggedLeadId) return;

  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  document.querySelectorAll('.kanban-col.drop-target').forEach(el => {
    if (el !== col) el.classList.remove('drop-target');
  });
  col.classList.add('drop-target');
}

function handleKanbanDragLeave(e) {
  const col = e.target.closest('.kanban-col');
  if (!col || col.contains(e.relatedTarget)) return;
  col.classList.remove('drop-target');
}

async function handleKanbanDrop(e) {
  const col = e.target.closest('.kanban-col');
  if (!col || !draggedLeadId) return;

  e.preventDefault();
  const nextEstado = col.dataset.estado;
  const leadId = draggedLeadId;
  const previousEstado = draggedLeadEstado;
  clearKanbanDragState();

  if (!nextEstado || nextEstado === previousEstado) return;

  const result = await apiFetch(`${API}/${leadId}`, {
    method: 'PATCH',
    body: JSON.stringify({ estado: nextEstado }),
  });

  if (result) {
    toast(`Lead movido a ${statusLabel(nextEstado)}`, 'success');
    fetchLeads();
  }
}

function clearKanbanDragState() {
  document.querySelectorAll('.kanban-card.dragging').forEach(el => el.classList.remove('dragging'));
  document.querySelectorAll('.kanban-col.drop-target').forEach(el => el.classList.remove('drop-target'));
  draggedLeadId = null;
  draggedLeadEstado = null;
}

function statusLabel(estado) {
  return KANBAN_COLS.find(col => col.estado === estado)?.label ?? estado;
}

// ── Modal helpers ─────────────────────────────────────────────────────────────
function openNewModal() {
  editingId = null;
  modalTitle.textContent = 'Nuevo Lead';
  btnSubmit.textContent  = 'Guardar Lead';
  form.reset();
  clearErrors();
  openModal();
}

async function openEditModal(id) {
  const leads = await apiFetch(API);
  if (!leads) return;
  const lead = leads.find(l => l.id === id);
  if (!lead) return;

  editingId = id;
  modalTitle.textContent = 'Editar Lead';
  btnSubmit.textContent  = 'Actualizar Lead';
  leadIdInput.value  = lead.id;
  inputNombre.value  = lead.nombre;
  inputEmail.value   = lead.email;
  inputFuente.value  = lead.fuente;
  inputEstado.value  = lead.estado;
  clearErrors();
  openModal();
}

function openModal()  { overlay.classList.add('open'); setTimeout(() => inputNombre.focus(), 50); }
function closeModal() { overlay.classList.remove('open'); }

// ── Helpers ───────────────────────────────────────────────────────────────────
const API_KEY = 'minicrm_86c4b5fd9a9221e04a7dedaf3996dbf5563b29010d106df2';

async function apiFetch(url, options = {}) {
  const config = {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, ...options.headers },
  };
  try {
    const res  = await fetch(url, config);
    if (res.status === 204) return true;
    const data = await res.json();
    if (!res.ok) { toast(data.error || 'Error desconocido', 'error'); return null; }
    return data;
  } catch {
    toast('No se pudo conectar con el servidor', 'error');
    return null;
  }
}

function showError(el, input, msg) {
  el.textContent = msg;
  input.classList.add('error');
}

function clearErrors() {
  errNombre.textContent = '';
  errEmail.textContent  = '';
  inputNombre.classList.remove('error');
  inputEmail.classList.remove('error');
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

let toastTimer;
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}
