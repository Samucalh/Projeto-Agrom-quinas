/* =============================================
   AGROMÁQUINAS – CLIENTES.JS
   Aba "Clientes e máquinas" do painel administrativo

   DEPENDE DE: utils.js, calendar.js e admin.js (carregados antes)
   (usa api, showToast, formatDateBR, todayISO, escHtml, formatDoc,
    formatTelDisplay, openDetail e a variável currentView)

   CONEXÃO COM O BACKEND (app.py):
     GET /api/clientes?busca=&limit=&offset=  → lista de clientes (com busca)
     GET /api/clientes/{id}/maquinas          → máquinas do cliente + histórico
     GET /api/clientes/resumo                 → totais mostrados na sidebar
   O endereço base da API está em utils.js (variável API_BASE).

   FLUXO:
   Tela 1 (lista) → clique num cliente → Tela 2 (máquinas do cliente)
   Na Tela 2, clique numa máquina para abrir o histórico de serviços e,
   em cada serviço, em "Ver detalhes do agendamento" para abrir o modal
   que já existe no painel (status, mapa, relatório de conclusão).
   ============================================= */

const CLIENTES_PAGE = 50;    // quantos clientes carregar por vez
const BUSCA_DELAY   = 300;   // ms de espera depois que a pessoa para de digitar

// Estado da aba (um único objeto para facilitar a leitura)
const cv = {
  busca:     '',      // texto da busca atual
  lista:     [],      // clientes já carregados na tela
  total:     0,       // total de clientes que batem com a busca (no banco)
  reqId:     0,       // número da requisição de lista mais recente (descarta respostas antigas)
  maqReq:    0,       // idem, para a requisição de máquinas
  timer:     null,    // temporizador do "debounce" da busca
  clienteId: null,    // cliente aberto na Tela 2 (null = Tela 1)
  focoId:    null,    // cliente que deve receber foco ao voltar para a lista
  scrollY:   0,       // posição da rolagem na lista, para restaurar ao voltar
};

// Ícone de cada tipo de maquinário (os nomes vêm das opções do index.html)
const MAQUINA_ICONES = {
  'Trator': '🚜', 'Colheitadeira': '🌽', 'Plantadeira': '🌱', 'Pulverizador': '💧',
  'Forrageira': '🌾', 'Grade / Arado': '⛏️', 'Roçadeira': '🌿',
};

const STATUS_LABEL       = { 'pendente': 'Pendente', 'em-andamento': 'Em Andamento', 'finalizado': 'Finalizado' };
const STATUS_BADGE_CLASS = { 'pendente': 'badge-pendente', 'em-andamento': 'badge-em-andamento', 'finalizado': 'badge-finalizado' };

// ── Inicialização ─────────────────────────────
document.addEventListener('DOMContentLoaded', initClientesView);

function initClientesView() {
  const input = document.getElementById('clienteBusca');
  const clear = document.getElementById('clienteBuscaLimpar');
  if (!input) return;

  // Busca: espera a pessoa parar de digitar para não chamar a API a cada letra
  input.addEventListener('input', () => {
    clear.hidden = !input.value;
    clearTimeout(cv.timer);
    cv.timer = setTimeout(() => buscarClientes(input.value), BUSCA_DELAY);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); clearTimeout(cv.timer); buscarClientes(input.value); }
    if (e.key === 'Escape') limparBusca();
  });
  clear.addEventListener('click', limparBusca);

  // Tela 1: clique num cliente / tentar de novo / carregar mais
  document.getElementById('clientesList').addEventListener('click', e => {
    if (e.target.closest('[data-retry]')) return carregarClientes();
    const card = e.target.closest('.cliente-card');
    if (card) abrirCliente(card.dataset.id);
  });
  document.getElementById('clientesMaisBtn').addEventListener('click', () => carregarClientes({ append: true }));

  // Tela 2: voltar / abrir-fechar máquina / abrir agendamento / tentar de novo
  document.getElementById('btnVoltarClientes').addEventListener('click', voltarParaClientes);
  document.getElementById('maquinasList').addEventListener('click', e => {
    if (e.target.closest('[data-retry]')) return carregarMaquinas(cv.clienteId);
    const head = e.target.closest('.maquina-head');
    if (head) return toggleMaquina(head);
    const btn = e.target.closest('[data-abrir-agend]');
    if (btn) openDetail(btn.dataset.abrirAgend);   // modal do admin.js
  });
}

// Chamada por switchView() (admin.js) toda vez que a aba é aberta
function showClientesView() {
  carregarResumoClientes();
  if (cv.clienteId) carregarMaquinas(cv.clienteId);
  else              carregarClientes();
}

// Chamada por admin.js depois de mudar status / finalizar um serviço.
// Se a aba está aberta, atualiza os números e o histórico na tela.
// (A lista de clientes é recarregada sozinha quando se volta para ela.)
function refreshClientesView() {
  if (currentView !== 'clientes') return;
  carregarResumoClientes();
  if (cv.clienteId) carregarMaquinas(cv.clienteId);
}

// ══════════════════════════════════════════════
//  TELA 1 – LISTA DE CLIENTES + BUSCA
// ══════════════════════════════════════════════
function buscarClientes(valor) {
  const termo = String(valor || '').trim();
  if (termo === cv.busca && cv.lista.length) return;   // nada mudou
  cv.busca = termo;
  carregarClientes();
}

function limparBusca() {
  const input = document.getElementById('clienteBusca');
  clearTimeout(cv.timer);
  input.value = '';
  document.getElementById('clienteBuscaLimpar').hidden = true;
  input.focus();
  buscarClientes('');
}

async function carregarClientes({ append = false } = {}) {
  const meu  = ++cv.reqId;
  const list = document.getElementById('clientesList');

  if (!cv.lista.length) list.innerHTML = estadoHTML('⏳', 'Carregando clientes...');
  else                  list.classList.add('is-loading');   // mantém a lista antiga, só esmaecida

  const qs = new URLSearchParams({ limit: CLIENTES_PAGE, offset: append ? cv.lista.length : 0 });
  if (cv.busca) qs.set('busca', cv.busca);

  try {
    const data = await api.get('/clientes?' + qs.toString());
    if (meu !== cv.reqId) return;   // chegou uma busca mais nova: ignora esta resposta
    cv.lista = append ? cv.lista.concat(data.clientes || []) : (data.clientes || []);
    cv.total = data.total ?? cv.lista.length;
    renderClientes();
  } catch (err) {
    if (meu !== cv.reqId) return;
    cv.lista = [];
    list.classList.remove('is-loading');
    list.innerHTML = estadoHTML('⚠️', 'Não foi possível carregar os clientes',
      `${err.message}. Verifique se o backend (app.py) está em execução.`, true);
    document.getElementById('clientesInfo').textContent = '';
    document.getElementById('clientesMais').hidden = true;
  }
}

function renderClientes() {
  const list = document.getElementById('clientesList');
  const info = document.getElementById('clientesInfo');
  const mais = document.getElementById('clientesMais');
  list.classList.remove('is-loading');

  if (!cv.lista.length) {
    list.innerHTML = cv.busca
      ? estadoHTML('🔎', 'Nenhum cliente encontrado',
          `Não achamos ninguém para “${cv.busca}”. Confira o nome ou digite parte dos números do CPF/CNPJ.`)
      : estadoHTML('👥', 'Nenhum cliente cadastrado ainda',
          'Os clientes aparecem aqui assim que fizerem o primeiro agendamento pelo site.');
    info.textContent = cv.busca ? 'Nenhum resultado' : '';
    mais.hidden = true;
    return;
  }

  list.innerHTML = cv.lista.map(clienteCardHTML).join('');

  const n = cv.total;
  let txt = cv.busca
    ? `${n} ${plural(n, 'cliente encontrado', 'clientes encontrados')} para “${cv.busca}”`
    : `${n} ${plural(n, 'cliente cadastrado', 'clientes cadastrados')}`;
  if (cv.lista.length < n) txt += ` (mostrando ${cv.lista.length})`;
  info.textContent = txt;
  mais.hidden = cv.lista.length >= n;

  // Voltando da Tela 2: devolve o foco ao cliente que estava aberto (acessibilidade)
  if (cv.focoId) {
    list.querySelector(`.cliente-card[data-id="${cv.focoId}"]`)?.focus({ preventScroll: true });
    cv.focoId = null;
  }
}

function clienteCardHTML(c) {
  const tipoDoc = String(c.documento || '').length === 14 ? 'CNPJ' : 'CPF';
  const nMaq = c.total_maquinas || 0;
  const nAg  = c.total_agendamentos || 0;
  return `
    <button type="button" class="cliente-card" data-id="${c.id}">
      <span class="cliente-avatar" aria-hidden="true">${escHtml(iniciais(c.nome))}</span>
      <span class="cliente-info">
        <span class="cliente-nome">${escHtml(c.nome)}</span>
        <span class="cliente-meta">
          <span>${tipoDoc} ${escHtml(formatDoc(c.documento))}</span>
          <span>${escHtml(formatTelDisplay(c.telefone))}</span>
        </span>
      </span>
      <span class="cliente-counts">
        <span><strong>${nMaq}</strong> ${plural(nMaq, 'máquina', 'máquinas')}</span>
        <span><strong>${nAg}</strong> ${plural(nAg, 'agendamento', 'agendamentos')}</span>
      </span>
      <span class="cliente-chevron" aria-hidden="true">›</span>
    </button>`;
}

// ══════════════════════════════════════════════
//  TELA 2 – MÁQUINAS DO CLIENTE
// ══════════════════════════════════════════════
async function abrirCliente(id) {
  cv.clienteId = Number(id);
  cv.scrollY   = window.scrollY;

  document.getElementById('clientePerfil').innerHTML = '';
  document.getElementById('maquinasTitulo').textContent = 'Máquinas';
  document.getElementById('maquinasList').innerHTML = estadoHTML('⏳', 'Carregando máquinas...');
  mostrarTelaCliente('detalhe');
  document.getElementById('btnVoltarClientes').focus({ preventScroll: true });

  await carregarMaquinas(cv.clienteId);
}

function voltarParaClientes() {
  cv.focoId    = cv.clienteId;
  cv.clienteId = null;
  cv.maqReq++;                       // descarta respostas de máquinas que ainda estejam a caminho
  mostrarTelaCliente('lista');
  window.scrollTo({ top: cv.scrollY });
  carregarClientes();                // as contagens podem ter mudado
}

function mostrarTelaCliente(tela) {
  document.getElementById('clientesListaView').hidden   = tela !== 'lista';
  document.getElementById('clienteDetalheView').hidden  = tela !== 'detalhe';
  if (tela === 'detalhe') window.scrollTo({ top: 0 });
}

async function carregarMaquinas(id) {
  const meu  = ++cv.maqReq;
  const list = document.getElementById('maquinasList');
  try {
    const data = await api.get(`/clientes/${id}/maquinas`);
    if (meu !== cv.maqReq || cv.clienteId !== id) return;
    renderPerfil(data.cliente, data.total_maquinas);
    renderMaquinas(data.maquinas || []);
  } catch (err) {
    if (meu !== cv.maqReq || cv.clienteId !== id) return;
    list.innerHTML = estadoHTML('⚠️', 'Não foi possível carregar as máquinas', err.message, true);
  }
}

function renderPerfil(c, totalMaquinas) {
  const tipoDoc = String(c.documento || '').length === 14 ? 'CNPJ' : 'CPF';
  const fone    = String(c.telefone || '').replace(/\D/g, '');
  const desde   = formatDateBR((c.created_at || '').slice(0, 10)) || '–';

  document.getElementById('clientePerfil').innerHTML = `
    <span class="cliente-avatar big" aria-hidden="true">${escHtml(iniciais(c.nome))}</span>
    <div class="perfil-main">
      <h2>${escHtml(c.nome)}</h2>
      <dl class="perfil-dados">
        <div><dt>${tipoDoc}</dt><dd>${escHtml(formatDoc(c.documento))}</dd></div>
        <div><dt>Telefone</dt><dd>${fone
          ? `<a href="tel:+55${fone}">${escHtml(formatTelDisplay(c.telefone))}</a>` : '–'}</dd></div>
        <div><dt>E-mail</dt><dd>${c.email
          ? `<a href="mailto:${escHtml(c.email)}">${escHtml(c.email)}</a>` : '–'}</dd></div>
        <div><dt>Cliente desde</dt><dd>${desde}</dd></div>
      </dl>
    </div>`;

  document.getElementById('maquinasTitulo').textContent = `Máquinas (${totalMaquinas ?? 0})`;
}

function renderMaquinas(maquinas) {
  const list = document.getElementById('maquinasList');

  if (!maquinas.length) {
    list.innerHTML = estadoHTML('🚜', 'Nenhuma máquina registrada',
      'Este cliente ainda não tem agendamentos ativos.');
    return;
  }

  // Ao recarregar (ex.: depois de mudar um status) mantém abertas as máquinas que já estavam.
  // Se for a primeira exibição e houver só uma máquina, já abre o histórico dela.
  const jaTinhaCards = list.querySelector('.maquina-card') !== null;
  const abertas = new Set([...list.querySelectorAll('.maquina-card.open')].map(el => el.dataset.key));

  list.innerHTML = maquinas.map((m, i) => {
    const aberta = jaTinhaCards ? abertas.has(m.chave) : maquinas.length === 1;
    return maquinaHTML(m, i, aberta);
  }).join('');
}

function maquinaHTML(m, i, aberta) {
  const icone = MAQUINA_ICONES[m.tipo_maquina] || '⚙️';
  const st    = STATUS_LABEL[m.ultimo_status] ? m.ultimo_status : 'pendente';
  const bodyId = `maq-body-${i}`;
  const nServ = m.total_servicos || 0;

  const locais = (m.localizacoes || []).length
    ? `<p class="maquina-locais">📍 ${m.localizacoes.length > 1 ? 'Atendida em' : 'Local'}: ${
        escHtml(m.localizacoes.join(' • '))}</p>`
    : '';

  return `
    <article class="maquina-card${aberta ? ' open' : ''}" data-key="${escHtml(m.chave)}">
      <button type="button" class="maquina-head" aria-expanded="${aberta}" aria-controls="${bodyId}">
        <span class="maquina-ico" aria-hidden="true">${icone}</span>
        <span class="maquina-info">
          <span class="maquina-modelo">${escHtml(m.marca_modelo)}</span>
          <span class="maquina-tipo">${escHtml(m.tipo_maquina)}</span>
          <span class="maquina-chips">
            <span class="chip">${m.ano_maquina ? 'Ano ' + escHtml(m.ano_maquina) : 'Ano não informado'}</span>
            <span class="chip">${nServ} ${plural(nServ, 'serviço', 'serviços')}</span>
            <span class="chip">Último: ${formatDateBR(m.ultimo_servico)}</span>
          </span>
        </span>
        <span class="card-status-badge ${STATUS_BADGE_CLASS[st]}" title="Status do último serviço">${STATUS_LABEL[st]}</span>
        <span class="maquina-toggle" aria-hidden="true">›</span>
      </button>
      <div class="maquina-body" id="${bodyId}"${aberta ? '' : ' hidden'}>
        ${locais}
        <h4 class="historico-titulo">Histórico de serviços</h4>
        ${(m.servicos || []).map(servicoHTML).join('')}
      </div>
    </article>`;
}

function servicoHTML(s) {
  const st = STATUS_LABEL[s.status] ? s.status : 'pendente';

  let relatorio = '';
  if (s.status === 'finalizado') {
    // finalizado_em vem em UTC; new Date() converte para o horário local
    const quando = s.finalizado_em ? formatDateBR(todayISO(new Date(s.finalizado_em))) : '';
    relatorio = `
      <div class="servico-relatorio">
        <strong>✅ Relatório de conclusão${quando ? ' – ' + quando : ''}</strong>
        <p>${escHtml(s.relatorio_conclusao) || '(sem relatório registrado)'}</p>
      </div>`;
  }

  return `
    <div class="servico-item status-${st}">
      <div class="servico-top">
        <span class="servico-data">📅 ${formatDateBR(s.data_agendamento)} às ${escHtml(s.horario)}</span>
        <span class="card-status-badge ${STATUS_BADGE_CLASS[st]}">${STATUS_LABEL[st]}</span>
      </div>
      <div class="servico-tipo">${escHtml(s.tipo_servico)}</div>
      <div class="servico-campo">
        <span class="servico-rotulo">Problema informado</span>
        <p>${escHtml(s.descricao_problema)}</p>
      </div>
      <div class="servico-campo">
        <span class="servico-rotulo">Local</span>
        <p>📍 ${escHtml(s.localizacao)}</p>
      </div>
      ${relatorio}
      <button type="button" class="btn-link-agend" data-abrir-agend="${s.id}">Ver detalhes do agendamento</button>
    </div>`;
}

function toggleMaquina(head) {
  const card = head.closest('.maquina-card');
  const abrir = !card.classList.contains('open');
  card.classList.toggle('open', abrir);
  head.setAttribute('aria-expanded', String(abrir));
  card.querySelector('.maquina-body').hidden = !abrir;
}

// ══════════════════════════════════════════════
//  SIDEBAR – TOTAIS
// ══════════════════════════════════════════════
async function carregarResumoClientes() {
  try {
    const d = await api.get('/clientes/resumo');
    document.getElementById('statClientes').textContent = d.total_clientes ?? '–';
    document.getElementById('statMaquinas').textContent = d.total_maquinas ?? '–';
  } catch (_) {
    // Sem os totais a aba continua funcionando; os números ficam como "–".
  }
}

// ── Helpers ───────────────────────────────────
function plural(n, singular, plur) { return n === 1 ? singular : plur; }

// Iniciais para o "avatar": primeira e última palavras relevantes do nome
function iniciais(nome) {
  const ignorar = ['da', 'de', 'do', 'das', 'dos', 'e', 'ltda', 'me', 'epp', 'sa', 's/a'];
  const p = String(nome || '').trim().split(/\s+/)
    .filter(w => w && !ignorar.includes(w.toLowerCase()));
  if (!p.length) return '?';
  const a = p[0][0], b = p.length > 1 ? p[p.length - 1][0] : '';
  return (a + b).toUpperCase();
}

// Bloco padrão de "vazio / carregando / erro"
function estadoHTML(icone, titulo, texto = '', comRetry = false) {
  return `
    <div class="empty-state">
      <span class="empty-icon">${icone}</span>
      <h3>${escHtml(titulo)}</h3>
      ${texto ? `<p>${escHtml(texto)}</p>` : ''}
      ${comRetry ? '<button type="button" class="btn-load-more" data-retry>Tentar novamente</button>' : ''}
    </div>`;
}
