# 03 – Pegar as credenciais da Supabase

Agora precisamos pegar dois "endereços de acesso" que o `app.py` vai usar para conversar com o seu banco:

1. **URL do projeto** — o "endereço" do servidor (parecido com um link de site)
2. **Chave service_role** — a "senha" que permite o `app.py` ler/escrever no banco

> **Tempo estimado:** 3 minutos
> **Atenção máxima:** a chave service_role dá **poder total** ao banco. Vou explicar isso direito antes.

---

## Antes de copiar: entendendo as chaves

A Supabase oferece **dois tipos de chave** para acessar o seu projeto:

### 1) `anon` (anônima) — chave pública

- **Quem pode ver?** Qualquer pessoa que abrir o site. Aparece no código do navegador.
- **Tem poderes?** Quase nenhum. Só consegue fazer o que você liberou nas **políticas RLS** (porteiro do banco).
- **No nosso projeto:** ela só conseguiria ler a view `slots_ocupados`. **A gente não vai usar essa chave** porque o nosso navegador fala com o `app.py`, não direto com a Supabase.

### 2) `service_role` (serviço) — chave secreta

- **Quem pode ver?** **Só você.** Nunca pode aparecer em código JavaScript de navegador.
- **Tem poderes?** **Totais.** Ignora todas as políticas RLS. Pode ler, escrever, deletar qualquer coisa em qualquer tabela.
- **No nosso projeto:** é a chave que o `app.py` usa pra conversar com o banco.

> **Analogia:** imagine seu apartamento.
>
> - A `anon` é como deixar um cartãozinho na porta dizendo "estou no andar 12". Qualquer um pode ler. Não dá pra fazer mal nenhum.
> - A `service_role` é a **chave mestra do prédio**, que abre todos os apartamentos, o cofre da administração, o terraço. Se cair na mão errada, qualquer um vira "dono" do seu banco.
>
> Por isso a `service_role`:
>
> - Fica **só dentro do `app.py`** (no arquivo `.env`, que está no `.gitignore`)
> - **Nunca** entra em código JavaScript
> - **Nunca** é commitada no Git
> - **Nunca** é compartilhada por mensagem, screenshot, etc.

---

## Passo 1 – Abrir as configurações de API

1. No painel da Supabase, com o projeto `agromaquinas` aberto, olhe o **menu lateral esquerdo**.
2. **Lá embaixo** (no rodapé do menu) tem um ícone de **engrenagem** ⚙️ ou um link escrito **"Project Settings"**.
3. Clique nele.

Vai abrir uma página com várias abas: General, Database, Authentication, **API**, etc.

4. Clique na aba **"API"** (geralmente na lateral, embaixo de "Configuration" ou "Settings").

---

## Passo 2 – Copiar a URL do projeto

Procure a seção **"Project URL"**. Você vai ver algo assim:

```
https://abcdefghijklm.supabase.co
```

(As letras antes de `.supabase.co` são o identificador único do seu projeto — vão ser diferentes pra você.)

**Copie esse endereço inteiro.** Use o botão de cópia ao lado do campo (se tiver) ou selecione + Ctrl+C.

Cole num bloco de notas temporário, com o rótulo:

```
SUPABASE_URL=https://abcdefghijklm.supabase.co
```

---

## Passo 3 – Copiar a chave service_role

Ainda na mesma página, procure a seção **"Project API keys"**. Tem duas chaves listadas:

- **`anon`** `public` — pode ignorar essa.
- **`service_role`** `secret` — **essa é a que importa**.

Ao lado da chave `service_role`, vai ter um botão **"Reveal"** (Revelar) ou um olho 👁️. Por padrão a chave está escondida (mostrando `eyJhbG.....`). Clique em **Reveal** para mostrar.

A chave vai parecer um texto longão tipo:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
```

(Ela tem cerca de 200 caracteres e três partes separadas por pontos `.`.)

**Copie a chave inteira.** Cole no seu bloco de notas temporário com o rótulo:

```
SUPABASE_SERVICE_KEY=eyJhbGciOi...
```

---

## Passo 4 – Onde guardar essas informações

Você acabou de copiar duas coisas:

1. `SUPABASE_URL=...`
2. `SUPABASE_SERVICE_KEY=...`

Vamos colocá-las no arquivo `.env` no próximo doc. **Por enquanto, deixe num bloco de notas aberto** (Bloco de Notas do Windows, mesmo).

> **Importante:**
>
> - **Não cole no chat com colegas** mesmo que seja só pra "testar".
> - **Não tire screenshot** dessa parte da tela e poste em lugar nenhum.
> - **Não commite no Git** (vamos garantir que o `.gitignore` cuida disso).

---

## E se a service_role vazar?

Se você acidentalmente expor a chave (postou em chat, commitou no Git, etc.), faça isso **imediatamente**:

1. Volte na página **Project Settings → API**
2. Ao lado da `service_role`, procure um botão **"Reset"** ou **"Generate new key"**
3. Clique. A Supabase gera uma chave nova e **invalida a antiga**.
4. Atualize o seu `.env` local com a nova chave.

A chave antiga deixa de funcionar imediatamente — então quem copiou ela perde o acesso.

---

## Checklist de "deu tudo certo aqui"

- [ ] Você abriu **Project Settings → API** no painel da Supabase
- [ ] Copiou a **Project URL** para o bloco de notas
- [ ] Clicou em "Reveal" na `service_role` key e copiou ela para o bloco de notas
- [ ] Você entendeu que a `service_role` **nunca** pode ir para o navegador / Git / chat
- [ ] Você tem essas duas linhas anotadas em algum lugar temporário:
  ```
  SUPABASE_URL=https://...supabase.co
  SUPABASE_SERVICE_KEY=eyJhbG...
  ```

Próximo passo: configurar o backend Python. Vá para [`04-CONFIGURAR-O-BACKEND.md`](04-CONFIGURAR-O-BACKEND.md).
