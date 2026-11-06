# 07 – Problemas comuns e como resolver

Esta é a página onde você volta toda vez que algo dá errado. Os problemas estão divididos por momento em que aparecem. **Use o índice** abaixo pra pular pro lugar certo.

## Índice rápido

- [Problemas com Python / PowerShell](#problemas-com-python--powershell)
- [Problemas no `pip install`](#problemas-no-pip-install)
- [Problemas ao rodar `python app.py`](#problemas-ao-rodar-python-apppy)
- [Problemas no navegador / formulário](#problemas-no-navegador--formulário)
- [Problemas com o autopreenchimento](#problemas-com-o-autopreenchimento)
- [Problemas no banco / Supabase](#problemas-no-banco--supabase)
- [Limitações conhecidas (o que melhorar depois)](#limitações-conhecidas)

---

## Problemas com Python / PowerShell

### "python não é reconhecido como um comando interno ou externo"

**Causa:** você esqueceu de marcar "Add python.exe to PATH" na instalação.

**Solução:**

1. Desinstale o Python: Iniciar → Configurações → Aplicativos → Python → Desinstalar
2. Reinstale **marcando** a caixinha "Add python.exe to PATH" (vide [`00.5-INSTALAR-PYTHON-WINDOWS.md`](00.5-INSTALAR-PYTHON-WINDOWS.md))
3. **Feche e abra o PowerShell de novo** — o PATH só atualiza em janelas novas

---

### "venv\Scripts\Activate.ps1 cannot be loaded because running scripts is disabled on this system"

**Causa:** o Windows bloqueia scripts PowerShell por padrão (proteção de segurança).

**Solução:**

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Confirme com `S` e Enter. Depois tente ativar de novo.

---

### O prompt do PowerShell não mostra `(venv)` mesmo eu tendo "ativado"

**Causa:** o venv não foi ativado corretamente, ou você está em outra pasta.

**Solução:**

1. Confirme que está na pasta certa: `pwd` deve mostrar a pasta do projeto
2. Confirme que existe a pasta `venv`: `ls` deve listar `venv` entre os itens
3. Ative novamente: `venv\Scripts\Activate.ps1`
4. Se mesmo assim não aparecer `(venv)`, **feche o PowerShell e abra de novo**, refaça os passos

---

## Problemas no `pip install`

### "ERROR: Could not install packages due to an OSError"

**Causa mais comum:** permissão. Você está rodando o pip fora do venv (e o Windows está protegendo).

**Solução:**

1. Confirme que o venv está ativo (deve aparecer `(venv)` no prompt)
2. Rode `pip install -r requirements.txt` de novo

---

### "SSL: CERTIFICATE_VERIFY_FAILED"

**Causa:** sua rede (provavelmente Wi-Fi da faculdade ou empresa) está bloqueando/inspecionando HTTPS.

**Solução:**

- Use **dados móveis do celular** como roteador (Wi-Fi de hotspot)
- Ou, se for confiável o ambiente: `pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org -r requirements.txt`

---

### "ERROR: pip's dependency resolver does not currently take into account..."

**Causa:** apenas um aviso, normalmente não impede a instalação.

**Solução:** se no final aparecer `Successfully installed`, tudo certo. Pode ignorar o aviso.

---

## Problemas ao rodar `python app.py`

### "RuntimeError: ⚠️ Defina SUPABASE_URL e SUPABASE_SERVICE_KEY no arquivo .env"

**Causa:** o `app.py` não está achando as variáveis do `.env`. Possibilidades:

1. O arquivo `.env` não existe (você não rodou `copy .env.example .env`)
2. O arquivo `.env` existe mas está vazio ou com os placeholders
3. O arquivo se chama `.env.txt` em vez de `.env` (Windows tende a esconder extensões)

**Solução:**

1. No PowerShell, rode `dir .env` (ou `ls .env`) — deve aparecer **`.env`** exato, sem `.txt`.
2. Abra o `.env` e confira que tem `SUPABASE_URL=` e `SUPABASE_SERVICE_KEY=` preenchidos com valores reais (não placeholders).
3. Se estiver `.env.txt`, renomeie via PowerShell: `ren .env.txt .env`

---

### "ModuleNotFoundError: No module named 'flask'" (ou 'supabase', etc.)

**Causa:** você não ativou o venv, ou as dependências não foram instaladas.

**Solução:**

```powershell
venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

---

### "OSError: [WinError 10048] ... port already in use" / "address already in use"

**Causa:** já tem alguma coisa rodando na porta 5000.

**Solução 1 (recomendada):** descobrir quem está usando a porta e fechar:

```powershell
netstat -ano | findstr :5000
```

Vai aparecer uma linha tipo: `TCP    0.0.0.0:5000    ...    LISTENING    12345`. O `12345` é o PID do programa. Para fechá-lo:

```powershell
taskkill /PID 12345 /F
```

**Solução 2:** mude a porta. No `.env`, troque `PORT=5000` para `PORT=5001`. **Mas também ajuste `utils.js`:** a linha que diz `5000` precisa virar `5001` também.

---

### O app.py rodou mas trava em "Initializing..." e não continua

**Causa:** problema de DNS / rede para alcançar a Supabase.

**Solução:**

- Confirme que tem internet
- Verifique a URL no `.env` — deve começar com `https://` e terminar com `.supabase.co`, **sem barra no final**
- Tente abrir a URL diretamente no navegador. Se carregar uma página "Welcome to Supabase", a URL está certa.

---

## Problemas no navegador / formulário

### "Erro ao salvar agendamento" (toast vermelho no canto)

**Causas possíveis e como descobrir qual é:**

1. Abra o **PowerShell onde o `app.py` está rodando**
2. Vai aparecer uma linha em vermelho com a mensagem de erro real
3. Veja qual erro caiu:

#### `CPF/CNPJ inválido.`

O CPF que você digitou tem dígitos verificadores errados. Use um CPF válido — por exemplo `111.444.777-35` (CPF de teste padrão) ou um CPF real seu.

#### `Este horário já está reservado. Escolha outro horário.`

Alguém (talvez você mesmo num teste anterior) já reservou esse slot. Escolha outro horário.

#### `Erro interno: ...`

Algo mais sério. Vai ter detalhes técnicos depois do `:`. Procure as palavras-chave no Google ou cole no [`07-PROBLEMAS-COMUNS.md`](07-PROBLEMAS-COMUNS.md) se for recorrente.

---

### "CORS policy: No 'Access-Control-Allow-Origin' header is present" no console do navegador

**Causa:** você abriu o `index.html` com duplo clique (URL `file://...`), mas o `app.py` está configurado pra permitir só conexões HTTP/HTTPS.

**Solução:** use a **Opção B** do [`05-RODAR-E-TESTAR.md`](05-RODAR-E-TESTAR.md) — rodar um servidor estático:

```powershell
python -m http.server 8000
```

E abra `http://localhost:8000` no navegador.

---

### O calendário no formulário não mostra horários ocupados

**Causa:** chamada `/api/agendamentos/slots` falhou. Causas possíveis:

1. O backend não está rodando — confira o PowerShell
2. A view `slots_ocupados` não foi criada — re-rode o `schema.sql` no SQL Editor

---

## Problemas com o autopreenchimento

### Eu digito o CPF e não acontece nada

**Causas:**

1. Você não saiu do campo (o lookup só dispara no evento `blur`). **Clique em qualquer outro lugar** depois de digitar o CPF.
2. O CPF que você digitou **não é válido** (dígitos verificadores errados). O lookup só dispara com CPF/CNPJ válido. Esse comportamento é intencional, é parte da proteção contra varredura.
3. O `app.py` não está rodando — confira o PowerShell.
4. É a primeira vez que esse CPF é usado — o sistema não vai achar nada (comportamento correto).

**Como conferir o que aconteceu:**

- Abra o **DevTools do navegador** (F12) → aba **Network**
- Digite o CPF de novo, saia do campo
- Procure uma linha chamada `lookup?documento=...`
- Clica nela e vê:
  - **Status 200** = encontrou cliente, autopreencheu (verifica se a mensagem verde aparece em cima)
  - **Status 404** = cliente novo, sem autopreenchimento (correto pra primeira vez)
  - **Status 422** = "Documento inválido" (CPF errado)
  - **Não aparece nenhuma linha** = JavaScript não chamou. Veja se o `app.py` está rodando.

---

## Problemas no banco / Supabase

### "permission denied for table agendamentos" no log do `app.py`

**Causa:** você está usando a **anon key** em vez da **service_role key**.

**Solução:** no `.env`, confira se o valor de `SUPABASE_SERVICE_KEY` começa com `eyJhbGc...` e é o que aparece na linha **service_role** do painel Supabase. Releia o [`03-PEGAR-AS-CREDENCIAIS.md`](03-PEGAR-AS-CREDENCIAIS.md).

---

### "duplicate key value violates unique constraint uniq_slot_ativo"

**Causa:** você tentou criar dois agendamentos pro mesmo dia + horário (ambos não cancelados).

**Solução:** escolha outro horário, ou cancele o agendamento antigo primeiro.

---

### "violates foreign key constraint agendamentos_cliente_id_fkey"

**Causa:** você tentou apagar um cliente que ainda tem agendamentos.

**Solução:** apague os agendamentos do cliente primeiro, depois tente apagar o cliente. **Ou** apenas marque o cliente como "inativo" (não fizemos esse campo nesta versão; pra essa fase, apenas deixe o cliente lá).

---

### "Schema criado com sucesso" não aparece mas também não dá erro

**Causa:** versão antiga do schema já existe no banco e está em conflito.

**Solução** (cuidado — apaga dados!):

No SQL Editor, rode antes do `schema.sql`:

```sql
DROP TABLE IF EXISTS agendamentos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP VIEW IF EXISTS slots_ocupados;
```

Depois rode o `schema.sql` normal. **Isso apaga tudo do banco** — só faça se for o que você quer.

---

## Limitações conhecidas

Aqui ficam coisas que **não estão erradas**, mas que você precisa saber pra o futuro.

### 1) Risco de privacidade no endpoint de lookup

O endpoint `GET /api/clientes/lookup?documento=XXX` permite descobrir **nome, telefone e e-mail** de qualquer cliente, dado o CPF/CNPJ.

**Por que é um problema:** se alguém souber o CPF de uma pessoa cadastrada, pode descobrir o telefone e o e-mail dela, sem autenticação nenhuma.

**Mitigações já em vigor:**

- O endpoint só dispara se o CPF for matematicamente válido (impede varredura aleatória)
- Não expõe ID interno, datas de cadastro, ou dados de agendamentos
- Está documentado aqui

**Como resolver de verdade no futuro (Fase 2):**

- Adicionar login do cliente (Supabase Auth) — só consegue ver os próprios dados depois de logado
- Ou pedir uma 2ª informação para "confirmar" (ex: data do último agendamento)
- Ou tornar o endpoint privado (só admin pode chamar) e fazer o autopreenchimento em outro fluxo

Para um TCC, **o risco está aceito e documentado**. Em produção real, **trate isso** antes de colocar no ar.

### 2) Sem login do admin

Qualquer pessoa que acessar `admin.html` consegue ver/alterar agendamentos. Em produção, isso seria um problema.

**Como resolver no futuro:** Supabase Auth com login por e-mail/senha. Isso é parte da Fase 2 (não está incluso nesta entrega).

### 3) Sem deletar / soft delete

Apagar um cliente do `Table Editor` é bloqueado se ele tiver agendamentos (proteção FK). Idealmente teria um campo `ativo BOOLEAN` na tabela `clientes` para "desligar" sem apagar. Fica como ideia de evolução.

### 4) Backup automático só uma vez por dia (plano Free)

Se você apagar dados sem querer no meio do dia, o backup pode estar desatualizado. Pra projetos sérios, pague o plano Pro (que tem backups frequentes) ou faça backup manual antes de operações arriscadas.

### 5) Senhas e tokens no `.env`

Por enquanto, a `service_role` key fica no `.env` em texto puro. Pra um projeto pequeno, está OK. Em produção:

- Use serviços como AWS Secrets Manager, Doppler, ou variáveis de ambiente do host
- **Nunca** comite o `.env` (já tratado pelo `.gitignore`)

---

## Quando nada disso resolveu

1. Anote o erro **exatamente** como aparece (copia tudo, sem resumir)
2. Anote o passo onde estava (qual doc estava seguindo, qual comando rodou)
3. Procure o erro no Google entre aspas (ex: `"ModuleNotFoundError: No module named 'flask'"`)
4. Se mesmo assim travar, é hora de pedir ajuda — leve essas informações junto.
