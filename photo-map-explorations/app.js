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
const shutter = document.querySelector('#shutter');
const sendMap = document.querySelector('#send-map');
let captured = false;

function show(screen) {
  [menu, camera, map, scanner, revealMap, painting, painterMap, prism, mirageMap, magic, summonMap, door, anywhereMap].forEach((item) => item.classList.add('is-hidden'));
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

document.querySelector('#open-experiment').addEventListener('click', () => { resetCamera(); show(camera); });
document.querySelector('#open-scanner').addEventListener('click', () => { resetScanner(); show(scanner); });
document.querySelector('#open-painting').addEventListener('click', () => { resetPainting(); show(painting); });
document.querySelector('#open-prism').addEventListener('click', () => { resetPrism(); show(prism); });
document.querySelector('#open-magic').addEventListener('click', () => { resetMagic(); show(magic); });
document.querySelector('#open-door').addEventListener('click', () => { resetDoor(); show(door); });
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
