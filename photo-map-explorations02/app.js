const menu = document.querySelector('#debug-menu');
const camera = document.querySelector('#camera-screen');
const map = document.querySelector('#map-screen');
const scanner = document.querySelector('#scanner-screen');
const revealMap = document.querySelector('#reveal-map-screen');
const painting = document.querySelector('#painting-screen');
const painterMap = document.querySelector('#painter-map-screen');
const prism = document.querySelector('#prism-screen');
const mirageMap = document.querySelector('#mirage-map-screen');
const magic = document.querySelector('#magic-screen');
const summonMap = document.querySelector('#summon-map-screen');
const door = document.querySelector('#door-screen');
const anywhereMap = document.querySelector('#anywhere-map-screen');
const planeCamera = document.querySelector('#plane-camera-screen');
const planeMap = document.querySelector('#plane-map-screen');
const moodCamera = document.querySelector('#mood-camera-screen');
const moodMap = document.querySelector('#mood-map-screen');
const stampCamera = document.querySelector('#stamp-camera-screen');
const mailMap = document.querySelector('#mail-map-screen');
const diamondCamera = document.querySelector('#diamond-camera-screen');
const birdMap = document.querySelector('#bird-map-screen');
const antCamera = document.querySelector('#ant-camera-screen');
const antMap = document.querySelector('#ant-map-screen');
const flowerCamera = document.querySelector('#flower-camera-screen');
const flowerMap = document.querySelector('#flower-map-screen');
const windowCamera = document.querySelector('#window-camera-screen');
const windowMap = document.querySelector('#window-map-screen');
const filmCamera = document.querySelector('#film-camera-screen');
const filmMap = document.querySelector('#film-map-screen');
const shutter = document.querySelector('#shutter');
const sendMap = document.querySelector('#send-map');
let captured = false;

function show(screen) {
  [menu, camera, map, scanner, revealMap, painting, painterMap, prism, mirageMap, magic, summonMap, door, anywhereMap, planeCamera, planeMap, moodCamera, moodMap, stampCamera, mailMap, diamondCamera, birdMap, antCamera, antMap, flowerCamera, flowerMap, windowCamera, windowMap, filmCamera, filmMap].forEach((item) => item.classList.add('is-hidden'));
  screen.classList.remove('is-hidden');
}
function resetCamera() {
  captured = false;
  camera.classList.remove('captured');
  shutter.classList.remove('is-hidden');
  sendMap.classList.add('is-hidden');
  document.querySelector('#camera-hint').textContent = '框住想留下的教堂';
}
function playDrop() {
  // Reinsert the falling elements so their one-shot CSS animations restart.
  ['.airdrop', '.drop-shadow'].forEach((selector) => {
    const element = map.querySelector(selector);
    element.replaceWith(element.cloneNode(true));
  });
  map.classList.remove('playing');
  void map.offsetWidth;
  map.classList.add('playing');
  // 盒子落地后退场，地图上最终只保留被送达的教堂主体。
  setTimeout(() => {
    const deliveredGift = map.querySelector('.airdrop');
    if (deliveredGift) {
      deliveredGift.style.transition = 'opacity 220ms ease';
      deliveredGift.style.opacity = '0';
    }
    const shadow = map.querySelector('.drop-shadow');
    if (shadow) shadow.style.opacity = '0';
  }, 2580);
}
function resetScanner() {
  scanner.classList.remove('scanned');
  document.querySelector('#scan-button').classList.remove('is-hidden');
  document.querySelector('#reveal-button').classList.add('is-hidden');
  document.querySelector('#scanner-hint').textContent = '将景色置于扫描区域内';
}
function playReveal() {
  revealMap.classList.remove('revealing');
  void revealMap.offsetWidth;
  revealMap.classList.add('revealing');
}
function resetPainting() {
  painting.classList.remove('framed');
  document.querySelector('#frame-button').classList.remove('is-hidden');
  document.querySelector('#painter-send').classList.add('is-hidden');
  document.querySelector('#painting-hint').textContent = '让景色先住进画框里';
}
function playPainting() {
  painterMap.classList.remove('painting-now');
  void painterMap.offsetWidth;
  painterMap.classList.add('painting-now');
}
function resetPrism() {
  prism.classList.remove('refracted');
  document.querySelector('#prism-button').classList.remove('is-hidden');
  document.querySelector('#mirage-send').classList.add('is-hidden');
  document.querySelector('#prism-hint').textContent = '让棱镜对准景色里的光';
}
function playMirage() {
  mirageMap.classList.remove('miraging');
  void mirageMap.offsetWidth;
  mirageMap.classList.add('miraging');
}
function resetMagic() {
  magic.classList.remove('casting');
  document.querySelector('#magic-button').classList.remove('is-hidden');
  document.querySelector('#summon-send').classList.add('is-hidden');
  document.querySelector('#magic-hint').textContent = '让魔法阵在景色背后显现';
}
function playSummon() {
  summonMap.classList.remove('summoning');
  void summonMap.offsetWidth;
  summonMap.classList.add('summoning');
}
function resetDoor() {
  door.classList.remove('entering');
  document.querySelector('#door-button').classList.remove('is-hidden');
  document.querySelector('#door-send').classList.add('is-hidden');
  document.querySelector('#door-hint').textContent = '选择一扇通往地图的门';
}
function playAnywhere() {
  anywhereMap.classList.remove('opening');
  void anywhereMap.offsetWidth;
  anywhereMap.classList.add('opening');
}
function resetPlane() {
  planeCamera.classList.remove('folding', 'folded');
  document.querySelector('#fold-button').classList.remove('is-hidden');
  document.querySelector('#plane-send').classList.add('is-hidden');
  document.querySelector('#plane-hint').textContent = '桌上有一张刚刚拍下的照片';
  document.querySelector('#fold-status-copy').textContent = '照片已展开，等待折叠';
}
function playPlaneLanding() {
  planeMap.classList.remove('plane-arriving');
  void planeMap.offsetWidth;
  planeMap.classList.add('plane-arriving');
}
function resetMood() {
  moodCamera.classList.remove('mood-dissolving', 'mood-ready');
  document.querySelector('#mood-button').classList.remove('is-hidden');
  document.querySelector('#mood-send').classList.add('is-hidden');
  document.querySelector('#mood-hint').textContent = '让魔法棒读出这一刻的颜色';
}
function playMoodFlow() {
  moodMap.classList.remove('mood-flowing');
  void moodMap.offsetWidth;
  moodMap.classList.add('mood-flowing');
}
function resetStamp() {
  stampCamera.classList.remove('stamping', 'posted');
  document.querySelector('#stamp-button').classList.remove('is-hidden');
  document.querySelector('#stamp-send').classList.add('is-hidden');
  document.querySelector('#stamp-hint').textContent = '把这一刻收进一枚邮票';
}
function playMailDelivery() {
  mailMap.classList.remove('mail-delivering');
  void mailMap.offsetWidth;
  mailMap.classList.add('mail-delivering');
}
function resetDiamond() {
  diamondCamera.classList.remove('crystallizing', 'bird-ready');
  document.querySelector('#diamond-button').classList.remove('is-hidden');
  document.querySelector('#diamond-send').classList.add('is-hidden');
  document.querySelector('#diamond-hint').textContent = '让照片里的光慢慢结晶';
}
function playBirdDelivery() {
  birdMap.classList.remove('bird-delivering');
  void birdMap.offsetWidth;
  birdMap.classList.add('bird-delivering');
}
function resetAnt() {
  antCamera.classList.remove('rolling', 'ants-ready');
  document.querySelector('#ant-button').classList.remove('is-hidden');
  document.querySelector('#ant-send').classList.add('is-hidden');
  document.querySelector('#ant-hint').textContent = '旧纸边缘，正好收藏这一刻';
}
function playAntDelivery() {
  antMap.classList.remove('ants-delivering');
  void antMap.offsetWidth;
  antMap.classList.add('ants-delivering');
}
function resetFlower() {
  flowerCamera.classList.remove('closing-flower', 'bud-ready');
  document.querySelector('#flower-button').classList.remove('is-hidden');
  document.querySelector('#flower-send').classList.add('is-hidden');
  document.querySelector('#flower-hint').textContent = '让景色落在花心里';
}
function playFlowerPlanting() {
  flowerMap.classList.remove('flower-planting');
  void flowerMap.offsetWidth;
  flowerMap.classList.add('flower-planting');
}
function resetWindow() {
  windowCamera.classList.remove('window-closing', 'window-packed');
  document.querySelector('#window-button').classList.remove('is-hidden');
  document.querySelector('#window-send').classList.add('is-hidden');
  document.querySelector('#window-hint').textContent = '此刻正停在窗外';
}
function playWindowOpening() {
  windowMap.classList.remove('window-opening');
  void windowMap.offsetWidth;
  windowMap.classList.add('window-opening');
}
function resetFilm() {
  filmCamera.classList.remove('film-shooting', 'film-ready');
  document.querySelector('#film-button').classList.remove('is-hidden');
  document.querySelector('#film-send').classList.add('is-hidden');
  document.querySelector('#film-hint').textContent = '复古相机已经对准这一刻';
}
function playFilmRolling() {
  filmMap.classList.remove('film-rolling');
  void filmMap.offsetWidth;
  filmMap.classList.add('film-rolling');
}
function seedMoodParticles() {
  const seed = (container, target, mapMode = false) => {
    while (container.children.length < target) container.appendChild(document.createElement('i'));
    [...container.children].forEach((particle, index) => {
      const a = (index * 47 + 19) % 101;
      const b = (index * 73 + 11) % 97;
      particle.style.setProperty('--x', `${18 + (a % 66)}%`);
      particle.style.setProperty('--y', `${23 + (b % 52)}%`);
      particle.style.setProperty('--dx', `${-128 + ((a * 17) % 256)}px`);
      particle.style.setProperty('--dy', `${-105 + ((b * 19) % 228)}px`);
      particle.style.setProperty('--n', `${(index % 16) * 0.045}s`);
      particle.style.setProperty('--delay', `${(index % 22) * 0.045}s`);
      particle.style.setProperty('--size', `${mapMode ? 2 + (index % 5) : 2 + (index % 6)}px`);
      particle.style.setProperty('--tone', index % 5 === 0 ? '#e76061' : index % 3 === 0 ? '#ed8559' : '#f5c45c');
    });
  };
  seed(document.querySelector('.mood-particle-cloud'), 96);
  seed(document.querySelector('.mood-particle-stream'), 132, true);
}
seedMoodParticles();
document.querySelector('#open-experiment').addEventListener('click', () => { resetCamera(); show(camera); });
document.querySelector('#open-scanner').addEventListener('click', () => { resetScanner(); show(scanner); });
document.querySelector('#open-painting').addEventListener('click', () => { resetPainting(); show(painting); });
document.querySelector('#open-prism').addEventListener('click', () => { resetPrism(); show(prism); });
document.querySelector('#open-magic').addEventListener('click', () => { resetMagic(); show(magic); });
document.querySelector('#open-door').addEventListener('click', () => { resetDoor(); show(door); });
document.querySelector('#open-plane').addEventListener('click', () => { resetPlane(); show(planeCamera); });
document.querySelector('#open-mood').addEventListener('click', () => { resetMood(); show(moodCamera); });
document.querySelector('#open-stamp').addEventListener('click', () => { resetStamp(); show(stampCamera); });
document.querySelector('#open-diamond').addEventListener('click', () => { resetDiamond(); show(diamondCamera); });
document.querySelector('#open-ant').addEventListener('click', () => { resetAnt(); show(antCamera); });
document.querySelector('#open-flower').addEventListener('click', () => { resetFlower(); show(flowerCamera); });
document.querySelector('#open-window').addEventListener('click', () => { resetWindow(); show(windowCamera); });
document.querySelector('#open-film').addEventListener('click', () => { resetFilm(); show(filmCamera); });
document.querySelector('.camera-topbar .back').addEventListener('click', () => show(menu));
document.querySelector('.map-back').addEventListener('click', () => show(menu));
document.querySelector('.scanner-back').addEventListener('click', () => show(menu));
document.querySelector('.reveal-back').addEventListener('click', () => show(menu));
document.querySelector('.painting-back').addEventListener('click', () => show(menu));
document.querySelector('.painter-map-back').addEventListener('click', () => show(menu));
document.querySelector('.prism-back').addEventListener('click', () => show(menu));
document.querySelector('.mirage-back').addEventListener('click', () => show(menu));
document.querySelector('.magic-back').addEventListener('click', () => show(menu));
document.querySelector('.summon-back').addEventListener('click', () => show(menu));
document.querySelector('.door-back').addEventListener('click', () => show(menu));
document.querySelector('.anywhere-back').addEventListener('click', () => show(menu));
document.querySelector('.plane-back').addEventListener('click', () => show(menu));
document.querySelector('.plane-map-back').addEventListener('click', () => show(menu));
document.querySelector('.mood-back').addEventListener('click', () => show(menu));
document.querySelector('.mood-map-back').addEventListener('click', () => show(menu));
document.querySelector('.stamp-back').addEventListener('click', () => show(menu));
document.querySelector('.mail-map-back').addEventListener('click', () => show(menu));
document.querySelector('.diamond-back').addEventListener('click', () => show(menu));
document.querySelector('.bird-map-back').addEventListener('click', () => show(menu));
document.querySelector('.ant-back').addEventListener('click', () => show(menu));
document.querySelector('.ant-map-back').addEventListener('click', () => show(menu));
document.querySelector('.flower-back').addEventListener('click', () => show(menu));
document.querySelector('.flower-map-back').addEventListener('click', () => show(menu));
document.querySelector('.window-back').addEventListener('click', () => show(menu));
document.querySelector('.window-map-back').addEventListener('click', () => show(menu));
document.querySelector('.film-back').addEventListener('click', () => show(menu));
document.querySelector('.film-map-back').addEventListener('click', () => show(menu));
shutter.addEventListener('click', () => {
  if (captured) return;
  captured = true;
  camera.classList.add('captured');
  shutter.classList.add('is-hidden');
  document.querySelector('#camera-hint').textContent = '教堂已经封装成快递';
  setTimeout(() => sendMap.classList.remove('is-hidden'), 950);
});
sendMap.addEventListener('click', () => { show(map); playDrop(); });
document.querySelector('.replay').addEventListener('click', playDrop);
document.querySelector('#scan-button').addEventListener('click', () => {
  scanner.classList.add('scanned');
  document.querySelector('#scan-button').classList.add('is-hidden');
  document.querySelector('#scanner-hint').textContent = '景色已被压缩成一张地图切片';
  setTimeout(() => document.querySelector('#reveal-button').classList.remove('is-hidden'), 1250);
});
document.querySelector('#reveal-button').addEventListener('click', () => { show(revealMap); playReveal(); });
document.querySelector('.reveal-replay').addEventListener('click', playReveal);
document.querySelector('#frame-button').addEventListener('click', () => {
  painting.classList.add('framed');
  document.querySelector('#frame-button').classList.add('is-hidden');
  document.querySelector('#painting-hint').textContent = '这一帧正在被送往地图';
  setTimeout(() => document.querySelector('#painter-send').classList.remove('is-hidden'), 1000);
});
document.querySelector('#painter-send').addEventListener('click', () => { show(painterMap); playPainting(); });
document.querySelector('.painter-replay').addEventListener('click', playPainting);
document.querySelector('#prism-button').addEventListener('click', () => {
  prism.classList.add('refracted');
  document.querySelector('#prism-button').classList.add('is-hidden');
  document.querySelector('#prism-hint').textContent = '这束光正在穿过地图';
  setTimeout(() => document.querySelector('#mirage-send').classList.remove('is-hidden'), 1750);
});
document.querySelector('#mirage-send').addEventListener('click', () => { show(mirageMap); playMirage(); });
document.querySelector('.mirage-replay').addEventListener('click', playMirage);
document.querySelector('#magic-button').addEventListener('click', () => {
  magic.classList.add('casting');
  document.querySelector('#magic-button').classList.add('is-hidden');
  document.querySelector('#magic-hint').textContent = '主体已穿过法阵';
  setTimeout(() => document.querySelector('#summon-send').classList.remove('is-hidden'), 1350);
});
document.querySelector('#summon-send').addEventListener('click', () => { show(summonMap); playSummon(); });
document.querySelector('.summon-replay').addEventListener('click', playSummon);
document.querySelector('#door-button').addEventListener('click', () => {
  door.classList.add('entering');
  document.querySelector('#door-button').classList.add('is-hidden');
  document.querySelector('#door-hint').textContent = '主体已经被推入门后';
  setTimeout(() => document.querySelector('#door-send').classList.remove('is-hidden'), 1250);
});
document.querySelector('#door-send').addEventListener('click', () => { show(anywhereMap); playAnywhere(); });
document.querySelector('.anywhere-replay').addEventListener('click', playAnywhere);
document.querySelector('#fold-button').addEventListener('click', () => {
  planeCamera.classList.add('folding');
  document.querySelector('#fold-button').classList.add('is-hidden');
  document.querySelector('#plane-hint').textContent = '照片正在折成一架纸飞机';
  setTimeout(() => { document.querySelector('#fold-status-copy').textContent = '把两个角折向中线'; }, 260);
  setTimeout(() => { document.querySelector('#fold-status-copy').textContent = '再把两侧收成机翼'; }, 980);
  setTimeout(() => { document.querySelector('#fold-status-copy').textContent = '沿中线对折，压出折痕'; }, 1780);
  setTimeout(() => {
    planeCamera.classList.add('folded');
    document.querySelector('#fold-status-copy').textContent = '纸飞机已经准备出发';
    document.querySelector('#plane-hint').textContent = '让风把照片送到地图上';
    document.querySelector('#plane-send').classList.remove('is-hidden');
  }, 2700);
});
document.querySelector('#plane-send').addEventListener('click', () => { show(planeMap); playPlaneLanding(); });
document.querySelector('.plane-replay').addEventListener('click', playPlaneLanding);
document.querySelector('#mood-button').addEventListener('click', () => {
  moodCamera.classList.add('mood-dissolving');
  document.querySelector('#mood-button').classList.add('is-hidden');
  document.querySelector('#mood-hint').textContent = '金橙色正在从照片里浮出来';
  setTimeout(() => {
    moodCamera.classList.add('mood-ready');
    document.querySelector('#mood-hint').textContent = '这份心情已经可以流向地图';
    document.querySelector('#mood-send').classList.remove('is-hidden');
  }, 2200);
});
document.querySelector('#mood-send').addEventListener('click', () => { show(moodMap); playMoodFlow(); });
document.querySelector('.mood-replay').addEventListener('click', playMoodFlow);
document.querySelector('#stamp-button').addEventListener('click', () => {
  stampCamera.classList.add('stamping');
  document.querySelector('#stamp-button').classList.add('is-hidden');
  document.querySelector('#stamp-hint').textContent = '邮戳落下，照片正在装进信封';
  setTimeout(() => {
    stampCamera.classList.add('posted');
    document.querySelector('#stamp-hint').textContent = '这封信已经投入邮箱';
    document.querySelector('#stamp-send').classList.remove('is-hidden');
  }, 2200);
});
document.querySelector('#stamp-send').addEventListener('click', () => { show(mailMap); playMailDelivery(); });
document.querySelector('.mail-replay').addEventListener('click', playMailDelivery);
document.querySelector('#diamond-button').addEventListener('click', () => {
  diamondCamera.classList.add('crystallizing');
  document.querySelector('#diamond-button').classList.add('is-hidden');
  document.querySelector('#diamond-hint').textContent = '照片正在折射成一颗钻石';
  setTimeout(() => {
    diamondCamera.classList.add('bird-ready');
    document.querySelector('#diamond-hint').textContent = '小鸟已经衔起这颗光';
    document.querySelector('#diamond-send').classList.remove('is-hidden');
  }, 2450);
});
document.querySelector('#diamond-send').addEventListener('click', () => { show(birdMap); playBirdDelivery(); });
document.querySelector('.bird-replay').addEventListener('click', playBirdDelivery);
document.querySelector('#ant-button').addEventListener('click', () => {
  antCamera.classList.add('rolling');
  document.querySelector('#ant-button').classList.add('is-hidden');
  document.querySelector('#ant-hint').textContent = '牛皮纸正在慢慢卷起';
  setTimeout(() => {
    antCamera.classList.add('ants-ready');
    document.querySelector('#ant-hint').textContent = '搬运队已经把纸卷抬起来了';
    document.querySelector('#ant-send').classList.remove('is-hidden');
  }, 2500);
});
document.querySelector('#ant-send').addEventListener('click', () => { show(antMap); playAntDelivery(); });
document.querySelector('.ant-replay').addEventListener('click', playAntDelivery);
document.querySelector('#flower-button').addEventListener('click', () => {
  flowerCamera.classList.add('closing-flower');
  document.querySelector('#flower-button').classList.add('is-hidden');
  document.querySelector('#flower-hint').textContent = '花瓣正在把景色轻轻合起来';
  setTimeout(() => {
    flowerCamera.classList.add('bud-ready');
    document.querySelector('#flower-hint').textContent = '这一刻已经收进花苞';
    document.querySelector('#flower-send').classList.remove('is-hidden');
  }, 2100);
});
document.querySelector('#flower-send').addEventListener('click', () => { show(flowerMap); playFlowerPlanting(); });
document.querySelector('.flower-replay').addEventListener('click', playFlowerPlanting);
document.querySelector('#window-button').addEventListener('click', () => {
  windowCamera.classList.add('window-closing');
  document.querySelector('#window-button').classList.add('is-hidden');
  document.querySelector('#window-hint').textContent = '两扇窗正在收好这片景色';
  setTimeout(() => {
    windowCamera.classList.add('window-packed');
    document.querySelector('#window-hint').textContent = '窗景已经准备换一个地方打开';
    document.querySelector('#window-send').classList.remove('is-hidden');
  }, 1700);
});
document.querySelector('#window-send').addEventListener('click', () => { show(windowMap); playWindowOpening(); });
document.querySelector('.window-replay').addEventListener('click', playWindowOpening);
document.querySelector('#film-button').addEventListener('click', () => {
  filmCamera.classList.add('film-shooting');
  document.querySelector('#film-button').classList.add('is-hidden');
  document.querySelector('#film-hint').textContent = '胶片正在从相机里显影';
  setTimeout(() => {
    filmCamera.classList.add('film-ready');
    document.querySelector('#film-hint').textContent = '胶片已经卷好，准备出发';
    document.querySelector('#film-send').classList.remove('is-hidden');
  }, 2500);
});
document.querySelector('#film-send').addEventListener('click', () => { show(filmMap); playFilmRolling(); });
document.querySelector('.film-replay').addEventListener('click', playFilmRolling);
