# 02 – Rodar o `schema.sql` no Supabase

Agora vamos criar as **tabelas** dentro do projeto que você criou no doc anterior. As tabelas são onde os dados vão morar (uma tabela `clientes`, uma tabela `agendamentos`).

Para criar essas tabelas, vamos copiar e colar o conteúdo do arquivo `schema.sql` (que está na pasta raiz do projeto) dentro do **SQL Editor** da Supabase.

> **Tempo estimado:** 3 minutos

---

## Passo 1 – Abrir o SQL Editor

1. Você deve estar no painel do seu projeto Supabase (se não, faça login em https://supabase.com/dashboard e clique no projeto `agromaquinas`).
2. No **menu lateral esquerdo**, procure o ícone que parece um documento com `</>`  ou as letras `SQL` — está escrito **"SQL Editor"**.
3. Clique nele.

A tela vai mostrar uma área grande no centro com um editor de código (parecido com o Notepad) e provavelmente alguns exemplos de queries na lateral.

---

## Passo 2 – Criar uma nova query

Procure o botão **"New query"** (geralmente em cima do editor ou no canto superior direito). Clique nele.

O editor central vai ficar vazio, esperando você digitar SQL.

---

## Passo 3 – Copiar o `schema.sql`

1. Abra o arquivo **`schema.sql`** da pasta do projeto (no seu editor de código, ou abrindo direto pelo Bloco de Notas/VS Code).
2. **Selecione tudo** (Ctrl+A) e **copie** (Ctrl+C).
3. Volte ao navegador, clique dentro do editor da Supabase, e **cole** (Ctrl+V).

Você deve ver algo parecido com:

```sql
-- =============================================
-- AgroMáquinas – Schema do banco de dados
-- ...
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
...
```

Tudo é uma linha SQL após outra. Não precisa entender 100% agora — a próxima seção deste documento explica o que cada bloco faz.

---

## Passo 4 – Executar

Olhe no canto superior direito ou inferior do editor: tem um botão **"Run"** (Executar) ou um atalho `Ctrl + Enter`.

**Clique em "Run"** (ou pressione **Ctrl + Enter**).

A Supabase vai processar o SQL. Em 1-2 segundos você deve ver, embaixo do editor, uma área de resultado mostrando:

```
| resultado                   | clientes_existentes | agendamentos_existentes |
| Schema criado com sucesso!  | 0                   | 0                       |
```

**Esse é o sinal de que tudo deu certo.** As duas tabelas foram criadas, vazias (0 clientes, 0 agendamentos).

### Se der erro

- "permission denied" → você não está logado no projeto certo. Verifique a URL.
- "syntax error" → você não copiou o arquivo inteiro. Apague tudo e cole de novo.
- Outro erro → ver [`07-PROBLEMAS-COMUNS.md`](07-PROBLEMAS-COMUNS.md).

---

## Por que duas tabelas? (a parte didática)

Você pode estar se perguntando: "_por que não uma tabela só com tudo dentro?_". Excelente pergunta. Vamos entender:

### Imagine sem normalização (jeito errado)

Se a gente tivesse **uma tabela só** com tudo:

| id  | nome_cliente   | cpf         | telefone     | tipo_servico    | data       | horario |
| --- | -------------- | ----------- | ------------ | --------------- | ---------- | ------- |
| 1   | João da Silva  | 123.456.789-00 | 99999-1111 | Manutenção      | 15/06/2026 | 09:00   |
| 2   | João da Silva  | 123.456.789-00 | 99999-1111 | Troca de óleo   | 22/06/2026 | 14:00   |
| 3   | João da Silva  | 123.456.789-00 | 99999-1111 | Diagnóstico     | 01/07/2026 | 10:00   |

Olha o problema: **o João aparece 3 vezes**. O nome dele, CPF e telefone estão escritos 3 vezes. Imagine se forem 50 agendamentos.

E pior: se o João mudar de telefone, você teria que ir nas **50 linhas** e atualizar uma por uma. Se esquecesse uma, ficaria inconsistente (qual telefone é o certo?).

### Com normalização (jeito certo)

A gente separa em **duas tabelas**:

**Tabela `clientes` (3 linhas viram 1):**

| id  | nome          | documento     | telefone     |
| --- | ------------- | ------------- | ------------ |
| 1   | João da Silva | 12345678900   | 99999-1111   |

**Tabela `agendamentos`:**

| id  | cliente_id  | tipo_servico    | data       | horario |
| --- | ----------- | --------------- | ---------- | ------- |
| 1   | **1**       | Manutenção      | 15/06/2026 | 09:00   |
| 2   | **1**       | Troca de óleo   | 22/06/2026 | 14:00   |
| 3   | **1**       | Diagnóstico     | 01/07/2026 | 10:00   |

A coluna `cliente_id` em `agendamentos` é como um **número de protocolo** que aponta para a tabela `clientes`. Quando alguém precisa do nome do cliente, "vai lá em `clientes`, busca o id 1, e descobre que é o João da Silva".

Se o João mudar de telefone, **mudamos em UMA linha só** — a da tabela `clientes`. Todos os agendamentos dele automaticamente "veem" o telefone novo.

> **Conceito que você acabou de aprender:** isso é o que se chama de **chave estrangeira** (em inglês, _foreign key_, abreviado FK). A coluna `cliente_id` é uma chave estrangeira que aponta para `clientes.id`.

---

## O que cada parte do `schema.sql` faz

Abra o `schema.sql` e olhe junto comigo. Tem 7 blocos:

### Bloco 1 – `update_updated_at()`

```sql
CREATE OR REPLACE FUNCTION update_updated_at() ...
```

Uma **função** que atualiza automaticamente a coluna `updated_at` (data da última modificação) toda vez que uma linha for alterada. É como um relógio que carimba "modificado em X" sempre que alguém mexe.

### Bloco 2 – `CREATE TABLE clientes`

Cria a tabela de clientes. Pontos importantes:

- `id BIGSERIAL PRIMARY KEY` → cada linha ganha um número automático único (1, 2, 3, ...). É a **chave primária** (jeito oficial de identificar uma linha).
- `documento TEXT NOT NULL UNIQUE` → o CPF/CNPJ é **único** (não pode ter dois clientes com o mesmo). Isso é o que garante que o João nunca vai aparecer duplicado.

### Bloco 3 – `CREATE TABLE agendamentos`

Cria a tabela de agendamentos. Pontos importantes:

- `cliente_id BIGINT NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT` → a **chave estrangeira** apontando pra `clientes`. O `ON DELETE RESTRICT` é uma proteção: você não consegue apagar um cliente se ainda tiver agendamentos dele no banco.
- `status TEXT ... CHECK (status IN (...))` → restringe os valores possíveis a `pendente`, `em-andamento`, `finalizado` ou `cancelado`. Se você tentar gravar `xpto`, o banco vai recusar.

### Bloco 4 – Índice único parcial

```sql
CREATE UNIQUE INDEX uniq_slot_ativo
    ON agendamentos (data_agendamento, horario)
    WHERE status <> 'cancelado';
```

Esse índice garante que **não existam dois agendamentos diferentes** para a mesma data + horário — **exceto** se um deles estiver cancelado. Ou seja: se você cancela um agendamento, o slot fica livre de novo para outro cliente. É um detalhe importante de regra de negócio.

### Bloco 5 – View pública `slots_ocupados`

```sql
CREATE OR REPLACE VIEW slots_ocupados AS
SELECT data_agendamento, horario FROM agendamentos ...
```

Uma **view** é uma "tabela virtual" — uma janelinha que mostra parte dos dados. A `slots_ocupados` mostra **só a data e o horário** dos agendamentos ativos. Por quê?

Porque o calendário no `index.html` precisa saber quais horários estão ocupados pra mostrar marcados em vermelho. Mas o calendário roda no navegador (qualquer pessoa pode ver) — e a gente não pode deixar o navegador ver **nome, CPF, telefone** de outros clientes.

A view é o filtro: o público vê só data+horário, **nunca os dados pessoais**.

### Bloco 6 – Row-Level Security (RLS)

```sql
ALTER TABLE clientes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos  ENABLE ROW LEVEL SECURITY;
```

RLS é o **porteiro** do banco. Ele decide quem pode ler/escrever em cada linha.

Como **não criamos nenhuma política** para o público (`anon`), o público fica **totalmente bloqueado** de mexer nas tabelas reais. Só consegue ver a view `slots_ocupados` que liberamos com `GRANT SELECT ON slots_ocupados TO anon`.

> **Resumindo:** o público (qualquer um com a chave anon, que é pública) só consegue ver data+horário ocupados. O backend Python (que tem a `service_role` key, secreta) vê tudo. Isso protege os dados dos seus clientes.

### Bloco 7 – Mensagem de confirmação

```sql
SELECT 'Schema criado com sucesso!' AS resultado, ...
```

Só uma mensagem amigável no final pra você ter certeza que tudo rodou.

---

## Conferir que as tabelas foram criadas

1. No menu lateral, clique em **"Table Editor"** (ícone que parece uma tabela / planilha).
2. Você deve ver, na lateral esquerda, as tabelas:
   - `clientes` (0 registros)
   - `agendamentos` (0 registros)
3. Se clicar em cada uma, vai ver as colunas que definimos.

> Se aparecer também uma `slots_ocupados` na lista — não é uma tabela, é a view. Pode ignorar ou clicar para ver (vai estar vazia também).

---

## Checklist de "deu tudo certo aqui"

- [ ] Você abriu o **SQL Editor** no painel da Supabase
- [ ] Colou o conteúdo de `schema.sql` e clicou **Run**
- [ ] Apareceu a mensagem `Schema criado com sucesso!` no resultado
- [ ] No **Table Editor** você vê as tabelas `clientes` e `agendamentos`, ambas com 0 linhas
- [ ] Você entendeu (pelo menos por cima) o que é uma chave estrangeira e por que separamos em duas tabelas

Próximo passo: pegar as chaves de acesso. Vá para [`03-PEGAR-AS-CREDENCIAIS.md`](03-PEGAR-AS-CREDENCIAIS.md).
