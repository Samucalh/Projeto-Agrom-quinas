# 05 – Rodar e testar tudo end-to-end

Tudo configurado! Agora é a hora da verdade: ligar o backend, fazer um agendamento de teste, e ver os dados aparecerem no banco.

> **Tempo estimado:** 10 a 15 minutos

---

## Visão geral

Você vai precisar de **3 coisas abertas ao mesmo tempo**:

1. O **PowerShell** com o `app.py` rodando (vai ficar "preso", esperando requisições)
2. O **navegador** com o `index.html` aberto (pra fazer o agendamento)
3. O **painel da Supabase** (pra ver o dado chegar no banco)

A ordem aqui importa. Siga passo a passo.

---

## Passo 1 – Ligar o backend

Abra o PowerShell, navegue até a pasta do projeto, ative o `venv` e rode o `app.py`:

```powershell
cd "C:\Users\SEU_USUARIO\caminho\ate\Projeto-Agrom-quinas"
venv\Scripts\Activate.ps1
python app.py
```

> Se você fechou o PowerShell desde o doc anterior, vai precisar reativar o venv. Se o prompt já mostrar `(venv)`, pode pular essa parte.

Se tudo estiver certo, você vai ver:

```
==================================================
  AgroMáquinas API — porta 5000
  Teste: http://localhost:5000/api/health
  Debug: True
==================================================

 * Serving Flask app 'app'
 * Debug mode: on
WARNING: This is a development server. Do not use it in a production deployment. ...
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:5000
 * Running on http://192.168.x.x:5000
```

**O `app.py` está rodando.** Ele vai ficar nesse estado, parado, esperando requisições.

> **NÃO feche essa janela** enquanto estiver testando. Se fechar, o backend para.
>
> **Para parar mais tarde:** aperte **Ctrl + C** no PowerShell.

### Se aparecer um erro vermelho

Os mais comuns:

- **`RuntimeError: Defina SUPABASE_URL...`** → você não preencheu o `.env`. Volte ao [`04-CONFIGURAR-O-BACKEND.md`](04-CONFIGURAR-O-BACKEND.md).
- **`ModuleNotFoundError: No module named 'flask'`** → você não ativou o venv. Rode `venv\Scripts\Activate.ps1` antes do `python app.py`.
- **`OSError: [WinError 10048] ... port already in use`** → a porta 5000 está ocupada. Veja [`07-PROBLEMAS-COMUNS.md`](07-PROBLEMAS-COMUNS.md).

---

## Passo 2 – Testar a rota de saúde

Antes de mexer no formulário, vamos confirmar que o backend está respondendo.

Abra o navegador e vá em:

```
http://localhost:5000/api/health
```

Você deve ver um JSON tipo:

```json
{ "status": "ok", "service": "AgroMáquinas API", "version": "2.0.0" }
```

> Se aparecer **"Esse site não pode ser acessado"** ou erro de conexão, o `app.py` não está rodando. Volte ao PowerShell e confira se ele está com a mensagem "Running on http://127.0.0.1:5000".

---

## Passo 3 – Abrir o site (index.html)

Você tem 2 opções pra abrir o site:

### Opção A (mais simples) — Duplo clique no arquivo

1. Vá no Explorador de Arquivos até a pasta do projeto
2. Dê duplo clique em **`index.html`**
3. O navegador vai abrir o site

A URL no navegador vai ser algo como `file:///C:/Users/.../index.html`. Funciona, mas **o CORS do navegador pode reclamar** ao enviar dados. Se der erro de CORS, use a opção B.

### Opção B (recomendada) — Servidor estático local

Abra **outro PowerShell** (ative o venv também) e rode:

```powershell
python -m http.server 8000
```

Agora vá no navegador em:

```
http://localhost:8000
```

Você vai ver a tela do AgroMáquinas. Use essa URL pra testar.

> **Por que duas portas?** O Python está rodando dois servidores: o `app.py` na porta 5000 (banco) e o `http.server` na porta 8000 (serve o HTML). É normal ter vários servidores ao mesmo tempo em portas diferentes.

---

## Passo 4 – Fazer um agendamento de teste

Na tela do AgroMáquinas, role até a seção **"Faça seu Agendamento"** e clique em **Agendar Manutenção**.

### Passo 1 do formulário – Dados do cliente

Preencha com dados de teste:

- **Nome:** `João da Silva (TESTE)`
- **CPF/CNPJ:** Use um CPF válido. Para testes, pode usar **`111.444.777-35`** (esse é um CPF de teste com dígitos verificadores válidos).
  > Quando você sair do campo (clicar em outro lugar), o sistema vai consultar o backend. Como é a primeira vez, **não vai encontrar nada** — comportamento esperado. O aviso verde "cliente já cadastrado" **não vai aparecer**.
- **Telefone:** `(11) 99999-1234`
- **E-mail:** `teste@agromaquinas.com.br`

Clique em **Próximo →**.

### Passo 2 – Dados do serviço

- **Tipo de serviço:** Manutenção Preventiva
- **Tipo de maquinário:** Trator
- **Marca/Modelo:** John Deere 5075E
- **Ano:** 2020
- **Descrição do problema:** `Teste de cadastro inicial no banco de dados`
- **Localização:** `Fazenda Boa Vista, BR-163 km 45`

Clique em **Próximo →**.

### Passo 3 – Data e horário

- Escolha uma **data útil** (segunda a sexta) na próxima semana
- Escolha qualquer horário **disponível** (em verde)

Clique em **Próximo →**.

### Passo 4 – Confirmar

Confira os dados no resumo e clique em **✓ Confirmar Agendamento**.

Vai aparecer:

- Modal verde: **"Agendamento Confirmado!"** com um número de protocolo
- Toast (mensagem no canto): sucesso

> Se aparecer um erro vermelho tipo "Erro ao salvar agendamento", vá ver o PowerShell do `app.py` — vai ter mensagens em vermelho explicando o que aconteceu. Verifique o [`07-PROBLEMAS-COMUNS.md`](07-PROBLEMAS-COMUNS.md).

---

## Passo 5 – Conferir no banco da Supabase

Agora abra o painel da Supabase em outra aba.

### Conferir o cliente

1. Menu lateral → **"Table Editor"**
2. Clique na tabela **`clientes`**
3. Você deve ver **1 linha**:

   | id  | nome                    | documento     | telefone      | email                       |
   | --- | ----------------------- | ------------- | ------------- | --------------------------- |
   | 1   | João da Silva (TESTE)   | 11144477735   | 11999991234   | teste@agromaquinas.com.br   |

### Conferir o agendamento

4. Clique na tabela **`agendamentos`**
5. Você deve ver **1 linha** com:
   - `cliente_id` = **1** (apontando para o João que acabou de cadastrar)
   - `tipo_servico` = "Manutenção Preventiva"
   - `data_agendamento` = a data que você escolheu
   - `status` = "pendente"
   - `created_at` = data/hora de agora

**Se você vê essas duas linhas, parabéns — o banco está funcionando ponta a ponta.**

---

## Passo 6 – Testar o autopreenchimento (a parte mais legal)

Agora vamos testar a feature de cliente reconhecido.

1. Volte ao site (`http://localhost:8000` ou abrindo o `index.html` de novo)
2. Clique em **Agendar Manutenção**
3. Passo 1 — preencha **somente o CPF** com `111.444.777-35`
4. Clique fora do campo (em qualquer outro lugar)

**O que deve acontecer:**

- O nome, telefone e e-mail são preenchidos **automaticamente**
- Aparece um aviso verde em cima dos campos:
  > _"✓ Cliente já cadastrado — dados preenchidos. Pode editar se algo mudou."_

**Que mágica é essa?** O `client.js` chamou `GET /api/clientes/lookup?documento=11144477735` e o backend respondeu com os dados que estavam no banco. Sem precisar pedir tudo de novo.

### Testar atualização

Ainda nessa tela:

5. Mude o telefone para `(11) 88888-5678`
6. Continue o agendamento normalmente até confirmar

Agora vá ao Supabase Table Editor → `clientes`:

- Você deve continuar vendo **uma única linha** do João (não duplicou).
- Mas o telefone agora é o **novo** (`11888885678`).
- O `updated_at` mudou para o horário de agora.

E na tabela `agendamentos` você vê **dois** agendamentos, ambos com `cliente_id = 1`.

---

## Passo 7 – Testar o painel admin

Abra **`admin.html`** (duplo clique no arquivo, ou `http://localhost:8000/admin.html` se estiver usando o servidor estático).

Você deve ver:

- Os agendamentos que você acabou de criar, listados
- O nome do cliente, tipo de serviço, máquina, localização aparecendo direito
- Conseguir clicar num agendamento e ver os detalhes

> Se aparecer "Erro ao carregar agendamentos", o `app.py` provavelmente parou. Confira no PowerShell.

Tente também:

- Mudar o status para "Em Andamento" — clica no botão e vê se atualiza
- Finalizar o serviço — clica em "Finalizar", escreve um relatório, salva

Cada ação reflete imediatamente no banco. Pode conferir no Supabase Table Editor.

---

## Checklist final do projeto funcionando

- [ ] `python app.py` roda sem erro, mostra "Running on http://127.0.0.1:5000"
- [ ] `http://localhost:5000/api/health` retorna `{"status":"ok",...}`
- [ ] O formulário do `index.html` salva agendamento e mostra modal de sucesso
- [ ] Na tabela `clientes` do Supabase aparece **uma linha** para o cliente novo
- [ ] Na tabela `agendamentos` aparece **uma linha** com `cliente_id` apontando pro cliente
- [ ] Agendar de novo com o **mesmo CPF** autopreenche os campos
- [ ] **Não duplica** cliente no segundo agendamento
- [ ] Se editar o telefone, o registro do cliente atualiza
- [ ] O `admin.html` mostra a lista e permite mudar status

Se você marcou todos os itens: **a camada de banco está 100% funcional**.

---

## Daqui pra frente

- Sempre que for trabalhar no projeto, **ative o venv** primeiro (`venv\Scripts\Activate.ps1`) e rode `python app.py`.
- Para fechar tudo, **Ctrl+C** no PowerShell para parar o `app.py`. Não esqueça também de parar o `http.server` se estiver usando.
- Veja [`06-VER-OS-DADOS.md`](06-VER-OS-DADOS.md) para aprender a navegar no painel Supabase com mais detalhes.
- Se algo der errado: [`07-PROBLEMAS-COMUNS.md`](07-PROBLEMAS-COMUNS.md).
