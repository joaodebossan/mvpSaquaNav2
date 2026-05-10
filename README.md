# SaquaNav 📍

O **SaquaNav** é uma plataforma cívica e de gestão urbana (Cidadania Inteligente / Smart City) desenvolvida com foco no município de Saquarema. O projeto tem um objetivo duplo: engajar a população na zeladoria da cidade e fornecer um poderoso painel de Business Intelligence (BI) e gestão operacional para a prefeitura.

![Mockup SaquaNav](https://img.shields.io/badge/Status-Em%20Produ%C3%A7%C3%A3o-success) ![Stack](https://img.shields.io/badge/Stack-Vanilla_JS_|_Supabase-blue) ![Mobile First](https://img.shields.io/badge/Design-Mobile_First-orange)

## 🎯 Objetivo Geral do Projeto

A ideia central do SaquaNav é eliminar a burocracia na comunicação entre os cidadãos e o poder público. 

*   **Para o Cidadão:** Oferece um aplicativo rápido, intuitivo e com visual nativo (PWA-like) onde qualquer pessoa pode relatar buracos, acidentes, obras irregulares ou eventos diretamente em um mapa interativo, anexando fotos em tempo real.
*   **Para o Gestor Público (Admin):** Funciona como um painel de controle operacional. Permite auditar as queixas da população, monitorar a frota municipal ativa, gerenciar canteiros de obras e cruzar todos esses dados em um Dashboard Analítico, capaz de exportar relatórios gerenciais automáticos em PDF e Excel.

---

## 💡 Ideais de Concepção

O SaquaNav foi concebido sob três pilares fundamentais:

1.  **Foco Extremo em Performance (No-Build Tooling):** Para garantir que o app carregue rapidamente até em conexões 3G precárias, a arquitetura dispensou frameworks pesados (como React ou Angular) e processos de build (Webpack/Vite). O projeto é inteiramente construído em Vanilla JS, HTML e CSS, aproveitando os recursos nativos dos navegadores modernos.
2.  **Abordagem Mobile-First:** Tanto o painel do morador quanto o painel administrativo foram desenhados primeiramente para a tela do celular. Toda a interface usa padrões modernos de UX (Bottom Sheets, Swipes, Carrosséis Horizontais) simulando perfeitamente a experiência de um aplicativo nativo instalado no aparelho.
3.  **Sincronização em Tempo Real:** Problemas urbanos são urgentes. Utilizando as *Subscriptions* do Supabase, sempre que um morador reporta um buraco ou um gestor atualiza a localização de um caminhão da frota, todos os mapas (de todos os usuários conectados) são atualizados quase que instantaneamente, sem precisar recarregar a página.

---

## 🛠️ Tecnologias Aplicadas

A stack de tecnologia foi escolhida pela sua resiliência e facilidade de deploy:

*   **Front-end:** HTML5, CSS3 (variáveis CSS e Flexbox/Grid) e JavaScript moderno (ES6+).
*   **Mapas e Geolocalização:** [Leaflet.js](https://leafletjs.com/) consumindo tiles do OpenStreetMap.
*   **Back-end e Banco de Dados (BaaS):** [Supabase](https://supabase.com/) (PostgreSQL). Toda a lógica de banco, APIs REST e WebSockets (Realtime) é gerenciada pelo Supabase.
*   **Armazenamento de Mídia:** Armazenamento otimizado de imagens no banco em Base64, com estratégia de *Lazy Loading* (carregamento sob demanda) para não travar a renderização inicial do mapa.
*   **Geração de Relatórios:** Bibliotecas `jsPDF` e `jspdf-autotable` rodando inteiramente *Client-Side* para exportar os dados do painel BI direto do navegador do gestor.
*   **Hospedagem / Deploy:** Arquitetura Serverless focada em CDN (Vercel/GitHub Pages), garantindo cache edge e alta disponibilidade.

---

## 🗂️ Estrutura do Projeto

O código é modularizado separando claramente a experiência do morador da experiência do servidor público:

```text
SaquaNav-Mobile/
├── index.html           # Interface Principal (App do Cidadão)
├── admin.html           # Painel Administrativo e BI
├── css/
│   ├── usuario.css      # Estilos mobile-first do cidadão
│   └── admin.css        # Estilos, Dashboards e modais de gestão
└── js/
    ├── usuario.js       # Lógica do Leaflet, Envios de Reports e Favoritos locais
    └── admin.js         # Lógica de BI, Aprovação/Recusa, Frota e Canteiros de Obras
```

### 🧩 Módulos Principais

#### 📱 Módulo do Cidadão (`index.html`)
*   **Geolocalização Automática:** Encontra a posição do usuário ao abrir o app.
*   **Reports:** Formulário passo-a-passo para relatar Obras, Trânsito, Acidentes, Eventos ou Buracos.
*   **Favoritos:** Sistema local (`localStorage`) para favoritar reports específicos e acompanhar atualizações.
*   **Busca:** Motor de busca integrado ao OpenStreetMap (Nominatim) para encontrar ruas específicas de Saquarema.

#### 🔐 Módulo de Gestão Administrativa (`admin.html`)
*   **Auditoria de Reports:** Avaliação em fila (Aprovar / Recusar) de incidentes relatados pela população.
*   **Gestão de Canteiros (🏗️):** Cadastro de obras da prefeitura, maquinário alocado, anexo de fotos e posicionamento dinâmico no mapa.
*   **Monitoramento de Frota (🚛):** Controle de viaturas e caminhões (Placa, Modelo, Status de Operação/Manutenção).
*   **Dashboard BI e Exportações (📊):** Consolidação dos dados em Eixos Temáticos (*Estrutura Urbana*, *Sistema Viário*, etc) cruzando as queixas da população com os dados oficiais (como canteiros). Geração automática de relatórios em **PDF** ou **Excel (CSV)**.

---

## 🚀 Como Executar Localmente

1. Clone este repositório:
   ```bash
   git clone https://github.com/joaodebossan/mvpSaquaNav2.git
   ```
2. Inicie um servidor HTTP simples na raiz do projeto (Exemplo usando Python):
   ```bash
   python3 -m http.server 8080
   ```
3. Acesse no navegador:
   * **Cidadão:** `http://localhost:8080/index.html`
   * **Admin:** `http://localhost:8080/admin.html` (Usuário de teste configurado na interface).

## 🔒 Variáveis e Chaves
Este projeto depende das chaves públicas do Supabase (URL e API Key) que estão inicializadas diretamente no front-end (`js/usuario.js` e `js/admin.js`). Como o Row Level Security (RLS) garante a integridade da base, essas chaves anônimas podem operar de forma pública com segurança para leitura e inserções restritas.