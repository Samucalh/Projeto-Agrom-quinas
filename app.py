"""
AgroMáquinas – Backend Python (Flask + Supabase)
================================================

══════════════════════════════════════════════
 INSTALAÇÃO DAS DEPENDÊNCIAS
══════════════════════════════════════════════
Execute no terminal (na pasta do projeto):

    pip install -r requirements.txt

══════════════════════════════════════════════
 ARQUIVO .env  (crie na mesma pasta que app.py)
══════════════════════════════════════════════
Use o arquivo .env.example como modelo. Conteúdo mínimo:

    SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
    SUPABASE_SERVICE_KEY=eyJhbGciOi...    ← service_role key
    SECRET_KEY=qualquer_string_longa_e_aleatoria
    FLASK_ENV=development

COMO OBTER SUPABASE_URL e SUPABASE_SERVICE_KEY:
1. Acesse https://supabase.com e faça login
2. Abra seu projeto → "Project Settings" (engrenagem no menu lateral)
3. Clique em "API"
4. "Project URL"           → copie → cole em SUPABASE_URL
5. "service_role" key      → copie → cole em SUPABASE_SERVICE_KEY
   ⚠️  Essa chave tem PODERES TOTAIS no banco. Nunca exponha no
   frontend, nunca comite no Git. O arquivo .env já está no
   .gitignore.

══════════════════════════════════════════════
 BANCO DE DADOS
══════════════════════════════════════════════
Execute o arquivo schema.sql no Supabase antes de rodar:
Painel Supabase → SQL Editor → New query → Cole o conteúdo → Run

══════════════════════════════════════════════
 COMO RODAR
══════════════════════════════════════════════
    python app.py

Acesse para testar: http://localhost:5000/api/health
Para parar: Ctrl+C
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from dotenv import load_dotenv
import os, re
from datetime import datetime, date
from calendar import monthrange

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'agromaquinas-dev-troque-em-producao')

# ── CORS ──────────────────────────────────────────────────────────────────────
# Em produção, substitua "*" pelo domínio real do seu site:
# Ex: {"origins": "https://www.agromaquinas.com.br"}
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ── Conexão Supabase ──────────────────────────────────────────────────────────
# Usamos a service_role key porque este backend é confiável (roda no servidor,
# nunca no navegador). Essa chave ignora as políticas de RLS — então tem
# acesso total às tabelas. NUNCA coloque essa chave em código de frontend.
SUPABASE_URL: str = os.getenv('SUPABASE_URL', '')
SUPABASE_SERVICE_KEY: str = os.getenv('SUPABASE_SERVICE_KEY', '')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError(
        "\n⚠️  Defina SUPABASE_URL e SUPABASE_SERVICE_KEY no arquivo .env\n"
        "Veja as instruções no topo deste arquivo.\n"
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# ── Horários válidos ──────────────────────────────────────────────────────────
# ATENÇÃO: deve ser IDÊNTICO à constante WORK_HOURS em calendar.js
WORK_HOURS = ['07:00','08:00','09:00','10:00','11:00',
              '13:00','14:00','15:00','16:00','17:00']

# ── Helpers HTTP ──────────────────────────────────────────────────────────────
def ok(data, code=200):   return jsonify(data), code
def err(msg, code=400):   return jsonify({'error': msg}), code

def validate_required(payload, fields):
    missing = [f for f in fields if not payload.get(f)]
    return f"Campos obrigatórios ausentes: {', '.join(missing)}" if missing else None

def sanitize_str(value, max_len=500):
    return None if value is None else str(value).strip()[:max_len]

def is_valid_date(date_str):
    try:
        d = datetime.strptime(date_str, '%Y-%m-%d').date()
        if d < date.today(): return False, "A data não pode ser no passado."
        if d.weekday() >= 5: return False, "Não realizamos atendimentos aos finais de semana."
        return True, None
    except ValueError:
        return False, "Formato de data inválido. Use YYYY-MM-DD."

# ── Validação de CPF/CNPJ ─────────────────────────────────────────────────────
# Espelha as funções validateCPF/validateCNPJ de utils.js.
# Usadas no endpoint /api/clientes/lookup para impedir varredura: só
# fazemos a consulta no banco se o documento for matematicamente válido.
def _only_digits(s: str) -> str:
    return re.sub(r'\D', '', s or '')

def is_valid_cpf(cpf: str) -> bool:
    d = _only_digits(cpf)
    if len(d) != 11 or d == d[0] * 11:
        return False
    s = sum(int(d[i]) * (10 - i) for i in range(9))
    r = (s * 10) % 11
    if r in (10, 11): r = 0
    if r != int(d[9]): return False
    s = sum(int(d[i]) * (11 - i) for i in range(10))
    r = (s * 10) % 11
    if r in (10, 11): r = 0
    return r == int(d[10])

def is_valid_cnpj(cnpj: str) -> bool:
    d = _only_digits(cnpj)
    if len(d) != 14 or d == d[0] * 14:
        return False
    w1 = [5,4,3,2,9,8,7,6,5,4,3,2]
    w2 = [6] + w1
    def _mod(n): return 0 if n % 11 < 2 else 11 - (n % 11)
    if _mod(sum(int(d[i]) * w1[i] for i in range(12))) != int(d[12]): return False
    if _mod(sum(int(d[i]) * w2[i] for i in range(13))) != int(d[13]): return False
    return True

def is_valid_document(doc: str) -> bool:
    d = _only_digits(doc)
    if len(d) == 11: return is_valid_cpf(d)
    if len(d) == 14: return is_valid_cnpj(d)
    return False


# ══════════════════════════════════════════════════════════════════════════════
# ROTAS
# ══════════════════════════════════════════════════════════════════════════════

# ── Rota de verificação ───────────────────────────────────────────────────────
@app.route('/api/health', methods=['GET'])
def health():
    """Teste: http://localhost:5000/api/health → deve retornar {"status":"ok"}"""
    return ok({'status': 'ok', 'service': 'AgroMáquinas API', 'version': '2.0.0'})


# ── Upsert de cliente (helper interno) ────────────────────────────────────────
def _upsert_cliente(nome: str, documento: str, telefone: str, email: str) -> int:
    """
    Procura cliente pelo `documento`. Se existir, atualiza nome/telefone/email
    (dados mais recentes vencem) e retorna o id. Se não existir, cria e retorna
    o id do novo cliente.
    """
    nome     = sanitize_str(nome)
    documento= _only_digits(documento)
    telefone = _only_digits(telefone)
    email    = sanitize_str(email, 254)

    if not nome or not documento or not telefone or not email:
        raise ValueError("Dados do cliente incompletos (nome, documento, telefone, email).")

    # Procura existente
    existing = (supabase.table('clientes')
                .select('id')
                .eq('documento', documento)
                .limit(1)
                .execute())

    if existing.data:
        cliente_id = existing.data[0]['id']
        (supabase.table('clientes')
            .update({'nome': nome, 'telefone': telefone, 'email': email})
            .eq('id', cliente_id)
            .execute())
        return cliente_id

    inserted = (supabase.table('clientes')
                .insert({'nome': nome, 'documento': documento,
                         'telefone': telefone, 'email': email})
                .execute())
    if not inserted.data:
        raise RuntimeError("Falha ao criar cliente.")
    return inserted.data[0]['id']


# ── Lookup de cliente por documento ───────────────────────────────────────────
@app.route('/api/clientes/lookup', methods=['GET'])
def lookup_cliente():
    """
    GET /api/clientes/lookup?documento=12345678901

    Usado por client.js: quando o usuário sai do campo CPF/CNPJ no formulário,
    o frontend consulta esse endpoint. Se o cliente já existir, devolvemos
    nome/telefone/email para autopreencher o formulário.

    SEGURANÇA: só consulta o banco se o documento for matematicamente válido
    (dígitos verificadores corretos), para evitar varredura aleatória.
    Mesmo assim, esse endpoint expõe nome/tel/email para quem souber o CPF —
    risco assumido nesta fase, documentado em docs/07-PROBLEMAS-COMUNS.md.
    """
    documento_raw = request.args.get('documento', '')
    documento = _only_digits(documento_raw)

    if not is_valid_document(documento):
        return err('Documento inválido.', 422)

    try:
        res = (supabase.table('clientes')
               .select('nome, telefone, email')
               .eq('documento', documento)
               .limit(1)
               .execute())
        if not res.data:
            return err('Cliente não encontrado.', 404)
        return ok(res.data[0])
    except Exception as e:
        return err(f"Erro ao consultar cliente: {e}", 500)


# ── Listar agendamentos ───────────────────────────────────────────────────────
@app.route('/api/agendamentos', methods=['GET'])
def list_agendamentos():
    """
    GET /api/agendamentos
    Params opcionais: data=YYYY-MM-DD, status=pendente|em-andamento|finalizado,
                      limit=100, offset=0
    Usado pelo admin.js para carregar o painel.

    Faz JOIN com a tabela clientes via a foreign key cliente_id.
    Cada agendamento retorna { ..., clientes: { id, nome, documento, ... } }.
    """
    try:
        data_filtro   = request.args.get('data')
        status_filtro = request.args.get('status')
        limit         = min(int(request.args.get('limit', 100)), 500)
        offset        = int(request.args.get('offset', 0))

        query = (supabase
                 .table('agendamentos')
                 .select('*, clientes(*)')
                 .order('data_agendamento', desc=False)
                 .order('horario', desc=False)
                 .range(offset, offset + limit - 1))

        if data_filtro:   query = query.eq('data_agendamento', data_filtro)
        if status_filtro: query = query.eq('status', status_filtro)

        res = query.execute()
        return ok({'agendamentos': res.data or [], 'count': len(res.data or [])})
    except Exception as e:
        return err(f"Erro ao buscar agendamentos: {e}", 500)


# ── Buscar um agendamento ─────────────────────────────────────────────────────
@app.route('/api/agendamentos/<int:agend_id>', methods=['GET'])
def get_agendamento(agend_id):
    try:
        res = (supabase.table('agendamentos')
               .select('*, clientes(*)')
               .eq('id', agend_id)
               .single()
               .execute())
        return ok(res.data) if res.data else err('Agendamento não encontrado.', 404)
    except Exception as e:
        return err(str(e), 500)


# ── Criar agendamento ─────────────────────────────────────────────────────────
@app.route('/api/agendamentos', methods=['POST'])
def create_agendamento():
    """
    POST /api/agendamentos
    Chamado por client.js ao confirmar o formulário.

    Fluxo:
      1. Faz upsert do cliente (procura pelo documento; se existe atualiza
         nome/tel/email, se não existe cria).
      2. Verifica se o slot (data + horário) já está ocupado por agendamento
         ativo (não cancelado).
      3. Insere o agendamento com cliente_id.
    """
    try:
        body = request.get_json(silent=True) or {}

        required = ['nome_cliente','documento','telefone','email',
                    'tipo_servico','tipo_maquina','marca_modelo',
                    'descricao_problema','localizacao','data_agendamento','horario']
        msg = validate_required(body, required)
        if msg: return err(msg, 422)

        if not is_valid_document(body.get('documento','')):
            return err('CPF/CNPJ inválido.', 422)

        valid, date_err = is_valid_date(body['data_agendamento'])
        if not valid: return err(date_err, 422)

        if body['horario'] not in WORK_HOURS:
            return err(f"Horário inválido. Disponíveis: {', '.join(WORK_HOURS)}", 422)

        slot = (supabase.table('agendamentos')
                .select('id')
                .eq('data_agendamento', body['data_agendamento'])
                .eq('horario', body['horario'])
                .neq('status', 'cancelado')
                .execute())
        if slot.data:
            return err('Este horário já está reservado. Escolha outro horário.', 409)

        cliente_id = _upsert_cliente(
            nome     = body.get('nome_cliente'),
            documento= body.get('documento'),
            telefone = body.get('telefone'),
            email    = body.get('email'),
        )

        record = {
            'cliente_id':         cliente_id,
            'tipo_servico':       sanitize_str(body.get('tipo_servico')),
            'tipo_maquina':       sanitize_str(body.get('tipo_maquina')),
            'marca_modelo':       sanitize_str(body.get('marca_modelo')),
            'ano_maquina':        body.get('ano_maquina'),
            'descricao_problema': sanitize_str(body.get('descricao_problema'), 2000),
            'localizacao':        sanitize_str(body.get('localizacao')),
            'data_agendamento':   body['data_agendamento'],
            'horario':            body['horario'],
            'status':             'pendente',
            'relatorio_conclusao': None,
        }

        res = supabase.table('agendamentos').insert(record).execute()
        if not res.data: return err('Erro ao salvar no banco. Tente novamente.', 500)
        return ok({'message': 'Agendamento criado com sucesso!',
                   'id': res.data[0]['id'],
                   'cliente_id': cliente_id}, 201)

    except ValueError as e:
        return err(str(e), 422)
    except Exception as e:
        return err(f"Erro interno: {e}", 500)


# ── Atualizar status ──────────────────────────────────────────────────────────
@app.route('/api/agendamentos/<int:agend_id>/status', methods=['PUT'])
def update_status(agend_id):
    """
    PUT /api/agendamentos/{id}/status
    Body: { "status": "pendente" | "em-andamento" | "finalizado" }
    Chamado por admin.js → updateStatus().
    """
    try:
        body   = request.get_json(silent=True) or {}
        status = body.get('status')
        if status not in ('pendente','em-andamento','finalizado','cancelado'):
            return err("Status inválido.", 422)

        res = (supabase.table('agendamentos')
               .update({'status': status})
               .eq('id', agend_id).execute())
        if not res.data: return err('Agendamento não encontrado.', 404)
        return ok({'message': 'Status atualizado.', 'id': agend_id, 'status': status})
    except Exception as e:
        return err(str(e), 500)


# ── Finalizar serviço ─────────────────────────────────────────────────────────
@app.route('/api/agendamentos/<int:agend_id>/finalizar', methods=['PUT'])
def finalizar_servico(agend_id):
    """
    PUT /api/agendamentos/{id}/finalizar
    Body: { "relatorio_conclusao": "texto", "status": "finalizado" }
    Chamado por admin.js → finalizarServico().
    """
    try:
        body      = request.get_json(silent=True) or {}
        relatorio = sanitize_str(body.get('relatorio_conclusao',''), 5000)

        res = (supabase.table('agendamentos')
               .update({
                   'status':              'finalizado',
                   'relatorio_conclusao': relatorio,
                   'finalizado_em':       datetime.utcnow().isoformat(),
               })
               .eq('id', agend_id).execute())
        if not res.data: return err('Agendamento não encontrado.', 404)
        return ok({'message': 'Serviço finalizado com sucesso!', 'id': agend_id})
    except Exception as e:
        return err(str(e), 500)


# ── Excluir agendamento ───────────────────────────────────────────────────────
@app.route('/api/agendamentos/<int:agend_id>', methods=['DELETE'])
def delete_agendamento(agend_id):
    """Apaga o agendamento. O cliente vinculado permanece no cadastro."""
    try:
        res = supabase.table('agendamentos').delete().eq('id', agend_id).execute()
        if not res.data: return err('Agendamento não encontrado.', 404)
        return ok({'message': 'Agendamento removido.', 'id': agend_id})
    except Exception as e:
        return err(str(e), 500)


# ── Slots disponíveis (calendário do cliente) ─────────────────────────────────
@app.route('/api/agendamentos/slots', methods=['GET'])
def get_slots():
    """
    GET /api/agendamentos/slots?year=2025&month=6
    Retorna horários ocupados por data no mês informado.
    Chamado por calendar.js → loadBookedSlots().

    Lê da VIEW pública `slots_ocupados`, que expõe apenas data e horário.
    Nunca expõe dados pessoais — segurança por design.
    """
    try:
        year  = int(request.args.get('year',  datetime.now().year))
        month = int(request.args.get('month', datetime.now().month))
        _, last_day = monthrange(year, month)
        start = f"{year}-{month:02d}-01"
        end   = f"{year}-{month:02d}-{last_day}"

        res = (supabase.table('slots_ocupados')
               .select('data_agendamento, horario')
               .gte('data_agendamento', start)
               .lte('data_agendamento', end)
               .execute())

        slots = {}
        for row in (res.data or []):
            d, h = row.get('data_agendamento'), row.get('horario')
            if d and h: slots.setdefault(d,[]).append(h)

        return ok({'slots': slots, 'year': year, 'month': month})
    except Exception as e:
        return err(f"Erro ao buscar slots: {e}", 500)


# ── Handlers de erro ──────────────────────────────────────────────────────────
@app.errorhandler(404)
def not_found(e):        return err('Rota não encontrada.', 404)
@app.errorhandler(405)
def method_not_allowed(e): return err('Método não permitido.', 405)
@app.errorhandler(500)
def server_error(e):     return err('Erro interno no servidor.', 500)


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == '__main__':
    port  = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV','production') == 'development'
    print(f"\n{'='*50}")
    print(f"  AgroMáquinas API — porta {port}")
    print(f"  Teste: http://localhost:{port}/api/health")
    print(f"  Debug: {debug}")
    print(f"{'='*50}\n")
    app.run(host='0.0.0.0', port=port, debug=debug)
