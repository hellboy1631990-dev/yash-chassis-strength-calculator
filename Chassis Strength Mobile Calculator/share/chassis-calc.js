(function () {
  const G = 9.81;
  const DEFS = {
    WB: { label: 'Wheelbase', unit: 'm', min: 2.5, max: 8, step: 0.005 },
    J: { label: 'Distance between front steer axles', unit: 'm', min: 1.2, max: 2.4, step: 0.005 },
    FOH: { label: 'Front axle centre to front end of chassis', unit: 'm', min: 0.5, max: 2, step: 0.005 },
    CA: { label: 'Back of cab to centre of rear axle(s)', unit: 'm', min: 1.5, max: 7, step: 0.005 },
    ROH: { label: 'Rear overhang', unit: 'm', min: 0.5, max: 4, step: 0.005 },
    YS: { label: 'Rail yield stress (OEM info)', unit: 'MPa', min: 250, max: 900, step: 10 },
    Z: { label: 'Section modulus @ Bmax, full chassis', unit: 'cm³', min: 100, max: 1500, step: 1 },
    TF: { label: 'Tare mass over front axle', unit: 'kg', min: 1000, max: 12000, step: 5 },
    TR: { label: 'Tare mass over rear axle', unit: 'kg', min: 1000, max: 12000, step: 5 },
    MF: { label: "Max manufacturer's allowable, front", unit: 'kg', min: 2000, max: 16000, step: 50 },
    MR: { label: "Max manufacturer's allowable, rear", unit: 'kg', min: 3000, max: 26000, step: 50 },
    A: { label: 'Front axle → front hanger', unit: 'm', min: 0, max: 1.5, step: 0.005 },
    B: { label: 'Front axle → rear hanger', unit: 'm', min: 0, max: 1.5, step: 0.005 },
    H: { label: '2nd steer axle → front hanger', unit: 'm', min: 0, max: 1.5, step: 0.005 },
    I: { label: '2nd steer axle → rear hanger', unit: 'm', min: 0, max: 1.5, step: 0.005 },
    C: { label: 'Rear axle → front hanger (fwd)', unit: 'm', min: 0, max: 2, step: 0.005 },
    D: { label: 'Rear axle → rear hanger', unit: 'm', min: 0, max: 2, step: 0.005 },
    E: { label: 'Rear axle → front hanger (aft)', unit: 'm', min: 0, max: 2, step: 0.005 },
    F: { label: 'Rear axle → rear hanger (aft)', unit: 'm', min: 0, max: 2, step: 0.005 }
  };
  const CONFIGS = {
    spring: { label: 'Spring', sub: 'Single / tandem', title: 'SINGLE-TANDEM AXLE SPRING', vehicle: ['WB', 'FOH', 'CA', 'ROH', 'YS', 'Z'], brackets: ['A', 'B', 'C', 'D'], fohCode: 'F' },
    airbag: { label: 'Airbag', sub: 'Tandem', title: 'TANDEM AIRBAG', vehicle: ['WB', 'FOH', 'CA', 'ROH', 'YS', 'Z'], brackets: ['A', 'B', 'C', 'D', 'E', 'F'], fohCode: 'G' },
    twin: { label: 'Twin Steer', sub: 'Tandem bag', title: 'TWIN STEER-TANDEM AIRBAG', vehicle: ['WB', 'J', 'FOH', 'CA', 'ROH', 'YS', 'Z'], brackets: ['A', 'B', 'H', 'I', 'C', 'D', 'E', 'F'], fohCode: 'G' }
  };
  const SAMPLES = {
    spring: { basis: 'full', job: { company: '', engineer: '', customer: 'Sample Customer A', jobNo: 'DEMO-01', rev: '0', date: '2026-07-09', desc: '3 Way Tipper', gvm: '7500', gcm: '11000' }, fos: 3,
      v: { WB: 3.85, FOH: 1.09, CA: 2.25, ROH: 1.105, YS: 350, Z: 245, TF: 1775, TR: 2675, MF: 3000, MR: 4500, A: 0.575, B: 0.553, C: 0.605, D: 0.61 } },
    airbag: { basis: 'full', job: { company: '', engineer: '', customer: 'Sample Customer B', jobNo: 'DEMO-02', rev: '0', date: '2026-07-16', desc: 'Pantech', gvm: '28500', gcm: '70000' }, fos: 4,
      v: { WB: 6.685, FOH: 1.275, CA: 5.6, ROH: 3.35, YS: 550, Z: 857, TF: 5700, TR: 3820, MF: 7000, MR: 16500, A: 0.87, B: 0.82, C: 1.15, D: 0.35, E: 0.35, F: 1.1 } },
    twin: { basis: 'full', job: { company: '', engineer: '', customer: 'Sample Customer C', jobNo: 'DEMO-03', rev: '0', date: '2026-07-31', desc: 'Beavertail Tray', gvm: '32000', gcm: '55000' }, fos: 4,
      v: { WB: 6.385, J: 1.8, FOH: 1.275, CA: 5.6, ROH: 3.15, YS: 500, Z: 590, TF: 5850, TR: 3600, MF: 11000, MR: 16500, A: 0.867, B: 0.66, H: 0.875, I: 0.47, C: 1.15, D: 0.35, E: 0.35, F: 1.15 } }
  };
  const FOS = [[3, 'Normal use'], [4, 'Minimum'], [5, 'Tippers / off-road']];

  function calc(cfg, v, fos, basis) {
    const zDiv = 1; // Section modulus is always full chassis (no per-rail split)
    const ax1 = v.FOH, RA = v.FOH + v.WB, L = RA + v.ROH, xs = RA - v.CA;
    const ax2 = cfg === 'twin' ? ax1 + v.J : null;
    const PF = Math.max(0, v.MF - v.TF), PR = Math.max(0, v.MR - v.TR), PL = PF + PR;
    const wkg = PL / (v.CA + v.ROH), w = wkg * G / 1000;
    let br;
    if (cfg === 'twin') {
      const rf = PF / 4 * G / 1000;
      br = [{ id: 'A', x: ax1 - v.A, R: rf }, { id: 'B', x: ax1 + v.B, R: rf }, { id: 'H', x: ax2 - v.H, R: rf }, { id: 'I', x: ax2 + v.I, R: rf }];
    } else {
      const rf = PF / 2 * G / 1000;
      br = [{ id: 'A', x: ax1 - v.A, R: rf }, { id: 'B', x: ax1 + v.B, R: rf }];
    }
    if (cfg === 'spring') {
      const r = PR / 2 * G / 1000;
      br.push({ id: 'C', x: RA - v.C, R: r }, { id: 'D', x: RA + v.D, R: r });
    } else {
      const r = PR / 4 * G / 1000;
      br.push({ id: 'C', x: RA - v.C, R: r }, { id: 'D', x: RA - v.D, R: r }, { id: 'E', x: RA + v.E, R: r }, { id: 'F', x: RA + v.F, R: r });
    }
    br.sort((a, b) => a.x - b.x);
    const Mraw = x => { let m = 0; for (const b of br) if (x >= b.x) m += b.R * (x - b.x); const u = Math.max(0, x - xs); return m - w / 2 * u * u; };
    const V = (x, left) => { let s = 0; for (const b of br) if (left ? x > b.x : x >= b.x) s += b.R; return s - w * Math.max(0, x - xs); };
    // Override: bending moment at end of chassis forced to 0 — blended linearly from last bracket to end.
    const xLast = Math.min(L, Math.max(...br.map(b => b.x)));
    const mEnd = Mraw(L);
    const M = x => (x > xLast && L > xLast) ? Mraw(x) - mEnd * (x - xLast) / (L - xLast) : Mraw(x);
    const xsList = [];
    for (let x = 0; x < L - 1e-9; x += 0.1) xsList.push(+x.toFixed(4));
    xsList.push(L);
    br.forEach(b => xsList.push(b.x - 1e-6, b.x));
    xsList.push(xs);
    xsList.sort((a, b) => a - b);
    const pts = [];
    let bmPos = { x: 0, m: 0 }, bmNeg = { x: 0, m: 0 }, sf = { x: 0, v: 0 };
    for (const x of xsList) {
      if (x < 0 || x > L) continue;
      const m = x >= L ? 0 : M(x), s = V(x);
      pts.push({ x, m, s });
      if (m > bmPos.m) bmPos = { x, m };
      if (m < bmNeg.m) bmNeg = { x, m };
      if (Math.abs(s) > Math.abs(sf.v)) sf = { x, v: s };
    }
    const bm = Math.abs(bmNeg.m) > bmPos.m ? bmNeg : bmPos;
    const Bmax = Math.abs(bm.m), stress = Bmax / zDiv * 1000 / v.Z, allow = v.YS / fos;
    const table = br.map(b => ({ label: 'R' + b.id, x: b.x, R: b.R, s: V(b.x), m: M(b.x) }));
    table.push({ label: 'Max. bending moment', x: bm.x, s: V(bm.x), m: bm.m, peak: 'bm' });
    table.push({ label: 'Max. shear force', x: sf.x, s: sf.v, m: sf.x >= L ? 0 : M(sf.x), peak: 'sf' });
    return { cfg, basis: 'full', zDiv, L, xs, RA, ax1, ax2, PF, PR, PL, wkg, w, br, pts, bm, bmPos, bmNeg, sf, Bmax, stress, allow, fos, util: stress / allow, pass: stress <= allow, table, mEndRaw: mEnd };
  }

  function chart(r, kind, W, H, padX, padY) {
    const px = x => padX + x / r.L * (W - 2 * padX);
    const ser = r.pts.map(p => ({ x: p.x, y: kind === 'bm' ? p.m : p.s }));
    let lo = Math.min(0, ...ser.map(p => p.y)), hi = Math.max(0, ...ser.map(p => p.y));
    if (hi - lo < 1e-6) hi = 1;
    const py = y => padY + (hi - y) / (hi - lo) * (H - 2 * padY);
    const line = ser.map(p => px(p.x).toFixed(1) + ',' + py(p.y).toFixed(1)).join(' ');
    const z = py(0).toFixed(1);
    const peak = kind === 'bm' ? { x: r.bm.x, y: r.bm.m } : { x: r.sf.x, y: r.sf.v };
    return { line, area: padX + ',' + z + ' ' + line + ' ' + (W - padX) + ',' + z, zero: z, px: px(peak.x).toFixed(1), py: py(peak.y).toFixed(1), hi, lo, sx: px };
  }

  // Realistic side elevation. All geometry in metres (y up from ground), mapped to px.
  function elevation(r, cfg, o) {
    const W = o.W, pad = o.padX, k = Math.min((W - 2 * pad) / r.L, o.maxK || 1e9);
    const ox = (W - r.L * k) / 2, top = o.top, ROOF = 3.1;
    const X = x => ox + x * k, Y = y => top + (ROOF - y) * k;
    const H = Y(0) + o.bot;
    const f = n => n.toFixed(1), P = (x, y) => f(X(x)) + ',' + f(Y(y));
    const rect = (x1, x2, y1, y2) => ({ x: f(X(x1)), y: f(Y(y2)), w: f(Math.max(0, (x2 - x1) * k)), h: f((y2 - y1) * k) });
    const ax = r.ax1, ar = 0.62, cf = 0;
    const cb = Math.max(r.xs - 0.06, ax + ar + 0.2, 1.6);
    const archL = Math.max(cf + 0.04, ax - ar), archR = ax + ar;
    const R = f(ar * k);
    const cab = `M${P(cf, 0.95)} L${P(cf, 1.85)} L${P(cf + 0.07, 2.78)} Q${P(cf + 0.1, 3.02)} ${P(cf + 0.36, 3.04)} L${P(cb - 0.12, 3.04)} Q${P(cb, 3.04)} ${P(cb, 2.92)} L${P(cb, 0.95)} L${P(archR, 0.95)} A${R} ${R} 0 0 0 ${P(archL, 0.95)} L${P(cf, 0.95)} Z`;
    const dS = cf + 0.2, dE = Math.min(cb - 0.18, cf + 1.5);
    const win = `M${P(dS + 0.02, 2.02)} L${P(dS + 0.1, 2.8)} L${P(dE - 0.06, 2.8)} L${P(dE - 0.06, 2.02)} Z`;
    const door = `M${P(dS, 1.66)} L${P(dS, 2.88)} L${P(dE, 2.88)} L${P(dE, 1.66)} Z`;
    const screen = `M${P(cf + 0.02, 1.98)} L${P(cf + 0.09, 2.76)}`;
    const beltLine = `M${P(cf + 0.01, 1.92)} L${P(cb, 1.92)}`;
    const mirror = `M${P(cf + 0.12, 2.62)} L${P(cf - 0.2, 2.62)}`;
    const mirrorHead = rect(cf - 0.27, cf - 0.15, 2.12, 2.74);
    const bumper = rect(-0.1, Math.max(0.3, archL - 0.04), 0.42, 0.95);
    const lamp = rect(-0.02, 0.14, 1.04, 1.2);
    const handle = rect(dE - 0.24, dE - 0.08, 2.0, 2.04);
    const steps = [];
    const sx1 = archR + 0.04, sx2 = Math.min(cb - 0.03, archR + 0.42);
    if (sx2 - sx1 > 0.15) [0.52, 0.78].forEach(y => steps.push(rect(sx1, sx2, y - 0.03, y)));
    const rearW = cfg === 'spring' ? [r.RA] : [r.RA - 0.66, r.RA + 0.66];
    const frontW = r.ax2 ? [r.ax1, r.ax2] : [r.ax1];
    const wheels = frontW.concat(rearW).map(x => ({ cx: f(X(x)), cy: f(Y(0.5)), rt: f(0.5 * k), rr: f(0.3 * k), rh: f(0.09 * k) }));
    const g1 = rearW[0] - 0.62, g2 = rearW[rearW.length - 1] + 0.62;
    const guards = [`M${P(g1, 0.72)} L${P(g1, 1.12)} L${P(g2, 1.12)} L${P(g2, 0.72)}`];
    if (r.ax2) guards.push(`M${P(r.ax2 - 0.62, 0.8)} L${P(r.ax2 - 0.62, 1.12)} L${P(r.ax2 + 0.62, 1.12)} L${P(r.ax2 + 0.62, 0.8)}`);
    const tanks = [];
    const tS = r.ax2 ? r.ax2 + 0.72 : Math.max(archR + 0.12, cb - 0.25), tE = Math.min(tS + 1.15, g1 - 0.1);
    if (tE - tS >= 0.5) tanks.push({ ...rect(tS, tE, 0.4, 0.9), rx: f(0.1 * k), band1: f(X(tS + 0.2)), band2: f(X(tE - 0.2)), y1: f(Y(0.9)), y2: f(Y(0.4)) });
    const rail = rect(0.05, r.L, 0.78, 1.05);
    const subframe = rect(r.xs + 0.05, r.L, 1.05, 1.14);
    const body = rect(r.xs + 0.05, r.L, 1.14, 2.75);
    const underrun = `M${P(r.L - 0.22, 0.86)} L${P(r.L - 0.22, 0.42)} M${P(r.L - 0.4, 0.42)} L${P(r.L - 0.02, 0.42)}`;
    const arrows = []; const n = Math.max(4, Math.round((r.L - r.xs) / 0.4));
    for (let i = 0; i < n; i++) { const x = r.xs + 0.05 + (r.L - r.xs - 0.05) * (i + 0.5) / n; arrows.push({ d: `M${P(x, 2.6)} L${P(x, 1.32)}`, head: `${f(X(x) - 2.6)},${f(Y(1.32) - 4)} ${f(X(x) + 2.6)},${f(Y(1.32) - 4)} ${P(x, 1.2)}` }); }
    const brackets = r.br.map(b => ({ id: b.id, ...rect(b.x - 0.06, b.x + 0.06, 0.6, 0.78), lx: f(X(b.x)), ly1: f(Y(0.6)), ly2: f(Y(0) + 3), ty: f(Y(0) + 12) }));
    return { vb: `0 0 ${W} ${f(H)}`, X, Y, k, ground: f(Y(0)), gx1: f(X(-0.4)), gx2: f(X(r.L + 0.3)), cab, win, door, screen, beltLine, mirror, mirrorHead, bumper, lamp, handle, steps, wheels, guards, tanks, rail, subframe, body, bodyTx: f(X(r.L)), bodyTy: f(Y(2.75) - 4), underrun, arrows, brackets, bmX: f(X(r.bm.x)), bmY1: f(Y(3.0)), bmY2: f(Y(0.78)) };
  }

  const KEY = 'chassisStrength.v2';
  function load() { if (window.__ccState) return window.__ccState; try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function save(s) {
    window.__ccState = s;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    try { if (window.parent !== window) window.parent.postMessage({ cc: 'state', s: JSON.parse(JSON.stringify(s)) }, (/^https?:$/.test(location.protocol) ? location.origin : '*')); } catch (e) {}
  }
  function fmt(n, d) { const p = Math.pow(10, d); return (Math.round(n * p) / p).toFixed(d); }

  // Permanent creator marker — fixed, non-editable. Re-injected if removed from the page.
  const CREATOR = Object.freeze({ role: 'Dashboard Creator', name: 'Engineer – Yash Mistry', text: 'Dashboard Creator · Engineer – Yash Mistry' });
  function guardCreator() {
    if (typeof document === 'undefined' || window.__ccGuard) return;
    window.__ccGuard = true;
    const check = () => {
      const marks = [...document.querySelectorAll('[data-creator-mark]')].filter(n => n.isConnected && n.offsetParent !== null && (n.textContent || '').indexOf(CREATOR.name) >= 0);
      let fb = document.getElementById('__cc_creator_fallback');
      if (!marks.length && !fb && document.body) {
        fb = document.createElement('div'); fb.id = '__cc_creator_fallback';
        fb.style.cssText = 'position:fixed;left:50%;bottom:6px;transform:translateX(-50%);z-index:2147483647;pointer-events:none';
        const sh = fb.attachShadow({ mode: 'closed' });
        sh.innerHTML = '<span style="font:600 11px sans-serif;letter-spacing:.04em;color:#3FD0FF;background:rgba(10,20,48,.92);border:1px solid rgba(63,208,255,.4);padding:4px 10px;border-radius:999px">' + CREATOR.text + '</span>';
        document.body.appendChild(fb);
      } else if (marks.length && fb) fb.remove();
    };
    setInterval(check, 1500);
  }
  guardCreator();

  window.ChassisCalc = { G, DEFS, CONFIGS, SAMPLES, FOS, calc, chart, elevation, load, save, fmt, CREATOR };
})();
