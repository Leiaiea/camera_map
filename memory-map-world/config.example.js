// 复制为 config.js 后填入本地凭据。config.js 不会提交到 Git。
window.MEMORY_MAP_CONFIG = {
  amapKey: "你的高德 Web端(JS API) Key",
  securityJsCode: "你的安全密钥（securityJsCode）",
  // 仅压淡高德底图；未来世界图层置于该层之上，不受影响。
  mapToneColor: "#FFFFFF",
  mapToneOpacity: 0.10,
  // 高德官方低饱和浅色底图；不对地图 DOM 使用 CSS 滤镜。
  mapStyle: "amap://styles/whitesmoke",
  // 仅作用于 3D 视角天空；不影响道路、建筑、地面染色或贴纸。
  skyColor: "#DCE8EC",
  // Demo 固定中心点（GCJ-02）；正式接入时由 A 侧传入或按产品逻辑计算。
  initialCenter: [120.563271, 32.390748],
  // 北京纬度下约对应 10 米量级的默认比例尺；实际标尺会随设备与纬度变化。
  initialZoom: 20,
};
