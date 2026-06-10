/* =============================================
   AGROMÁQUINAS – UTILS.JS
   Funções compartilhadas (client.js e admin.js)
   ============================================= */

// ══════════════════════════════════════════════
//  CONFIGURAÇÃO DA API – CONEXÃO COM O BACKEND
// ══════════════════════════════════════════════
//
//  EM DESENVOLVIMENTO LOCAL:
//  → Inicie o backend: python app.py
//  → O servidor sobe em: http://localhost:5000
//  → A variável abaixo detecta isso automaticamente.
//
//  SE O BACKEND USAR OUTRA PORTA (ex: 8000):
//  → Troque 5000 por 8000 na linha abaixo.
//
//  EM PRODUÇÃO (servidor hospedado):
//  → Deixe '/api' como está se frontend e backend
//    estiverem no mesmo domínio.
//  → Se estiverem em domínios diferentes, troque '/api'
//    pelo endereço completo: 'https://api.seusite.com.br/api'
//
const API_BASE = (window.location.hostname === 'localhost' ||
                  window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000/api'   // ← ALTERE A PORTA SE NECESSÁRIO
  : '/api';                        // ← AJUSTE PARA PRODUÇÃO SE NECESSÁRIO


// ── Funções HTTP ──────────────────────────────
async function apiFetch(path, options = {}) {
  const url = API_BASE + path;
  const cfg = { headers: { 'Content-Type': 'application/json' }, ...options };
  if (cfg.body && typeof cfg.body === 'object') cfg.body = JSON.stringify(cfg.body);
  const res  = await fetch(url, cfg);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro na requisição');
  return data;
}

const api = {
  get:    path       => apiFetch(path),
  post:   (path, b)  => apiFetch(path, { method: 'POST',   body: b }),
  put:    (path, b)  => apiFetch(path, { method: 'PUT',    body: b }),
  delete: path       => apiFetch(path, { method: 'DELETE' }),
};


// ── Máscaras de input ─────────────────────────
function maskCPFCNPJ(value) {
  const d = value.replace(/\D/g, '');
  if (d.length <= 11) {
    return d.replace(/(\d{3})(\d)/,'$1.$2')
            .replace(/(\d{3})(\d)/,'$1.$2')
            .replace(/(\d{3})(\d{1,2})$/,'$1-$2');
  }
  return d.slice(0,14)
    .replace(/(\d{2})(\d)/,'$1.$2')
    .replace(/(\d{3})(\d)/,'$1.$2')
    .replace(/(\d{3})(\d)/,'$1/$2')
    .replace(/(\d{4})(\d{1,2})$/,'$1-$2');
}

function maskPhone(value) {
  const d = value.replace(/\D/g,'').slice(0,11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{4})(\d)/,'$1-$2');
  return d.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d)/,'$1-$2');
}


// ── Validadores ───────────────────────────────
function validateCPF(cpf) {
  const d = cpf.replace(/\D/g,'');
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let s = 0;
  for (let i=0;i<9;i++) s += +d[i]*(10-i);
  let r = (s*10)%11; if(r===10||r===11) r=0; if(r!==+d[9]) return false;
  s=0; for(let i=0;i<10;i++) s += +d[i]*(11-i);
  r=(s*10)%11; if(r===10||r===11) r=0; return r===+d[10];
}

function validateCNPJ(cnpj) {
  const d = cnpj.replace(/\D/g,'');
  if (d.length!==14||/^(\d)\1+$/.test(d)) return false;
  const calc=(str,w)=>str.split('').reduce((s,v,i)=>s+ +v*w[i],0);
  const mod=n=>n%11<2?0:11-(n%11);
  const w1=[5,4,3,2,9,8,7,6,5,4,3,2], w2=[6,...w1];
  return mod(calc(d.slice(0,12),w1))===+d[12] && mod(calc(d.slice(0,13),w2))===+d[13];
}

function validateDoc(val) {
  const d = val.replace(/\D/g,'');
  return d.length===11 ? validateCPF(d) : validateCNPJ(d);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


// ── Datas em português ────────────────────────
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTHS_PT_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun',
                          'Jul','Ago','Set','Out','Nov','Dez'];
const DAYS_PT = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira',
                 'Quinta-feira','Sexta-feira','Sábado'];

function formatDateBR(dateStr) {
  if (!dateStr) return '';
  const [y,m,d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}


// ── Helpers DOM ───────────────────────────────
function show(el) { if(el) el.style.display=''; }
function hide(el) { if(el) el.style.display='none'; }


// ── Navbar scroll + menu mobile ───────────────
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  });
  const toggle = document.getElementById('navToggle');
  const links  = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => links.classList.remove('open'))
    );
  }
}


// ── Toast de notificação ──────────────────────
function showToast(msg, type = 'success') {
  document.querySelector('.agro-toast')?.remove();
  const t = document.createElement('div');
  t.innerHTML = `<span>${type==='success'?'✓':'✕'}</span> ${msg}`;
  Object.assign(t.style, {
    position:'fixed', bottom:'28px', right:'28px',
    background: type==='success' ? '#1a3a2e' : '#b91c1c',
    color:'#fbfbf9', padding:'14px 22px', borderRadius:'12px',
    boxShadow:'0 8px 28px rgba(0,0,0,.25)', fontSize:'.9rem',
    fontWeight:'600', zIndex:'9999', display:'flex',
    alignItems:'center', gap:'10px', maxWidth:'340px',
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

document.addEventListener('DOMContentLoaded', initNavbar);
