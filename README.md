# SaquaNav

SaquaNav e uma aplicacao de mapa colaborativo desenvolvida para a cidade de Saquarema, RJ. Permite que moradores registrem ocorrencias como obras, transito, acidentes, buracos e eventos diretamente no mapa interativo. Administradores podem revisar, aprovar e gerenciar os registros em tempo real por meio de um painel dedicado.

---

## Sumario

- [Visao Geral](#visao-geral)
- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Banco de Dados](#banco-de-dados)
- [Executando Localmente](#executando-localmente)
- [Deploy](#deploy)
- [Configuracao](#configuracao)
- [Contribuindo](#contribuindo)
- [Licenca](#licenca)

---

## Visao Geral

O SaquaNav e uma aplicacao front-end estatica sem servidor proprio. Toda a persistencia de dados e gerenciada pelo [Supabase](https://supabase.com), que fornece um banco PostgreSQL gerenciado com API REST e assinaturas em tempo real via WebSocket. A aplicacao e hospedada na [Vercel](https://vercel.com) e redeploya automaticamente a cada push para o branch `main`.

---

## Funcionalidades

### Interface do Usuario

- Mapa interativo com [Leaflet.js](https://leafletjs.com) e tiles do OpenStreetMap.
- Criacao de registros pressionando e segurando (mobile) ou com duplo clique (desktop) no mapa.
- Tipos de ocorrencia: obras, transito, acidente, evento e buraco.
- Anexo de foto com botoes separados para camera e galeria no mobile.
- Deteccao automatica de endereco via geocodificacao reversa (API Nominatim).
- Sistema de favoritos pessoal por conta de usuario, com armazenamento isolado por nome de login.
- Atualizacao em tempo real dos marcadores no mapa quando o administrador aprova, reprova ou exclui um registro.
- Suporte a modo claro e escuro com preferencia salva no navegador.
- Barra de busca com autocompletar de enderecos.
- Filtros de categoria para exibir ou ocultar tipos de ocorrencia no mapa.
- Badge de favorito exibido diretamente sobre o marcador do evento quando o usuario estiver logado.

### Interface do Administrador

- Painel de login separado da interface do usuario.
- Lista de todos os registros submetidos com carrossel horizontal de cards no mobile.
- Aprovacao, reprovacao e exclusao de registros com atualizacao imediata no Supabase.
- Carregamento lazy de fotos nos cards da lista e nos popups do mapa.
- Criacao manual de registros via clique longo ou duplo clique no mapa.
- Atualizacoes em tempo real via canal Supabase Realtime (WebSocket).
- Painel de estatisticas com totais de registros pendentes, aprovados e reprovados.

---

## Arquitetura

```
Navegador (Usuario / Admin)
          |
          | HTTPS
          v
     Vercel CDN
  (HTML, CSS, JS estaticos)
          |
          | Supabase JS SDK (REST + WebSocket)
          v
  Supabase (PostgreSQL)
  - tabela reports
  - politicas de Row Level Security
  - publicacao Realtime
```

A aplicacao utiliza a biblioteca cliente do Supabase (`@supabase/supabase-js`) carregada via CDN. Nao e necessario etapa de build nem bundler. Os deploys sao acionados automaticamente por pushes no GitHub.

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Front-end | HTML5, CSS3, JavaScript (ES2020+) vanilla |
| Mapa | Leaflet.js 1.9.4 |
| Banco de dados | Supabase (PostgreSQL) |
| Tempo real | Supabase Realtime (WebSocket) |
| Geocodificacao | OpenStreetMap Nominatim API |
| Hospedagem | Vercel (site estatico) |
| Controle de versao | Git / GitHub |

---

## Estrutura do Projeto

```
SaquaNav-Mobile/
├── index.html              # Pagina do usuario final
├── admin.html              # Painel do administrador
├── vercel.json             # Configuracao de deploy na Vercel
├── .gitignore
├── css/
│   ├── usuario.css         # Estilos da interface do usuario
│   └── admin.css           # Estilos do painel administrativo
└── js/
    ├── supabase-config.js  # Inicializacao do cliente Supabase (compartilhado)
    ├── usuario.js          # Logica da interface do usuario
    └── admin.js            # Logica do painel administrativo
```

---

## Banco de Dados

A aplicacao utiliza uma unica tabela no Supabase.

### Criacao da Tabela

```sql
CREATE TABLE reports (
  id            BIGSERIAL PRIMARY KEY,
  tipo          TEXT NOT NULL,
  lat           REAL,
  lng           REAL,
  endereco      TEXT,
  descricao     TEXT,
  imagem_base64 TEXT,
  timestamp     TIMESTAMPTZ DEFAULT NOW(),
  status        TEXT DEFAULT 'pendente'
);
```

### Politicas de Seguranca (Row Level Security)

```sql
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura publica"  ON reports FOR SELECT USING (true);
CREATE POLICY "Insercao publica" ON reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Update admin"     ON reports FOR UPDATE USING (true);
CREATE POLICY "Delete admin"     ON reports FOR DELETE USING (true);
```

> **Aviso:** As politicas acima permitem acesso publico total para fins de MVP. Em producao, restrinja as operacoes de UPDATE e DELETE a usuarios autenticados com perfil de administrador.

### Publicacao Realtime

Para habilitar atualizacoes em tempo real, adicione a tabela `reports` a publicacao do Supabase Realtime:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE reports;
```

---

## Executando Localmente

Os tiles do OpenStreetMap exigem um cabecalho HTTP `Referer`, o que impede abrir o arquivo diretamente no navegador via `file://`. Utilize um servidor local.

### Com Python (recomendado)

```bash
cd "SaquaNav-Mobile"
python3 -m http.server 8080
```

Acesse em [http://localhost:8080](http://localhost:8080).

O painel administrativo esta disponivel em [http://localhost:8080/admin.html](http://localhost:8080/admin.html).

---

## Deploy

O projeto esta configurado para deploy automatico na Vercel. O arquivo `vercel.json` na raiz instrui a Vercel a servir o projeto como site estatico com URLs limpas.

### Passo a Passo

1. Envie o repositorio para o GitHub.
2. Acesse [vercel.com](https://vercel.com) e importe o repositorio.
3. Defina o **Framework Preset** como `Other`.
4. Deixe os campos de Build Command e Output Directory em branco.
5. Clique em **Deploy**.

A partir dai, cada `git push origin main` dispara um redeploy automatico sem interrupcao do servico.

### Enviando Alteracoes

```bash
git add -A
git commit -m "tipo: descricao da alteracao"
git push origin main
```

---

## Configuracao

As credenciais do Supabase ficam no arquivo `js/supabase-config.js`, carregado antes dos scripts principais em ambas as paginas.

```js
// js/supabase-config.js
const SUPABASE_URL = 'https://seu-projeto.supabase.co';
const SUPABASE_KEY = 'sua-chave-anon-publica';

const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);
```

> A chave `anon` e a chave publica da API. E seguro expor em codigo client-side desde que as politicas de Row Level Security estejam corretamente configuradas.

---

## Contribuindo

1. Crie um fork do repositorio.
2. Crie um branch para a sua alteracao: `git checkout -b feature/nome-da-funcionalidade`.
3. Faca o commit das alteracoes: `git commit -m "feat: descricao"`.
4. Envie para o seu fork: `git push origin feature/nome-da-funcionalidade`.
5. Abra um Pull Request contra o branch `main`.

### Convencao de Commits

| Prefixo | Uso |
|---|---|
| `feat:` | Nova funcionalidade |
| `fix:` | Correcao de bug |
| `style:` | Alteracoes visuais ou de CSS |
| `refactor:` | Reestruturacao de codigo sem mudanca de comportamento |
| `docs:` | Atualizacoes de documentacao |

---

## Licenca

Projeto desenvolvido para a cidade de Saquarema, RJ, Brasil. Todos os direitos reservados.