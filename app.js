// =========================================================
// SMART-POLA — app.js
// Sistem Semakan Pola Pakaian Berasaskan AI (TVET)
//
// Struktur:
//   1. Data Ukuran Badan   — input ukuran pelajar (dikekalkan)
//   2. Tetapan Pola        — formula dijana selepas Bahagian
//                            Pola dipilih
//   3. Imbas Pola          — kamera + kad penentukuran 10 cm × 10 cm
//                            (skala automatik, tanpa paparan kalibrasi)
//   4. Analisis Pola       — ukur manual/automatik + semakan
//   5. Keputusan           — LULUS / PERLU PEMBETULAN
//   6. Passport            — rekod pencapaian
// =========================================================
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const VERSION = "v5.1.0";
  const $ = (id) => document.getElementById(id);
  const num = (v) => (Number.isFinite(v) ? v : null);

  // =======================================================
  // UTILITI
  // =======================================================
  function fmt(v, d = 1) {
    if (v === null || v === undefined || !Number.isFinite(v)) return "—";
    return Number(v).toFixed(d) + " cm";
  }

  function setStatus(el, msg, cls) {
    if (!el) return;
    el.textContent = msg;
    el.className = "status" + (cls ? " " + cls : "");
  }

  // =======================================================
  // VERSI
  // =======================================================
  const versionBadge = $("versionBadge");
  if (versionBadge) versionBadge.textContent = VERSION;

  // =======================================================
  // SEKSYEN 1 — DATA UKURAN BADAN (dikekalkan)
  // =======================================================
  const unitSelect = $("unit");
  const unitLabels = document.querySelectorAll(".input-unit .unit-label");
  const measurementIds = [
    "shoulder", "chest", "waist", "hip", "neck",
    "backLength", "labuhBaju", "labuhSkirt", "labuhLengan", "bukaanTangan",
  ];
  const measurementInputs = {};
  measurementIds.forEach((id) => {
    const el = $(id);
    if (el) measurementInputs[id] = el;
  });

  function currentUnit() {
    return unitSelect ? unitSelect.value : "cm";
  }

  function readMeasurements() {
    // Nilai disimpan sentiasa dalam cm; input dalam inci ditukar automatik.
    const factor = currentUnit() === "in" ? 2.54 : 1;
    const m = {};
    for (const [id, el] of Object.entries(measurementInputs)) {
      const raw = parseFloat(el.value);
      m[id] = Number.isFinite(raw) && raw > 0 ? num(raw * factor) : null;
    }
    return m;
  }

  function updateUnitLabels() {
    const label = currentUnit() === "in" ? "in" : "cm";
    unitLabels.forEach((el) => {
      el.textContent = label;
    });
  }

  function saveMeasurements() {
    const m = readMeasurements();
    const filled = Object.values(m).filter((v) => v !== null).length;
    if (filled === 0) {
      setStatus($("measurementStatus"), "Sila masukkan sekurang-kurangnya satu ukuran.", "fail");
      return;
    }
    try {
      localStorage.setItem("smartpola_measurements", JSON.stringify({ unit: currentUnit(), values: m }));
      setStatus($("measurementStatus"), `✅ ${filled} ukuran disimpan. Seterusnya: pilih pola di Seksyen 2.`, "ok");
    } catch (e) {
      setStatus($("measurementStatus"), "Penyimpanan disekat pelayar (mode incognito?).", "fail");
    }
  }

  function loadMeasurements() {
    try {
      const saved = JSON.parse(localStorage.getItem("smartpola_measurements") || "null");
      if (!saved || !saved.values) return;
      // Nilai tersimpan dalam cm — papar dalam unit semasa.
      const factor = currentUnit() === "in" ? 1 / 2.54 : 1;
      for (const [id, cm] of Object.entries(saved.values)) {
        const el = measurementInputs[id];
        if (el && cm !== null) el.value = (cm * factor).toFixed(1);
      }
      setStatus($("measurementStatus"), "Ukuran sebelumnya dimuatkan.", "ok");
    } catch (e) {
      // abaikan
    }
  }

  if (unitSelect) {
    unitSelect.addEventListener("change", () => {
      updateUnitLabels();
      loadMeasurements();
      if (state.targets) computeTargets(); // formula papar semula dalam unit baharu
    });
  }
  const saveMeasurementsButton = $("saveMeasurements");
  if (saveMeasurementsButton) saveMeasurementsButton.addEventListener("click", saveMeasurements);

  // =======================================================
  // SEKSYEN 2 — TETAPAN POLA + FORMULA
  // =======================================================
  // Formula setiap bahagian pola (kunci = id ukuran Seksyen 1).
  const FORMULAS = {
    baju: {
      label: "Baju",
      parts: {
        badanDepan: {
          label: "Badan Depan",
          rows: [
            { name: "Lebar Dada Depan", formula: "¼ Keliling Dada + 3 cm r Clarence", calc: (m) => (m.chest ? m.chest / 4 + 3 : null) },
            { name: "Labuh Depan", formula: "Labuh Baju + 2 cm", calc: (m) => (m.labuhBaju ? m.labuhBaju + 2 : null) },
          ],
        },
        badanBelakang: {
          label: "Badan Belakang",
          rows: [
            { name: "Lebar Belakang", formula: "¼ Keliling Dada − 1 cm", calc: (m) => (m.chest ? m.chest / 4 - 1 : null) },
            { name: "Labuh Belakang", formula: "Labuh Baju", calc: (m) => (m.labuhBaju ? m.labuhBaju : null) },
          ],
        },
        lengan: {
          label: "Lengan",
          rows: [
            { name: "Panjang Lengan", formula: "Labuh Lengan", calc: (m) => (m.labuhLengan ? m.labuhLengan : null) },
            { name: "Lebar Lengan Atas", formula: "½ Bukaan Tangan + 3 cm", calc: (m) => (m.bukaanTangan ? m.bukaanTangan / 2 + 3 : null) },
            { name: "Bukaan Lengan", formula: "½ Bukaan Tangan", calc: (m) => (m.bukaanTangan ? m.bukaanTangan / 2 : null) },
          ],
        },
        kolar: {
          label: "Kolar / Leher",
          rows: [
            { name: "Lebar Leher Belakang", formula: "¼ Keliling Leher − 1 cm", calc: (m) => (m.neck ? m.neck / 4 - 1 : null) },
            { name: "Lebar Leher Depan", formula: "¼ Keliling Leher", calc: (m) => (m.neck ? m.neck / 4 : null) },
          ],
        },
      },
    },
    skirt: {
      label: "Skirt",
      parts: {
        skirtDepan: {
          label: "Skirt Depan",
          rows: [
            { name: "Lebar Pinggang Depan", formula: "¼ Keliling Pinggang + 1 cm rese", calc: (m) => (m.waist ? m.waist / 4 + 1 : null) },
            { name: "Lebar Pinggul Depan", formula: "¼ Keliling Pinggul + 1 cm", calc: (m) => (m.hip ? m.hip / 4 + 1 : null) },
            { name: "Labuh Skirt Depan", formula: "Labuh Kain", calc: (m) => (m.labuhSkirt ? m.labuhSkirt : null) },
          ],
        },
        skirtBelakang: {
          label: "Skirt Belakang",
          rows: [
            { name: "Lebar Pinggang Belakang", formula: "¼ Keliling Pinggang + 1 cm rese", calc: (m) => (m.waist ? m.waist / 4 + 1 : null) },
            { name: "Lebar Pinggul Belakang", formula: "¼ Keliling Pinggul − 1 cm", calc: (m) => (m.hip ? m.hip / 4 - 1 : null) },
            { name: "Labuh Skirt Belakang", formula: "Labuh Kain", calc: (m) => (m.labuhSkirt ? m.labuhSkirt : null) },
          ],
        },
      },
    },
    seluar: {
      label: "Seluar",
      parts: {
        seluarDepan: {
          label: "Seluar Depan",
          rows: [
            { name: "Lebar Pinggang Depan", formula: "¼ Keliling Pinggang + 2 cm", calc: (m) => (m.waist ? m.waist / 4 + 2 : null) },
            { name: "Lebar Pinggul Depan", formula: "¼ Keliling Pinggul", calc: (m) => (m.hip ? m.hip / 4 : null) },
            { name: "Labuh Seluar", formula: "Labuh Kain / Seluar", calc: (m) => (m.labuhSkirt ? m.labuhSkirt : null) },
          ],
        },
        seluarBelakang: {
          label: "Seluar Belakang",
          rows: [
            { name: "Lebar Pinggang Belakang", formula: "¼ Keliling Pinggang + 4 cm", calc: (m) => (m.waist ? m.waist / 4 + 4 : null) },
            { name: "Lebar Pinggul Belakang", formula: "¼ Keliling Pinggul + 1 cm", calc: (m) => (m.hip ? m.hip / 4 + 1 : null) },
          ],
        },
      },
    },
    dress: {
      label: "Dress",
      parts: {
        dressAtas: {
          label: "Dress Atas (Bodis)",
          rows: [
            { name: "Lebar Dada", formula: "¼ Keliling Dada + 2 cm", calc: (m) => (m.chest ? m.chest / 4 + 2 : null) },
            { name: "Lebar Bahu", formula: "Lebar Bahu − 1 cm", calc: (m) => (m.shoulder ? m.shoulder - 1 : null) },
          ],
        },
        dressRok: {
          label: "Dress Rok",
          rows: [
            { name: "Lebar Pinggul", formula: "¼ Keliling Pinggul + 2 cm", calc: (m) => (m.hip ? m.hip / 4 + 2 : null) },
            { name: "Labuh Dress", formula: "Labuh Baju + Labuh Kain ÷ 2", calc: (m) => (m.labuhBaju && m.labuhSkirt ? m.labuhBaju + m.labuhSkirt / 2 : null) },
          ],
        },
        lenganDress: {
          label: "Lengan Dress",
          rows: [
            { name: "Panjang Lengan", formula: "Labuh Lengan − 2 cm", calc: (m) => (m.labuhLengan ? m.labuhLengan - 2 : null) },
            { name: "Bukaan Lengan", formula: "½ Bukaan Tangan + 1 cm", calc: (m) => (m.bukaanTangan ? m.bukaanTangan / 2 + 1 : null) },
          ],
        },
      },
    },
  };

  const garmentTypeSelect = $("garmentType");
  const patternPartSelect = $("patternPart");
  const patternSelectionStatus = $("patternSelectionStatus");

  // =======================================================
  // KEADAAN GLOBAL
  // =======================================================
  const state = {
    measurements: null,
    garment: null,
    part: null,
    targets: null, // [{ id, name, formula, target }]
    calibration: null, // { pxPerCm }
    captureScale: 1,
    pieces: [], // keping pola yang diukur
    activePiece: -1,
    checkRows: [],
    passport: [],
    lineDetected: false,
  };

  function resetPatternPart() {
    state.part = null;
    state.targets = null;
    patternPartSelect.innerHTML = "";
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "-- Pilih bahagian pola --";
    patternPartSelect.appendChild(opt);
    patternPartSelect.disabled = true;
  }

  function populatePatternParts() {
    const garment = FORMULAS[state.garment];
    resetPatternPart();
    if (!garment) return;
    patternPartSelect.disabled = false;
    Object.entries(garment.parts).forEach(([key, part]) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = part.label;
      patternPartSelect.appendChild(opt);
    });
  }

  function computeTargets() {
    state.measurements = readMeasurements();
    const garment = FORMULAS[state.garment];
    const part = garment ? garment.parts[state.part] : null;

    if (!garment || !part) {
      state.targets = null;
      renderFormula();
      return;
    }

    state.targets = part.rows
      .map((row, i) => ({
        id: state.garment + "_" + state.part + "_" + i,
        name: row.name,
        formula: row.formula,
        target: num(row.calc(state.measurements)),
      }))
      .filter((t) => t.target !== null);

    renderFormula();
  }

  function renderFormula() {
    const detail = $("formulaDetail");
    if (!detail) return;
    const garment = FORMULAS[state.garment];
    const part = garment ? garment.parts[state.part] : null;

    if (!garment || !part) {
      detail.innerHTML = "Belum tersedia";
      return;
    }

    const missing = [];
    const lines = part.rows.map((row) => {
      const v = row.calc(state.measurements || readMeasurements());
      if (v === null || !Number.isFinite(v)) {
        missing.push(row);
        return `<li><strong>${row.name}</strong> — <code>${row.formula}</code> — <em>ukuran belum diisi di Seksyen 1</em></li>`;
      }
      return `<li><strong>${row.name}</strong> — <code>${row.formula}</code> = <strong>${fmt(v)}</strong></li>`;
    });

    let html = `<ul>${lines.join("")}</ul>`;
    if (missing.length > 0) {
      html += `<p style="margin:8px 0 0;color:var(--warn);">⚠️ ${missing.length} formula belum dapat dikira — lengkapkan ukuran berkaitan di Seksyen 1.</p>`;
    }
    detail.innerHTML = html;
    setStatus(patternSelectionStatus, `✅ Formula ${garment.label} — ${part.label} dijana.`, "ok");
  }

  function onGarmentChange() {
    state.garment = garmentTypeSelect.value || null;
    resetPatternPart();
    state.targets = null;
    renderFormula();
    if (state.garment) {
      populatePatternParts();
      setStatus(patternSelectionStatus, `Jenis pakaian: ${FORMULAS[state.garment].label}. Pilih bahagian pola.`, "warn");
    } else {
      setStatus(patternSelectionStatus, "", "");
    }
  }

  function onPartChange() {
    state.part = patternPartSelect.value || null;
    if (state.part) {
      computeTargets();
    } else {
      state.targets = null;
      renderFormula();
      setStatus(patternSelectionStatus, "", "");
    }
  }

  if (garmentTypeSelect) garmentTypeSelect.addEventListener("change", onGarmentChange);
  if (patternPartSelect) patternPartSelect.addEventListener("change", onPartChange);

  // =======================================================
  // SEKSYEN 3 — IMBAS POLA (KAMERA + PENENTUKURAN)
  // =======================================================
  const video = $("camera");
  const canvasInput = $("canvasInput");
  const overlayCanvas = $("overlayCanvas");
  const capturedImage = $("capturedImage");
  const measureCanvas = $("measureCanvas");
  const cameraButton = $("cameraButton");
  const flipCameraButton = $("flipCamera");
  const recalibrateButton = $("recalibrateButton");
  const statusEl = $("status");

  let stream = null;
  let facingMode = "environment";

  async function openCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus(statusEl, "Kamera tidak disokong pelayar ini.", "fail");
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      video.srcObject = stream;
      await video.play().catch(() => {});
      cameraButton.textContent = "📸 Ambil Gambar";
      flipCameraButton.hidden = false;
      setStatus(statusEl, "Kamera aktif. Letakkan pola + kad hitam 10 cm, kemudian ambil gambar.", "ok");
    } catch (err) {
      setStatus(statusEl, "Kamera gagal: " + err.name + " — benarkan kebenaran kamera.", "fail");
    }
  }

  function closeCamera() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    cameraButton.textContent = "📷 Buka Kamera";
    flipCameraButton.hidden = true;
  }

  async function onCameraButton() {
    if (!stream) {
      await openCamera();
      return;
    }
    capturePhoto();
  }

  function capturePhoto() {
    if (!video.videoWidth) {
      setStatus(statusEl, "Kamera belum sedia — cuba lagi.", "warn");
      return;
    }
    canvasInput.width = video.videoWidth;
    canvasInput.height = video.videoHeight;
    canvasInput.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = canvasInput.toDataURL("image/jpeg", 0.9);
    closeCamera();
    setStatus(statusEl, "Gambar diambil. Mengira skala daripada kad 10 cm × 10 cm...", "ok");
    loadCapturedImage(dataUrl);
  }

  function loadCapturedImage(dataUrl) {
    const img = new Image();
    img.onload = () => {
      capturedImage.src = dataUrl;
      capturedImage.style.display = "block";
      $("noImageMessage").style.display = "none";
      state.captureScale = 1;
      calibrateFromCard(img);
      // Ukur automatik serta-merta — ukuran pola terus dipaparkan di Seksyen 4.
      if (state.calibration) autoMeasure();
    };
    img.src = dataUrl;
  }

  // ---- Penentukuran automatik: kad hitam tetap 10 cm × 10 cm ----
  function calibrateFromCard(img) {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    measureCanvas.width = w;
    measureCanvas.height = h;
    const ctx = measureCanvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    let data;
    try {
      data = ctx.getImageData(0, 0, w, h).data;
    } catch (e) {
      setStatus(statusEl, "Gagal membaca imej untuk penentukuran.", "fail");
      return;
    }

    // Cari kotak gelap besar (kad hitam) — imbas sampel setiap 4 px.
    const isDark = (i) => data[i] < 60 && data[i + 1] < 60 && data[i + 2] < 60;
    let minX = w, maxX = -1, minY = h, maxY = -1, count = 0;
    for (let y = 0; y < h; y += 4) {
      for (let x = 0; x < w; x += 4) {
        const i = (y * w + x) * 4;
        if (isDark(i)) {
          count++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < 0 || count < 200) {
      setStatus(statusEl, "Kad hitam 10 cm × 10 cm tidak dikesan — pastikan kad kelihatan penuh dalam gambar, atau tekan 🔄 Muat Semula Skala.", "fail");
      return;
    }

    const cardW = maxX - minX;
    const cardH = maxY - minY;
    if (cardW < 40 || cardH < 40) {
      setStatus(statusEl, "Kad hitam terlalu kecil dalam gambar — dekatkan kamera.", "fail");
      return;
    }

    // Kad 10 cm × 10 cm — skala daripada purata dua dimensi supaya lebih tepat.
    const pxPerCm = (cardW + cardH) / 2 / 10;
    state.calibration = { pxPerCm, card: { x0: minX, y0: minY, x1: maxX, y1: maxY } };
    setStatus(statusEl, "Skala siap. Ukuran pola dipaparkan di Seksyen 4 — klik dua titik pada gambar untuk ukur bahagian lain.", "ok");
    state.lineDetected = true;
    $("lineStatus").textContent = "Kad 10 cm × 10 cm dikesan";
    $("formulaStatus").textContent = pxPerCm.toFixed(1) + " px/cm";
    $("autoMeasureButton").disabled = false;
    $("manualCheckButton").disabled = false;
  }

  // ---- Muat semula skala secara manual (klik 2 hujung kad 10 cm) ----
  let manualCalibMode = false;
  let calibClicks = [];

  function startManualCalibration() {
    if (capturedImage.style.display === "none" || !capturedImage.naturalWidth) {
      setStatus(statusEl, "Ambil gambar pola dahulu sebelum memuat semula skala.", "warn");
      return;
    }
    manualCalibMode = true;
    calibClicks = [];
    setStatus(statusEl, "Klik dua hujung kad hitam pada gambar (panjang 10 cm), kemudian skala dikira semula.", "warn");
  }

  function finishManualCalibration(d) {
    const prevCard = state.calibration && state.calibration.card ? state.calibration.card : null;
    state.calibration = { pxPerCm: d / 10, card: prevCard };
    manualCalibMode = false;
    $("formulaStatus").textContent = (d / 10).toFixed(1) + " px/cm";
    $("autoMeasureButton").disabled = false;
    $("manualCheckButton").disabled = false;
    setStatus(statusEl, "✅ Skala dikira semula. Ukur semula pola dengan klik dua titik.", "ok");
  }

  recalibrateButton.addEventListener("click", startManualCalibration);

  // ---- Tukar kamera depan/belakang ----
  flipCameraButton.addEventListener("click", () => {
    facingMode = facingMode === "environment" ? "user" : "environment";
    closeCamera();
    openCamera();
  });

  cameraButton.addEventListener("click", onCameraButton);

  // =======================================================
  // SEKSYEN 4 — ANALISIS POLA
  // =======================================================
  const sensitivityInput = $("edgeSensitivity");
  const sensitivityValue = $("sensitivityValue");
  const pieceChips = $("pieceChips");
  const pieceRename = $("pieceRename");
  const pieceNameInput = $("pieceNameInput");
  const autoMeasureButton = $("autoMeasureButton");
  const manualCheckButton = $("manualCheckButton");
  const lockTargetsButton = $("lockTargetsButton");
  const saveChecksButton = $("saveChecksButton");
  const checkTableBody = $("checkTableBody");

  sensitivityInput.addEventListener("input", () => {
    sensitivityValue.textContent = sensitivityInput.value;
  });

  // ---- Ukur automatik: kotak sempadan pola ----
  function autoMeasure() {
    if (!state.calibration) {
      setStatus(statusEl, "Skala belum dijumpai — pastikan kad hitam kelihatan dalam gambar.", "warn");
      return;
    }
    const ctx = measureCanvas.getContext("2d");
    const w = measureCanvas.width;
    const h = measureCanvas.height;
    let data;
    try {
      data = ctx.getImageData(0, 0, w, h).data;
    } catch (e) {
      setStatus(statusEl, "Gagal membaca imej.", "fail");
      return;
    }

    const thresh = 120 - (sensitivityInput.value - 5) * 8;
    // Cari piksel GELAP di luar kawasan kad penentukuran (kad turut gelap —
    // mesti dikecualikan supaya tidak dikira sebagai pola).
    const calib = state.calibration;
    const cardRect = calib.card || null;
    const MARGIN = Math.max(6, calib.pxPerCm); // tepi kad menebal sedikit
    const inCard = (x, y) =>
      cardRect &&
      x >= cardRect.x0 - MARGIN && x <= cardRect.x1 + MARGIN &&
      y >= cardRect.y0 - MARGIN && y <= cardRect.y1 + MARGIN;
    let minX = w, maxX = -1, minY = h, maxY = -1;
    for (let y = 0; y < h; y += 3) {
      for (let x = 0; x < w; x += 3) {
        if (inCard(x, y)) continue;
        const i = (y * w + x) * 4;
        if (data[i] < thresh && data[i + 1] < thresh && data[i + 2] < thresh) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) {
      setStatus(statusEl, "Tiada garisan pola dikesan — naikkan kepekaan pengesanan.", "warn");
      return;
    }

    const widthCm = (maxX - minX) / calib.pxPerCm;
    const heightCm = (maxY - minY) / calib.pxPerCm;
    const longest = Math.hypot(maxX - minX, maxY - minY) / calib.pxPerCm;

    addPiece(widthCm, heightCm, longest);
    setStatus(statusEl, `📐 Auto: lebar ${fmt(widthCm)}, tinggi ${fmt(heightCm)}. Semak nama keping dan tekan ✅.`, "ok");
    drawMeasureOverlay(minX, minY, maxX, maxY);
  }

  function drawMeasureOverlay(x0, y0, x1, y1) {
    const ctx = measureCanvas.getContext("2d");
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = Math.max(2, measureCanvas.width / 400);
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    measureCanvas.style.display = "block";
  }

  // ---- Klik pada gambar: kalibrasi manual ATAU ukur manual ----
  let measureClicks = [];
  capturedImage.addEventListener("click", (e) => {
    const rect = capturedImage.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (capturedImage.naturalWidth / rect.width);
    const y = (e.clientY - rect.top) * (capturedImage.naturalHeight / rect.height);

    // Mod kalibrasi manual (klik 2 hujung kad 10 cm)
    if (manualCalibMode) {
      calibClicks.push({ x, y });
      if (calibClicks.length === 2) {
        const d = Math.hypot(calibClicks[1].x - calibClicks[0].x, calibClicks[1].y - calibClicks[0].y);
        if (d < 10) {
          setStatus(statusEl, "Titik terlalu hampir — klik dua hujung kad dengan tepat.", "fail");
          calibClicks = [];
          return;
        }
        finishManualCalibration(d);
      } else {
        setStatus(statusEl, "Titik 1 ditetapkan — klik hujung kedua.", "warn");
      }
      return;
    }

    // Mod ukur manual (klik 2 titik pola)
    if (!state.calibration) {
      setStatus(statusEl, "Skala belum dijumpai — pastikan kad hitam kelihatan dalam gambar, atau tekan 🔄 Muat Semula Skala.", "warn");
      return;
    }
    measureClicks.push({ x, y });

    if (measureClicks.length === 2) {
      const d = Math.hypot(measureClicks[1].x - measureClicks[0].x, measureClicks[1].y - measureClicks[0].y);
      const cm = d / state.calibration.pxPerCm;
      const cmH = Math.abs(measureClicks[1].y - measureClicks[0].y) / state.calibration.pxPerCm;
      const cmW = Math.abs(measureClicks[1].x - measureClicks[0].x) / state.calibration.pxPerCm;
      addPiece(cmW, cmH, cm);
      setStatus(statusEl, `Ukuran manual: ${fmt(cm)}. Tekan ✅ untuk tambah ke semakan.`, "ok");
      drawLine(measureClicks[0], measureClicks[1]);
      measureClicks = [];
    } else {
      setStatus(statusEl, "Titik mula ditetapkan — klik titik tamat.", "warn");
    }
  });

  function drawLine(p0, p1) {
    const ctx = measureCanvas.getContext("2d");
    ctx.strokeStyle = "#b91c1c";
    ctx.lineWidth = Math.max(2, measureCanvas.width / 400);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
    measureCanvas.style.display = "block";
  }

  // ---- Keping pola ----
  function addPiece(widthCm, heightCm, longestCm) {
    state.pieces.push({ name: "Keping " + (state.pieces.length + 1), widthCm, heightCm, longestCm });
    state.activePiece = state.pieces.length - 1;
    renderPieces();
  }

  function renderPieces() {
    pieceChips.style.display = state.pieces.length > 0 ? "flex" : "none";
    pieceRename.style.display = state.pieces.length > 0 ? "flex" : "none";
    pieceChips.innerHTML = "";
    state.pieces.forEach((p, i) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip" + (i === state.activePiece ? " active" : "");
      chip.textContent = `${p.name}: ${fmt(p.longestCm)}`;
      chip.addEventListener("click", () => {
        state.activePiece = i;
        pieceNameInput.value = p.name;
        renderPieces();
      });
      pieceChips.appendChild(chip);
    });
    const p = state.pieces[state.activePiece];
    if (p) {
      $("chipLength").textContent = `📐 Lebar: ${fmt(p.widthCm)}`;
      $("chipWidth").textContent = `📏 Terpanjang: ${fmt(p.longestCm)}`;
      $("chipHeight").textContent = `↕️ Tinggi: ${fmt(p.heightCm)}`;
      $("patternMeasurement").textContent = fmt(p.longestCm);
    }
  }

  $("renamePieceButton").addEventListener("click", () => {
    const p = state.pieces[state.activePiece];
    if (p && pieceNameInput.value.trim()) {
      p.name = pieceNameInput.value.trim();
      renderPieces();
      setStatus(statusEl, "Nama keping disimpan.", "ok");
    }
  });

  // ---- Kunci semua sasaran ----
  lockTargetsButton.addEventListener("click", () => {
    if (!state.targets || state.targets.length === 0) {
      setStatus(patternSelectionStatus, "Pilih bahagian pola dahulu di Seksyen 2.", "warn");
      return;
    }
    let added = 0;
    state.targets.forEach((t) => {
      if (!state.checkRows.some((r) => r.id === t.id)) {
        state.checkRows.push({ id: t.id, name: t.name, formula: t.formula, target: t.target, measured: null, pieceName: null });
        added++;
      }
    });
    renderCheckTable();
    setStatus(patternSelectionStatus, `🔒 ${added} sasaran dikunci ke jadual semakan.`, "ok");
  });

  // ---- Tambah ukuran ke semakan ----
  manualCheckButton.addEventListener("click", () => {
    if (!state.pieces.length) {
      setStatus(statusEl, "Ukur pola dahulu (manual atau automatik).", "warn");
      return;
    }
    const p = state.pieces[state.activePiece];
    if (!state.checkRows.length) {
      setStatus(statusEl, "Kunci sasaran dahulu (🔒) atau pilih bahagian pola di Seksyen 2.", "warn");
      return;
    }
    // Isi baris pertama yang belum diukur.
    const row = state.checkRows.find((r) => r.measured === null);
    if (row) {
      row.measured = p.longestCm;
      row.pieceName = p.name;
      renderCheckTable();
      setStatus(statusEl, `✅ ${p.name} dimasukkan ke "${row.name}".`, "ok");
    } else {
      setStatus(statusEl, "Semua baris telah diukur — tambah bahagian pola lain atau simpan ke Passport.", "warn");
    }
  });

  // ---- Jadual semakan ----
  function renderCheckTable() {
    if (state.checkRows.length === 0) {
      checkTableBody.innerHTML = '<tr class="empty-row"><td colspan="6">Belum ada data semakan.</td></tr>';
      saveChecksButton.disabled = true;
      return;
    }
    let anyMeasured = false;
    const rows = state.checkRows.map((r) => {
      let beza = "—";
      let keputusan = "Menunggu ukuran";
      let cls = "";
      let done = "";
      if (r.measured !== null) {
        anyMeasured = true;
        const diff = r.measured - r.target;
        beza = (diff > 0 ? "+" : "") + diff.toFixed(1) + " cm";
        if (Math.abs(diff) <= 1) {
          keputusan = "LULUS";
          cls = "ok";
          done = ' class="row-done"';
        } else {
          keputusan = "PEMBETULAN";
          cls = "fail";
        }
      }
      return `<tr${done}><td>${r.name}</td><td>${fmt(r.target)}</td><td>${r.measured !== null ? fmt(r.measured) : "—"}</td><td>${beza}</td><td class="${cls}">${keputusan}</td><td>${r.pieceName || "—"}</td></tr>`;
    });
    checkTableBody.innerHTML = rows.join("");
    saveChecksButton.disabled = !anyMeasured;
    updateResult();
  }

  // ---- Keputusan (Seksyen 5) ----
  function updateResult() {
    const resultTitle = $("resultTitle");
    const resultMessage = $("resultMessage");
    const resultBox = document.querySelector(".result-box");
    const measured = state.checkRows.filter((r) => r.measured !== null);
    if (measured.length === 0) {
      resultTitle.textContent = "Menunggu semakan pola";
      resultMessage.textContent = "Keputusan akan dipaparkan selepas analisis.";
      resultBox.className = "result-box";
      return;
    }
    const lulus = measured.filter((r) => Math.abs(r.measured - r.target) <= 1).length;
    if (lulus === measured.length) {
      resultTitle.textContent = "✅ LULUS";
      resultMessage.textContent = `Semua ${measured.length} ukuran pola menepati sasaran (toleransi ±1 cm).`;
      resultBox.className = "result-box ok";
    } else {
      resultTitle.textContent = "⚠️ PERLU PEMBETULAN";
      resultMessage.textContent = `${measured.length - lulus} daripada ${measured.length} ukuran melebihi toleransi ±1 cm. Betulkan pola dan ukur semula.`;
      resultBox.className = "result-box fail";
    }
  }

  // ---- Passport (Seksyen 6) ----
  const PASSPORT_KEY = "smartpola_passport";

  function loadPassport() {
    try {
      state.passport = JSON.parse(localStorage.getItem(PASSPORT_KEY) || "[]");
    } catch (e) {
      state.passport = [];
    }
    renderPassport();
  }

  function renderPassport() {
    const list = $("passportList");
    $("passportTotal").textContent = state.passport.length;
    const lulus = state.passport.filter((r) => r.lulus).length;
    $("passportLulus").textContent = lulus;
    if (state.passport.length === 0) {
      list.innerHTML = '<li>Belum ada rekod.</li>';
      return;
    }
    list.innerHTML = state.passport
      .map((r) => {
        const d = new Date(r.time);
        const dateStr = d.toLocaleDateString("ms-MY") + " " + d.toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" });
        const cls = r.lulus ? "lulus" : "gagal";
        const sym = r.lulus ? "✅" : "⚠️";
        return `<li><span>${sym} <strong>${r.garment} — ${r.part}</strong> (${r.count} ukuran)<br><small>${dateStr}</small></span><span class="${cls}">${r.lulus ? "LULUS" : "PERLU PEMBETULAN"}</span></li>`;
      })
      .join("");
  }

  saveChecksButton.addEventListener("click", () => {
    const measured = state.checkRows.filter((r) => r.measured !== null);
    if (measured.length === 0) {
      setStatus(statusEl, "Tiada ukuran untuk disimpan.", "warn");
      return;
    }
    const lulus = measured.every((r) => Math.abs(r.measured - r.target) <= 1);
    const garmentLabel = FORMULAS[state.garment] ? FORMULAS[state.garment].label : "Pola";
    const partLabel = FORMULAS[state.garment] && FORMULAS[state.garment].parts[state.part] ? FORMULAS[state.garment].parts[state.part].label : "";
    state.passport.push({
      time: Date.now(),
      garment: garmentLabel,
      part: partLabel,
      count: measured.length,
      lulus,
      rows: measured.map((r) => ({ name: r.name, target: r.target, measured: r.measured })),
    });
    try {
      localStorage.setItem(PASSPORT_KEY, JSON.stringify(state.passport));
    } catch (e) {
      // abaikan
    }
    renderPassport();
    setStatus(statusEl, "💾 Semakan disimpan ke Passport.", "ok");
  });

  $("clearPassportButton").addEventListener("click", () => {
    if (!confirm("Kosongkan semua rekod Passport?")) return;
    state.passport = [];
    try {
      localStorage.removeItem(PASSPORT_KEY);
    } catch (e) {
      // abaikan
    }
    renderPassport();
  });

  autoMeasureButton.addEventListener("click", autoMeasure);

  // =======================================================
  // INIT
  // =======================================================
  updateUnitLabels();
  loadMeasurements();
  loadPassport();
  renderFormula();
  renderCheckTable();
});
