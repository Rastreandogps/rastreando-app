/* natal.js — MODO NATAL do app Rastreando GPS (15/11/2026)
   Neve caindo, neve acumulando e pisca-pisca por cima do mapa. Código da animação feito por outra IA a pedido do dono
   (arquivo natal_mapa_premium.html), revisado por Claude: só a parte da animação (sem a página de demonstração).
   Só é carregado quando o modo Natal está ligado. API: window.RGNatal.ligar(elemento, opcoes) / window.RGNatal.desligar(). */
(function(){ try{ if(!document.getElementById('natal-css')){ var st=document.createElement('style'); st.id='natal-css'; st.textContent='.natal-camada{position:absolute;inset:0;z-index:1;pointer-events:none;background:transparent;overflow:hidden;contain:layout paint}.natal-canvas{display:block;width:100%;height:100%;pointer-events:none}'; document.head.appendChild(st) } }catch(e){} })();
(function () {
  'use strict';
  let instancia = null;
  const DOIS_PI = Math.PI * 2;
  const aleatorio = (a, b) => a + Math.random() * (b - a);
  const limitar = (n, a, b) => Math.max(a, Math.min(b, n));

  function ligar(elemento, opcoes) {
    desligar();
    if (!(elemento instanceof HTMLElement)) throw new TypeError('RGNatal.ligar: informe um elemento HTML.');
    const config = Object.assign({ intensidade: 'discreta', acumular: true, luzes: true }, opcoes || {});
    config.intensidade = config.intensidade === 'caprichada' ? 'caprichada' : 'discreta';
    config.acumular = config.acumular !== false;
    config.luzes = config.luzes !== false;
    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
    const camada = document.createElement('div');
    camada.className = 'natal-camada';
    camada.setAttribute('aria-hidden', 'true');
    const canvas = document.createElement('canvas');
    canvas.className = 'natal-canvas';
    camada.appendChild(canvas);
    elemento.appendChild(camada);
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) { camada.remove(); return; }
    const s = { elemento, camada, canvas, ctx, config, reduzido, w: 0, h: 0, dpr: 1,
      flocos: [], depositos: [], lampadas: [], monte: 1, queda: [], chao: 0, raf: 0, ultimo: 0, tempo: 0,
      inicio: performance.now(), ativo: true, amostras: [], lento: false, vento: 0,
      observador: null, aoVisivel: null, aoReducao: null };
    instancia = s;

    function novoFloco(aleatorioY) {
      const camada = Math.floor(Math.random() * 3);
      const escalas = [0.7, 1.35, 2.3];
      return { x: aleatorio(0, s.w), y: aleatorioY ? aleatorio(0, s.h) : -aleatorio(3, 55),
        raio: escalas[camada] * aleatorio(.65, 1.5),
        velocidade: [12, 23, 40][camada] * aleatorio(.7, 1.3),
        opacidade: [.40, .72, .94][camada] * aleatorio(.65, 1),
        fase: aleatorio(0, DOIS_PI), frequencia: aleatorio(.7, 1.65),
        balanco: aleatorio(3, 10), profundidade: camada };
    }
    function quantidade() {
      /* Base de 390 × 780 px, ajustada pela área e limitada em telas grandes. */
      return limitar(Math.round((config.intensidade === 'caprichada' ? 160 : 60) *
        (s.w * s.h) / (390 * 780)), 8, config.intensidade === 'caprichada' ? 600 : 250);
    }
    function distribuir() {
      if (!s.w || !s.h) return;
      const alvo = Math.max(4, Math.floor(quantidade() * (s.lento ? .5 : 1)));
      while (s.flocos.length < alvo) s.flocos.push(novoFloco(true));
      if (s.flocos.length > alvo) s.flocos.length = alvo;
    }
    function ajustar() {
      const rect = camada.getBoundingClientRect();
      const largura = Math.max(0, rect.width), altura = Math.max(0, rect.height);
      if (!largura || !altura) { s.w = 0; s.h = 0; return; }
      const antigoW = s.w, antigoH = s.h;
      s.w = largura; s.h = altura;
      s.dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(s.w * s.dpr));
      canvas.height = Math.max(1, Math.round(s.h * s.dpr));
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      if (antigoW && antigoH) for (const f of s.flocos) {
        f.x *= s.w / antigoW; f.y *= s.h / antigoH;
      }
      s.depositos = new Array(Math.max(2, Math.ceil(s.w / 7) + 1)).fill(0);
      s.lampadas = [];
      for (let x = 12, i = 0; x < s.w - 3; x += 25, i++) {
        s.lampadas.push({ x, y: 13 + 3.4 * Math.sin((x / Math.max(s.w, 1)) * Math.PI * 3) + 1.6 * Math.sin(x * .071 + 1.1), /* 15/11 (dono): fio mais abaixo da barra, curva mais natural */
          cor: ['#ff6454', '#ffc267', '#75dba0', '#83c7ff'][i % 4],
          fase: aleatorio(0, DOIS_PI), periodo: aleatorio(1.8, 3.2) });
      }
      distribuir();
      desenhar();
    }
    /* Curva de acúmulo: mais alta nas extremidades e suavemente ondulada. */
    /* 15/11/2026: o chão da neve acompanha o cartão de baixo quadro a quadro (RGNatal.chao), sem refazer a tela */
    function piso() { return s.h - (s.chao || 0); }
    function topoNeve(x, progresso) { /* 15/11 (dono): montinhos brancos, com relevo, sem a faixa azulada */
      const margem = Math.abs(2 * x / Math.max(s.w, 1) - 1);
      const base = 22.5 + 18.5 * Math.pow(margem, 3.2);
      const montes = 2.0 * Math.sin(x * .023 + .9) + 1.25 * Math.sin(x * .059 + 2.3) + .55 * Math.sin(x * .113);
      const i = limitar(Math.floor(x / 7), 0, s.depositos.length - 1);
      const deposito = s.depositos[i] || 0;
      return limitar((base + montes + 1.8 * deposito) * progresso, 0, 26 + 18 * Math.pow(margem, 3.2)) * s.monte;
    }
    function caminhoNeve(progresso) {
      ctx.beginPath(); ctx.moveTo(0, piso());
      for (let x = 0; x <= s.w; x += 3) ctx.lineTo(x, piso() - topoNeve(x, progresso));
      ctx.lineTo(s.w, piso() - topoNeve(s.w, progresso));
      ctx.lineTo(s.w, piso()); ctx.closePath();
    }
    function desenharAcumulo(progresso) {
      if (!config.acumular || progresso <= 0 || s.monte <= .01) return;
      const ch = piso();
      ctx.save();
      /* Sombra de contato restrita a poucos pixels: não invade o mapa. */
      ctx.beginPath();
      for (let x = 0; x <= s.w; x += 3) { const y = ch - topoNeve(x, progresso); if (!x) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.strokeStyle = 'rgba(44,67,80,.13)'; ctx.lineWidth = 3; ctx.shadowColor = 'rgba(37,57,70,.12)'; ctx.shadowBlur = 4; ctx.stroke(); ctx.shadowBlur = 0;
      caminhoNeve(progresso);
      const corpo = ctx.createLinearGradient(0, ch - 46, 0, ch);
      corpo.addColorStop(0, '#ffffff'); corpo.addColorStop(.40, '#fcfdff'); corpo.addColorStop(.78, '#f2f6fa'); corpo.addColorStop(1, '#eaf0f6');
      ctx.fillStyle = corpo; ctx.fill();
      ctx.save(); caminhoNeve(progresso); ctx.clip();
      /* Sombras localizadas nos montinhos, quase imperceptíveis. */
      for (let x = -30; x < s.w + 50; x += 69) {
        const y = ch - topoNeve(limitar(x + 25, 0, s.w), progresso) + 10;
        const brilho = ctx.createRadialGradient(x + 25, y, 1, x + 25, y, 40);
        brilho.addColorStop(0, 'rgba(206,221,234,.20)'); brilho.addColorStop(1, 'rgba(206,221,234,0)');
        ctx.fillStyle = brilho; ctx.fillRect(x - 15, ch - 48, 85, 48);
      }
      ctx.restore();
      ctx.beginPath();
      for (let x = 0; x <= s.w; x += 3) { const y = ch - topoNeve(x, progresso); if (!x) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
    }
    function desenharLuzes() {
      if (!config.luzes || !s.lampadas.length) return;
      ctx.save();
      /* Fio em curva contínua, com pequena queda entre os pontos. */
      ctx.beginPath(); ctx.moveTo(0, 9);
      for (let i = 0; i < s.lampadas.length; i++) {
        const l = s.lampadas[i];
        const anterior = i ? s.lampadas[i-1] : {x:0,y:9};
        ctx.quadraticCurveTo((anterior.x+l.x)/2, Math.max(anterior.y,l.y)+3.6, l.x,l.y);
      }
      ctx.lineTo(s.w, 9);
      ctx.strokeStyle = 'rgba(32,40,44,.80)'; ctx.lineWidth = 1.1; ctx.stroke();
      for (const l of s.lampadas) {
        const pulso = reduzido.matches ? 1 : (.30 + .70 * (.5 + .5 * Math.sin(s.tempo * DOIS_PI / l.periodo + l.fase)));
        const y = l.y + 4.6;
        ctx.strokeStyle = 'rgba(36,43,48,.9)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(l.x,l.y); ctx.lineTo(l.x,l.y+2.4); ctx.stroke();
        /* Halo radial em vez de sombra dura: luzes pequenas, mas luminosas. */
        ctx.save(); ctx.globalAlpha = pulso * .40;
        const halo = ctx.createRadialGradient(l.x,y,0,l.x,y,7.5);
        halo.addColorStop(0,l.cor); halo.addColorStop(.32,l.cor); halo.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(l.x,y,7.5,0,DOIS_PI); ctx.fill();
        ctx.restore();
        ctx.save(); ctx.globalAlpha = pulso;
        ctx.fillStyle = l.cor; ctx.shadowColor = l.cor; ctx.shadowBlur = 3.5;
        ctx.beginPath(); ctx.ellipse(l.x,y,1.9,2.7,0,0,DOIS_PI); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,.74)';
        ctx.beginPath(); ctx.ellipse(l.x-.5,y-.8, .42,.7,-.3,0,DOIS_PI); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
    function desenharQueda() {
      if (!s.queda.length) return;
      ctx.save(); ctx.fillStyle = '#f4faff'; ctx.shadowColor = 'rgba(24,43,62,.25)'; ctx.shadowBlur = 2;
      for (const q of s.queda) { ctx.globalAlpha = Math.max(0, Math.min(1, q.a)); ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, DOIS_PI); ctx.fill(); }
      ctx.restore();
    }
    function desenharFlocos() {
      for (const f of s.flocos) {
        const r = f.raio;
        ctx.save();
        ctx.globalAlpha = f.opacidade;
        ctx.shadowColor = 'rgba(24,43,62,.21)'; ctx.shadowColor = 'rgba(24,43,62,.30)'; ctx.shadowBlur = f.profundidade === 0 ? 3 : 1.2;
        const g = ctx.createRadialGradient(f.x - r * .25, f.y - r * .25, .1, f.x, f.y, r * 1.8);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(.36, 'rgba(255,255,255,.96)');
        g.addColorStop(1, 'rgba(236,247,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(f.x, f.y, r * 1.8, 0, DOIS_PI); ctx.fill();
        ctx.restore();
      }
    }
    function desenhar() {
      if (!s.w || !s.h) return;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0); /* 15/11/2026: o celular pode zerar a escala do desenho ao voltar de outro app (a neve aparecia pela metade, no meio do mapa) */
      ctx.clearRect(0, 0, s.w, s.h);
      if (!reduzido.matches) { desenharFlocos(); desenharQueda(); }
      desenharAcumulo(reduzido.matches ? 1 : limitar((performance.now() - s.inicio) / 120000, 0, 1));
      desenharLuzes();
    }
    function quadro(agora) {
      s.raf = 0;
      if (!s.ativo || document.hidden || reduzido.matches) return;
      const dt = s.ultimo ? limitar((agora - s.ultimo) / 1000, 0, .05) : 0;
      s.ultimo = agora;
      s.tempo += dt;
      s.vento = 8 * Math.sin(s.tempo * .17) + 3 * Math.sin(s.tempo * .071 + 1.2);
      const progresso = limitar((agora - s.inicio) / 120000, 0, 1);
      /* 15/11/2026 (dono): o cartão desceu = a neve acumulada despenca e o monte se refaz embaixo */
      if (s.queda.length) {
        const chaoY = piso();
        for (const q of s.queda) { q.vy += 950 * dt; q.y += q.vy * dt; q.x += q.vx * dt; q.a -= dt * .25; }
        s.queda = s.queda.filter((q) => q.y < chaoY - 2 && q.a > .05);
      }
      if (s.monte < 1 && agora - (s.caiuEm || 0) > 260) s.monte = Math.min(1, s.monte + dt / 1.1);
      for (const f of s.flocos) {
        f.y += f.velocidade * dt;
        f.x += (s.vento * (.4 + f.profundidade * .3) +
          Math.sin(s.tempo * f.frequencia + f.fase) * f.balanco) * dt;
        if (f.x < -10) f.x = s.w + 8;
        if (f.x > s.w + 10) f.x = -8;
        if (f.y > piso() - (config.acumular ? topoNeve(f.x, progresso) : 0)) {
          if (config.acumular && s.depositos.length) {
            const i = limitar(Math.floor(f.x / 7), 0, s.depositos.length - 1);
            s.depositos[i] = limitar(s.depositos[i] + .08, 0, 1);
          }
          Object.assign(f, novoFloco(false));
        }
      }
      /* Média de FPS numa janela de 2 segundos; reduz uma única vez. */
      if (dt > 0) {
        s.amostras.push({ t: agora, dt });
        while (s.amostras.length && agora - s.amostras[0].t > 2000) s.amostras.shift();
        const duracao = s.amostras.reduce((a, b) => a + b.dt, 0);
        if (!s.lento && duracao >= 1.95 && s.amostras.length / duracao < 40) {
          s.lento = true; distribuir(); s.amostras.length = 0;
        }
      }
      desenhar();
      s.raf = requestAnimationFrame(quadro);
    }
    function iniciar() {
      cancelAnimationFrame(s.raf); s.raf = 0; s.ultimo = 0;
      desenhar();
      if (s.ativo && !document.hidden && !reduzido.matches && s.w && s.h) {
        s.raf = requestAnimationFrame(quadro);
      }
    }
    s.despencar = function (desceu) { /* chamado ANTES de o chão mudar: os pedaços nascem na linha do monte antigo */
      if (!config.acumular || reduzido.matches || !s.w || !s.h) return;
      const progresso = limitar((performance.now() - s.inicio) / 120000, 0, 1);
      if (progresso * s.monte < .04) { s.caiuEm = performance.now(); return; }
      const n = Math.min(34, Math.max(4, Math.round(desceu * 1.3 * s.monte * s.w / 390)));
      for (let i = 0; i < n && s.queda.length < 320; i++) {
        const x = aleatorio(0, s.w), topo = topoNeve(x, progresso);
        s.queda.push({ x, y: piso() - aleatorio(0, topo), vx: aleatorio(-18, 18), vy: aleatorio(0, 70), r: aleatorio(1.4, 4.2) * (.6 + .4 * progresso), a: aleatorio(.75, 1) });
      }
      s.monte = Math.max(0, s.monte - desceu / 46);
      s.caiuEm = performance.now();
    };
    s.aoVisivel = function () { if (!document.hidden) ajustar(); iniciar(); };
    canvas.addEventListener('contextrestored', function () { ajustar(); iniciar(); });
    s.aoReducao = iniciar;
    document.addEventListener('visibilitychange', s.aoVisivel);
    if (reduzido.addEventListener) reduzido.addEventListener('change', s.aoReducao);
    else reduzido.addListener(s.aoReducao);
    if ('ResizeObserver' in window) {
      s.observador = new ResizeObserver(ajustar);
      s.observador.observe(elemento);
    } else window.addEventListener('resize', ajustar);
    s.ajustar = ajustar;
    ajustar(); iniciar();
  }
  function desligar() {
    if (!instancia) return;
    const s = instancia;
    instancia = null;
    s.ativo = false;
    cancelAnimationFrame(s.raf);
    document.removeEventListener('visibilitychange', s.aoVisivel);
    if (s.reduzido.removeEventListener) s.reduzido.removeEventListener('change', s.aoReducao);
    else s.reduzido.removeListener(s.aoReducao);
    if (s.observador) s.observador.disconnect();
    else window.removeEventListener('resize', s.ajustar);
    s.camada.remove();
    s.flocos.length = 0; s.lampadas.length = 0; s.depositos.length = 0;
  }
  function chao(px) {
    const s = instancia; if (!s) return;
    const novo = Math.max(0, Number(px) || 0), desceu = (s.chao || 0) - novo;
    if (desceu > 1.5 && s.despencar) s.despencar(desceu);
    s.chao = novo;
  }
  window.RGNatal = { ligar, desligar, chao };
})();
