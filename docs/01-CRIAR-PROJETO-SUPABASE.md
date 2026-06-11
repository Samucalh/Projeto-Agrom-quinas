# 01 – Criar o projeto na Supabase

Agora vamos criar o projeto na Supabase. Lembre: a sua **conta** já existe (você usou o e-mail `samucamartins1803@gmail.com` para cadastrar). O que ainda **não existe** é um **projeto** dentro dela — é como ter conta no Gmail mas nenhum e-mail enviado ainda. Vamos resolver isso aqui.

> **Tempo estimado:** 5 minutos (mais 1 a 2 minutos esperando a Supabase criar o projeto)

---

## Passo 1 – Entrar na sua conta

1. Abra o navegador
2. Vá em **https://supabase.com/dashboard**
3. Faça login com o e-mail e senha que você já tem
4. Você vai cair numa tela chamada **"Projects"** (Projetos). Se essa for sua primeira vez, vai estar vazia, com uma mensagem do tipo _"Welcome to Supabase"_.

---

## Passo 2 – Criar um novo projeto

Procure um botão verde escrito **"New project"** (geralmente no topo da página ou no centro da tela quando ela está vazia). Clique nele.

> Algumas contas têm o conceito de **"Organization"** (Organização). Se aparecer um menu pedindo para escolher uma organização, escolha a única que existe (deve ter o nome da sua conta ou um nome aleatório que a Supabase gerou).

---

## Passo 3 – Preencher os dados do projeto

Vai aparecer um formulário com os seguintes campos:

### Project name (Nome do projeto)

Digite:

```
agromaquinas
```

> Use **só letras minúsculas, sem espaço, sem acento**. Esse nome vai aparecer na URL do banco e em vários lugares.

### Database Password (Senha do banco de dados)

A Supabase pede que você crie uma senha forte para o **banco de dados**. **ATENÇÃO**: essa senha é **diferente** da senha da sua conta Supabase. É uma senha separada, só para o banco em si.

> **O que fazer:**
>
> - Clique no botão **"Generate a password"** para a Supabase gerar uma senha forte automaticamente. Isso é muito mais seguro do que inventar.
> - **COPIE essa senha** e **anote no seu caderno físico ou em um gerenciador de senhas** com o rótulo:
>   > _"Senha do banco Supabase – AgroMáquinas"_
> - **Você não vai usar essa senha no dia a dia** — o `app.py` usa outra forma de autenticação (uma "chave de API"). Mas se um dia precisar acessar o banco direto, vai precisar dela.

### Region (Região)

Esse campo escolhe **em qual parte do mundo** o servidor do seu banco vai ficar. Quanto mais perto fisicamente da gente, mais rápido.

**Escolha:** **`South America (São Paulo)`** ou `sa-east-1`.

> Se essa opção não aparecer, escolha qualquer outra das Américas (US East, US West). O importante é não escolher Europa ou Ásia.

### Pricing Plan (Plano)

Escolha **"Free"** (gratuito). O plano free dá:

- 500 MB de banco (cabem **milhares** de agendamentos)
- 2 projetos gratuitos
- Suficiente para o trabalho da faculdade e para muito tempo depois

> **Você não precisa cadastrar cartão de crédito** para usar o plano free.

---

## Passo 4 – Clicar em "Create new project"

Há um botão verde no final do formulário, escrito **"Create new project"**. Clique.

Vai aparecer uma tela com uma animação de loading (carregamento) com mensagens tipo:

> _"Setting up your project..."_
> _"Configuring database..."_

**Espere de 1 a 3 minutos.** A Supabase está literalmente criando um servidor para você na nuvem. Não feche a janela.

---

## Passo 5 – Você está no painel do projeto

Quando terminar, você vai cair no **painel (dashboard)** do seu projeto. Ele tem:

- **Menu lateral esquerdo** com vários ícones (Table Editor, SQL Editor, Authentication, etc.)
- **Área central** com cards mostrando "Connect your project", "API", e outras coisas

**Não se assuste** com a quantidade de opções. Você vai usar só algumas delas. Para esta fase, só precisamos de duas:

| Menu              | Para quê                                        | Quando vai usar              |
| ----------------- | ----------------------------------------------- | ---------------------------- |
| **SQL Editor**    | Rodar comandos SQL (criar tabelas, consultar)   | Próximo doc                  |
| **Table Editor**  | Ver os dados em formato de planilha             | Depois de fazer agendamentos |
| **Project Settings → API** | Pegar URL e chave do projeto           | Doc 03                       |

---

## Checklist de "deu tudo certo aqui"

- [ ] Você está logado na Supabase com a conta `samucamartins1803@gmail.com`
- [ ] Você criou um projeto chamado **`agromaquinas`**
- [ ] Você anotou em local seguro a **senha do banco** que foi gerada
- [ ] A região do projeto é **South America (São Paulo)** (ou outra das Américas)
- [ ] Plano escolhido: **Free**
- [ ] Você está vendo o painel do projeto (com menu lateral à esquerda)

Pronto? Próximo passo: criar as tabelas. Vá para [`02-RODAR-O-SCHEMA.md`](02-RODAR-O-SCHEMA.md).
