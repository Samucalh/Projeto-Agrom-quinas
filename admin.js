/* =============================================
   AGROMÁQUINAS – ADMIN.JS
   Lógica do painel administrativo

   DEPENDE DE: utils.js e calendar.js (carregados antes)
   ============================================= */

// ══════════════════════════════════════════════
//  CONFIGURAÇÃO DO GOOGLE MAPS
// ══════════════════════════════════════════════
//
//  COMO OBTER SUA CHAVE:
//  1. Acesse: https://console.cloud.google.com/
//  2. Crie ou selecione um projeto
//  3. Menu → "APIs e Serviços" → "Biblioteca"
//  4. Pesquise "Maps Embed API" → clique em "Ativar"
//  5. Menu → "Credenciais" → "Criar credenciais" → "Chave de API"
//  6. Copie a chave gerada e cole no lugar de 'SUA_CHAVE_GOOGLE_MAPS_AQUI'
//
//  RECOMENDADO EM PRODUÇÃO:
//  Nas configurações da chave, restrinja ao seu domínio em
//  "Restrições de aplicativo" → "Referenciadores HTTP".
//
//  SEM A CHAVE: o sistema exibe um botão "Ver no Google Maps"
//  que abre o endereço em nova aba (funciona sem chave).
//
const MAPS_KEY = 'SUA_CHAVE_GOOGLE_MAPS_AQUI'; // ← SUBSTITUA pela sua chave


// ── Estado global ─────────────────────────────
let allAgendamentos = [];
let currentFilter   = 'todos';
let selectedDate    = new Date().toISOString().slice(0,10);
let currentAgendId  = null;
let miniCal;

// ── Inicialização ─────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initSidebarToggle();
  await loadAgendamentos();
  initMiniCal();
});

function initSidebarToggle() {
  const btn     = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('adminSidebar');
  btn?.addEventListener('click', () => sidebar.classList.toggle('open'));
  document.addEventListener('click', e => {
    if (window.innerWidth <= 900 &&
        sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        !btn.contains(e.target)) sidebar.classList.remove('open');
  });
}

// ── Carregamento dos dados ────────────────────
//
// CONEXÃO COM O BACKEND:
// GET /api/agendamentos — retorna todos os agendamentos.
// Endereço base configurado em utils.js (variável API_BASE).
// Se o backend não estiver rodando, exibe mensagem de erro.
//
async function loadAgendamentos() {
  try {
    const data = await api.get('/agendamentos');
    allAgendamentos = data.agendamentos || [];
    updateStats();
    renderList();
    updateMiniCalDots();
  } catch (err) {
    document.getElementById('agendamentosList').innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">⚠️</span>
        <h3>Erro ao carregar agendamentos</h3>
        <p>${err.message}</p>
        <p style="margin-top:8px;font-size:.82rem;color:var(--text-muted);">
          Verifique se o backend (app.py) está em execução e se o
          endereço da API em utils.js está correto.
        </p>
      </div>`;
  }
}

function updateStats() {
  const now   = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const mes   = allAgendamentos.filter(a => a.data_agendamento?.startsWith(month));
  document.getElementById('statTotal').textContent     = mes.length;
  document.getElementById('statPendente').textContent  = mes.filter(a=>a.status==='pendente').length;
  document.getElementById('statFinalizado').textContent= mes.filter(a=>a.status==='finalizado').length;
}

// ── Mini calendário ───────────────────────────
function initMiniCal() {
  miniCal = new MiniCalendar({
    gridId: 'miniCalGrid', labelId: 'miniMesAno',
    prevId: 'miniPrev',   nextId:  'miniNext',
    agendamentos: buildDateMap(),
    onSelect: dateStr => { selectedDate = dateStr; updateHeader(dateStr); renderList(); },
  });
}

function buildDateMap() {
  const map = {};
  allAgendamentos.forEach(a => {
    if (a.data_agendamento) map[a.data_agendamento] = (map[a.data_agendamento]||0)+1;
  });
  return map;
}

function updateMiniCalDots() { miniCal?.setAgendamentos(buildDateMap()); }

// ── Lista de agendamentos ─────────────────────
function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderList();
}

function renderList() {
  const list = document.getElementById('agendamentosList');
  updateHeader(selectedDate);

  let items = allAgendamentos.filter(a => a.data_agendamento === selectedDate);
  if (currentFilter !== 'todos') items = items.filter(a => a.status === currentFilter);
  items.sort((a,b) => (a.horario||'').localeCompare(b.horario||''));

  if (!items.length) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📭</span>
        <h3>Nenhum agendamento encontrado</h3>
        <p>Não há agendamentos${currentFilter!=='todos'?` com status "${currentFilter}"`:''} para esta data.</p>
      </div>`;
    return;
  }
  list.innerHTML = items.map(cardHTML).join('');
  list.querySelectorAll('.agendamento-card').forEach(c =>
    c.addEventListener('click', () => openDetail(c.dataset.id))
  );
}

// Os dados do cliente vêm aninhados em a.clientes (JOIN feito pelo backend
// via foreign key). Esta função extrai o cliente com fallback seguro caso
// o JOIN venha vazio por algum motivo.
function cli(a) { return a?.clientes || {}; }

function cardHTML(a) {
  const cls = {pendente:'status-pendente','em-andamento':'status-em-andamento',finalizado:'status-finalizado'}[a.status]||'';
  const bc  = {pendente:'badge-pendente','em-andamento':'badge-em-andamento',finalizado:'badge-finalizado'}[a.status]||'badge-pendente';
  const bl  = {pendente:'Pendente','em-andamento':'Em Andamento',finalizado:'Finalizado'}[a.status]||a.status;
  const c   = cli(a);
  return `
    <div class="agendamento-card ${cls}" data-id="${a.id}">
      <div class="card-time-col">
        <div class="card-time">${a.horario||'--:--'}</div>
        <div class="card-date-small">${formatDateBR(a.data_agendamento)}</div>
      </div>
      <div class="card-divider"></div>
      <div class="card-info">
        <div class="card-client">${escHtml(c.nome)}</div>
        <div class="card-service">${escHtml(a.tipo_servico)}</div>
        <div class="card-machine">🚜 ${escHtml(a.marca_modelo)}</div>
        <div class="card-location">📍 ${escHtml(a.localizacao)}</div>
      </div>
      <span class="card-status-badge ${bc}">${bl}</span>
    </div>`;
}

function updateHeader(dateStr) {
  const [y,m,d] = (dateStr||'').split('-');
  const dt = dateStr ? new Date(+y,+m-1,+d) : new Date();
  const label = dateStr ? `${DAYS_PT[dt.getDay()]}, ${d}/${m}/${y}` : 'Hoje';
  document.getElementById('contentTitle').textContent    = `Agendamentos – ${label}`;
  document.getElementById('contentSubtitle').textContent = 'Clique em um agendamento para ver os detalhes';
}

// ── Modal de detalhes ─────────────────────────
async function openDetail(id) {
  const a = allAgendamentos.find(x => String(x.id)===String(id));
  if (!a) return;
  currentAgendId = a.id;

  const c = cli(a);

  document.getElementById('dh-client').textContent   = c.nome || '';
  document.getElementById('dh-datetime').textContent = `${formatDateBR(a.data_agendamento)} às ${a.horario}`;

  const badgeEl = document.getElementById('d-status-badge');
  const bc = {pendente:'badge-pendente','em-andamento':'badge-em-andamento',finalizado:'badge-finalizado'};
  const bl = {pendente:'⏳ Pendente','em-andamento':'🔧 Em Andamento',finalizado:'✅ Finalizado'};
  badgeEl.className   = `detail-badge ${bc[a.status]||'badge-pendente'}`;
  badgeEl.textContent = bl[a.status]||a.status;

  document.getElementById('statusButtons').style.display = a.status==='finalizado' ? 'none' : '';

  document.getElementById('d-nome').textContent  = c.nome || '';
  document.getElementById('d-doc').textContent   = formatDoc(c.documento);
  document.getElementById('d-tel').textContent   = formatTelDisplay(c.telefone);
  document.getElementById('d-email').textContent = c.email || '';
  document.getElementById('d-servico').textContent  = a.tipo_servico;
  document.getElementById('d-maquina').textContent  = a.tipo_maquina;
  document.getElementById('d-modelo').textContent   = a.marca_modelo;
  document.getElementById('d-ano').textContent      = a.ano_maquina||'–';
  document.getElementById('d-problema').textContent = a.descricao_problema;
  document.getElementById('d-local').textContent    = a.localizacao;

  loadMap(a.localizacao);

  const finContent = document.getElementById('finalizacaoContent');
  const finInfo    = document.getElementById('finalizadoInfo');
  if (a.status === 'finalizado') {
    finContent.style.display = 'none';
    finInfo.style.display    = '';
    document.getElementById('finalizadoRelatorio').textContent =
      a.relatorio_conclusao || '(sem relatório registrado)';
  } else {
    finContent.style.display = '';
    finInfo.style.display    = 'none';
    document.getElementById('relatorioText').value = '';
  }

  document.getElementById('detailOverlay').classList.add('active');
}

function closeDetail(e) {
  if (e.target===document.getElementById('detailOverlay')) closeDetailModal();
}
function closeDetailModal() {
  document.getElementById('detailOverlay').classList.remove('active');
  currentAgendId = null;
}

// ── Mapa ──────────────────────────────────────
function loadMap(address) {
  const container = document.getElementById('mapContainer');
  if (!address) {
    container.innerHTML = `<div class="map-placeholder"><span>📍</span><p>Endereço não informado</p></div>`;
    return;
  }
  const encoded = encodeURIComponent(address);
  if (MAPS_KEY && MAPS_KEY !== 'SUA_CHAVE_GOOGLE_MAPS_AQUI') {
    container.innerHTML = `
      <iframe src="https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=${encoded}&zoom=12"
        allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  } else {
    container.innerHTML = `
      <div class="map-placeholder" style="cursor:pointer;"
           onclick="window.open('https://maps.google.com/?q=${encoded}','_blank')">
        <span>🗺️</span>
        <p style="font-weight:600;color:var(--green-dark);">Clique para ver no Google Maps</p>
        <p style="font-size:.75rem;margin-top:4px;padding:0 12px;text-align:center;">${escHtml(address)}</p>
        <p style="font-size:.68rem;margin-top:6px;color:var(--text-muted);">Configure MAPS_KEY em admin.js para o mapa incorporado</p>
      </div>`;
  }
}

// ── Atualizar status ──────────────────────────
//
// CONEXÃO COM O BACKEND:
// PUT /api/agendamentos/{id}/status
// Body: { "status": "pendente" | "em-andamento" | "finalizado" }
//
async function updateStatus(newStatus) {
  if (!currentAgendId) return;
  try {
    await api.put(`/agendamentos/${currentAgendId}/status`, { status: newStatus });
    const a = allAgendamentos.find(x => String(x.id)===String(currentAgendId));
    if (a) a.status = newStatus;
    showToast('Status atualizado com sucesso!');
    openDetail(currentAgendId);
    renderList();
    updateStats();
  } catch(err) { showToast(err.message,'error'); }
}

// ── Finalizar serviço ─────────────────────────
//
// CONEXÃO COM O BACKEND:
// PUT /api/agendamentos/{id}/finalizar
// Body: { "relatorio_conclusao": "...", "status": "finalizado" }
//
async function finalizarServico() {
  if (!currentAgendId) return;
  const relatorio = document.getElementById('relatorioText').value.trim();
  try {
    await api.put(`/agendamentos/${currentAgendId}/finalizar`, {
      relatorio_conclusao: relatorio,
      status: 'finalizado',
    });
    const a = allAgendamentos.find(x => String(x.id)===String(currentAgendId));
    if (a) { a.status='finalizado'; a.relatorio_conclusao=relatorio; }
    showToast('Serviço marcado como finalizado! ✅');
    openDetail(currentAgendId);
    renderList();
    updateStats();
  } catch(err) { showToast(err.message,'error'); }
}

// ── Helpers ───────────────────────────────────
function escHtml(str) {
  return String(str||'').replace(/[&<>"']/g,
    m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function formatDoc(d) {
  if(!d) return '–';
  const s=String(d).replace(/\D/g,'');
  if(s.length===11) return s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4');
  if(s.length===14) return s.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5');
  return d;
}
function formatTelDisplay(t) {
  if(!t) return '–';
  const s=String(t).replace(/\D/g,'');
  if(s.length===11) return s.replace(/(\d{2})(\d{5})(\d{4})/,'($1) $2-$3');
  if(s.length===10) return s.replace(/(\d{2})(\d{4})(\d{4})/,'($1) $2-$3');
  return t;
}
