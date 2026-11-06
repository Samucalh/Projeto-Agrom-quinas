# 04 – Configurar o backend Python

Agora vamos preparar o **backend** — o programinha Python (`app.py`) que vai ficar no meio entre o site e o banco. Isso envolve:

1. Criar um "ambiente virtual" (uma caixinha isolada onde as bibliotecas Python vão morar)
2. Instalar as dependências (Flask, Supabase, etc.)
3. Criar o arquivo `.env` com as chaves que você copiou

> **Tempo estimado:** 5 a 10 minutos (depende da velocidade da sua internet)

---

## Antes de começar

Você precisa estar com:

- Python instalado (você já fez no [`00.5-INSTALAR-PYTHON-WINDOWS.md`](00.5-INSTALAR-PYTHON-WINDOWS.md))
- PowerShell aberto **na pasta do projeto**
- Aquele bloco de notas com `SUPABASE_URL` e `SUPABASE_SERVICE_KEY`

Para navegar até a pasta do projeto no PowerShell:

```powershell
cd "C:\Users\SEU_USUARIO\caminho\ate\Projeto-Agrom-quinas"
```

(Troque pelo caminho real. Se esqueceu, releia a Parte 5 do [`00.5-INSTALAR-PYTHON-WINDOWS.md`](00.5-INSTALAR-PYTHON-WINDOWS.md).)

Confirme com `ls` — você deve ver `app.py`, `schema.sql`, `requirements.txt`, etc.

---

## Passo 1 – Criar o ambiente virtual

> **O que é um ambiente virtual?** É uma "caixinha" dentro da pasta do seu projeto, onde as bibliotecas Python ficam isoladas das do resto do computador. Isso evita que projetos diferentes briguem por versões diferentes. É padrão profissional.

No PowerShell (na pasta do projeto), digite:

```powershell
python -m venv venv
```

Vai demorar 10 a 30 segundos e não vai mostrar nada na tela. **Isso é normal** — quando termina, só volta o prompt.

Você vai notar que apareceu uma nova pasta chamada `venv` dentro do projeto (confirme com `ls`).

---

## Passo 2 – Ativar o ambiente virtual

Depois de criar, você precisa **"entrar"** dentro dele. Use o comando:

```powershell
venv\Scripts\Activate.ps1
```

### Se aparecer um erro de "Execution Policy"

Provavelmente vai aparecer um erro vermelho longo, parecido com:

> _"... cannot be loaded because running scripts is disabled on this system..."_

Isso é uma proteção padrão do Windows. **Solução** (digite no PowerShell):

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Vai aparecer uma pergunta de confirmação. Digite **`S`** (ou `Y`) e aperte Enter.

Agora tente ativar de novo:

```powershell
venv\Scripts\Activate.ps1
```

### Como saber se ativou

O prompt do PowerShell vai mudar e ficar com um `(venv)` no começo:

```
(venv) PS C:\Users\SeuNome\Projects\Projeto-Agrom-quinas>
```

Esse `(venv)` é o sinal de que o ambiente virtual está ativo. **De agora em diante, tudo que você instalar com `pip` fica dentro dessa caixinha.**

> **Você precisa ativar toda vez** que abrir um PowerShell novo para trabalhar no projeto. É só repetir o comando `venv\Scripts\Activate.ps1`. Quando quiser sair do venv, digite `deactivate`.

---

## Passo 3 – Instalar as dependências

Com o `(venv)` aparecendo no prompt, digite:

```powershell
pip install -r requirements.txt
```

O `pip` vai começar a baixar e instalar várias bibliotecas. Você vai ver uma lista correndo na tela, tipo:

```
Collecting flask>=3.0.0,<4.0.0
  Downloading flask-3.0.x-py3-none-any.whl ...
Collecting supabase>=2.7.0,<3.0.0
  Downloading supabase-2.x.x.tar.gz ...
...
Successfully installed flask-3.0.x flask-cors-4.0.x supabase-2.x.x ...
```

**Espere até aparecer `Successfully installed ...`**. Isso pode levar de 30 segundos a 2 minutos dependendo da sua internet.

### Se der erro de SSL ou rede

- Verifique sua conexão de internet
- Se estiver numa rede da faculdade com bloqueios, tente do celular usando dados móveis (4G/5G como roteador)
- Veja [`07-PROBLEMAS-COMUNS.md`](07-PROBLEMAS-COMUNS.md) para outros erros conhecidos

---

## Passo 4 – Criar o arquivo `.env`

O arquivo `.env` é onde a gente guarda as credenciais (URL e chave da Supabase) sem precisar deixá-las direto no código.

### 4.1 – Copiar o modelo

No PowerShell, ainda dentro da pasta do projeto:

```powershell
copy .env.example .env
```

Vai aparecer:

```
        1 file(s) copied.
```

Agora você tem um arquivo chamado `.env` (idêntico ao `.env.example`, com placeholders).

### 4.2 – Abrir o `.env` para editar

Abra o arquivo `.env` no seu editor de código favorito (VS Code, Bloco de Notas, etc.).

> **No Bloco de Notas:** clique com o botão direito no arquivo `.env` → **Abrir com** → **Escolher outro programa** → **Bloco de Notas**.
>
> Se você não está vendo o arquivo `.env` no Explorador de Arquivos, é porque ele começa com ponto e o Windows esconde por padrão. Vá em **Visualizar** → marque **"Itens ocultos"**.

Você vai ver algo assim:

```dotenv
SUPABASE_URL=https://SUBSTITUA-PELO-SEU-PROJETO.supabase.co
SUPABASE_SERVICE_KEY=eyJSUBSTITUA-PELA-SUA-SERVICE-ROLE-KEY
SECRET_KEY=troque-isso-por-uma-string-longa-aleatoria-de-no-minimo-32-chars
FLASK_ENV=development
PORT=5000
```

### 4.3 – Preencher com os valores reais

Agora cola os valores que você anotou no [`03-PEGAR-AS-CREDENCIAIS.md`](03-PEGAR-AS-CREDENCIAIS.md):

- Substitua a linha `SUPABASE_URL=...` pelo seu URL real
- Substitua a linha `SUPABASE_SERVICE_KEY=...` pela sua chave real
- Para a `SECRET_KEY`, troque o texto de exemplo por qualquer **string longa aleatória**. Sugestão fácil: digite no teclado coisa tipo `agromaquinas-2026-x9k3lq8p7vmnz4w2bg5tjh6yfd1c` — qualquer coisa **única e difícil de adivinhar** com 32+ caracteres serve.
- Deixe `FLASK_ENV=development` e `PORT=5000` como estão.

O arquivo final deve ficar assim:

```dotenv
SUPABASE_URL=https://abcdefghijklm.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
SECRET_KEY=agromaquinas-2026-x9k3lq8p7vmnz4w2bg5tjh6yfd1c
FLASK_ENV=development
PORT=5000
```

**Salve o arquivo** (Ctrl+S no editor) e feche.

### Conferir que NÃO vai para o Git

O `.gitignore` já está configurado para esconder o `.env`. Mas confirme:

```powershell
git status
```

Você **NÃO** deve ver `.env` na lista de "untracked files". Você deve ver só os arquivos `.env.example`, `requirements.txt`, etc.

Se aparecer `.env` na lista vermelha, alguma coisa deu errado no `.gitignore`. **NÃO faça commit**. Releia o arquivo `.gitignore` na raiz do projeto e verifique se a linha `.env` está lá.

---

## Checklist de "deu tudo certo aqui"

- [ ] Existe uma pasta `venv/` dentro da pasta do projeto
- [ ] No PowerShell aparece `(venv)` antes do caminho — venv ativo
- [ ] `pip install -r requirements.txt` terminou com `Successfully installed`
- [ ] Existe um arquivo `.env` na raiz do projeto, com os valores reais (não os placeholders)
- [ ] `git status` **não** mostra `.env` como arquivo novo a commitar

Pronto pra ligar o servidor: [`05-RODAR-E-TESTAR.md`](05-RODAR-E-TESTAR.md).
