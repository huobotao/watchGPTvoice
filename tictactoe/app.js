(function () {
  'use strict';
  const T = window.TTT;

  const fmt = (n) => n.toLocaleString('en-US');
  const pct = (n, total) => total ? ((n / total) * 100).toFixed(1) + '%' : '—';

  // ============================== Tab switching ==============================
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b === btn));
      const target = btn.dataset.tab;
      document.querySelectorAll('.panel').forEach((p) => {
        p.classList.toggle('active', p.id === 'panel-' + target);
      });
      if (target === 'dashboard') renderDashboardOnce();
      if (target === 'sunburst') renderSunburst();
    });
  });

  // ============================== Explorer ==============================
  const state = {
    board: new Array(9).fill(''),
    history: [], // array of {cell, player}
  };

  const POS_NAMES = ['左上', '上', '右上', '左', '中', '右', '左下', '下', '右下'];
  function playerToMove() { return state.history.length % 2 === 0 ? 'X' : 'O'; }

  function renderExplorer() {
    const turn = playerToMove();
    const winInfo = T.winningLine(state.board);
    const full = T.isFull(state.board);
    const terminal = !!winInfo || full;
    const options = terminal ? null : T.moveOptions(state.board, turn);

    // Breadcrumb
    const bc = document.getElementById('breadcrumb');
    if (state.history.length === 0) {
      bc.textContent = '空盘 · 从这里开始';
    } else {
      bc.innerHTML = state.history.map((m, i) => {
        const p = i % 2 === 0 ? 'X' : 'O';
        return `<span class="move ${p.toLowerCase()}-c">${p}@${POS_NAMES[m.cell]}</span>`;
      }).join('<span class="sep">›</span>');
    }

    // Turn indicator
    const ti = document.getElementById('turn-indicator');
    if (terminal) {
      if (winInfo) ti.innerHTML = `<strong class="${winInfo.player.toLowerCase()}-c">${winInfo.player} 胜</strong>`;
      else ti.innerHTML = '<strong class="d-c">和局</strong>';
    } else {
      ti.innerHTML = `轮到 <span class="${turn.toLowerCase()}-c">${turn}</span> 落子`;
    }

    // Board cells
    const board = document.getElementById('board');
    board.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      const piece = state.board[i];
      if (piece) {
        cell.classList.add('played');
        const winning = winInfo && winInfo.line.includes(i) ? ' winning' : '';
        cell.innerHTML = `<span class="glyph ${piece}${winning}">${piece}</span>`;
      } else if (terminal) {
        cell.classList.add('disabled');
      } else {
        const opt = options.find((o) => o.cell === i);
        if (opt) {
          const tot = opt.total || 1;
          cell.innerHTML = `
            <div class="stats">
              <div class="row-x"><div class="bar" style="width:${(opt.x/tot)*100}%"></div><span>X</span><span>${fmt(opt.x)}</span></div>
              <div class="row-o"><div class="bar" style="width:${(opt.o/tot)*100}%"></div><span>O</span><span>${fmt(opt.o)}</span></div>
              <div class="row-d"><div class="bar" style="width:${(opt.d/tot)*100}%"></div><span>D</span><span>${fmt(opt.d)}</span></div>
            </div>`;
          cell.addEventListener('click', () => play(i));
        }
      }
      board.appendChild(cell);
    }

    // Summary
    const summary = document.getElementById('summary');
    if (terminal) {
      const outcome = winInfo
        ? `<strong class="${winInfo.player.toLowerCase()}-c">${winInfo.player} 已胜</strong>`
        : '<strong class="d-c">和局已成</strong>';
      summary.innerHTML = `
        <h3>当前结果</h3>
        <div class="terminal-note">${outcome}，这是穷举出的 ${fmt(255168)} 局中的一条具体路径。</div>
        <p style="color: var(--text-dim); font-size: 13px; margin: 12px 0 0;">点"撤销"返回上一手探索其它走法。</p>
      `;
    } else {
      // Aggregate over all options
      let x = 0, o = 0, d = 0, total = 0;
      options.forEach((opt) => { x += opt.x; o += opt.o; d += opt.d; total += opt.total; });
      summary.innerHTML = `
        <h3>从这个局面出发的所有对弈</h3>
        <div class="total">${fmt(total)} <span style="font-size: 14px; color: var(--text-dim); font-weight: normal;">局</span></div>
        <div class="breakdown">
          <div class="b-x" style="width:${(x/total)*100}%"></div>
          <div class="b-o" style="width:${(o/total)*100}%"></div>
          <div class="b-d" style="width:${(d/total)*100}%"></div>
        </div>
        <div class="legend-row"><span class="x-c">X 胜 ${fmt(x)}</span><span>${pct(x, total)}</span></div>
        <div class="legend-row"><span class="o-c">O 胜 ${fmt(o)}</span><span>${pct(o, total)}</span></div>
        <div class="legend-row"><span class="d-c">和 ${fmt(d)}</span><span>${pct(d, total)}</span></div>
      `;
    }

    document.getElementById('btn-back').disabled = state.history.length === 0;
    document.getElementById('btn-reset').disabled = state.history.length === 0;
  }

  function play(cell) {
    if (state.board[cell]) return;
    const p = playerToMove();
    state.board[cell] = p;
    state.history.push({ cell, player: p });
    renderExplorer();
  }

  function undo() {
    const last = state.history.pop();
    if (last) state.board[last.cell] = '';
    renderExplorer();
  }

  function reset() {
    state.board = new Array(9).fill('');
    state.history = [];
    renderExplorer();
  }

  document.getElementById('btn-back').addEventListener('click', undo);
  document.getElementById('btn-reset').addEventListener('click', reset);

  renderExplorer();

  // ============================== Dashboard ==============================
  let dashboardRendered = false;
  function renderDashboardOnce() {
    if (dashboardRendered) return;
    dashboardRendered = true;
    renderDashboard();
  }

  function renderDashboard() {
    const g = T.globalStats();
    document.getElementById('card-total').textContent = fmt(g.total);
    document.getElementById('card-x').textContent = fmt(g.x);
    document.getElementById('card-o').textContent = fmt(g.o);
    document.getElementById('card-d').textContent = fmt(g.d);
    document.getElementById('card-x-pct').textContent = pct(g.x, g.total);
    document.getElementById('card-o-pct').textContent = pct(g.o, g.total);
    document.getElementById('card-d-pct').textContent = pct(g.d, g.total);

    renderPie(g);
    renderHeatmap();
    renderBars(g);
  }

  function renderPie(g) {
    const svg = document.getElementById('pie');
    svg.innerHTML = '';
    const segs = [
      { label: 'X 胜', val: g.x, color: 'var(--x)' },
      { label: 'O 胜', val: g.o, color: 'var(--o)' },
      { label: '和', val: g.d, color: 'var(--d)' },
    ];
    const r = 90;
    let a0 = -Math.PI / 2;
    segs.forEach((s) => {
      const frac = s.val / g.total;
      const a1 = a0 + frac * Math.PI * 2;
      const large = frac > 0.5 ? 1 : 0;
      const x0 = Math.cos(a0) * r, y0 = Math.sin(a0) * r;
      const x1 = Math.cos(a1) * r, y1 = Math.sin(a1) * r;
      const d = `M0 0 L${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', s.color);
      path.setAttribute('stroke', 'var(--bg-card)');
      path.setAttribute('stroke-width', '2');
      svg.appendChild(path);

      const mid = (a0 + a1) / 2;
      const tx = Math.cos(mid) * r * 0.62;
      const ty = Math.sin(mid) * r * 0.62;
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', tx);
      text.setAttribute('y', ty);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('fill', '#0e1116');
      text.setAttribute('font-size', '12');
      text.setAttribute('font-weight', '700');
      text.textContent = (frac * 100).toFixed(1) + '%';
      svg.appendChild(text);
      a0 = a1;
    });

    // Center label
    const cx = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    cx.setAttribute('x', 0); cx.setAttribute('y', r + 20);
    cx.setAttribute('text-anchor', 'middle');
    cx.setAttribute('fill', 'var(--text-dim)');
    cx.setAttribute('font-size', '11');
    cx.textContent = `共 ${fmt(g.total)} 局`;
    svg.appendChild(cx);
  }

  function renderHeatmap() {
    const fm = T.firstMoveStats();
    const hm = document.getElementById('heatmap');
    hm.innerHTML = '';
    fm.forEach((s) => {
      const cell = document.createElement('div');
      cell.className = 'hm-cell';
      const xp = (s.x / s.total) * 100;
      const op = (s.o / s.total) * 100;
      const dp = (s.d / s.total) * 100;
      cell.innerHTML = `
        <div class="row" style="font-weight:700; font-size: 13px;"><span>格 ${s.cell}</span><span style="color: var(--text-dim);">${POS_NAMES[s.cell]}</span></div>
        <div>
          <div class="hm-bar">
            <div style="background: var(--x); width: ${xp}%"></div>
            <div style="background: var(--o); width: ${op}%"></div>
            <div style="background: var(--d); width: ${dp}%"></div>
          </div>
          <div class="row" style="margin-top: 4px;">
            <span class="x-c">${xp.toFixed(1)}</span>
            <span class="o-c">${op.toFixed(1)}</span>
            <span class="d-c">${dp.toFixed(1)}</span>
          </div>
          <div class="total-line">${fmt(s.total)} 局</div>
        </div>
      `;
      hm.appendChild(cell);
    });
  }

  function renderBars(g) {
    const svg = document.getElementById('bars');
    svg.innerHTML = '';
    const W = 600, H = 260, pad = { l: 50, r: 20, t: 20, b: 50 };
    const lens = [5, 6, 7, 8, 9];
    const data = lens.map((L) => {
      const v = g.lengthDist[L] || { x: 0, o: 0, d: 0 };
      return { L, x: v.x, o: v.o, d: v.d, total: v.x + v.o + v.d };
    });
    const maxV = Math.max(...data.map((d) => d.total));
    const innerW = W - pad.l - pad.r;
    const innerH = H - pad.t - pad.b;
    const bw = (innerW / lens.length) * 0.7;
    const step = innerW / lens.length;

    // Y axis grid
    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
      const v = (maxV / ticks) * i;
      const y = pad.t + innerH - (v / maxV) * innerH;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', pad.l); line.setAttribute('x2', W - pad.r);
      line.setAttribute('y1', y); line.setAttribute('y2', y);
      line.setAttribute('stroke', 'var(--line)');
      line.setAttribute('stroke-dasharray', i === 0 ? '0' : '2 2');
      svg.appendChild(line);

      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', pad.l - 8); t.setAttribute('y', y + 3);
      t.setAttribute('text-anchor', 'end');
      t.setAttribute('fill', 'var(--text-dim)');
      t.setAttribute('font-size', '10');
      t.textContent = Math.round(v / 1000) + 'k';
      svg.appendChild(t);
    }

    data.forEach((d, idx) => {
      const x = pad.l + step * idx + (step - bw) / 2;
      let y = pad.t + innerH;
      [['x', 'var(--x)'], ['o', 'var(--o)'], ['d', 'var(--d)']].forEach(([k, color]) => {
        const h = (d[k] / maxV) * innerH;
        if (h > 0) {
          y -= h;
          const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          r.setAttribute('x', x); r.setAttribute('y', y);
          r.setAttribute('width', bw); r.setAttribute('height', h);
          r.setAttribute('fill', color);
          svg.appendChild(r);
        }
      });

      // x-axis label
      const lab = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lab.setAttribute('x', pad.l + step * idx + step / 2);
      lab.setAttribute('y', H - pad.b + 18);
      lab.setAttribute('text-anchor', 'middle');
      lab.setAttribute('fill', 'var(--text-dim)');
      lab.setAttribute('font-size', '11');
      lab.textContent = d.L + ' 手';
      svg.appendChild(lab);

      // total above bar
      const totLab = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      totLab.setAttribute('x', pad.l + step * idx + step / 2);
      totLab.setAttribute('y', y - 6);
      totLab.setAttribute('text-anchor', 'middle');
      totLab.setAttribute('fill', 'var(--text)');
      totLab.setAttribute('font-size', '11');
      totLab.setAttribute('font-weight', '600');
      totLab.textContent = fmt(d.total);
      svg.appendChild(totLab);
    });

    // x-axis title
    const xt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    xt.setAttribute('x', W / 2); xt.setAttribute('y', H - 8);
    xt.setAttribute('text-anchor', 'middle');
    xt.setAttribute('fill', 'var(--text-dim)');
    xt.setAttribute('font-size', '11');
    xt.textContent = '对局长度（落子数）';
    svg.appendChild(xt);
  }

  // ============================== Sunburst ==============================
  let sunburstDepth = 4;
  const depthSelect = document.getElementById('depth-select');
  depthSelect.addEventListener('change', () => {
    sunburstDepth = parseInt(depthSelect.value);
    renderSunburst(true);
  });

  let lastSunburstDepth = -1;

  // Lay out a tree of nodes as sunburst arcs (no D3 dependency).
  // Nodes whose game already ended (no children) at depth < maxDepth are
  // extended out to the outer radius, so the disk stays fully filled.
  function layoutSunburst(root, maxDepth, radiusPerLayer, innerHole, outerRadius) {
    const arcs = [];
    function walk(node, a0, a1, depth, path) {
      const expanded = node.children && depth < maxDepth;
      if (depth > 0) {
        const r0 = innerHole + (depth - 1) * radiusPerLayer;
        const r1 = expanded ? innerHole + depth * radiusPerLayer : outerRadius;
        arcs.push({ node, a0, a1, depth, r0, r1, path, expanded });
      }
      if (!expanded) return;
      const total = node.children.reduce((s, c) => s + c.total, 0) || 1;
      let a = a0;
      for (const child of node.children) {
        const span = (a1 - a0) * (child.total / total);
        const childA1 = a + span;
        walk(child, a, childA1, depth + 1, path.concat([{ move: child.move, player: child.player }]));
        a = childA1;
      }
    }
    walk(root, 0, Math.PI * 2, 0, []);
    return arcs;
  }

  function arcPath(a0, a1, r0, r1) {
    // SVG path for an annular sector. Angles measured from 12 o'clock, CW.
    // x = sin(a) * r, y = -cos(a) * r
    const raw = a1 - a0;
    if (raw <= 0) return '';
    // Adaptive padding: small for thin arcs so they don't disappear.
    const pad = Math.min(0.004, raw * 0.15);
    const sa = raw - pad;
    if (sa <= 0) return '';
    const mid = (a0 + a1) / 2;
    const startA = mid - sa / 2;
    const endA = mid + sa / 2;
    const large = sa > Math.PI ? 1 : 0;
    const x0 = Math.sin(startA) * r1, y0 = -Math.cos(startA) * r1;
    const x1 = Math.sin(endA) * r1,   y1 = -Math.cos(endA) * r1;
    const x2 = Math.sin(endA) * r0,   y2 = -Math.cos(endA) * r0;
    const x3 = Math.sin(startA) * r0, y3 = -Math.cos(startA) * r0;
    return `M${x0} ${y0} A${r1} ${r1} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 ${large} 0 ${x3} ${y3} Z`;
  }

  // Color a sunburst arc by which outcome dominates this subtree.
  // Brightness scales with how lopsided the dominance is (uniform = dim, 100% = vivid).
  function colorFor(node, depth) {
    const tot = node.total || 1;
    const xR = node.x / tot, oR = node.o / tot, dR = node.d / tot;
    let palette, share;
    if (xR >= oR && xR >= dR) { palette = [255, 107, 91]; share = xR; }
    else if (oR >= dR)        { palette = [91, 157, 255]; share = oR; }
    else                       { palette = [196, 204, 217]; share = dR; }
    // Map share [1/3, 1] -> intensity [0.35, 1]. Below uniform stays dim.
    const norm = Math.max(0, (share - 1 / 3) / (2 / 3));
    const intensity = 0.35 + 0.65 * Math.pow(norm, 0.7);
    const bg = 22; // base dark
    const r = Math.round(bg + (palette[0] - bg) * intensity);
    const g = Math.round(bg + (palette[1] - bg) * intensity);
    const b = Math.round(bg + (palette[2] - bg) * intensity);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function renderSunburst(force) {
    if (!force && lastSunburstDepth === sunburstDepth) return;
    lastSunburstDepth = sunburstDepth;

    const svg = document.getElementById('sunburst');
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const SVG_NS = 'http://www.w3.org/2000/svg';

    const tree = T.buildSunburst(sunburstDepth);
    const maxRadius = 330;
    const innerHole = 60;
    const radiusPerLayer = (maxRadius - innerHole) / sunburstDepth;
    const arcs = layoutSunburst(tree, sunburstDepth, radiusPerLayer, innerHole, maxRadius);

    const tip = document.getElementById('sun-tooltip');
    const stage = document.querySelector('.sunburst-stage');

    // Stroke only the wider arcs (at lower depths). Very thin arcs would be
    // dominated by stroke and read as black.
    const strokeThresholdAngle = 0.015;
    for (const a of arcs) {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', arcPath(a.a0, a.a1, a.r0, a.r1));
      path.setAttribute('fill', colorFor(a.node, a.depth));
      if ((a.a1 - a.a0) > strokeThresholdAngle) {
        path.setAttribute('stroke', '#0e1116');
        path.setAttribute('stroke-width', '0.6');
      } else {
        path.setAttribute('stroke', 'none');
      }

      path.addEventListener('mousemove', (event) => {
        const node = a.node;
        const tot = node.total || 1;
        const moves = a.path.map((m) => `<span class="${m.player.toLowerCase()}-c">${m.player}@${POS_NAMES[m.move]}</span>`).join(' › ');
        const board = node.board;
        const miniBoard = `<div class="mini-board">${board.map((p) => `<div class="mini-cell ${p}">${p || ''}</div>`).join('')}</div>`;
        tip.innerHTML = `
          <div style="color: var(--text-dim); margin-bottom: 2px;">第 ${a.depth} 手</div>
          <div>${moves}</div>
          ${miniBoard}
          <div><span class="x-c">X ${fmt(node.x)} (${pct(node.x, tot)})</span></div>
          <div><span class="o-c">O ${fmt(node.o)} (${pct(node.o, tot)})</span></div>
          <div><span class="d-c">D ${fmt(node.d)} (${pct(node.d, tot)})</span></div>
          <div style="color: var(--text-dim); margin-top: 4px;">${fmt(tot)} 局穿过此分支${node.terminal ? ' · 终局' : ''}</div>
        `;
        const rect = stage.getBoundingClientRect();
        const tipRect = tip.getBoundingClientRect();
        let x = event.clientX - rect.left + 14;
        let y = event.clientY - rect.top + 14;
        if (x + tipRect.width > rect.width) x = event.clientX - rect.left - tipRect.width - 14;
        if (y + tipRect.height > rect.height) y = event.clientY - rect.top - tipRect.height - 14;
        tip.style.left = Math.max(8, x) + 'px';
        tip.style.top = Math.max(8, y) + 'px';
        tip.classList.add('show');
      });
      path.addEventListener('mouseleave', () => tip.classList.remove('show'));

      path.addEventListener('click', () => {
        state.board = new Array(9).fill('');
        state.history = [];
        a.path.forEach((m) => {
          state.board[m.move] = m.player;
          state.history.push({ cell: m.move, player: m.player });
        });
        document.querySelector('.tab[data-tab="explorer"]').click();
        renderExplorer();
      });

      svg.appendChild(path);
    }

    // Center label
    const cLabel = document.createElementNS(SVG_NS, 'text');
    cLabel.setAttribute('class', 'center-label');
    cLabel.setAttribute('y', -4);
    cLabel.textContent = '全部对局';
    svg.appendChild(cLabel);
    const cSub = document.createElementNS(SVG_NS, 'text');
    cSub.setAttribute('class', 'center-sub');
    cSub.setAttribute('y', 14);
    cSub.textContent = `${fmt(255168)} 局 · 前 ${sunburstDepth} 手`;
    svg.appendChild(cSub);
  }

  // Pre-warm engine so first dashboard click is instant
  T.globalStats();
})();
