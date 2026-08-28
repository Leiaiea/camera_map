(function () {
  "use strict";

  const config = window.MEMORY_MAP_CONFIG || {};
  const statusElement = document.querySelector("#status");
  const locateButton = document.querySelector("#locate-button");
  const mapTone = document.querySelector("#map-tone");
  const groundTintLayer = document.querySelector("#ground-tint-layer");
  const stickerLayer = document.querySelector("#sticker-layer");
  let mapInitialized = false;
  let loadTimeoutId = null;
  let mapInstance = null;
  let AMapInstance = null;
  const worldContent = new Map();
  const demoMemoryRecords = Array.isArray(window.MEMORY_MAP_DEMO_RECORDS)
    ? window.MEMORY_MAP_DEMO_RECORDS
    : [];
  const demoStickers = [];

  function setStatus(message) {
    statusElement.textContent = message;
  }

  function showLoadFailure(message, error) {
    if (loadTimeoutId) {
      window.clearTimeout(loadTimeoutId);
    }
    console.error(message, error || "");
    setStatus(message);
  }

  function locationStatus(result) {
    const accuracy = Number(result.accuracy);
    if (Number.isFinite(accuracy) && accuracy > 0) {
      return `定位成功：精度约 ${Math.round(accuracy)} 米（仅预览，未保存）。`;
    }
    return "定位成功：当前结果未提供精度，可能为城市级定位（仅预览，未保存）。";
  }

  function locateCurrentPosition() {
    if (!mapInstance || !AMapInstance) {
      return;
    }

    locateButton.disabled = true;
    setStatus("正在请求当前位置…");

    const geolocation = new AMapInstance.Geolocation({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      noGeoLocation: 0,
      showButton: false,
      showMarker: false,
      showCircle: false,
      panToLocation: false,
      zoomToAccuracy: false,
    });

    geolocation.getCurrentPosition(function (status, result) {
      locateButton.disabled = false;
      if (status !== "complete" || !result || !result.position) {
        const reason = result && result.message ? `：${result.message}` : "。请检查系统定位、页面授权与 HTTPS 环境。";
        setStatus(`定位失败${reason}`);
        return;
      }

      mapInstance.setZoomAndCenter(Math.max(mapInstance.getZoom(), 16), result.position);
      setStatus(locationStatus(result));
    });
  }

  locateButton.addEventListener("click", locateCurrentPosition);

  function hasValue(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function getConfiguredCenter() {
    return Array.isArray(config.initialCenter) ? config.initialCenter : [116.397428, 39.90923];
  }

  // 高缩放级别展示“身边”时更接近低角度；缩小查看更大区域时逐步回到俯视。
  function getPitchForZoom(zoom) {
    const farZoom = 12;
    const nearZoom = 20;
    const farPitch = 18;
    const nearPitch = 58;
    const safeZoom = Number.isFinite(zoom) ? zoom : nearZoom;
    const progress = Math.max(0, Math.min(1, (safeZoom - farZoom) / (nearZoom - farZoom)));
    return Math.round((farPitch + (nearPitch - farPitch) * progress) * 10) / 10;
  }

  function syncPitchToZoom() {
    if (!mapInstance) {
      return;
    }
    mapInstance.setPitch(getPitchForZoom(mapInstance.getZoom()));
  }

  function createDemoStickers() {
    if (!stickerLayer || demoStickers.length > 0) {
      return;
    }

    demoMemoryRecords.forEach(function (record) {
      const node = document.createElement("img");
      const objectNode = document.createElement("span");
      const shadowNode = document.createElement("img");
      const tintNode = document.createElement("i");
      node.className = "map-sticker";
      objectNode.className = "sticker-object";
      shadowNode.className = "sticker-shadow";
      tintNode.className = "ground-tint";
      const tintColors = Array.isArray(record.groundTintColors) ? record.groundTintColors : [record.groundTintColor || "#A8A8A8"];
      tintNode.style.setProperty("--ground-tint-color-1", tintColors[0] || "#A8A8A8");
      tintNode.style.setProperty("--ground-tint-color-2", tintColors[1] || tintColors[0] || "#A8A8A8");
      tintNode.style.setProperty("--ground-tint-color-3", tintColors[2] || tintColors[0] || "#A8A8A8");
      node.src = record.assets.stickerUrl;
      shadowNode.src = record.assets.stickerUrl;
      node.alt = "";
      shadowNode.alt = "";
      node.draggable = false;
      shadowNode.draggable = false;
      node.addEventListener("error", function () { node.hidden = true; });
      if (groundTintLayer) {
        groundTintLayer.appendChild(tintNode);
      }
      objectNode.appendChild(shadowNode);
      objectNode.appendChild(node);
      stickerLayer.appendChild(objectNode);
      demoStickers.push({
        id: record.id,
        tintNode: tintNode,
        objectNode: objectNode,
        node: node,
        position: new AMapInstance.LngLat(record.location.lngGcj02, record.location.latGcj02),
      });
    });
  }

  function renderDemoStickers() {
    if (!mapInstance) {
      return;
    }
    demoStickers.forEach(function (sticker) {
      if (!sticker.position) {
        return;
      }
      const point = mapInstance.lngLatToContainer(sticker.position);
      sticker.objectNode.style.left = `${point.getX()}px`;
      sticker.objectNode.style.top = `${point.getY()}px`;
      sticker.tintNode.style.left = `${point.getX()}px`;
      sticker.tintNode.style.top = `${point.getY()}px`;
    });
  }

  function applyMapTone() {
    const requestedOpacity = Number(config.mapToneOpacity);
    const opacity = Number.isFinite(requestedOpacity)
      ? Math.max(0, Math.min(1, requestedOpacity))
      : 0.52;
    mapTone.style.backgroundColor = hasValue(config.mapToneColor) ? config.mapToneColor : "#FFFFFF";
    mapTone.style.opacity = String(opacity);
  }

  applyMapTone();

  function publishWorldUpdate(type, id, record) {
    window.dispatchEvent(new CustomEvent("memory-map-world-update", {
      detail: { type: type, id: id, record: record },
    }));
  }

  function publishMapApi() {
    window.memoryMapWorld = {
      getMap: function () { return mapInstance; },
      upsertContent: function (id, record) {
        worldContent.set(id, record);
        publishWorldUpdate("upsert", id, record);
      },
      removeContent: function (id) {
        worldContent.delete(id);
        publishWorldUpdate("remove", id);
      },
    };
  }

  if (!hasValue(config.amapKey) || !hasValue(config.securityJsCode)) {
    setStatus("请先在 config.js 填入高德 Key 与安全密钥。");
    return;
  }

  // 高德要求安全密钥在 JS API 脚本之前写入全局配置。
  window._AMapSecurityConfig = { securityJsCode: config.securityJsCode };

  function createMap(AMap) {
    try {
      if (mapInstance) {
        return;
      }
      if (!AMap) {
        showLoadFailure("高德脚本已返回，但 AMap 未初始化。请检查 Key 与安全密钥。" );
        return;
      }
      const options = {
        viewMode: "3D",
        // 3D 场景的天空颜色独立于底图样式和地面染色。
        skyColor: hasValue(config.skyColor) ? config.skyColor : "#DCE8EC",
        zoom: Number(config.initialZoom) || 12,
        center: getConfiguredCenter(),
        pitch: getPitchForZoom(Number(config.initialZoom) || 12),
        rotation: 0,
        resizeEnable: true,
        dragEnable: true,
        zoomEnable: true,
        touchZoom: true,
        pitchEnable: false,
        rotateEnable: false,
        showLabel: false,
        showIndoorMap: false,
        showBuildingBlock: true,
        buildingAnimation: false,
        roofColor: "#E8E8EA",
        wallColor: "#D8D8DC",
        // 保留普通道路，隐藏 POI；道路等级与地铁的精确隐藏由个性化地图样式控制。
        features: ["bg", "road", "building"],
      };

      if (hasValue(config.mapStyle)) {
        options.mapStyle = config.mapStyle;
      }

      AMapInstance = AMap;
      mapInstance = new AMap.Map("map", options);
      window.memoryMapPreview = mapInstance;
      mapInstance.on("zoomchange", syncPitchToZoom);
      mapInstance.on("mapmove", renderDemoStickers);
      mapInstance.on("zoomend", renderDemoStickers);
      mapInstance.on("resize", renderDemoStickers);
      // 初始化参数与运行时 setter 双重应用，便于本地预览排除加载时序影响。
      if (hasValue(config.mapStyle)) {
        mapInstance.setMapStyle(config.mapStyle);
      }
      setStatus("地图对象已创建，正在加载图面…");

      // complete 表示地图图块已完成加载，不能在 Map 实例创建时就误报成功。
      mapInstance.on("complete", function () {
        syncPitchToZoom();
        createDemoStickers();
        renderDemoStickers();
        // 自定义样式服务在线返回后再次应用，避免首次图面初始化回退为默认样式。
        if (hasValue(config.mapStyle)) {
          mapInstance.setMapStyle(config.mapStyle);
        }
        mapInitialized = true;
        window.clearTimeout(loadTimeoutId);
        const styleStatus = hasValue(config.mapStyle) ? "已应用底图样式" : "使用默认样式";
        setStatus(`地图图面已加载（${styleStatus}）：可拖动与双指缩放。`);
        locateButton.disabled = false;
        publishMapApi();
      });
    } catch (error) {
      showLoadFailure("地图初始化失败，请检查浏览器控制台与高德平台配置。", error);
    }
  }

  const loaderScript = document.createElement("script");
  loaderScript.charset = "utf-8";
  loaderScript.src = "https://webapi.amap.com/loader.js";
  loaderScript.onerror = function () {
    showLoadFailure("高德脚本加载失败，请检查网络、Key 的 Web(JS API) 平台类型与白名单配置。");
  };
  loaderScript.onload = function () {
    if (!window.AMapLoader) {
      showLoadFailure("高德加载器未初始化，请检查网络或浏览器拦截扩展。");
      return;
    }

    window.AMapLoader.load({
      key: config.amapKey,
      version: "2.0",
      plugins: ["AMap.Geolocation"],
    })
      .then(createMap)
      .catch(function (error) {
        showLoadFailure("高德 API 加载失败，请检查 Key、安全密钥及域名白名单。", error);
      });
  };
  document.head.appendChild(loaderScript);

  loadTimeoutId = window.setTimeout(function () {
    if (!mapInitialized) {
      showLoadFailure("等待高德地图超过 10 秒：请检查 Key 类型、securityJsCode、网络及域名白名单。");
    }
  }, 10000);
})();
