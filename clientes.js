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

   FLUXO (3 telas dentro da mesma aba):
   Tela 1 (lista de clientes + busca)
     → clique num cliente → Tela 2 (dados do cliente + máquinas dele)
     → clique numa máquina → Tela 3 (PRONTUÁRIO da máquina)

   O prontuário funciona como um prontuário médico, só que da máquina:
   ficha da máquina, dados do dono, resumo e TODOS os atendimentos, do mais
   recente para o mais antigo, com o que o cliente informou no agendamento
   e o relatório de conclusão deixado pelo técnico. Pode ser impresso ou
   salvo em PDF pelo botão "Imprimir / salvar PDF".
   Em cada atendimento, "Abrir agendamento" abre o modal que já existe no
   painel (status, mapa, finalização).
   ============================================= */

const CLIENTES_PAGE = 50;    // quantos clientes carregar por vez
const BUSCA_DELAY   = 300;   // ms de espera depois que a pessoa para de digitar

// Estado da aba (um único objeto para facilitar a leitura)
const cv = {
  busca:      '',      // texto da busca atual
  lista:      [],      // clientes já carregados na tela
  total:      0,       // total de clientes que batem com a busca (no banco)
  reqId:      0,       // número da requisição de lista mais recente (descarta respostas antigas)
  maqReq:     0,       // idem, para a requisição de máquinas
  timer:      null,    // temporizador do "debounce" da busca
  tela:       'lista', // 'lista' | 'detalhe' | 'prontuario'
  clienteId:  null,    // cliente aberto na Tela 2/3 (null = Tela 1)
  dados:      null,    // última resposta de /clientes/{id}/maquinas
  maqChave:   null,    // máquina aberta na Tela 3
  filtroHist: 'todos', // filtro do histórico: 'todos' | 'concluidos' | 'abertos'
  focoId:     null,    // cliente que deve receber foco ao voltar para a lista
  scrollLista: 0,      // posição da rolagem na Tela 1, para restaurar ao voltar
  scrollMaq:   0,      // posição da rolagem na Tela 2, para restaurar ao voltar
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
    if (e.key === 'Enter')  { e.preventDefault(); clearTimeout(cv.timer); buscarClientes(input.value); input.blur(); }
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

  // Tela 2: voltar / abrir prontuário / tentar de novo
  document.getElementById('btnVoltarClientes').addEventListener('click', voltarParaClientes);
  document.getElementById('maquinasList').addEventListener('click', e => {
    if (e.target.closest('[data-retry]')) return carregarMaquinas(cv.clienteId);
    const card = e.target.closest('.maquina-card');
    if (card) abrirProntuario(card.dataset.key);
  });

  // Tela 3: voltar / imprimir / filtrar histórico / abrir agendamento
  // (com "?." para não travar a aba se o navegador tiver um admin.html antigo em cache)
  document.getElementById('btnVoltarMaquinas')?.addEventListener('click', voltarParaMaquinas);
  document.getElementById('btnImprimirProntuario')?.addEventListener('click', () => window.print());
  document.getElementById('prontuario')?.addEventListener('click', e => {
    const filtro = e.target.closest('[data-filtro-hist]');
    if (filtro) return aplicarFiltroHistorico(filtro.dataset.filtroHist);
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
// Se a aba está aberta, atualiza os números, as máquinas e o prontuário.
// (A lista de clientes é recarregada sozinha quando se volta para ela.)
function refreshClientesView() {
  if (currentView !== 'clientes') return;
  carregarResumoClientes();
  if (cv.clienteId) carregarMaquinas(cv.clienteId);
}

function mostrarTela(tela) {
  cv.tela = tela;
  document.getElementById('clientesListaView').hidden  = tela !== 'lista';
  document.getElementById('clienteDetalheView').hidden = tela !== 'detalhe';
  const pront = document.getElementById('prontuarioView');
  if (pront) pront.hidden = tela !== 'prontuario';
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
  const nMaq  = c.total_maquinas || 0;
  const nAg   = c.total_agendamentos || 0;
  const nConc = c.total_concluidos || 0;
  return `
    <button type="button" class="cliente-card" data-id="${c.id}">
      <span class="cliente-avatar" aria-hidden="true">${escHtml(iniciais(c.nome))}</span>
      <span class="cliente-info">
        <span class="cliente-nome">${escHtml(c.nome)}</span>
        <span class="cliente-meta">
          <span>${tipoDoc(c.documento)} ${escHtml(formatDoc(c.documento))}</span>
          <span>${escHtml(formatTelDisplay(c.telefone))}</span>
          ${c.ultimo_agendamento ? `<span>Último agendamento: ${formatDateBR(c.ultimo_agendamento)}</span>` : ''}
        </span>
      </span>
      <span class="cliente-counts">
        <span><strong>${nMaq}</strong> ${plural(nMaq, 'máquina', 'máquinas')}</span>
        <span><strong>${nAg}</strong> ${plural(nAg, 'atendimento', 'atendimentos')}</span>
        <span><strong>${nConc}</strong> ${plural(nConc, 'concluído', 'concluídos')}</span>
      </span>
      <span class="cliente-chevron" aria-hidden="true">›</span>
    </button>`;
}

// ══════════════════════════════════════════════
//  TELA 2 – CLIENTE + MÁQUINAS
// ══════════════════════════════════════════════
async function abrirCliente(id) {
  cv.clienteId   = Number(id);
  cv.dados       = null;
  cv.maqChave    = null;
  cv.scrollLista = window.scrollY;

  document.getElementById('clientePerfil').innerHTML = '';
  document.getElementById('maquinasTitulo').textContent = 'Máquinas';
  document.getElementById('maquinasList').innerHTML = estadoHTML('⏳', 'Carregando máquinas...');
  mostrarTela('detalhe');
  window.scrollTo({ top: 0 });
  document.getElementById('btnVoltarClientes').focus({ preventScroll: true });

  await carregarMaquinas(cv.clienteId);
}

function voltarParaClientes() {
  cv.focoId    = cv.clienteId;
  cv.clienteId = null;
  cv.dados     = null;
  cv.maqChave  = null;
  cv.maqReq++;                       // descarta respostas de máquinas que ainda estejam a caminho
  mostrarTela('lista');
  window.scrollTo({ top: cv.scrollLista });
  carregarClientes();                // as contagens podem ter mudado
}

async function carregarMaquinas(id) {
  const meu  = ++cv.maqReq;
  const list = document.getElementById('maquinasList');
  try {
    const data = await api.get(`/clientes/${id}/maquinas`);
    if (meu !== cv.maqReq || cv.clienteId !== id) return;
    cv.dados = data;
    renderPerfil(data.cliente, data.total_maquinas);
    renderMaquinas(data.maquinas || []);

    // Se o prontuário está aberto, redesenha com os dados novos
    if (cv.tela === 'prontuario') {
      const m = acharMaquina(cv.maqChave);
      if (m) renderProntuario(m);
      else   voltarParaMaquinas();   // a máquina sumiu (ex.: agendamento cancelado)
    }
  } catch (err) {
    if (meu !== cv.maqReq || cv.clienteId !== id) return;
    list.innerHTML = estadoHTML('⚠️', 'Não foi possível carregar as máquinas', err.message, true);
    if (cv.tela === 'prontuario' && !cv.dados) voltarParaMaquinas();
  }
}

function renderPerfil(c, totalMaquinas) {
  const fone  = String(c.telefone || '').replace(/\D/g, '');
  const desde = formatDateBR((c.created_at || '').slice(0, 10)) || '–';

  document.getElementById('clientePerfil').innerHTML = `
    <span class="cliente-avatar big" aria-hidden="true">${escHtml(iniciais(c.nome))}</span>
    <div class="perfil-main">
      <h2>${escHtml(c.nome)}</h2>
      <dl class="perfil-dados">
        <div><dt>${tipoDoc(c.documento)}</dt><dd>${escHtml(formatDoc(c.documento))}</dd></div>
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
  list.innerHTML = maquinas.map(maquinaCardHTML).join('');
}

function maquinaCardHTML(m) {
  const st    = STATUS_LABEL[m.ultimo_status] ? m.ultimo_status : 'pendente';
  const nServ = m.total_servicos || 0;
  const nConc = m.total_concluidos || 0;

  return `
    <button type="button" class="maquina-card" data-key="${escHtml(m.chave)}">
      <span class="maquina-ico" aria-hidden="true">${maquinaIcone(m.tipo_maquina)}</span>
      <span class="maquina-info">
        <span class="maquina-modelo">${escHtml(m.marca_modelo)}</span>
        <span class="maquina-tipo">${escHtml(m.tipo_maquina)}</span>
        <span class="maquina-chips">
          <span class="chip">${m.ano_maquina ? 'Ano ' + escHtml(m.ano_maquina) : 'Ano não informado'}</span>
          <span class="chip">${nServ} ${plural(nServ, 'atendimento', 'atendimentos')}</span>
          <span class="chip chip-ok">${nConc} ${plural(nConc, 'concluído', 'concluídos')}</span>
          <span class="chip">Último: ${formatDateBR(m.ultimo_servico)}</span>
        </span>
      </span>
      <span class="card-status-badge ${STATUS_BADGE_CLASS[st]}" title="Status do último atendimento">${STATUS_LABEL[st]}</span>
      <span class="maquina-abrir" aria-hidden="true"><span class="maquina-abrir-txt">Prontuário</span> ›</span>
    </button>`;
}

// ══════════════════════════════════════════════
//  TELA 3 – PRONTUÁRIO DA MÁQUINA
// ══════════════════════════════════════════════
function abrirProntuario(chave) {
  const m = acharMaquina(chave);
  if (!m) return;
  cv.maqChave   = chave;
  cv.filtroHist = 'todos';
  cv.scrollMaq  = window.scrollY;
  renderProntuario(m);
  mostrarTela('prontuario');
  window.scrollTo({ top: 0 });
  document.getElementById('btnVoltarMaquinas').focus({ preventScroll: true });
}

function voltarParaMaquinas() {
  const chave = cv.maqChave;
  cv.maqChave = null;
  mostrarTela('detalhe');
  window.scrollTo({ top: cv.scrollMaq });
  // Devolve o foco à máquina que estava aberta (acessibilidade)
  [...document.querySelectorAll('#maquinasList .maquina-card')]
    .find(el => el.dataset.key === chave)?.focus({ preventScroll: true });
}

function acharMaquina(chave) {
  return (cv.dados?.maquinas || []).find(m => m.chave === chave) || null;
}

function renderProntuario(m) {
  const c       = cv.dados.cliente || {};
  const st      = STATUS_LABEL[m.ultimo_status] ? m.ultimo_status : 'pendente';
  const nServ   = m.total_servicos || 0;
  const nConc   = m.total_concluidos || 0;
  const nAberto = m.total_em_aberto ?? (nServ - nConc);
  const fone    = String(c.telefone || '').replace(/\D/g, '');
  const locais  = m.localizacoes || [];

  document.getElementById('prontuario').innerHTML = `
    <div class="pront-print-brand">
      <img src="Logo AgroMáquinas remodelado.png" alt="AgroMáquinas" />
      <span>Prontuário de máquina · emitido em ${formatDateTimeBR(new Date().toISOString())}</span>
    </div>

    <header class="pront-header">
      <span class="pront-ico" aria-hidden="true">${maquinaIcone(m.tipo_maquina)}</span>
      <div class="pront-header-main">
        <span class="pront-eyebrow">Prontuário da máquina</span>
        <h2 id="prontuarioTitulo">${escHtml(m.marca_modelo)}</h2>
        <p class="pront-header-sub">${escHtml(m.tipo_maquina)} · ${m.ano_maquina ? 'Ano ' + escHtml(m.ano_maquina) : 'Ano não informado'}</p>
        <p class="pront-header-dono">Proprietário: <strong>${escHtml(c.nome)}</strong></p>
      </div>
      <div class="pront-header-status">
        <span class="pront-status-label">Situação atual</span>
        <span class="card-status-badge ${STATUS_BADGE_CLASS[st]}">${STATUS_LABEL[st]}</span>
      </div>
    </header>

    <div class="pront-resumo">
      ${resumoTile(nServ, plural(nServ, 'Atendimento', 'Atendimentos'))}
      ${resumoTile(nConc, plural(nConc, 'Concluído', 'Concluídos'), 'ok')}
      ${resumoTile(nAberto, 'Em aberto', nAberto ? 'aberto' : '')}
      ${resumoTile(formatDateBR(m.primeiro_servico) || '–', 'Primeiro atendimento', 'data')}
      ${resumoTile(formatDateBR(m.ultimo_servico) || '–', 'Último atendimento', 'data')}
    </div>

    <div class="pront-grid">
      <section class="pront-bloco" aria-labelledby="prontMaqTit">
        <h3 id="prontMaqTit">🚜 Dados da máquina</h3>
        <dl class="pront-dl">
          <div><dt>Tipo de maquinário</dt><dd>${escHtml(m.tipo_maquina) || '–'}</dd></div>
          <div><dt>Marca / Modelo</dt><dd>${escHtml(m.marca_modelo) || '–'}</dd></div>
          <div><dt>Ano (aprox.)</dt><dd>${m.ano_maquina ? escHtml(m.ano_maquina) : 'Não informado'}</dd></div>
          <div><dt>Última conclusão</dt><dd>${formatDateTimeBR(m.ultima_conclusao) || '–'}</dd></div>
          <div class="full"><dt>${plural(locais.length, 'Local de atendimento', 'Locais de atendimento')}</dt>
            <dd>${locais.length
              ? `<ul class="pront-locais">${locais.map(l => `<li>📍 ${escHtml(l)}</li>`).join('')}</ul>`
              : '–'}</dd></div>
        </dl>
      </section>

      <section class="pront-bloco" aria-labelledby="prontCliTit">
        <h3 id="prontCliTit">👤 Dados do cliente</h3>
        <dl class="pront-dl">
          <div class="full"><dt>Nome / Razão social</dt><dd>${escHtml(c.nome) || '–'}</dd></div>
          <div><dt>${tipoDoc(c.documento)}</dt><dd>${escHtml(formatDoc(c.documento))}</dd></div>
          <div><dt>Telefone / WhatsApp</dt><dd>${fone
            ? `<a href="tel:+55${fone}">${escHtml(formatTelDisplay(c.telefone))}</a>` : '–'}</dd></div>
          <div class="full"><dt>E-mail</dt><dd>${c.email
            ? `<a href="mailto:${escHtml(c.email)}">${escHtml(c.email)}</a>` : '–'}</dd></div>
          <div><dt>Cliente desde</dt><dd>${formatDateBR((c.created_at || '').slice(0, 10)) || '–'}</dd></div>
        </dl>
      </section>
    </div>

    <section class="pront-historico" aria-labelledby="prontHistTit">
      <div class="pront-historico-head">
        <h3 id="prontHistTit">📋 Histórico de atendimentos</h3>
        <div class="hist-filtros" role="group" aria-label="Filtrar histórico">
          ${filtroBtn('todos',      `Todos (${nServ})`)}
          ${filtroBtn('concluidos', `Concluídos (${nConc})`)}
          ${filtroBtn('abertos',    `Em aberto (${nAberto})`)}
        </div>
      </div>
      <ol class="hist-lista" id="histLista">
        ${(m.servicos || []).map((s, i) => historicoItemHTML(s, nServ - i)).join('')}
      </ol>
      <p class="hist-vazio" id="histVazio" hidden></p>
    </section>`;

  aplicarFiltroHistorico(cv.filtroHist);
}

function resumoTile(valor, rotulo, tipo = '') {
  return `
    <div class="resumo-tile${tipo ? ' tile-' + tipo : ''}">
      <span class="resumo-num">${escHtml(String(valor))}</span>
      <span class="resumo-label">${escHtml(rotulo)}</span>
    </div>`;
}

function filtroBtn(valor, texto) {
  return `<button type="button" class="filter-btn" data-filtro-hist="${valor}" aria-pressed="false">${escHtml(texto)}</button>`;
}

// numero = posição do atendimento na vida da máquina (1º, 2º, ...)
function historicoItemHTML(s, numero) {
  const st         = STATUS_LABEL[s.status] ? s.status : 'pendente';
  const concluido  = s.status === 'finalizado';
  const solicitado = formatDateTimeBR(s.created_at);

  const conclusao = concluido
    ? `<div class="hist-relatorio">
         <strong>✅ Relatório de conclusão${s.finalizado_em ? ` · ${formatDateTimeBR(s.finalizado_em)}` : ''}</strong>
         <p>${s.relatorio_conclusao ? escHtml(s.relatorio_conclusao) : '<em>Nenhum relatório foi registrado na conclusão.</em>'}</p>
       </div>`
    : `<div class="hist-aguardando">
         ${st === 'em-andamento' ? '🔧 Serviço em andamento' : '⏳ Aguardando atendimento'} – o relatório aparece aqui quando o serviço for finalizado.
       </div>`;

  return `
    <li class="hist-item status-${st}" data-concluido="${concluido}">
      <span class="hist-marcador" aria-hidden="true"></span>
      <div class="hist-card">
        <div class="hist-top">
          <div>
            <span class="hist-num">${numero}º atendimento · Protocolo #${escHtml(s.id)}</span>
            <span class="hist-data">📅 ${formatDateBR(s.data_agendamento)} às ${escHtml(s.horario)}</span>
          </div>
          <span class="card-status-badge ${STATUS_BADGE_CLASS[st]}">${STATUS_LABEL[st]}</span>
        </div>

        <dl class="hist-campos">
          <div><dt>Tipo de serviço</dt><dd>${escHtml(s.tipo_servico) || '–'}</dd></div>
          <div><dt>Solicitado em</dt><dd>${solicitado || '–'}</dd></div>
          <div class="full"><dt>Local do atendimento</dt><dd>📍 ${escHtml(s.localizacao) || '–'}</dd></div>
          <div class="full"><dt>Problema informado pelo cliente</dt><dd class="pre">${escHtml(s.descricao_problema) || '–'}</dd></div>
        </dl>

        ${conclusao}

        <button type="button" class="btn-link-agend" data-abrir-agend="${s.id}">Abrir agendamento</button>
      </div>
    </li>`;
}

function aplicarFiltroHistorico(filtro) {
  cv.filtroHist = filtro;
  document.querySelectorAll('#prontuario [data-filtro-hist]').forEach(b => {
    const on = b.dataset.filtroHist === filtro;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  });

  let visiveis = 0;
  document.querySelectorAll('#histLista .hist-item').forEach(li => {
    const conc = li.dataset.concluido === 'true';
    const mostra = filtro === 'todos' || (filtro === 'concluidos' ? conc : !conc);
    li.hidden = !mostra;     // na impressão todos aparecem (veja admin.css)
    if (mostra) visiveis++;
  });

  const vazio = document.getElementById('histVazio');
  if (!vazio) return;
  vazio.hidden = visiveis > 0;
  vazio.textContent = filtro === 'concluidos'
    ? 'Nenhum atendimento desta máquina foi concluído ainda.'
    : 'Nenhum atendimento em aberto para esta máquina.';
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

function tipoDoc(doc) { return String(doc || '').length === 14 ? 'CNPJ' : 'CPF'; }

function maquinaIcone(tipo) { return MAQUINA_ICONES[tipo] || '⚙️'; }

// Data e hora no fuso do navegador: "19/11/2026 às 14:35".
// O banco guarda created_at/finalizado_em em UTC; new Date() converte.
function formatDateTimeBR(iso) {
  if (!iso) return '';
  // Alguns navegadores antigos não entendem mais de 3 casas nos segundos
  const d = new Date(String(iso).replace(/(\.\d{3})\d+/, '$1'));
  if (isNaN(d)) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${formatDateBR(todayISO(d))} às ${hh}:${mm}`;
}

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
