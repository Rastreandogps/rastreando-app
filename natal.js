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
      flocos: [], depositos: [], lampadas: [], raf: 0, ultimo: 0, tempo: 0,
      inicio: performance.now(), ativo: true, amostras: [], lento: false, vento: 0,
      observador: null, aoVisivel: null, aoReducao: null };
    instancia = s;

    function novoFloco(aleatorioY) {
      const camada = Math.floor(Math.random() * 3);
      const escalas = [0.7, 1.35, 2.3];
      return { x: aleatorio(0, s.w), y: aleatorioY ? aleatorio(0, s.h) : -aleatorio(3, 55),
        raio: escalas[camada] * aleatorio(.65, 1.5),
        velocidade: [12, 23, 40][camada] * aleatorio(.7, 1.3),
        opacidade: [.29, .63, .91][camada] * aleatorio(.65, 1),
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
        s.lampadas.push({ x, y: 7 + 5.5 * Math.sin((x / Math.max(s.w, 1)) * Math.PI * 3),
          cor: ['#ff6454', '#ffc267', '#75dba0', '#83c7ff'][i % 4],
          fase: aleatorio(0, DOIS_PI), periodo: aleatorio(1.8, 3.2) });
      }
      distribuir();
      desenhar();
    }
    /* Curva de acúmulo: mais alta nas extremidades e suavemente ondulada. */
    function topoNeve(x, progresso) {
      const margem = Math.abs(2 * x / Math.max(s.w, 1) - 1);
      const altura = 26 + 18 * Math.pow(margem, 2.5);
      const ondulacao = 1.2 * Math.sin(x * .039 + .5) + .7 * Math.sin(x * .103);
      const i = limitar(Math.floor(x / 7), 0, s.depositos.length - 1);
      const deposicao = s.depositos[i] || 0;
      return Math.max(0, (altura + ondulacao) * progresso * (.985 + .015 * deposicao));
    }
    function caminhoNeve(progresso) {
      ctx.beginPath(); ctx.moveTo(0, s.h);
      for (let x = 0; x <= s.w; x += 3) ctx.lineTo(x, s.h - topoNeve(x, progresso));
      ctx.lineTo(s.w, s.h - topoNeve(s.w, progresso));
      ctx.lineTo(s.w, s.h); ctx.closePath();
    }
    function desenharAcumulo(progresso) {
      if (!config.acumular || progresso <= 0) return;
      ctx.save();
      caminhoNeve(progresso);
      const neve = ctx.createLinearGradient(0, s.h - 48, 0, s.h);
      neve.addColorStop(0, '#ffffff');
      neve.addColorStop(.23, '#f5fbff');
      neve.addColorStop(.72, '#e1eff9');
      neve.addColorStop(1, '#c5dbea');
      ctx.fillStyle = neve;
      ctx.shadowColor = 'rgba(24,49,70,.24)'; ctx.shadowBlur = 9; ctx.shadowOffsetY = -3;
      ctx.fill();
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.save(); caminhoNeve(progresso); ctx.clip();
      /* Camadas de sombreamento difuso criam volume sem uma faixa chapada. */
      const sombra = ctx.createLinearGradient(0, s.h - 42, 0, s.h);
      sombra.addColorStop(0, 'rgba(255,255,255,.35)');
      sombra.addColorStop(.48, 'rgba(255,255,255,0)');
      sombra.addColorStop(1, 'rgba(92,135,163,.17)');
      ctx.fillStyle = sombra; ctx.fillRect(0, s.h - 48, s.w, 48);
      ctx.restore();
      ctx.beginPath();
      for (let x = 0; x <= s.w; x += 3) {
        const y = s.h - topoNeve(x, progresso);
        if (x === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.7;
      ctx.shadowColor = 'rgba(255,255,255,.7)'; ctx.shadowBlur = 3; ctx.stroke();
      ctx.restore();
    }
    function desenharLuzes() {
      if (!config.luzes || !s.lampadas.length) return;
      ctx.save();
      /* Fio em curva contínua, com pequena queda entre os pontos. */
      ctx.beginPath(); ctx.moveTo(0, 6);
      for (let i = 0; i < s.lampadas.length; i++) {
        const l = s.lampadas[i];
        const anterior = i ? s.lampadas[i-1] : {x:0,y:6};
        ctx.quadraticCurveTo((anterior.x+l.x)/2, Math.max(anterior.y,l.y)+3, l.x,l.y);
      }
      ctx.lineTo(s.w, 6);
      ctx.strokeStyle = 'rgba(28,36,42,.87)'; ctx.lineWidth = 1.35; ctx.stroke();
      for (const l of s.lampadas) {
        const pulso = reduzido.matches ? 1 : (.30 + .70 * (.5 + .5 * Math.sin(s.tempo * DOIS_PI / l.periodo + l.fase)));
        const y = l.y + 6;
        ctx.strokeStyle = 'rgba(36,43,48,.9)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(l.x,l.y); ctx.lineTo(l.x,l.y+3); ctx.stroke();
        /* Halo radial em vez de sombra dura: luzes pequenas, mas luminosas. */
        ctx.save(); ctx.globalAlpha = pulso * .53;
        const halo = ctx.createRadialGradient(l.x,y,0,l.x,y,10);
        halo.addColorStop(0,l.cor); halo.addColorStop(.32,l.cor); halo.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(l.x,y,10,0,DOIS_PI); ctx.fill();
        ctx.restore();
        ctx.save(); ctx.globalAlpha = pulso;
        ctx.fillStyle = l.cor; ctx.shadowColor = l.cor; ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.ellipse(l.x,y,2.4,3.2,0,0,DOIS_PI); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,.74)';
        ctx.beginPath(); ctx.ellipse(l.x-.65,y-1, .55,.95,-.3,0,DOIS_PI); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
    function desenharFlocos() {
      for (const f of s.flocos) {
        const r = f.raio;
        ctx.save();
        ctx.globalAlpha = f.opacidade;
        ctx.shadowColor = 'rgba(24,43,62,.21)'; ctx.shadowBlur = f.profundidade === 0 ? 4 : 1.3;
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
      ctx.clearRect(0, 0, s.w, s.h);
      if (!reduzido.matches) desenharFlocos();
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
      for (const f of s.flocos) {
        f.y += f.velocidade * dt;
        f.x += (s.vento * (.4 + f.profundidade * .3) +
          Math.sin(s.tempo * f.frequencia + f.fase) * f.balanco) * dt;
        if (f.x < -10) f.x = s.w + 8;
        if (f.x > s.w + 10) f.x = -8;
        if (f.y > s.h - (config.acumular ? topoNeve(f.x, progresso) : 0)) {
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
    s.aoVisivel = iniciar;
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
  window.RGNatal = { ligar, desligar };
})();
