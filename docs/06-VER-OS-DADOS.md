# 06 – Como ver e mexer nos dados no Supabase Studio

O painel da Supabase (chamado de **Supabase Studio**) tem um monte de ferramentas. Aqui vou mostrar as 3 mais úteis no dia a dia:

1. **Table Editor** — ver dados como planilha (e editar)
2. **SQL Editor** — fazer buscas avançadas e consultas
3. **Logs** — debugar problemas (ver o que está rolando "por baixo dos panos")

---

## 1) Table Editor — a "planilha" do banco

### Como abrir

Menu lateral esquerdo → **Table Editor** (ícone que parece uma tabela).

### O que você vê

- **Lista de tabelas** à esquerda: `clientes`, `agendamentos` (e `slots_ocupados`, que é uma view)
- **Conteúdo da tabela selecionada** no centro, em formato de planilha
- **Total de linhas** mostrado no rodapé

### O que dá pra fazer

#### Ver os dados

Clica numa tabela à esquerda — ela aparece no centro. Cada linha é um registro, cada coluna é um campo. Igual Excel.

#### Filtrar

No topo da tabela tem um botão **"Filter"**. Clique:

- Escolha a coluna (ex: `status`)
- Escolha o operador (`=`, `>`, `like`, etc.)
- Digite o valor (ex: `pendente`)
- Clique **"Apply filter"**

A planilha vai mostrar só as linhas que batem. Útil pra "ver só os agendamentos pendentes" rapidamente.

#### Ordenar

Botão **"Sort"** ao lado de Filter:

- Escolha a coluna (ex: `data_agendamento`)
- Ascending ou Descending
- Apply sort

#### Editar uma célula

Duplo clique numa célula → digita o novo valor → Enter pra salvar.

> **Cuidado:** mudar dados aqui afeta o banco **na hora**. Use só pra correções pontuais ou pra fazer testes. Não fique editando sem pensar.

#### Apagar uma linha

Clica no botão **"..."** à esquerda da linha → **"Delete row"**.

> **Atenção com a tabela `clientes`:** por causa do `ON DELETE RESTRICT` na FK, você **não consegue apagar** um cliente que ainda tem agendamentos. O Supabase vai recusar com um erro tipo "violates foreign key constraint". Apague os agendamentos primeiro, ou apenas marque como cancelado.

#### Exportar pra CSV

Útil pra abrir no Excel/Google Sheets.

- Botão de **"..."** no topo da tabela → **"Export as CSV"**
- Baixa um arquivo `.csv` que você abre no Excel/Sheets

---

## 2) SQL Editor — buscas avançadas

O SQL Editor é onde você pode fazer perguntas direto pro banco usando a linguagem SQL.

### Como abrir

Menu lateral → **SQL Editor**.

### Exemplo 1 – Listar todos os agendamentos do mês

```sql
SELECT a.id, c.nome, a.tipo_servico, a.data_agendamento, a.horario, a.status
FROM agendamentos a
JOIN clientes c ON c.id = a.cliente_id
WHERE a.data_agendamento >= '2026-06-01'
  AND a.data_agendamento <= '2026-06-30'
ORDER BY a.data_agendamento, a.horario;
```

Clica em **Run**. Vai aparecer uma tabelinha com o resultado.

> **O que esse comando faz?** "Me mostre id, nome do cliente, serviço, data, horário e status — buscando na tabela de agendamentos, juntando (`JOIN`) com a tabela de clientes pelo `cliente_id`, e filtrando só o mês de junho/2026."

### Exemplo 2 – Contar quantos agendamentos por cliente

```sql
SELECT c.nome, COUNT(*) AS total_agendamentos
FROM agendamentos a
JOIN clientes c ON c.id = a.cliente_id
GROUP BY c.nome
ORDER BY total_agendamentos DESC;
```

Mostra os clientes mais frequentes.

### Exemplo 3 – Achar slots ainda livres num dia

```sql
SELECT
  '2026-06-15'::date AS data,
  h AS horario,
  CASE WHEN h IN (
      SELECT horario FROM agendamentos
      WHERE data_agendamento = '2026-06-15' AND status <> 'cancelado'
  ) THEN 'OCUPADO' ELSE 'LIVRE' END AS situacao
FROM unnest(ARRAY['07:00','08:00','09:00','10:00','11:00',
                  '13:00','14:00','15:00','16:00','17:00']) AS h
ORDER BY h;
```

Mostra quais horários estão livres / ocupados num dia específico.

### Exemplo 4 – Buscar um cliente pelo CPF

```sql
SELECT * FROM clientes WHERE documento = '11144477735';
```

---

## 3) Logs — debugar problemas

Quando algo está dando errado e você não sabe o quê, os logs ajudam a entender o que está chegando no banco.

### Como abrir

Menu lateral → **Logs** → **Postgres Logs** (ou **API Logs**).

Tem 3 abas úteis:

- **Postgres Logs** — comandos SQL que estão sendo executados no banco
- **API Logs** — chamadas HTTP que estão chegando na Supabase
- **Realtime Logs** — não usamos, pode ignorar

### Quando usar

- O `app.py` está retornando erro mas você não sabe por quê → veja os Postgres Logs pra ver qual SQL falhou
- Suspeita que alguém de fora está acessando seu projeto → veja API Logs

---

## Tarefas práticas pra fixar

Tenta fazer isso pra praticar:

1. **No Table Editor:** filtre os agendamentos com status = "finalizado". Quantos aparecem?
2. **No SQL Editor:** rode `SELECT COUNT(*) FROM clientes;` — quantos clientes você tem?
3. **No SQL Editor:** rode `SELECT * FROM agendamentos ORDER BY created_at DESC LIMIT 5;` — vê os 5 últimos agendamentos.
4. **No Table Editor:** marque manualmente um agendamento como `cancelado` editando a célula `status`. Depois volte no site e veja que o slot dele liberou no calendário (a view `slots_ocupados` filtra cancelados).

---

## Backup dos dados

A Supabase faz backup automático no plano Free **uma vez por dia** (último dia). Em **Project Settings → Database → Backups** você vê quando foi o último.

Para baixar uma cópia completa do banco manualmente:

- Menu lateral → **Database** → **Backups**
- Ou use o SQL Editor: `SELECT * FROM clientes` e exporta CSV, idem `agendamentos`

> Pra um projeto de faculdade, o backup automático é suficiente. Se for usar em produção, configure backups mais frequentes.

---

## Resumo das ferramentas

| Ferramenta       | Pra quê?                                  | Quando usar?                          |
| ---------------- | ----------------------------------------- | ------------------------------------- |
| **Table Editor** | Ver/editar dados como planilha            | Conferir se um dado entrou, correções |
| **SQL Editor**   | Fazer buscas com filtros complexos        | Relatórios, análises, agregações      |
| **Logs**         | Ver o que está acontecendo "por baixo"    | Quando algo está dando errado         |

Próximo passo (só se algo deu errado em algum doc): [`07-PROBLEMAS-COMUNS.md`](07-PROBLEMAS-COMUNS.md).
