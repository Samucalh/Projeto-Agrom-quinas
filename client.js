/* =============================================
   AGROMÁQUINAS – CLIENT.JS
   Lógica do formulário de agendamento

   DEPENDE DE: utils.js e calendar.js (carregados antes)

   FLUXO DOS PASSOS:
   Passo 1 → nextStep(1) → Passo 2
   Passo 2 → nextStep(2) → Passo 3  |  prevStep(2) → Passo 1
   Passo 3 → nextStep(3) → Passo 4  |  prevStep(3) → Passo 2
   Passo 4 → submit       → API     |  prevStep(4) → Passo 3

   CONEXÃO COM O BACKEND:
   O submit envia POST /api/agendamentos
   O endereço base da API está em utils.js (variável API_BASE).
   O backend deve estar rodando (python app.py) para o envio funcionar.
   ============================================= */

let currentStep = 1;
let bookingCal;

// ── Inicialização ─────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initMasks();
  initCalendar();
  initForm();
});

function initMasks() {
  document.getElementById('documento')
    ?.addEventListener('input', e => { e.target.value = maskCPFCNPJ(e.target.value); });
  document.getElementById('telefone')
    ?.addEventListener('input', e => { e.target.value = maskPhone(e.target.value); });
}

function initCalendar() {
  bookingCal = new BookingCalendar({
    gridId:           'calendarGrid',
    monthLabelId:     'mesAno',
    prevId:           'prevMonth',
    nextId:           'nextMonth',
    slotsContainerId: 'timeSlotsSection',
    slotsGridId:      'timeSlotsGrid',
    dateLabelId:      'selectedDateLabel',
    hiddenDateId:     'dataSelecionada',
    hiddenTimeId:     'horarioSelecionado',
    errorId:          'horarioError',
  });
  bookingCal.render();
}

function initForm() {
  document.getElementById('agendamentoForm')
    ?.addEventListener('submit', handleSubmit);
}

// ── Navegação entre passos ────────────────────
// nextStep(n): avança DO passo n para o passo n+1 (se validação passar)
// prevStep(n): volta DO passo n para o passo n-1 (sem validação)
function nextStep(from) {
  if (!validateStep(from)) return;
  goToStep(from + 1);
}

function prevStep(from) {
  goToStep(from - 1);
}

function goToStep(step) {
  document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  document.getElementById(`step${step}`)?.classList.add('active');

  document.querySelectorAll('.step').forEach(s => {
    const n = +s.dataset.step;
    s.classList.remove('active','completed');
    if (n < step)  s.classList.add('completed');
    if (n === step) s.classList.add('active');
  });

  currentStep = step;
  if (step === 4) populateResumo();
  document.getElementById('agendar')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Validação por passo ───────────────────────
function validateStep(step) {
  let valid = true;

  if (step === 1) {
    valid &= validateField('nomeCliente',
      v => v.trim().length >= 3,
      'Informe um nome com pelo menos 3 caracteres.');
    valid &= validateField('documento',
      v => validateDoc(v),
      'CPF ou CNPJ inválido. Verifique os dígitos digitados.');
    valid &= validateField('telefone',
      v => v.replace(/\D/g,'').length >= 10,
      'Telefone inválido. Mínimo de 10 dígitos.');
    valid &= validateField('email',
      v => validateEmail(v),
      'E-mail inválido.');
  }

  if (step === 2) {
    valid &= validateField('tipoServico',
      v => !!v, 'Selecione o tipo de serviço.');
    valid &= validateField('tipoMaquina',
      v => !!v, 'Selecione o tipo de maquinário.');
    valid &= validateField('marcaModelo',
      v => v.trim().length >= 2, 'Informe a marca e o modelo.');
    valid &= validateField('problemaDescricao',
      v => v.trim().length >= 10,
      'Descreva o problema com pelo menos 10 caracteres.');
    valid &= validateField('localizacao',
      v => v.trim().length >= 5, 'Informe a localização.');
  }

  if (step === 3) {
    valid = bookingCal.validate();
  }

  return !!valid;
}

function validateField(id, testFn, errMsg) {
  const el  = document.getElementById(id);
  if (!el) return true;
  const err = el.nextElementSibling;
  const ok  = testFn(el.value);
  el.classList.toggle('error', !ok);
  if (err?.classList.contains('error-msg')) err.textContent = ok ? '' : errMsg;
  return ok;
}

// ── Resumo (passo 4) ──────────────────────────
function populateResumo() {
  const g = id => document.getElementById(id)?.value || '';
  document.getElementById('r-nome').textContent    = g('nomeCliente');
  document.getElementById('r-doc').textContent     = g('documento');
  document.getElementById('r-tel').textContent     = g('telefone');
  document.getElementById('r-email').textContent   = g('email');
  document.getElementById('r-servico').textContent = g('tipoServico');
  document.getElementById('r-maquina').textContent =
    g('tipoMaquina') + (g('anoMaquina') ? ` (${g('anoMaquina')})` : '');
  document.getElementById('r-modelo').textContent  = g('marcaModelo');
  document.getElementById('r-local').textContent   = g('localizacao');
  document.getElementById('r-problema').textContent= g('problemaDescricao');
  document.getElementById('r-data').textContent    = formatDateBR(g('dataSelecionada'));
  document.getElementById('r-horario').textContent = g('horarioSelecionado');
}

// ── Envio do formulário ───────────────────────
async function handleSubmit(e) {
  e.preventDefault();

  const btn     = document.getElementById('btnSubmit');
  const txtEl   = btn.querySelector('.btn-text');
  const loadEl  = btn.querySelector('.btn-loading');

  btn.disabled = true;
  txtEl.style.display  = 'none';
  loadEl.style.display = 'inline-flex';

  const g = id => document.getElementById(id)?.value?.trim() || '';

  const payload = {
    nome_cliente:       g('nomeCliente'),
    documento:          g('documento').replace(/\D/g,''),
    telefone:           g('telefone').replace(/\D/g,''),
    email:              g('email'),
    tipo_servico:       g('tipoServico'),
    tipo_maquina:       g('tipoMaquina'),
    marca_modelo:       g('marcaModelo'),
    ano_maquina:        g('anoMaquina') || null,
    descricao_problema: g('problemaDescricao'),
    localizacao:        g('localizacao'),
    data_agendamento:   g('dataSelecionada'),
    horario:            g('horarioSelecionado'),
    status:             'pendente',
  };

  try {
    // Envia para POST /api/agendamentos (app.py)
    const res = await api.post('/agendamentos', payload);

    const detail = document.getElementById('modalDetail');
    if (detail) {
      detail.innerHTML = `
        <strong>📅 ${formatDateBR(payload.data_agendamento)} às ${payload.horario}</strong><br>
        ${payload.tipo_servico} – ${payload.marca_modelo}<br>
        <small>Protocolo: #${res.id || 'N/A'}</small>
      `;
    }
    document.getElementById('modalSucesso')?.classList.add('active');

    // Reset
    document.getElementById('agendamentoForm')?.reset();
    bookingCal.selectedDate = null;
    bookingCal.selectedTime = null;
    bookingCal.render();
    goToStep(1);

  } catch (err) {
    showToast(
      err.message || 'Erro ao salvar agendamento. Verifique sua conexão e tente novamente.',
      'error'
    );
  } finally {
    btn.disabled = false;
    txtEl.style.display  = '';
    loadEl.style.display = 'none';
  }
}

// ── Modal de sucesso ──────────────────────────
function fecharModal() {
  document.getElementById('modalSucesso')?.classList.remove('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
