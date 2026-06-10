"""
AgroMáquinas – Backend Python (Flask + Supabase)
================================================

══════════════════════════════════════════════
 INSTALAÇÃO DAS DEPENDÊNCIAS
══════════════════════════════════════════════
Execute no terminal (na pasta do projeto):

    pip install flask flask-cors supabase python-dotenv

══════════════════════════════════════════════
 ARQUIVO .env  (crie na mesma pasta que app.py)
══════════════════════════════════════════════
Crie um arquivo chamado ".env" com o conteúdo:

    SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
    SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    SECRET_KEY=qualquer_string_longa_e_aleatoria
    FLASK_ENV=development

COMO OBTER SUPABASE_URL e SUPABASE_KEY:
1. Acesse https://supabase.com e faça login
2. Abra seu projeto → "Project Settings" (engrenagem no menu)
3. Clique em "API"
4. "Project URL"          → copie → cole em SUPABASE_URL
5. "anon / public" key    → copie → cole em SUPABASE_KEY (para testes)
   "service_role" key     → use em produção (mais permissões)
   ⚠️ Nunca exponha a service_role no frontend!

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

load_dotenv()  # Carrega o arquivo .env

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'agromaquinas-dev-troque-em-producao')

# ── CORS ──────────────────────────────────────────────────────────────────────
# Em produção, substitua "*" pelo domínio real do seu site:
# Ex: {"origins": "https://www.agromaquinas.com.br"}
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ── Conexão Supabase ──────────────────────────────────────────────────────────
# Credenciais vêm do .env — veja instruções no topo deste arquivo
SUPABASE_URL: str = os.getenv('SUPABASE_URL', '')
SUPABASE_KEY: str = os.getenv('SUPABASE_KEY', '')

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "\n⚠️  Defina SUPABASE_URL e SUPABASE_KEY no arquivo .env\n"
        "Veja as instruções no topo deste arquivo.\n"
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Horários válidos ──────────────────────────────────────────────────────────
# ATENÇÃO: deve ser IDÊNTICO à constante WORK_HOURS em calendar.js
WORK_HOURS = ['07:00','08:00','09:00','10:00','11:00',
              '13:00','14:00','15:00','16:00','17:00']

# ── Helpers ───────────────────────────────────────────────────────────────────
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

# ── Rota de verificação ───────────────────────────────────────────────────────
@app.route('/api/health', methods=['GET'])
def health():
    """Teste: http://localhost:5000/api/health → deve retornar {"status":"ok"}"""
    return ok({'status': 'ok', 'service': 'AgroMáquinas API', 'version': '1.0.0'})

# ── Listar agendamentos ───────────────────────────────────────────────────────
@app.route('/api/agendamentos', methods=['GET'])
def list_agendamentos():
    """
    GET /api/agendamentos
    Params opcionais: data=YYYY-MM-DD, status=pendente|em-andamento|finalizado,
                      limit=100, offset=0
    Usado pelo admin.js para carregar o painel.

    BANCO: lê da tabela 'agendamentos' no Supabase.
    Se renomear a tabela no Supabase, atualize .table('agendamentos') abaixo.
    """
    try:
        data_filtro   = request.args.get('data')
        status_filtro = request.args.get('status')
        limit         = min(int(request.args.get('limit', 100)), 500)
        offset        = int(request.args.get('offset', 0))

        query = (supabase
                 .table('agendamentos')           # ← nome da tabela no Supabase
                 .select('*')
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
        res = supabase.table('agendamentos').select('*').eq('id', agend_id).single().execute()
        return ok(res.data) if res.data else err('Agendamento não encontrado.', 404)
    except Exception as e:
        return err(str(e), 500)

# ── Criar agendamento ─────────────────────────────────────────────────────────
@app.route('/api/agendamentos', methods=['POST'])
def create_agendamento():
    """
    POST /api/agendamentos
    Chamado por client.js ao confirmar o formulário.

    BANCO: insere na tabela 'agendamentos' do Supabase.
    Verifica antes se o slot (data + horário) já está ocupado.
    """
    try:
        body = request.get_json(silent=True) or {}

        required = ['nome_cliente','documento','telefone','email',
                    'tipo_servico','tipo_maquina','marca_modelo',
                    'descricao_problema','localizacao','data_agendamento','horario']
        msg = validate_required(body, required)
        if msg: return err(msg, 422)

        valid, date_err = is_valid_date(body['data_agendamento'])
        if not valid: return err(date_err, 422)

        if body['horario'] not in WORK_HOURS:
            return err(f"Horário inválido. Disponíveis: {', '.join(WORK_HOURS)}", 422)

        # Verifica disponibilidade do slot no banco
        slot = (supabase.table('agendamentos')
                .select('id')
                .eq('data_agendamento', body['data_agendamento'])
                .eq('horario', body['horario'])
                .neq('status', 'cancelado')
                .execute())
        if slot.data:
            return err('Este horário já está reservado. Escolha outro horário.', 409)

        record = {
            'nome_cliente':       sanitize_str(body.get('nome_cliente')),
            'documento':          re.sub(r'\D','',str(body.get('documento',''))),
            'telefone':           re.sub(r'\D','',str(body.get('telefone',''))),
            'email':              sanitize_str(body.get('email'), 254),
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
        return ok({'message': 'Agendamento criado com sucesso!', 'id': res.data[0]['id']}, 201)

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
        if status not in ('pendente','em-andamento','finalizado'):
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

    BANCO: lê apenas data_agendamento e horario para não expor dados sensíveis.
    Esta rota precisa ser acessível sem autenticação (verifique as políticas
    RLS na tabela 'agendamentos' no painel do Supabase).
    """
    try:
        year  = int(request.args.get('year',  datetime.now().year))
        month = int(request.args.get('month', datetime.now().month))
        _, last_day = monthrange(year, month)
        start = f"{year}-{month:02d}-01"
        end   = f"{year}-{month:02d}-{last_day}"

        res = (supabase.table('agendamentos')
               .select('data_agendamento, horario')
               .gte('data_agendamento', start)
               .lte('data_agendamento', end)
               .neq('status', 'cancelado')
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
    print(f"  🚀 AgroMáquinas API — porta {port}")
    print(f"  📍 Teste: http://localhost:{port}/api/health")
    print(f"  🔧 Debug: {debug}")
    print(f"{'='*50}\n")
    app.run(host='0.0.0.0', port=port, debug=debug)
