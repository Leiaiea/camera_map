(() => {
  const trigger = document.querySelector('.action.side.guide');
  const shutter = document.querySelector('#capture');
  const stage = document.querySelector('#stage');
  if (!trigger || !shutter || !stage) return;

  // 替换正式素材时只需填入 stickerUrl；线稿 SVG 同样可替换为正式资产路径。
  const seeds = [
    { label: '一只你总遇见的猫', color: '#d9a877', rotate: -1.3, art: 'cat', stickerUrl: '' },
    { label: '每天路过的早餐摊', color: '#d8a15d', rotate: .8, art: 'stall', stickerUrl: '' },
    { label: '一棵你总经过却没看清的树', color: '#9cac82', rotate: -1.0, art: 'tree', stickerUrl: '' },
    { label: '窗外的一次落日', color: '#d99373', rotate: 1.2, art: 'sunset', stickerUrl: '' },
    { label: '深夜还亮着灯的一家店', color: '#c89a70', rotate: -.4, art: 'shop', stickerUrl: '' },
    { label: '你桌上的一杯水', color: '#8eafbd', rotate: 1.1, art: 'water', stickerUrl: '' },
  ];
  const drawings = {
    cat: '<path d="M42 67c-4-11-2-29 7-35l6 7 9-8 6 8c9 7 9 25 3 34M48 63c5 4 16 4 22 0M53 50h1M66 50h1M57 57c2 2 5 2 7 0M42 62l-10 5M43 69l-11 10M75 62l10 5M74 69l10 10"/>',
    stall: '<path d="M29 74h54M35 74V45h42v29M29 45h54l-5-16H34zM40 45v-9M51 45v-9M62 45v-9M73 45v-9M42 57h11M42 64h11M63 56h8v18"/>',
    tree: '<path d="M56 77V55M56 61l-9 10M56 66l9 9M56 56c-15 0-23-11-19-21 2-7 10-10 16-6 3-10 17-11 20-1 9-4 16 4 13 12 7 8-1 19-14 17-4 5-11 6-16 3zM27 77h58"/>',
    sunset: '<path d="M27 72h58M31 63c9-6 18 5 27-1 9-6 16 2 24-3M56 52a13 13 0 1 0 0-26 13 13 0 0 0 0 26zM56 18v-7M37 25l-5-5M75 25l5-5M32 45h-8M80 45h8"/>',
    shop: '<path d="M31 76V43h50v33M27 43h58l-5-15H32zM39 43v-8M50 43v-8M62 43v-8M73 43v-8M40 55h13v21M63 54h10v10H63zM47 66h1M69 59h1"/>',
    water: '<path d="M43 35h26l-3 38H46zM43 45h26M69 42c9-7 16-1 13 9-2 7-8 10-14 7M48 28c2-7 9-9 13-4M34 77h46"/>',
  };

  const style = document.createElement('style');
  style.textContent = `
    .seed-guide-backdrop{position:fixed;z-index:60;inset:0;display:flex;align-items:flex-end;background:rgba(36,38,34,.16);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity .25s ease}.seed-guide-backdrop.is-open{opacity:1;pointer-events:auto}
    .seed-guide-sheet{width:100%;height:58dvh;min-height:486px;padding:10px 20px calc(20px + env(safe-area-inset-bottom));overflow:hidden;border:1px solid rgba(255,255,255,.8);border-bottom:0;border-radius:28px 28px 0 0;color:#242622;background:rgba(255,255,255,.72);box-shadow:0 -18px 48px rgba(36,38,34,.1),inset 0 1px rgba(255,255,255,.78);backdrop-filter:blur(28px) saturate(1.08);-webkit-backdrop-filter:blur(28px) saturate(1.08);transform:translateY(104%);transition:transform .35s ease-out}.seed-guide-backdrop.is-open .seed-guide-sheet{transform:translateY(0)}
    .seed-guide-handle{width:36px;height:4px;margin:2px auto 18px;border-radius:99px;background:rgba(36,38,34,.18);touch-action:none}.seed-guide-head{margin:0 4px 20px}.seed-guide-title{margin:0;color:#242622;font:500 23px/1.3 "STKaiti","KaiTi","Noto Serif SC",serif;letter-spacing:-.03em}.seed-guide-subtitle{margin:5px 0 0;color:#6d716b;font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif}
    .seed-guide-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:0;padding:0;list-style:none}.seed-guide-card{min-width:0;opacity:0;transform:translateY(12px) rotate(calc(var(--rotation) * 1deg));animation:seed-settle .35s ease-out forwards;animation-delay:calc(var(--index) * 50ms + 70ms)}.seed-guide-card button{position:relative;width:100%;height:112px;padding:8px 10px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;overflow:hidden;border:0;border-radius:16px;color:#242622;background:#f7f7f3;background-image:radial-gradient(rgba(36,38,34,.035) .55px,transparent .7px);background-size:5px 5px;box-shadow:2px 3px 0 rgba(36,38,34,.035),5px 7px 12px rgba(36,38,34,.07);transform:rotate(calc(var(--rotation) * 1deg));transition:transform .18s ease,box-shadow .18s ease;cursor:pointer}.seed-guide-card button:focus-visible{outline:2px solid rgba(36,38,34,.5);outline-offset:3px}.seed-guide-card button:active{transform:translateY(-3px) rotate(calc(var(--rotation) * 1deg));box-shadow:3px 6px 13px rgba(36,38,34,.12)}
    .seed-guide-visual{position:relative;z-index:1;display:grid;place-items:center;width:68px;height:68px}.seed-guide-drawing{width:64px;height:64px;fill:none;stroke:#5d605b;stroke-width:1.45;stroke-linecap:round;stroke-linejoin:round}.seed-guide-label{position:relative;z-index:1;display:block;width:100%;overflow:hidden;color:#454943;font:12px/1.25 "STKaiti","KaiTi","Noto Serif SC",serif;letter-spacing:.01em;text-align:center;text-overflow:ellipsis;white-space:nowrap}
    .seed-guide-card.is-revealed button:before{content:"";position:absolute;inset:-18px;background:radial-gradient(circle at 45% 40%,color-mix(in srgb,var(--seed-color) 36%,transparent),transparent 63%);opacity:.65;animation:seed-develop .3s ease-out both}.seed-guide-card.is-revealed .seed-guide-drawing{stroke:#242622}.seed-guide-sticker{position:relative;width:72px;height:72px;display:grid;place-items:center;border:3px solid rgba(255,255,255,.88);border-radius:50% 48% 52% 45%;background:var(--seed-color);box-shadow:0 3px 6px rgba(36,38,34,.12);transform:rotate(-5deg);overflow:hidden}.seed-guide-sticker img{width:100%;height:100%;object-fit:cover}.seed-guide-sticker .seed-guide-drawing{width:58px;height:58px;stroke:rgba(255,255,255,.9)}
    .seed-capture-hint{position:absolute;z-index:25;top:calc(20px + env(safe-area-inset-top));left:50%;max-width:calc(100% - 48px);padding:8px 14px;border:1px solid rgba(255,255,255,.65);border-radius:999px;color:#242622;background:rgba(255,255,255,.58);box-shadow:0 8px 20px rgba(36,38,34,.1),inset 0 1px rgba(255,255,255,.75);backdrop-filter:blur(20px);font:14px/1.2 "STKaiti","KaiTi","Noto Serif SC",serif;white-space:nowrap;transform:translate(-50%,-10px);opacity:0;pointer-events:none;transition:opacity .2s ease,transform .2s ease}.seed-capture-hint.is-visible{opacity:1;transform:translate(-50%,0)}
    .seed-reference{position:absolute;z-index:12;left:50%;top:47%;width:min(72vw,290px);height:min(50vh,360px);display:grid;place-items:center;border:1px solid rgba(255,255,255,.42);border-radius:24px;opacity:0;pointer-events:none;transform:translate(-50%,-50%) scale(.96);transition:opacity .22s ease,transform .22s ease}.seed-reference:before,.seed-reference:after{content:"";position:absolute;width:21px;height:21px;border-color:rgba(255,255,255,.78);border-style:solid}.seed-reference:before{left:-2px;top:-2px;border-width:2px 0 0 2px}.seed-reference:after{right:-2px;bottom:-2px;border-width:0 2px 2px 0}.seed-reference.is-visible{opacity:1;transform:translate(-50%,-50%) scale(1)}.seed-reference svg{width:82%;height:82%;fill:none;stroke:rgba(255,255,255,.9);stroke-width:1.15;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 1px 2px rgba(0,0,0,.28))}
    @keyframes seed-settle{to{opacity:1;transform:translateY(0) rotate(calc(var(--rotation) * 1deg))}}@keyframes seed-develop{from{opacity:0;transform:scale(.75)}to{opacity:.65;transform:scale(1)}}@media(max-height:720px){.seed-guide-sheet{height:60dvh;min-height:0}.seed-guide-handle{margin-bottom:12px}.seed-guide-head{margin-bottom:12px}.seed-guide-card button{height:112px}.seed-guide-visual{width:67px;height:67px}.seed-guide-drawing{width:63px;height:63px}.seed-guide-sticker{width:59px;height:59px}.seed-guide-sticker .seed-guide-drawing{width:48px;height:48px}}@media(prefers-reduced-motion:reduce){.seed-guide-backdrop,.seed-guide-sheet,.seed-guide-card,.seed-guide-card button,.seed-capture-hint{transition:none;animation:none}.seed-guide-card{opacity:1;transform:rotate(calc(var(--rotation) * 1deg))}}
  `;

  const overlay = document.createElement('section');
  overlay.className = 'seed-guide-backdrop';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `<section class="seed-guide-sheet" role="dialog" aria-modal="true" aria-labelledby="seed-guide-title"><div class="seed-guide-handle" aria-label="向下滑动关闭"></div><header class="seed-guide-head"><h1 class="seed-guide-title" id="seed-guide-title">从刚好看见的地方开始</h1><p class="seed-guide-subtitle">这几样，你的地图上还没有。</p></header><ul class="seed-guide-grid"></ul></section>`;
  const hint = document.createElement('p');
  hint.className = 'seed-capture-hint';
  const reference = document.createElement('div');
  reference.className = 'seed-reference';
  reference.setAttribute('aria-hidden', 'true');
  document.head.append(style); document.body.append(overlay); stage.append(hint, reference);

  let pending = null;
  const grid = overlay.querySelector('.seed-guide-grid');
  const draw = seed => `<svg class="seed-guide-drawing" viewBox="0 0 112 96" aria-hidden="true">${drawings[seed.art]}</svg>`;
  const visual = (seed, revealed) => revealed ? `<span class="seed-guide-sticker">${seed.stickerUrl ? `<img src="${seed.stickerUrl}" alt="${seed.label}">` : draw(seed)}</span>` : draw(seed);
  const render = () => {
    const allDone = seeds.every(seed => seed.done);
    overlay.querySelector('.seed-guide-title').textContent = allDone ? '你的地图，已经开始活了。' : '从刚好看见的地方开始';
    overlay.querySelector('.seed-guide-subtitle').textContent = allDone ? '颜色会继续从你看见的地方长出来。' : '这几样，你的地图上还没有。';
    grid.innerHTML = seeds.map((seed, index) => `<li class="seed-guide-card${seed.done ? ' is-revealed' : ''}" style="--rotation:${seed.rotate};--index:${index};--seed-color:${seed.color}"><button type="button" data-seed="${index}" aria-label="${seed.done ? '查看' : '拍下'}${seed.label}"><span class="seed-guide-visual">${visual(seed, seed.done)}</span><span class="seed-guide-label">${seed.label}</span></button></li>`).join('');
    grid.querySelectorAll('button').forEach(button => button.addEventListener('click', () => selectSeed(Number(button.dataset.seed))));
  };
  const hideHint = () => { hint.classList.remove('is-visible'); reference.classList.remove('is-visible'); };
  const close = () => { overlay.classList.remove('is-open'); overlay.setAttribute('aria-hidden', 'true'); hideHint(); trigger.focus(); };
  const open = () => { render(); overlay.classList.add('is-open'); overlay.setAttribute('aria-hidden', 'false'); };
  const selectSeed = index => {
    const seed = seeds[index]; if (seed.done) return;
    pending = index; hint.textContent = `去拍${seed.label.replace(/^一只|^每天路过的|^一棵|^窗外的|^深夜还亮着灯的|^你桌上的/, '')}`;
    close(); window.setTimeout(() => {
      hint.classList.add('is-visible');
      reference.innerHTML = `<svg viewBox="0 0 112 96" aria-hidden="true">${drawings[seed.art]}</svg>`;
      reference.classList.add('is-visible');
      document.querySelector('.debug [data-mode="B"]')?.click();
    }, 300);
  };
  trigger.addEventListener('click', () => { if (stage.dataset.mode === 'A') open(); });
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
  let dragStart = null; const handle = overlay.querySelector('.seed-guide-handle');
  handle.addEventListener('pointerdown', event => { dragStart = event.clientY; handle.setPointerCapture(event.pointerId); });
  handle.addEventListener('pointerup', event => { if (dragStart !== null && event.clientY - dragStart > 56) close(); dragStart = null; });
  shutter.addEventListener('click', () => { if (pending === null) return; const selected = pending; pending = null; window.setTimeout(() => { seeds[selected].done = true; hideHint(); open(); }, 420); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && overlay.classList.contains('is-open')) close(); });
  render();
})();
