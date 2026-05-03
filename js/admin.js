  // ---- LOGIN ----
  // Usuário: admin | Senha: saqua123
  // (Em um projeto real, isso seria verificado no servidor!)
  const ADMIN_USER  = 'admin';
  const ADMIN_SENHA = 'saqua123';

  function fazerLogin() {
    try {
      const u    = document.getElementById('loginUsuario').value.trim();
      const s    = document.getElementById('loginSenha').value.trim();
      const erro = document.getElementById('loginErro');

      if (u === ADMIN_USER && s === ADMIN_SENHA) {
        document.getElementById('telaLogin').style.display = 'none';
        iniciarApp();
      } else {
        erro.textContent = '❌ Usuário ou senha incorretos.';
        erro.style.display = 'block';
        setTimeout(() => erro.style.display = 'none', 3000);
      }
    } catch(err) {
      const erro = document.getElementById('loginErro');
      erro.textContent = "Erro JS: " + err.message;
      erro.style.display = 'block';
    }
  }

  // ---- TEMA ----
  let isDark = false;
  try { isDark = localStorage.getItem('tema-admin') === 'dark'; } catch(e) {}

  function aplicarTema() {
    document.body.classList.toggle('dark', isDark);
    document.getElementById('btnTema').textContent = isDark ? '☀️' : '🌙';
  }

  function alternarTema() {
    isDark = !isDark;
    localStorage.setItem('tema-admin', isDark ? 'dark' : 'light');
    aplicarTema();
  }

  aplicarTema();

  // ---- CONFIGURAÇÃO DO MAPA ----
  const CENTRO = [-22.9370, -42.4980];
  let mapa;
  let marcadorLocal = null;
  let camadaReports;

  // Emoji de cada tipo
  const EMOJIS = {
    obras:    '🚧',
    transito: '🚗',
    acidente: '🚨',
    evento:   '🎉',
    buraco:   '⚠️'
  };

  function criarIcone(emoji) {
    return L.divIcon({
      html: `<div class="emoji-marker">${emoji}</div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });
  }

  // ---- DADOS ----
  let reports = [];
  let marcadorBusca = null;
  let timerBusca = null;
  let timerBuscaPin = null;

  // ---- BUSCA DE ENDEREÇO ----
  function buscarEndereco(texto) {
    clearTimeout(timerBusca);
    const box = document.getElementById('searchResults');

    if (texto.trim().length < 3) {
      box.classList.remove('ativo');
      return;
    }

    box.innerHTML = '<div class="result-vazio">🔍 Buscando...</div>';
    box.classList.add('ativo');

    timerBusca = setTimeout(async () => {
      try {
        const q = encodeURIComponent(texto + ', Saquarema, Rio de Janeiro, Brasil');
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=5`, {
          headers: { 'Accept-Language': 'pt-BR' }
        });
        const data = await res.json();

        if (!data.length) {
          box.innerHTML = '<div class="result-vazio">Nenhum endereço encontrado.</div>';
          return;
        }

        box.innerHTML = data.map(item => `
          <div class="result-item" onclick="irParaEndereco(${item.lat}, ${item.lon}, '${item.display_name.replace(/'/g,"\\'")}')">
            <span style="font-size:20px">📍</span>
            <div>
              <div class="result-nome">${item.display_name.split(',')[0]}</div>
              <div class="result-end">${item.display_name.split(',').slice(1,3).join(', ')}</div>
            </div>
          </div>
        `).join('');
      } catch {
        box.innerHTML = '<div class="result-vazio">Erro na busca.</div>';
      }
    }, 600);
  }

  function irParaEndereco(lat, lon, nome) {
    document.getElementById('searchResults').classList.remove('ativo');
    document.getElementById('searchInput').value = nome.split(',')[0];
    
    if (marcadorBusca) mapa.removeLayer(marcadorBusca);
    if (timerBuscaPin) clearTimeout(timerBuscaPin);
    
    marcadorBusca = L.marker([lat, lon], { icon: criarIcone('📍') }).addTo(mapa);
    marcadorBusca.bindPopup(`<div style="font-weight:700">📍 ${nome.split(',')[0]}</div>`).openPopup();
    mapa.flyTo([lat, lon], 17);
    
    timerBuscaPin = setTimeout(() => {
      if (marcadorBusca) {
        mapa.removeLayer(marcadorBusca);
        marcadorBusca = null;
      }
    }, 10000);
  }

  // ---- MENU LOGO ----
  function toggleLogoMenu() {
    const lm = document.getElementById('logoMenu');
    if (lm) lm.classList.toggle('ativo');
  }

  function fazerLogoutAdmin() {
    // Redireciona para a página principal (usuário)
    window.location.href = 'usuario.html';
  }

  // Fecha busca ou menu ao clicar fora
  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrapper')) {
      const sr = document.getElementById('searchResults');
      if(sr) sr.classList.remove('ativo');
    }
    if (!e.target.closest('.logo-wrapper')) {
      const lm = document.getElementById('logoMenu');
      if(lm) lm.classList.remove('ativo');
    }
  });

  // ---- INICIAR APP (depois do login) ----
  function iniciarApp() {
    mapa = L.map('mapa', { doubleClickZoom: false }).setView(CENTRO, 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapa);

    camadaReports = L.layerGroup().addTo(mapa);

    // ---- DUPLO CLIQUE / CLIQUE LONGO = NOVO REPORT ----
    let latLngNovoReport = null;

    const abrirNovoReportDoMapa = async e => {
      latLngNovoReport = e.latlng;
      document.getElementById('endNovoReport').value = 'Detectando...';
      document.getElementById('tipoNovoReport').value = 'obras';
      document.getElementById('descNovoReport').value = '';
      
      const imgPreview = document.getElementById('previewFotoAdmin');
      if (imgPreview) imgPreview.style.display = 'none';
      
      const fileInput = document.getElementById('fotoNovoReport');
      if (fileInput) fileInput.value = '';

      abrirModal('modalNovoReport');

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`,
          { headers: { 'Accept-Language': 'pt-BR' } }
        );
        const data = await res.json();
        document.getElementById('endNovoReport').value = data.display_name || 'Endereço não encontrado';
      } catch {
        document.getElementById('endNovoReport').value = 'Endereço não encontrado';
      }
    };

    mapa.on('dblclick', abrirNovoReportDoMapa);
    mapa.on('contextmenu', abrirNovoReportDoMapa);

    carregarReports();
    minhaLocalizacao(true);

    // Tempo real: verifica novos reports a cada 5 segundos
    setInterval(carregarReports, 5000);
  }

  // ---- CARREGAR REPORTS (COM TEMPO REAL) ----
  let reportsHash = '';

  async function carregarReports() {
    try {
      const res = await fetch('/api/relatorios');
      if (!res.ok) throw new Error('Servidor offline');
      const data = await res.json();
      
      // Só recarrega a tela se houver alguma mudança real nos dados
      const novoHash = JSON.stringify(data);
      if (novoHash !== reportsHash) {
        reportsHash = novoHash;
        reports = data;
        renderizarReports();
        atualizarStats();
      }
    } catch {
      // Falhas silenciosas no background
    }
  }

  // ---- MOSTRAR REPORTS NA LISTA E NO MAPA ----
  function renderizarReports() {
    const lista = document.getElementById('listaReports');
    camadaReports.clearLayers();

    if (!reports.length) {
      lista.innerHTML = '<div class="vazio">Nenhum report ainda.</div>';
      return;
    }

    lista.innerHTML = reports.map(r => {
      const emoji  = EMOJIS[r.tipo] || '📌';
      const status = r.status || 'pendente';
      const data   = new Date(r.timestamp).toLocaleString('pt-BR');
      return `
        <div class="report-card" id="card-${r.id}">
          <div class="report-header">
            <div class="report-tipo">${emoji} ${r.tipo}</div>
            <span class="badge badge-${status}">${status}</span>
          </div>
          <div class="report-end">📍 ${r.endereco || 'Sem endereço'}</div>
          ${r.descricao ? `<div class="report-desc">${r.descricao}</div>` : ''}
          <div class="report-data">🕐 ${data}</div>
          <div class="report-acoes">
            <button class="btn-ir"      onclick="irPara(${r.lat},${r.lng})">🗺️ Ver</button>
            <button class="btn-aprovar" onclick="aprovarReport(${r.id})">✅ Aprovar</button>
            <button class="btn-recusar" onclick="recusarReport(${r.id})">❌ Recusar</button>
            <button class="btn-deletar" onclick="deletarReport(${r.id})">🗑️</button>
          </div>
        </div>
      `;
    }).join('');

    // Coloca os reports no mapa
    reports.forEach(r => {
      if (r.status === 'recusado') return; // não mostra recusados no mapa
      const emoji = EMOJIS[r.tipo] || '📌';
      const m     = L.marker([r.lat, r.lng], { icon: criarIcone(emoji) });
      m.bindPopup(`
        <div style="min-width:180px">
          <div style="font-size:14px;font-weight:700;color:var(--text)">${emoji} ${r.tipo}</div>
          <div style="font-size:11px;color:var(--muted)">📍 ${r.endereco || ''}</div>
          ${r.descricao ? `<div style="font-size:12px;margin-top:6px">${r.descricao}</div>` : ''}
        </div>
      `);
      camadaReports.addLayer(m);
    });
  }

  // ---- AÇÕES NOS REPORTS ----
  async function aprovarReport(id) {
    try {
      await fetch(`/api/relatorios/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'aprovado' })
      });
      carregarReports();
    } catch {
      alert('Erro ao aprovar report');
    }
  }

  async function recusarReport(id) {
    try {
      await fetch(`/api/relatorios/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'recusado' })
      });
      carregarReports();
    } catch {
      alert('Erro ao recusar report');
    }
  }

  async function deletarReport(id) {
    if (!confirm('Deletar este report?')) return;
    try {
      await fetch(`/api/relatorios/${id}`, { method: 'DELETE' });
      carregarReports();
    } catch {
      alert('Erro ao deletar report');
    }
  }

  // ---- ADICIONAR REPORT MANUALMENTE ----
  async function salvarNovoReport() {
    const lat  = parseFloat(document.getElementById('latNovoReport').value);
    const lng  = parseFloat(document.getElementById('lngNovoReport').value);

    if (!lat || !lng) { alert('Coloque as coordenadas! Clique no mapa para pegar automaticamente.'); return; }

    const novo = {
      id:        Date.now(),
      tipo:      document.getElementById('tipoNovoReport').value,
      endereco:  document.getElementById('endNovoReport').value,
      descricao: document.getElementById('descNovoReport').value,
      lat:       lat,
      lng:       lng,
      timestamp: new Date().toISOString(),
      status:    'aprovado'
    };

    try {
      const res = await fetch('/api/relatorios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novo)
      });
      if (!res.ok) throw new Error('Servidor offline');
      fecharModal('modalNovoReport');
      carregarReports();
      alert('✅ Report adicionado!');
    } catch {
      alert('❌ Erro ao salvar report!');
    }
  }

  // ---- ESTATÍSTICAS ----
  function atualizarStats() {
    const total     = reports.length;
    const pendentes = reports.filter(r => (r.status || 'pendente') === 'pendente').length;
    const aprovados = reports.filter(r => r.status === 'aprovado').length;
    const recusados = reports.filter(r => r.status === 'recusado').length;

    document.getElementById('stat-total').textContent     = total;
    document.getElementById('stat-pendentes').textContent = pendentes;
    document.getElementById('stat-aprovados').textContent = aprovados;
    document.getElementById('stat-recusados').textContent = recusados;

    // Conta por tipo
    const contagem = {};
    reports.forEach(r => { contagem[r.tipo] = (contagem[r.tipo] || 0) + 1; });
    const tipos = Object.entries(contagem).sort((a,b) => b[1]-a[1]);
    document.getElementById('stats-tipos').innerHTML = tipos.map(([tipo, n]) =>
      `<div>${EMOJIS[tipo] || '📌'} ${tipo}: <strong>${n}</strong></div>`
    ).join('') || '<div style="color:var(--muted)">Sem dados ainda.</div>';
  }

  // ---- MINHA LOCALIZAÇÃO ----
  let timerLocalPin = null;

  function minhaLocalizacao(silent = false) {
    if (!navigator.geolocation) {
      if (!silent) alert('Geolocalização não suportada.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const ll = [pos.coords.latitude, pos.coords.longitude];
        
        if (marcadorLocal) mapa.removeLayer(marcadorLocal);
        if (timerLocalPin) clearTimeout(timerLocalPin);
        
        marcadorLocal = L.marker(ll, { icon: criarIcone('📍') }).addTo(mapa)
          .bindPopup('<div style="font-weight:700">📍 Você está aqui!</div>').openPopup();
        mapa.flyTo(ll, 16);
        
        timerLocalPin = setTimeout(() => {
          if (marcadorLocal) {
            mapa.removeLayer(marcadorLocal);
            marcadorLocal = null;
          }
        }, 10000);
      },
      () => {
        if (!silent) alert('Não foi possível obter sua localização.');
      }
    );
  }

  // ---- UTILITÁRIOS ----
  function irPara(lat, lng)  { mapa.flyTo([lat, lng], 17); }
  function abrirModal(id)    { document.getElementById(id).classList.add('ativo'); }
  function fecharModal(id)   { document.getElementById(id).classList.remove('ativo'); }

  function setStab(el, aba) {
    document.querySelectorAll('.stab').forEach(s => s.classList.remove('ativo'));
    el.classList.add('ativo');
    ['reports','stats'].forEach(id => {
      document.getElementById('tab-'+id).style.display = id === aba ? 'block' : 'none';
    });
  }

  // Fecha modal ao clicar fora
  document.querySelectorAll('.modal-bg').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('ativo'); });
  });
