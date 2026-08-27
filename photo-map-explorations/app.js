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
const blueprint = document.querySelector('#blueprint-screen');
const buildMap = document.querySelector('#build-map-screen');
const tear = document.querySelector('#tear-screen');
const colorMap = document.querySelector('#color-map-screen');
const mail = document.querySelector('#mail-screen');
const postMap = document.querySelector('#post-map-screen');
const chest = document.querySelector('#chest-screen');
const digMap = document.querySelector('#dig-map-screen');
const claw = document.querySelector('#claw-screen');
const craneMap = document.querySelector('#crane-map-screen');
const cloud = document.querySelector('#cloud-screen');
const rainMap = document.querySelector('#rain-map-screen');
const rip = document.querySelector('#rip-screen');
const tornMap = document.querySelector('#torn-map-screen');
const eye = document.querySelector('#eye-screen');
const skyEyeMap = document.querySelector('#sky-eye-map-screen');
const pen = document.querySelector('#pen-screen');
const penMap = document.querySelector('#pen-map-screen');
const shutter = document.querySelector('#shutter');
const sendMap = document.querySelector('#send-map');
let captured = false;

function show(screen) {
  [menu, camera, map, scanner, revealMap, painting, painterMap, prism, mirageMap, magic, summonMap, door, anywhereMap, blueprint, buildMap, tear, colorMap, mail, postMap, chest, digMap, claw, craneMap, cloud, rainMap, rip, tornMap, eye, skyEyeMap, pen, penMap].forEach((item) => item.classList.add('is-hidden'));
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
function resetBlueprint() {
  blueprint.classList.remove('planned');
  document.querySelector('#blueprint-button').classList.remove('is-hidden');
  document.querySelector('#build-send').classList.add('is-hidden');
  document.querySelector('#blueprint-hint').textContent = '把照片转换为一张施工图';
}
function playBuild() {
  buildMap.classList.remove('building-now');
  void buildMap.offsetWidth;
  buildMap.classList.add('building-now');
}
function resetTear() {
  tear.classList.remove('torn');
  document.querySelector('#tear-button').classList.remove('is-hidden');
  document.querySelector('#color-send').classList.add('is-hidden');
  document.querySelector('#tear-hint').textContent = '按住主体，把它从照片上撕下来';
}
function playColor() {
  colorMap.classList.remove('coloring');
  void colorMap.offsetWidth;
  colorMap.classList.add('coloring');
}
function resetMail() {
  mail.classList.remove('mailed');
  document.querySelector('#mail-button').classList.remove('is-hidden');
  document.querySelector('#mail-send').classList.add('is-hidden');
  document.querySelector('#mail-hint').textContent = '把这一刻写成一封信';
}
function playPost() {
  postMap.classList.remove('delivering');
  void postMap.offsetWidth;
  postMap.classList.add('delivering');
}
function resetChest() {
  chest.classList.remove('stored');
  document.querySelector('#chest-button').classList.remove('is-hidden');
  document.querySelector('#dig-send').classList.add('is-hidden');
  document.querySelector('#chest-hint').textContent = '把这一刻藏进宝箱';
}
function playDig() {
  digMap.classList.remove('digging');
  void digMap.offsetWidth;
  digMap.classList.add('digging');
}
function resetClaw() {
  claw.classList.remove('grabbed');
  document.querySelector('#claw-button').classList.remove('is-hidden');
  document.querySelector('#claw-send').classList.add('is-hidden');
  document.querySelector('#claw-hint').textContent = '把主体放进抓娃娃机';
}
function playCrane() {
  craneMap.classList.remove('craning');
  void craneMap.offsetWidth;
  craneMap.classList.add('craning');
}
function resetCloud() {
  cloud.classList.remove('colored');
  document.querySelector('#cloud-button').classList.remove('is-hidden');
  document.querySelector('#rain-send').classList.add('is-hidden');
  document.querySelector('#cloud-hint').textContent = '让云朵先靠近照片';
}
function playRain() {
  rainMap.classList.remove('raining');
  void rainMap.offsetWidth;
  rainMap.classList.add('raining');
}
function resetRip() {
  rip.classList.remove('locked');
  document.querySelector('#rip-button').classList.remove('is-hidden');
  document.querySelector('#rip-send').classList.add('is-hidden');
  document.querySelector('#rip-hint').textContent = '拍下一张照片，交给地图';
}
function playRip() {
  tornMap.classList.remove('ripping');
  void tornMap.offsetWidth;
  tornMap.classList.add('ripping');
}
function resetEye() {
  eye.classList.remove('captured');
  document.querySelector('#eye-button').classList.remove('is-hidden');
  document.querySelector('#eye-send').classList.add('is-hidden');
  document.querySelector('#eye-hint').textContent = '眨眼，确认你正在看的景色';
}
function playSkyEye() {
  skyEyeMap.classList.remove('projecting');
  void skyEyeMap.offsetWidth;
  skyEyeMap.classList.add('projecting');
}
function resetPen() {
  pen.classList.remove('captured');
  document.querySelector('#pen-button').classList.remove('is-hidden');
  document.querySelector('#pen-send').classList.add('is-hidden');
  document.querySelector('#pen-hint').textContent = '让钢笔记住这一刻';
}
function playPenMap() {
  penMap.classList.remove('drawing');
  void penMap.offsetWidth;
  penMap.classList.add('drawing');
}

document.querySelector('#open-experiment').addEventListener('click', () => { resetCamera(); show(camera); });
document.querySelector('#open-scanner').addEventListener('click', () => { resetScanner(); show(scanner); });
document.querySelector('#open-painting').addEventListener('click', () => { resetPainting(); show(painting); });
document.querySelector('#open-prism').addEventListener('click', () => { resetPrism(); show(prism); });
document.querySelector('#open-magic').addEventListener('click', () => { resetMagic(); show(magic); });
document.querySelector('#open-door').addEventListener('click', () => { resetDoor(); show(door); });
document.querySelector('#open-build').addEventListener('click', () => { resetBlueprint(); show(blueprint); });
document.querySelector('#open-tear').addEventListener('click', () => { resetTear(); show(tear); });
document.querySelector('#open-mail').addEventListener('click', () => { resetMail(); show(mail); });
document.querySelector('#open-treasure').addEventListener('click', () => { resetChest(); show(chest); });
document.querySelector('#open-claw').addEventListener('click', () => { resetClaw(); show(claw); });
document.querySelector('#open-cloud').addEventListener('click', () => { resetCloud(); show(cloud); });
document.querySelector('#open-rip').addEventListener('click', () => { resetRip(); show(rip); });
document.querySelector('#open-eye').addEventListener('click', () => { resetEye(); show(eye); });
document.querySelector('#open-pen').addEventListener('click', () => { resetPen(); show(pen); });
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
document.querySelector('.blueprint-back').addEventListener('click', () => show(menu));
document.querySelector('.build-back').addEventListener('click', () => show(menu));
document.querySelector('.tear-back').addEventListener('click', () => show(menu));
document.querySelector('.color-back').addEventListener('click', () => show(menu));
document.querySelector('.mail-back').addEventListener('click', () => show(menu));
document.querySelector('.post-back').addEventListener('click', () => show(menu));
document.querySelector('.chest-back').addEventListener('click', () => show(menu));
document.querySelector('.dig-back').addEventListener('click', () => show(menu));
document.querySelector('.claw-back').addEventListener('click', () => show(menu));
document.querySelector('.crane-back').addEventListener('click', () => show(menu));
document.querySelector('.cloud-back').addEventListener('click', () => show(menu));
document.querySelector('.rain-back').addEventListener('click', () => show(menu));
document.querySelector('.rip-back').addEventListener('click', () => show(menu));
document.querySelector('.torn-back').addEventListener('click', () => show(menu));
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
  setTimeout(() => document.querySelector('#door-send').classList.remove('is-hidden'), 3900);
});
document.querySelector('#door-send').addEventListener('click', () => { show(anywhereMap); playAnywhere(); });
document.querySelector('.anywhere-replay').addEventListener('click', playAnywhere);
document.querySelector('#blueprint-button').addEventListener('click', () => {
  blueprint.classList.add('planned');
  document.querySelector('#blueprint-button').classList.add('is-hidden');
  document.querySelector('#blueprint-hint').textContent = '施工图已经生成';
  setTimeout(() => document.querySelector('#build-send').classList.remove('is-hidden'), 1450);
});
document.querySelector('#build-send').addEventListener('click', () => { show(buildMap); playBuild(); });
document.querySelector('.build-replay').addEventListener('click', playBuild);
document.querySelector('#tear-button').addEventListener('click', () => {
  tear.classList.add('torn');
  document.querySelector('#tear-button').classList.add('is-hidden');
  document.querySelector('#tear-hint').textContent = '主体已被撕下，准备落到地图';
  setTimeout(() => document.querySelector('#color-send').classList.remove('is-hidden'), 1200);
});
document.querySelector('#color-send').addEventListener('click', () => { show(colorMap); playColor(); });
document.querySelector('.color-replay').addEventListener('click', playColor);
document.querySelector('#mail-button').addEventListener('click', () => {
  mail.classList.add('mailed');
  document.querySelector('#mail-button').classList.add('is-hidden');
  document.querySelector('#mail-hint').textContent = '主体已装好，正在寄出';
  setTimeout(() => document.querySelector('#mail-send').classList.remove('is-hidden'), 1350);
});
document.querySelector('#mail-send').addEventListener('click', () => { show(postMap); playPost(); });
document.querySelector('.post-replay').addEventListener('click', playPost);
document.querySelector('#chest-button').addEventListener('click', () => {
  chest.classList.add('stored');
  document.querySelector('#chest-button').classList.add('is-hidden');
  document.querySelector('#chest-hint').textContent = '宝箱已经封好，埋进地图';
  setTimeout(() => document.querySelector('#dig-send').classList.remove('is-hidden'), 1250);
});
document.querySelector('#dig-send').addEventListener('click', () => { show(digMap); playDig(); });
document.querySelector('.dig-replay').addEventListener('click', playDig);
document.querySelector('#claw-button').addEventListener('click', () => {
  claw.classList.add('grabbed');
  document.querySelector('#claw-button').classList.add('is-hidden');
  document.querySelector('#claw-hint').textContent = '机械爪已抓住主体';
  setTimeout(() => document.querySelector('#claw-send').classList.remove('is-hidden'), 1450);
});
document.querySelector('#claw-send').addEventListener('click', () => { show(craneMap); playCrane(); });
document.querySelector('.crane-replay').addEventListener('click', playCrane);
document.querySelector('#cloud-button').addEventListener('click', () => {
  cloud.classList.add('colored');
  document.querySelector('#cloud-button').classList.add('is-hidden');
  document.querySelector('#cloud-hint').textContent = '云朵已经吸满照片的颜色';
  setTimeout(() => document.querySelector('#rain-send').classList.remove('is-hidden'), 1400);
});
document.querySelector('#rain-send').addEventListener('click', () => { show(rainMap); playRain(); });
document.querySelector('.rain-replay').addEventListener('click', playRain);
document.querySelector('#rip-button').addEventListener('click', () => {
  rip.classList.add('locked');
  document.querySelector('#rip-button').classList.add('is-hidden');
  document.querySelector('#rip-hint').textContent = '主体已锁定，准备撕开地图';
  setTimeout(() => document.querySelector('#rip-send').classList.remove('is-hidden'), 950);
});
document.querySelector('#rip-send').addEventListener('click', () => { show(tornMap); playRip(); });
document.querySelector('.torn-replay').addEventListener('click', playRip);
document.querySelector('.eye-back').addEventListener('click', () => show(menu));
document.querySelector('.sky-eye-back').addEventListener('click', () => show(menu));
document.querySelector('#eye-button').addEventListener('click', () => {
  eye.classList.add('captured');
  document.querySelector('#eye-button').classList.add('is-hidden');
  document.querySelector('#eye-hint').textContent = '眼睛闭上了，记忆留下残影';
  setTimeout(() => document.querySelector('#eye-send').classList.remove('is-hidden'), 1300);
});
document.querySelector('#eye-send').addEventListener('click', () => { show(skyEyeMap); playSkyEye(); });
document.querySelector('.sky-eye-replay').addEventListener('click', playSkyEye);
document.querySelector('.pen-back').addEventListener('click', () => show(menu));
document.querySelector('.pen-map-back').addEventListener('click', () => show(menu));
document.querySelector('#pen-button').addEventListener('click', () => {
  pen.classList.add('captured');
  document.querySelector('#pen-button').classList.add('is-hidden');
  document.querySelector('#pen-hint').textContent = '主体已被钢笔记下';
  setTimeout(() => document.querySelector('#pen-send').classList.remove('is-hidden'), 850);
});
document.querySelector('#pen-send').addEventListener('click', () => { show(penMap); playPenMap(); });
document.querySelector('.pen-map-replay').addEventListener('click', playPenMap);
