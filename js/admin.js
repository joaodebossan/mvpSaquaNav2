  // ---- FIX: Altura real do viewport no Android/iOS ----
  function fixViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', vh + 'px');
  }
  fixViewportHeight();
  window.addEventListener('resize', fixViewportHeight);
  window.addEventListener('orientationchange', () => setTimeout(fixViewportHeight, 100));

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
    buraco:   '⚠️',
    canteiro: '🏗️',
    frota:    '🚛'
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
  let latLngNovoReport = null; // escopo global para que salvarNovoReport() possa acessar
  
  // -- NOVAS CAMADAS --
  let camadaCanteiros;
  let camadaFrota;
  let canteiros = [];
  let frota = [];

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
    window.location.href = 'index.html';
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
    camadaCanteiros = L.layerGroup().addTo(mapa);
    camadaFrota = L.layerGroup().addTo(mapa);

    // ---- DUPLO CLIQUE / CLIQUE LONGO = INTERAÇÃO NO MAPA ----
    const tratarCliqueMapa = async e => {
      // 1. Se estamos reposicionando um canteiro
      if (selecionandoPosicaoCanteiro) {
        atualizarPosicaoCanteiroNoBanco(selecionandoPosicaoCanteiro, e.latlng.lat, e.latlng.lng);
        selecionandoPosicaoCanteiro = null;
        return;
      }

      // 2. Se estamos reposicionando um veículo da frota
      if (selecionandoPosicaoFrota) {
        atualizarPosicaoFrotaNoBanco(selecionandoPosicaoFrota, e.latlng.lat, e.latlng.lng);
        selecionandoPosicaoFrota = null;
        return;
      }

      // 3. Fallback: Adicionar novo Report (comportamento original)
      latLngNovoReport = e.latlng;
      document.getElementById('endNovoReport').value = 'Detectando...';
      document.getElementById('tipoNovoReport').value = 'transito';
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

    mapa.on('dblclick', tratarCliqueMapa);
    mapa.on('contextmenu', tratarCliqueMapa);

    carregarReports();
    carregarCanteiros();
    carregarFrota();
    minhaLocalizacao(true);

    // Dica mobile: aparece após o login, some em 6 segundos
    if (window.innerWidth <= 700) {
      const dica = document.createElement('div');
      dica.id = 'dica-admin';
      dica.textContent = '📍 Pressione e segure para adicionar um novo pin';
      dica.style.cssText = [
        'position:fixed',
        'bottom:calc(240px + env(safe-area-inset-bottom) + 12px)',
        'left:50%',
        'transform:translateX(-50%)',
        'background:rgba(10,20,40,0.92)',
        'color:#fff',
        'padding:10px 20px',
        'border-radius:24px',
        'font-size:13px',
        'font-weight:600',
        'white-space:nowrap',
        'pointer-events:none',
        'z-index:99999',          // acima de tudo
        'box-shadow:0 4px 20px rgba(0,0,0,0.4)',
        'transition:opacity 0.6s ease',
        'opacity:1'
      ].join(';');
      document.body.appendChild(dica);

      // Some com fade após 6 segundos
      setTimeout(() => {
        dica.style.opacity = '0';
        setTimeout(() => dica.remove(), 700);
      }, 6000);
    }

    // Realtime: recebe notificações instantâneas do Supabase via WebSocket
    db.channel('admin-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => carregarReports())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'canteiros' }, () => carregarCanteiros())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'frota' }, () => carregarFrota())
      .subscribe();

    // Fallback: recarrega a cada 60s caso o WebSocket caia
    setInterval(() => {
      carregarReports();
      carregarCanteiros();
      carregarFrota();
    }, 60000);
  }

  // ---- CARREGAR REPORTS ----
  let reportsHash = '';

  async function carregarReports() {
    try {
      // Busca sem imagem_base64 para carregamento rápido
      const { data, error } = await db
        .from('reports')
        .select('id,tipo,lat,lng,endereco,descricao,timestamp,status')
        .order('timestamp', { ascending: false });
      if (error) throw error;

      const novoHash = JSON.stringify(data);
      if (novoHash !== reportsHash) {
        reportsHash = novoHash;
        reports = data || [];
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
      // Foto carregada de forma lazy ao clicar no botão
      const fotoSlot = `<div id="foto-slot-${r.id}"><button class="btn-ver-foto" onclick="carregarFotoCard(${r.id})">📷 Ver foto</button></div>`;
      return `
        <div class="report-card" id="card-${r.id}">
          <div class="report-header">
            <div class="report-tipo">${emoji} ${r.tipo}</div>
            <span class="badge badge-${status}">${status}</span>
          </div>
          <div class="report-end">📍 ${r.endereco || 'Sem endereço'}</div>
          ${r.descricao ? `<div class="report-desc">${r.descricao}</div>` : ''}
          ${fotoSlot}
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

    // Mede o card real no DOM e ajusta a altura da sidebar
    requestAnimationFrame(ajustarSidebarMobile);


    // Coloca os reports no mapa
    reports.forEach(r => {
      if (r.status === 'recusado') return; // não mostra recusados no mapa
      const emoji = EMOJIS[r.tipo] || '📌';
      const m     = L.marker([r.lat, r.lng], { icon: criarIcone(emoji) });

      // Popup com botão lazy de foto — wrapper div para não fechar o popup ao clicar
      m.bindPopup(`
        <div style="min-width:180px" id="popup-inner-${r.id}">
          <div style="font-size:14px;font-weight:700;color:var(--text)">${emoji} ${r.tipo}</div>
          <div style="font-size:11px;color:var(--muted)">📍 ${r.endereco || ''}</div>
          <div id="foto-popup-${r.id}">
            <button class="btn-ver-foto"
              onclick="event.stopPropagation();carregarFotoPopup(${r.id})"
              style="margin-top:6px">📷 Ver foto</button>
          </div>
          ${r.descricao ? `<div style="font-size:12px;margin-top:6px">${r.descricao}</div>` : ''}
        </div>
      `);
      camadaReports.addLayer(m);
    });
  }


  // ---- AÇÕES NOS REPORTS ----
  async function aprovarReport(id) {
    try {
      const { error } = await db.from('reports').update({ status: 'aprovado' }).eq('id', id);
      if (error) throw error;
      carregarReports();
    } catch {
      alert('Erro ao aprovar report');
    }
  }

  async function recusarReport(id) {
    try {
      const { error } = await db.from('reports').update({ status: 'recusado' }).eq('id', id);
      if (error) throw error;
      carregarReports();
    } catch {
      alert('Erro ao recusar report');
    }
  }

  async function deletarReport(id) {
    if (!confirm('Deletar este report?')) return;
    try {
      const { error } = await db.from('reports').delete().eq('id', id);
      if (error) throw error;
      carregarReports();
    } catch {
      alert('Erro ao deletar report');
    }
  }

  // ---- LAZY LOAD DE FOTO NOS CARDS DO ADMIN ----
  async function carregarFotoCard(id) {
    const slot = document.getElementById(`foto-slot-${id}`);
    if (!slot) return;
    slot.innerHTML = '<span style="font-size:11px;color:var(--muted)">Carregando...</span>';
    try {
      const { data, error } = await db
        .from('reports')
        .select('imagem_base64')
        .eq('id', id)
        .single();
      if (error || !data?.imagem_base64) {
        slot.innerHTML = '<span style="font-size:11px;color:var(--muted)">Sem foto</span>';
        return;
      }
      slot.innerHTML = `<img src="${data.imagem_base64}" style="width:100%;border-radius:8px;margin:6px 0;max-height:120px;object-fit:cover;">`;
      requestAnimationFrame(ajustarSidebarMobile);
    } catch {
      slot.innerHTML = '<span style="font-size:11px;color:var(--muted)">Erro ao carregar foto</span>';
    }
  }

  // ---- LAZY LOAD DE FOTO NOS POPUPS DO MAPA (ADMIN) ----
  async function carregarFotoPopup(id) {
    // Usa o wrapper div para trocar o conteúdo sem fechar o popup
    const slot = document.getElementById(`foto-popup-${id}`);
    if (!slot) return;
    slot.innerHTML = '<span style="font-size:11px;color:var(--muted)">Carregando...</span>';
    try {
      const { data, error } = await db
        .from('reports')
        .select('imagem_base64')
        .eq('id', id)
        .single();
      if (error || !data?.imagem_base64) {
        slot.innerHTML = '<span style="font-size:11px;color:var(--muted)">Sem foto</span>';
        return;
      }
      slot.innerHTML = `<img src="${data.imagem_base64}"
        style="width:100%;border-radius:8px;margin:6px 0;max-height:120px;object-fit:cover;display:block">`;
    } catch {
      slot.innerHTML = '<span style="font-size:11px;color:var(--muted)">Erro ao carregar</span>';
    }
  }

  // ---- FOTO DO REPORT E CANTEIRO (ADMIN) ----
  function previewFotoAdmin(input) {
    if (!input.files[0]) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.getElementById('previewFotoAdmin');
      img.src = e.target.result;
      img.style.display = 'block';
    };
    reader.readAsDataURL(input.files[0]);
  }

  function previewFotoCanteiro(input) {
    if (!input.files[0]) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.getElementById('previewFotoCanteiro');
      img.src = e.target.result;
      img.style.display = 'block';
    };
    reader.readAsDataURL(input.files[0]);
  }

  // ---- ADICIONAR REPORT MANUALMENTE ----
  async function salvarNovoReport() {
    // Usa a variável latLngNovoReport que é preenchida ao clicar no mapa
    if (!latLngNovoReport) { alert('Clique no mapa para definir a localização!'); return; }

    const novo = {
      tipo:      document.getElementById('tipoNovoReport').value,
      endereco:  document.getElementById('endNovoReport').value,
      descricao: document.getElementById('descNovoReport').value,
      lat:       latLngNovoReport.lat,
      lng:       latLngNovoReport.lng,
      status:    'aprovado'
    };

    // Converte foto para base64 se houver
    const fotoInput = document.getElementById('fotoNovoReport');
    if (fotoInput && fotoInput.files[0]) {
      novo.imagem_base64 = await new Promise(resolve => {
        const r = new FileReader();
        r.onload = e => resolve(e.target.result);
        r.readAsDataURL(fotoInput.files[0]);
      });
    }

    try {
      const { error } = await db.from('reports').insert(novo);
      if (error) throw error;
      fecharModal('modalNovoReport');
      // Limpa preview e input da foto
      const imgPreview = document.getElementById('previewFotoAdmin');
      if (imgPreview) { imgPreview.src = ''; imgPreview.style.display = 'none'; }
      if (fotoInput) fotoInput.value = '';
      latLngNovoReport = null;
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
    
    // Unifica canteiros oficiais na contagem geral de "obras"
    if (canteiros.length > 0) {
      contagem['obras'] = (contagem['obras'] || 0) + canteiros.length;
    }

    const tipos = Object.entries(contagem).sort((a,b) => b[1]-a[1]);
    document.getElementById('stats-tipos').innerHTML = tipos.map(([tipo, n]) =>
      `<div>${EMOJIS[tipo] || '📌'} ${tipo}: <strong>${n}</strong></div>`
    ).join('') || '<div style="color:var(--muted)">Sem dados ainda.</div>';
    // Conta por Eixo Temático
    const eixoStats = {
      'Estrutura Urbana': 0,
      'Sistema Viário': 0,
      'Segurança': 0,
      'Gestão e Eventos': 0,
      'Frota Municipal': frota.length
    };

    reports.forEach(r => {
      if (r.tipo === 'obras') eixoStats['Estrutura Urbana']++;
      if (r.tipo === 'buraco' || r.tipo === 'transito') eixoStats['Sistema Viário']++;
      if (r.tipo === 'acidente') eixoStats['Segurança']++;
      if (r.tipo === 'evento') eixoStats['Gestão e Eventos']++;
    });

    eixoStats['Estrutura Urbana'] += canteiros.length;

    document.getElementById('stats-eixos').innerHTML = Object.entries(eixoStats).map(([eixo, n]) => `
      <div class="eixo-card" onclick="abrirModalExportar('${eixo}')">
        <div class="eixo-nome">${eixo}</div>
        <div class="eixo-valor">${n}</div>
      </div>
    `).join('');
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

  // Atualiza o mapa no mobile (a altura da sidebar agora é fixa via CSS)
  function ajustarSidebarMobile() {
    if (typeof mapa !== 'undefined') mapa.invalidateSize();
  }

  // Reajusta ao rotacionar a tela
  window.addEventListener('orientationchange', () => setTimeout(ajustarSidebarMobile, 200));

  function setStab(el, aba) {
    document.querySelectorAll('.stab').forEach(s => s.classList.remove('ativo'));
    el.classList.add('ativo');
    ['reports','canteiros','frota','stats'].forEach(id => {
      const p = document.getElementById('tab-'+id);
      if(p) p.style.display = id === aba ? 'block' : 'none';
    });
    requestAnimationFrame(ajustarSidebarMobile);
  }

  // Fecha modal ao clicar fora
  document.querySelectorAll('.modal-bg').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('ativo'); });
  });

  // =========================================================
  // GESTÃO DE CANTEIROS
  // =========================================================
  let selecionandoPosicaoCanteiro = null;

  async function carregarCanteiros() {
    try {
      // Busca sem imagem_base64 para carregamento rápido
      const { data, error } = await db.from('canteiros')
        .select('id, nome, status, lat, lng, detalhes_json, timestamp')
        .order('timestamp', { ascending: false });
      if (error) throw error;
      canteiros = data || [];
      renderizarCanteiros();
      atualizarStats();
    } catch {}
  }

  function renderizarCanteiros() {
    const lista = document.getElementById('listaCanteiros');
    camadaCanteiros.clearLayers();

    if (!canteiros.length) {
      lista.innerHTML = '<div class="vazio">Nenhum canteiro cadastrado.</div>';
      return;
    }

    lista.innerHTML = canteiros.map(c => {
      const fotoSlot = `<div id="foto-slot-canteiro-${c.id}"><button class="btn-ver-foto" onclick="carregarFotoCanteiroCard(${c.id})">📷 Ver foto</button></div>`;
      return `
      <div class="report-card">
        <div class="report-header">
          <div class="report-tipo">🏗️ ${c.nome}</div>
          <span class="badge" style="background:#e0e0e0;color:#000">${c.status}</span>
        </div>
        <div class="report-desc">${c.detalhes_json?.resumo || 'Sem detalhes'}</div>
        ${fotoSlot}
        <div class="report-acoes">
          <button class="btn-ir" onclick="ativarSelecaoPosicaoCanteiro(${c.id})">📍 Posicionar</button>
          <button class="btn-ir" onclick="if(${c.lat}) irPara(${c.lat},${c.lng})">🗺️ Mapa</button>
          <button class="btn-deletar" onclick="deletarCanteiro(${c.id})">🗑️ Excluir</button>
        </div>
      </div>
      `;
    }).join('');

    requestAnimationFrame(ajustarSidebarMobile);

    canteiros.forEach(c => {
      if (!c.lat) return;
      const icone = L.divIcon({
        html: `<div class="marker-destaque" style="border-color:#f57c00">🏗️</div>`,
        className: '', iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -18]
      });
      L.marker([c.lat, c.lng], { icon: icone })
        .bindPopup(`
          <div style="min-width:180px" id="popup-canteiro-inner-${c.id}">
            <b>🏗️ ${c.nome}</b><br>Status: ${c.status}<br>${c.detalhes_json?.resumo || ''}
            <div id="foto-popup-canteiro-${c.id}">
              <button class="btn-ver-foto" onclick="event.stopPropagation();carregarFotoCanteiroPopup(${c.id})" style="margin-top:6px">📷 Ver foto</button>
            </div>
          </div>
        `)
        .addTo(camadaCanteiros);
    });
  }

  function iniciarNovoCanteiro() {
    document.getElementById('nomeCanteiro').value = '';
    document.getElementById('detalhesCanteiro').value = '';
    
    // Limpa imagem se houver
    const imgPreview = document.getElementById('previewFotoCanteiro');
    if (imgPreview) { imgPreview.src = ''; imgPreview.style.display = 'none'; }
    const fileInput = document.getElementById('fotoNovoCanteiro');
    if (fileInput) fileInput.value = '';

    abrirModal('modalNovoCanteiro');
  }

  async function salvarCanteiro() {
    const nome = document.getElementById('nomeCanteiro').value.trim();
    if (!nome) return alert('O nome é obrigatório!');

    const novo = {
      nome: nome,
      status: document.getElementById('statusCanteiro').value,
      detalhes_json: { resumo: document.getElementById('detalhesCanteiro').value }
    };

    // Converte foto para base64 se houver
    const fotoInput = document.getElementById('fotoNovoCanteiro');
    if (fotoInput && fotoInput.files[0]) {
      novo.imagem_base64 = await new Promise(resolve => {
        const r = new FileReader();
        r.onload = e => resolve(e.target.result);
        r.readAsDataURL(fotoInput.files[0]);
      });
    }

    try {
      await db.from('canteiros').insert(novo);
      fecharModal('modalNovoCanteiro');
      carregarCanteiros();
    } catch {
      alert('Erro ao salvar canteiro.');
    }
  }

  // ---- LAZY LOAD DE FOTO DO CANTEIRO ----
  async function carregarFotoCanteiroCard(id) {
    const slot = document.getElementById(`foto-slot-canteiro-${id}`);
    if (!slot) return;
    slot.innerHTML = '<span style="font-size:11px;color:var(--muted)">Carregando...</span>';
    try {
      const { data, error } = await db.from('canteiros').select('imagem_base64').eq('id', id).single();
      if (error || !data?.imagem_base64) {
        slot.innerHTML = '<span style="font-size:11px;color:var(--muted)">Sem foto</span>';
        return;
      }
      slot.innerHTML = `<img src="${data.imagem_base64}" style="width:100%;border-radius:8px;margin:6px 0;max-height:120px;object-fit:cover;">`;
      requestAnimationFrame(ajustarSidebarMobile);
    } catch {
      slot.innerHTML = '<span style="font-size:11px;color:var(--muted)">Erro ao carregar foto</span>';
    }
  }

  async function carregarFotoCanteiroPopup(id) {
    const slot = document.getElementById(`foto-popup-canteiro-${id}`);
    if (!slot) return;
    slot.innerHTML = '<span style="font-size:11px;color:var(--muted)">Carregando...</span>';
    try {
      const { data, error } = await db.from('canteiros').select('imagem_base64').eq('id', id).single();
      if (error || !data?.imagem_base64) {
        slot.innerHTML = '<span style="font-size:11px;color:var(--muted)">Sem foto</span>';
        return;
      }
      slot.innerHTML = `<img src="${data.imagem_base64}" style="width:100%;border-radius:8px;margin:6px 0;max-height:120px;object-fit:cover;display:block">`;
    } catch {
      slot.innerHTML = '<span style="font-size:11px;color:var(--muted)">Erro ao carregar</span>';
    }
  }

  async function deletarCanteiro(id) {
    if (!confirm('Excluir este canteiro?')) return;
    await db.from('canteiros').delete().eq('id', id);
    carregarCanteiros();
  }

  function ativarSelecaoPosicaoCanteiro(id) {
    selecionandoPosicaoCanteiro = id;
    alert('👉 Agora dê um DUPLO CLIQUE ou pressione e segure no mapa na posição exata deste canteiro de obras.');
  }

  async function atualizarPosicaoCanteiroNoBanco(id, lat, lng) {
    try {
      await db.from('canteiros').update({ lat, lng, timestamp: new Date().toISOString() }).eq('id', id);
      alert('✅ Localização do canteiro atualizada no mapa!');
      carregarCanteiros();
    } catch {
      alert('❌ Erro ao atualizar localização do canteiro.');
    }
  }

  // =========================================================
  // MONITORAMENTO DE FROTA
  // =========================================================
  let selecionandoPosicaoFrota = null;

  async function carregarFrota() {
    try {
      const { data, error } = await db.from('frota').select('*').order('timestamp', { ascending: false });
      if (error) throw error;
      frota = data || [];
      renderizarFrota();
      atualizarStats();
    } catch {}
  }

  function renderizarFrota() {
    const lista = document.getElementById('listaFrota');
    camadaFrota.clearLayers();

    if (!frota.length) {
      lista.innerHTML = '<div class="vazio">Nenhum veículo cadastrado.</div>';
      return;
    }

    lista.innerHTML = frota.map(f => `
      <div class="report-card">
        <div class="report-header">
          <div class="report-tipo">🚛 ${f.placa}</div>
          <span class="badge" style="background:#e0e0e0;color:#000">${f.status}</span>
        </div>
        <div class="report-desc">${f.veiculo || 'Modelo não informado'}</div>
        <div class="report-acoes">
          <button class="btn-ir" onclick="ativarSelecaoPosicaoFrota(${f.id})">📍 Posicionar</button>
          <button class="btn-ir" onclick="if(${f.lat}) irPara(${f.lat},${f.lng})">🗺️ Mapa</button>
          <button class="btn-deletar" onclick="deletarFrota(${f.id})">🗑️</button>
        </div>
      </div>
    `).join('');

    requestAnimationFrame(ajustarSidebarMobile);

    frota.forEach(f => {
      if (!f.lat) return;
      const cor = f.status === 'em serviço' ? '#2e7d32' : f.status === 'manutenção' ? '#c62828' : '#f57c00';
      const icone = L.divIcon({
        html: `<div class="marker-destaque" style="border-color:${cor}">🚛</div>`,
        className: '', iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -18]
      });
      L.marker([f.lat, f.lng], { icon: icone })
        .bindPopup(`<b>🚛 ${f.placa}</b><br>${f.veiculo}<br>Status: ${f.status}`)
        .addTo(camadaFrota);
    });
  }

  function iniciarNovaFrota() {
    document.getElementById('idFrota').value = '';
    document.getElementById('placaFrota').value = '';
    document.getElementById('veiculoFrota').value = '';
    abrirModal('modalNovaFrota');
  }

  async function salvarFrota() {
    const placa = document.getElementById('placaFrota').value.trim();
    if (!placa) return alert('A placa é obrigatória!');

    const novo = {
      placa: placa,
      veiculo: document.getElementById('veiculoFrota').value,
      status: document.getElementById('statusFrota').value
    };

    try {
      await db.from('frota').insert(novo);
      fecharModal('modalNovaFrota');
      carregarFrota();
    } catch {
      alert('Erro ao salvar veículo.');
    }
  }

  async function deletarFrota(id) {
    if (!confirm('Excluir este veículo?')) return;
    await db.from('frota').delete().eq('id', id);
    carregarFrota();
  }

  function ativarSelecaoPosicaoFrota(id) {
    selecionandoPosicaoFrota = id;
    alert('👉 Agora dê um DUPLO CLIQUE ou pressione e segure no mapa na posição exata em que o veículo está.');
  }

  async function atualizarPosicaoFrotaNoBanco(id, lat, lng) {
    try {
      await db.from('frota').update({ lat, lng, timestamp: new Date().toISOString() }).eq('id', id);
      alert('✅ Posição do veículo atualizada no mapa!');
      carregarFrota();
    } catch {
      alert('❌ Erro ao atualizar posição da frota.');
    }
  }

  // =========================================================
  // EXPORTAÇÃO DE RELATÓRIOS
  // =========================================================
  let eixoExportacaoAtual = '';

  function abrirModalExportar(eixo) {
    eixoExportacaoAtual = eixo;
    document.getElementById('eixoExportacao').textContent = eixo;
    abrirModal('modalExportar');
  }

  function gerarRelatorio(formato) {
    if (!eixoExportacaoAtual) return;
    
    let linhasGeradas = [];

    // Lógica para exportar FROTA
    if (eixoExportacaoAtual === 'Frota Municipal') {
      if (frota.length === 0) {
        alert('Não há veículos cadastrados para exportar.');
        return;
      }
      linhasGeradas = frota.map(f => [
        f.id,
        new Date(f.timestamp).toLocaleString('pt-BR'),
        'FROTA',
        f.status.toUpperCase(),
        f.placa,
        f.veiculo || 'Modelo não informado'
      ]);
    } else {
      // 1. Filtrar reports do eixo atual
      const relatorios = reports.filter(r => {
        if (eixoExportacaoAtual === 'Estrutura Urbana' && r.tipo === 'obras') return true;
        if (eixoExportacaoAtual === 'Sistema Viário' && (r.tipo === 'buraco' || r.tipo === 'transito')) return true;
        if (eixoExportacaoAtual === 'Segurança' && r.tipo === 'acidente') return true;
        if (eixoExportacaoAtual === 'Gestão e Eventos' && r.tipo === 'evento') return true;
        return false;
      });

      linhasGeradas = relatorios.map(r => [
        r.id,
        new Date(r.timestamp).toLocaleString('pt-BR'),
        r.tipo.toUpperCase(),
        r.status.toUpperCase(),
        r.endereco || '',
        (r.descricao || '').replace(/\n/g, ' ')
      ]);

      // 2. Injetar Canteiros se o eixo for Estrutura Urbana
      if (eixoExportacaoAtual === 'Estrutura Urbana') {
        const canteirosFormatados = canteiros.map(c => [
          `C-${c.id}`,
          new Date(c.timestamp).toLocaleString('pt-BR'),
          'CANTEIRO',
          c.status.toUpperCase(),
          c.nome, // Usamos o Nome do Canteiro como "Endereço principal"
          (c.detalhes_json?.resumo || '').replace(/\n/g, ' ')
        ]);
        linhasGeradas = linhasGeradas.concat(canteirosFormatados);
      }

      if (linhasGeradas.length === 0) {
        alert('Não há relatórios ou registros neste eixo para exportar.');
        return;
      }
    }

    // 2. Preparar dados para PDF/Excel
    const cabecalho = ['ID', 'Data', 'Tipo', 'Status', 'Endereço/Referência', 'Descrição'];
    const linhas = linhasGeradas;

    const dataAtual = new Date().toISOString().split('T')[0];
    const nomeArquivo = `SaquaNav_${eixoExportacaoAtual.replace(/ /g, '_')}_${dataAtual}`;

    if (formato === 'excel') {
      // Gerar CSV com ponto e vírgula e BOM (padrão Brasil/Excel)
      let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; 
      csvContent += cabecalho.join(';') + '\n'; 
      linhas.forEach(linha => {
        const linhaEscapada = linha.map(col => `"${String(col).replace(/"/g, '""')}"`);
        csvContent += linhaEscapada.join(';') + '\n';
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `${nomeArquivo}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } else if (formato === 'pdf') {
      // Gerar PDF com jsPDF e AutoTable
      if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('A biblioteca de PDF ainda não carregou. Verifique sua conexão e tente novamente.');
        return;
      }
      const doc = new window.jspdf.jsPDF('landscape'); // Formato Paisagem
      
      doc.setFontSize(18);
      doc.text(`Relatório SaquaNav - ${eixoExportacaoAtual}`, 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);
      doc.text(`Total de registros: ${linhas.length}`, 14, 36);

      doc.autoTable({
        startY: 44,
        head: [cabecalho],
        body: linhas,
        theme: 'striped',
        headStyles: { fillColor: [26, 115, 232] },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          4: { cellWidth: 70 }, // Coluna Endereço fixa
          5: { cellWidth: 'auto' } // Coluna Descrição flexível
        }
      });

      doc.save(`${nomeArquivo}.pdf`);
    }

    fecharModal('modalExportar');
  }
