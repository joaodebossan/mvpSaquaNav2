    // ---- FIX: Altura real do viewport no Android/iOS ----
    // O 100vh no Android Chrome inclui a barra do navegador, causando overflow.
    // Aqui setamos --vh com a altura real visível e usamos no CSS.
    function fixViewportHeight() {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', vh + 'px');
    }
    fixViewportHeight();
    window.addEventListener('resize', fixViewportHeight);
    window.addEventListener('orientationchange', () => setTimeout(fixViewportHeight, 100));

    // Centro de Saquarema
    const CENTRO = [-22.9370, -42.4980];

    // Inicia o mapa
    const mapa = L.map('mapa', {
      doubleClickZoom: false // duplo clique abre o report, não dá zoom
    }).setView(CENTRO, 15);

    // Camada do OpenStreetMap (gratuito)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapa);

    // Dados do app
    let reports       = [];
    let favoritos     = [];
    let latLngAtual   = null;
    let marcadorBusca = null;
    let marcadorLocal = null;

    // Quais tipos estão visíveis no mapa
    let filtrosAtivos = new Set(['obras', 'transito', 'acidente', 'evento', 'buraco', 'favorito']);

    // Camada de marcadores
    const camada = L.layerGroup().addTo(mapa);

    // Emoji de cada tipo
    const EMOJIS = {
      obras:    '🚧',
      transito: '🚗',
      acidente: '🚨',
      evento:   '🎉',
      buraco:   '⚠️',
      favorito: '❤️'
    };

    // ---- TEMA ----
    let isDark = localStorage.getItem('tema') === 'dark';

    function aplicarTema() {
      document.body.classList.toggle('dark', isDark);
      document.getElementById('btnTema').textContent = isDark ? '☀️' : '🌙';
    }

    function alternarTema() {
      isDark = !isDark;
      localStorage.setItem('tema', isDark ? 'dark' : 'light');
      aplicarTema();
    }

    aplicarTema();

    // ---- BUSCA DE ENDEREÇO ----
    let timerBusca = null;

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

    let timerBuscaPin = null;

    function irParaEndereco(lat, lon, nome) {
      document.getElementById('searchResults').classList.remove('ativo');
      document.getElementById('searchInput').value = nome.split(',')[0];
      
      if (marcadorBusca) mapa.removeLayer(marcadorBusca);
      if (timerBuscaPin) clearTimeout(timerBuscaPin);
      
      marcadorBusca = L.marker([lat, lon], { icon: criarIcone('📍') }).addTo(mapa);
      marcadorBusca.bindPopup(`<div class="popup-titulo">📍 ${nome.split(',')[0]}</div>`).openPopup();
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
      document.getElementById('logoMenu').classList.toggle('ativo');
    }
    
    // Fecha busca ou menu da logo ao clicar fora
    document.addEventListener('click', e => {
      if (!e.target.closest('.search-wrapper'))
        document.getElementById('searchResults').classList.remove('ativo');
        
      if (!e.target.closest('.logo-wrapper'))
        document.getElementById('logoMenu').classList.remove('ativo');
    });

    // ---- LOGIN SIMULADO ----
    function getUsuarioLogado() {
      return localStorage.getItem('saquanav-usuario-nome');
    }

    function atualizarEstadoLogin() {
      const nome = getUsuarioLogado();
      if (nome) {
        document.getElementById('menuItemLogin').style.display = 'none';
        document.getElementById('menuItemLogout').style.display = 'block';
        document.getElementById('menuItemLogout').textContent = `Sair (${nome})`;
      } else {
        document.getElementById('menuItemLogin').style.display = 'block';
        document.getElementById('menuItemLogout').style.display = 'none';
      }
    }

    function fazerLoginUsuario() {
      const nome = document.getElementById('nomeUsuarioLogin').value.trim();
      if (!nome) { alert('Por favor, insira o seu nome!'); return; }
      localStorage.setItem('saquanav-usuario-nome', nome);
      fecharModal('modalLoginUsuario');
      atualizarEstadoLogin();
      // Carrega os favoritos deste usuário e atualiza os badges no mapa
      carregarFavoritos();
      renderizarMarcadores();
      alert(`Olá, ${nome}! Agora você pode salvar seus favoritos.`);

      // Se estava tentando acessar os favoritos, abrimos agora
      if (document.getElementById('painelFavoritos').classList.contains('pendente')) {
        document.getElementById('painelFavoritos').classList.remove('pendente');
        setTab(document.querySelectorAll('.tab')[2], 'favoritos');
      }
    }

    function fazerLogoutUsuario() {
      localStorage.removeItem('saquanav-usuario-nome');
      favoritos = []; // limpa favoritos da memória
      atualizarEstadoLogin();
      fecharPainel('painelFavoritos');
      renderizarFavoritos();  // limpa a lista
      renderizarMarcadores(); // remove os badges do mapa
      alert('Você saiu da sua conta.');
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
            .bindPopup('<div class="popup-titulo">📍 Você está aqui!</div>').openPopup();
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

    // ---- CRIAR ÍCONE EMOJI ----
    // Cria ícone emoji simples ou com badge de favorito
    function criarIcone(emoji, ehFavorito = false) {
      const badge = ehFavorito
        ? '<span style="position:absolute;top:-4px;right:-4px;font-size:10px;line-height:1">❤️</span>'
        : '';
      return L.divIcon({
        html: `<div class="emoji-marker" style="position:relative">${emoji}${badge}</div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });
    }

    // ---- DUPLO CLIQUE / CLIQUE LONGO = REPORT ----
    const abrirNovoReportDoMapa = async e => {
      latLngAtual = e.latlng;

      document.getElementById('enderecoReport').value = 'Detectando...';
      document.getElementById('enderecoFav').value    = 'Detectando...';
      document.getElementById('tipoReport').value     = '';
      document.getElementById('descReport').value     = '';
      // Limpa ambos os inputs de foto e o preview
      const prev = document.getElementById('previewFoto');
      if (prev) { prev.src = ''; prev.style.display = 'none'; }
      const ic = document.getElementById('fotoReportCamera');
      const ig = document.getElementById('fotoReportGaleria');
      if (ic) ic.value = '';
      if (ig) ig.value = '';

      abrirModal('modalReport');

      // Busca o endereço automaticamente pelo GPS
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`,
          { headers: { 'Accept-Language': 'pt-BR' } }
        );
        const data = await res.json();
        const end  = data.display_name || 'Endereço não encontrado';
        document.getElementById('enderecoReport').value = end;
        document.getElementById('enderecoFav').value    = end;
      } catch {
        document.getElementById('enderecoReport').value = 'Endereço não encontrado';
        document.getElementById('enderecoFav').value    = 'Endereço não encontrado';
      }
    };

    mapa.on('dblclick', abrirNovoReportDoMapa);
    mapa.on('contextmenu', abrirNovoReportDoMapa);

    // ---- PREVIEW DA FOTO ----
    function previewFoto(input) {
      if (!input.files[0]) return;
      const reader = new FileReader();
      reader.onload = e => {
        const img = document.getElementById('previewFoto');
        img.src = e.target.result;
        img.style.display = 'block';
      };
      reader.readAsDataURL(input.files[0]);
    }

    // ---- SALVAR REPORT ----
    async function salvarReport() {
      const tipo = document.getElementById('tipoReport').value;
      if (!tipo) { alert('Selecione um tipo de ocorrência!'); return; }

      const payload = {
        lat:       latLngAtual.lat,
        lng:       latLngAtual.lng,
        tipo,
        endereco:  document.getElementById('enderecoReport').value,
        descricao: document.getElementById('descReport').value,
        status:    'pendente'
      };

      // Pega a foto de qualquer um dos dois inputs (câmera ou galeria)
      const fotoCamera  = document.getElementById('fotoReportCamera');
      const fotoGaleria = document.getElementById('fotoReportGaleria');
      const fotoArquivo = fotoCamera?.files[0] || fotoGaleria?.files[0] || null;

      if (fotoArquivo) {
        payload.imagem_base64 = await new Promise(res => {
          const r = new FileReader();
          r.onload = e => res(e.target.result);
          r.readAsDataURL(fotoArquivo);
        });
      }

      try {
        const { error } = await db.from('reports').insert(payload);
        if (error) throw error;
        fecharModal('modalReport');
        // Limpa os inputs de foto após envio
        const ic = document.getElementById('fotoReportCamera');
        const ig = document.getElementById('fotoReportGaleria');
        const pv = document.getElementById('previewFoto');
        if (ic) ic.value = '';
        if (ig) ig.value = '';
        if (pv) { pv.src = ''; pv.style.display = 'none'; }
        await carregarReports();
        alert('✅ Report enviado! Obrigado por contribuir!');
      } catch {
        alert('❌ Erro ao comunicar com o servidor!');
      }
    }

    // ---- FAVORITOS ----
    // Retorna a chave de favoritos do usuário atual
    function chaveFavoritos() {
      const usuario = getUsuarioLogado();
      return usuario ? `saquanav-favoritos-${usuario}` : null;
    }

    function carregarFavoritos() {
      const chave = chaveFavoritos();
      favoritos = chave ? JSON.parse(localStorage.getItem(chave) || '[]') : [];
      renderizarFavoritos();
    }

    function salvarFavorito() {
      const nome = document.getElementById('nomeFav').value.trim() || 'Meu local';
      const fav  = {
        id:       Date.now(),
        emoji:    document.getElementById('emojiFav').value,
        nome:     nome,
        endereco: document.getElementById('enderecoFav').value,
        lat:      latLngAtual.lat,
        lng:      latLngAtual.lng
      };
      favoritos.push(fav);
      const chave = chaveFavoritos();
      if (chave) localStorage.setItem(chave, JSON.stringify(favoritos));
      fecharModal('modalFavorito');
      renderizarFavoritos();
      renderizarMarcadores();
      alert('❤️ Favorito salvo!');
    }

    function deletarFavorito(id) {
      if (!confirm('Remover este favorito?')) return;
      favoritos = favoritos.filter(f => f.id !== id);
      const chave = chaveFavoritos();
      if (chave) localStorage.setItem(chave, JSON.stringify(favoritos));
      renderizarFavoritos();
      renderizarMarcadores();
    }

    // Remove favorito pelo lat/lng — usado pelo popup do mapa
    function deletarFavoritoDoMapa(lat, lng) {
      favoritos = favoritos.filter(f => !(f.lat === lat && f.lng === lng));
      const chave = chaveFavoritos();
      if (chave) localStorage.setItem(chave, JSON.stringify(favoritos));
      mapa.closePopup();
      renderizarFavoritos();
      renderizarMarcadores();
    }

    function renderizarFavoritos() {
      const lista = document.getElementById('listaFavoritos');
      if (!favoritos.length) {
        lista.innerHTML = '<div class="vazio-msg">Você ainda não tem favoritos.<br>Toque duas vezes no mapa e salve um local!</div>';
        return;
      }
      lista.innerHTML = favoritos.map(f => `
        <div class="fav-card" onclick="irParaFav(${f.lat}, ${f.lng})">
          <span class="fav-emoji">${f.emoji}</span>
          <div class="fav-info">
            <div class="fav-nome">${f.nome}</div>
            <div class="fav-end">${f.endereco ? f.endereco.split(',')[0] : ''}</div>
          </div>
          <button class="btn-del-fav" onclick="event.stopPropagation();deletarFavorito(${f.id})">🗑️</button>
        </div>
      `).join('');
    }

    function irParaFav(lat, lng) {
      fecharPainel('painelFavoritos');
      mapa.flyTo([lat, lng], 17);
    }

    // ---- GEOCODIFICAR ENDEREÇO VIA NOMINATIM ----
    async function geocodificar(endereco) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(endereco + ', Saquarema, RJ, Brasil')}&format=json&limit=1&countrycodes=br`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'SaquaNav/1.0' } });
        const data = await res.json();
        if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      } catch {}
      return null;
    }

    // ---- CARREGAR REPORTS ----
    async function carregarReports() {
      try {
        // Busca sem imagem_base64 para carregamento rápido
        // A foto é carregada de forma lazy ao abrir o popup
        const { data, error } = await db
          .from('reports')
          .select('id,tipo,lat,lng,endereco,descricao,timestamp,status')
          .order('timestamp', { ascending: false });
        if (error) throw error;
        reports = data || [];
        renderizarMarcadores();
      } catch {
        reports = [];
        renderizarMarcadores();
      }
    }

    // ---- COLOCAR MARCADORES NO MAPA ----
    function renderizarMarcadores() {
      camada.clearLayers();

      // Reseta o cache de foto: novos marcadores precisam carregar a foto novamente
      reports.forEach(r => { r._imgLoaded = false; });

      // Reports
      reports.forEach(r => {
        if (!filtrosAtivos.has(r.tipo)) return;

        const emoji = EMOJIS[r.tipo] || '📌';
        // Verifica se este report é favorito do usuário
        const ehFavorito = getUsuarioLogado() && favoritos.some(f => f.lat === r.lat && f.lng === r.lng);
        const m = L.marker([r.lat, r.lng], { icon: criarIcone(emoji, ehFavorito) });
        const data  = new Date(r.timestamp).toLocaleString('pt-BR');

        // Função que monta o HTML do popup (com ou sem foto)
        function buildPopup(imgHtml = '') {
          // Botão muda conforme o estado de favorito
          const btnFav = ehFavorito
            ? `<button class="popup-btn-fav popup-btn-desfav" onclick="deletarFavoritoDoMapa(${r.lat},${r.lng})">🗑️ Remover dos favoritos</button>`
            : `<button class="popup-btn-fav" onclick="abrirFavoritoDoMapa(${r.lat},${r.lng},'${(r.endereco||'').replace(/'/g,"\\'")}')">❤️ Salvar nos favoritos</button>`;
          return `
            <div style="min-width:200px">
              <div class="popup-titulo">${emoji} ${r.tipo.charAt(0).toUpperCase() + r.tipo.slice(1)}</div>
              <div class="popup-sub">📍 ${r.endereco || ''}</div>
              ${imgHtml}
              ${r.descricao ? `<div class="popup-desc">${r.descricao}</div>` : ''}
              <div class="popup-data">${data}</div>
              ${btnFav}
            </div>
          `;
        }

        m.bindPopup(buildPopup()); // Popup inicial sem foto (rápido)

        // Lazy load da foto ao abrir o popup
        m.on('popupopen', async () => {
          if (r._imgLoaded) return; // já carregou antes
          r._imgLoaded = true;
          try {
            const { data: imgData } = await db
              .from('reports')
              .select('imagem_base64')
              .eq('id', r.id)
              .single();
            if (imgData?.imagem_base64) {
              const imgHtml = `<img src="${imgData.imagem_base64}" class="popup-foto">`;
              m.setPopupContent(buildPopup(imgHtml));
            }
          } catch {}
        });

        camada.addLayer(m);
      });

      // Favoritos: só exibe se o usuário estiver logado
      // (os marcadores de favorito já aparecem como badge nos reports acima)
      // Aqui mostramos apenas favoritos que NÃO têm report correspondente
      if (filtrosAtivos.has('favorito') && getUsuarioLogado()) {
        const reportPositions = new Set(reports.map(r => `${r.lat},${r.lng}`));
        favoritos
          .filter(f => !reportPositions.has(`${f.lat},${f.lng}`))
          .forEach(f => {
          const m = L.marker([f.lat, f.lng], { icon: criarIcone(f.emoji, true) });
          m.bindPopup(`
            <div style="min-width:180px">
              <div class="popup-titulo">${f.emoji} ${f.nome}</div>
              <div class="popup-sub">📍 ${f.endereco ? f.endereco.split(',')[0] : ''}</div>
              <button class="popup-btn-fav" onclick="deletarFavorito(${f.id})">🗑️ Remover favorito</button>
            </div>
          `);
          camada.addLayer(m);
        });
      }
    }

    function abrirFavoritoDoMapa(lat, lng, endereco) {
      if (!getUsuarioLogado()) {
        alert('Faça login primeiro para poder salvar seus locais!');
        abrirModal('modalLoginUsuario');
        return;
      }
      latLngAtual = { lat, lng };
      document.getElementById('enderecoFav').value = endereco;
      document.getElementById('nomeFav').value     = '';
      mapa.closePopup();
      abrirModal('modalFavorito');
    }

    // ---- FILTROS ----
    function alternarFiltro(btn, tipo) {
      btn.classList.toggle('off');
      if (filtrosAtivos.has(tipo)) filtrosAtivos.delete(tipo);
      else filtrosAtivos.add(tipo);
      renderizarMarcadores();
    }

    // ---- ABAS ----
    function setTab(el, aba) {
      if (aba === 'favoritos' && !getUsuarioLogado()) {
        document.getElementById('painelFavoritos').classList.add('pendente');
        abrirModal('modalLoginUsuario');
        return;
      }
      
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('ativo'));
      el.classList.add('ativo');
      if (aba === 'favoritos') abrirPainel('painelFavoritos');
      else if (aba === 'filtros') abrirPainel('painelFiltros');
      else if (aba === 'sobre') abrirPainel('painelSobre');
    }

    // ---- ABRIR / FECHAR ----
    function abrirModal(id)  { document.getElementById(id).classList.add('ativo'); }
    function fecharModal(id) { document.getElementById(id).classList.remove('ativo'); }
    function abrirPainel(id) { document.getElementById(id).classList.add('ativo'); }
    function fecharPainel(id) {
      document.getElementById(id).classList.remove('ativo');
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('ativo'));
      document.querySelector('.tab').classList.add('ativo');
    }

    // Fecha modal ao clicar fora
    document.querySelectorAll('.modal-bg').forEach(m => {
      m.addEventListener('click', e => {
        if (e.target === m) {
          m.classList.remove('ativo');
          if (m.id.startsWith('painel')) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('ativo'));
            document.querySelector('.tab').classList.add('ativo');
          }
        }
      });
    });

    // Dica some depois de 10 segundos
    setTimeout(() => {
      const dica = document.getElementById('dica');
      dica.style.opacity = '0';
      setTimeout(() => dica.remove(), 500);
    }, 10000);

    // ---- INICIAR ----
    atualizarEstadoLogin();
    carregarReports();
    carregarFavoritos();
    minhaLocalizacao(true);

    // Realtime: atualiza marcadores automaticamente quando admin
    // aprovar, reprovar ou deletar qualquer report (sem recarregar a página)
    db.channel('usuario-reports')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reports'
      }, () => {
        carregarReports();
      })
      .subscribe();

