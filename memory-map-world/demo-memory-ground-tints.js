// 从每张 Demo 原图提取的地面染色主色；正式接入时在拍摄完成后生成并写入记录。
(function () {
  const tintById = {
    "demo-memory-001": "#D0B0B0",
    "demo-memory-002": "#709070",
    "demo-memory-003": "#F0D0B0",
    "demo-memory-004": "#709050",
    "demo-memory-005": "#D0D0B0",
    "demo-memory-006": "#907070",
    "demo-memory-007": "#303010",
    "demo-memory-008": "#B0D0F0",
    "demo-memory-009": "#B09070",
    "demo-memory-010": "#90B0D0",
    "demo-memory-011": "#709030",
    "demo-memory-012": "#B0D0F0",
    "demo-memory-013": "#305090",
    "demo-memory-014": "#D0B070",
    "demo-memory-015": "#503030",
    "demo-memory-016": "#B0B0D0",
    "demo-memory-017": "#5070D0",
    "demo-memory-018": "#707090",
    "demo-memory-019": "#707030",
    "demo-memory-020": "#505030",
    "demo-memory-021": "#709010",
    "demo-memory-022": "#905030",
    "demo-memory-023": "#B0B090",
    "demo-memory-024": "#505030",
    "demo-memory-025": "#D09090",
    "demo-memory-026": "#907070",
    "demo-memory-027": "#507050",
    "demo-memory-028": "#503030",
    "demo-memory-029": "#707050",
  };
  (window.MEMORY_MAP_DEMO_RECORDS || []).forEach(function (record) {
    record.groundTintColor = tintById[record.id] || "#A8A8A8";
  });
})();

