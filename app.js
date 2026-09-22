// =========================================================
// SMART-POLA V4.2.0
// Pengesanan garisan pola SEBENAR (Sobel + komponen bersambung),
// multi-keping + nama keping + label dimensi, penentukuran kad
// hitam, ukur manual 2 titik & automatik, semakan multi-baris,
// Passport. Overlay analisis dipaparkan di ATAS GAMBAR CAPTURED.
// =========================================================

// =========================================================
// 1. ELEMENT HTML
// =========================================================
const unitSelect = document.getElementById("unit");
const measurementInputs = {
  shoulder: document.getElementById("shoulder"),
  chest: document.getElementById("chest"),
  waist: document.getElementById("waist"),
  hip: document.getElementById("hip"),
  neck: document.getElementById("neck"),
  backLength: document.getElementById("backLength"),
  labuhSkirt: document.getElementById("labuhSkirt"), 
  sleeveLength: document.getElementById("sleeveLength"),
  bukaanTangan: document.getElementById("bukaanTangan")
};
const saveMeasurementsBtn = document.getElementById("saveMeasurements");
const measurementStatus = document.getElementById("measurementStatus");

const garmentType = document.getElementById("garmentType");
const patternPart = document.getElementById("patternPart");
const targetInfo = document.getElementById("targetInfo");
const patternSelectionStatus = document.getElementById("patternSelectionStatus");
const targetInputGroup = document.getElementById("targetInputGroup");
const targetInput = document.getElementById("targetInput");
const saveTargetButton = document.getElementById("saveTargetButton");
const targetStatus = document.getElementById("targetStatus");

const camera = document.getElementById("camera");
const cameraContainer = document.getElementById("cameraContainer");
const canvasInput = document.getElementById("canvasInput");
const overlayCanvas = document.getElementById("overlayCanvas");
const cameraButton = document.getElementById("cameraButton");
const flipCameraButton = document.getElementById("flipCamera");
const capturedImage = document.getElementById("capturedImage");
const measureCanvas = document.getElementById("measureCanvas");
const noImageMessage = document.getElementById("noImageMessage");
const status = document.getElementById("status");

const calibrationWidthInput = document.getElementById("calibrationWidth");
const calibrateButton = document.getElementById("calibrateButton");
const calibrationStatus = document.getElementById("calibrationStatus");

const lineStatus = document.getElementById("lineStatus");
const patternMeasurement = document.getElementById("patternMeasurement");
const formulaStatus = document.getElementById("formulaStatus");
const formulaDetail = document.getElementById("formulaDetail");

const chipLength = document.getElementById("chipLength");
const chipWidth = document.getElementById("chipWidth");
const chipHeight = document.getElementById("chipHeight");
const autoChips = document.getElementById("autoChips");
const pieceChips = document.getElementById("pieceChips");
const pieceRename = document.getElementById("pieceRename");
const pieceNameInput = document.getElementById("pieceNameInput");
const renamePieceButton = document.getElementById("renamePieceButton");
const edgeSensitivity = document.getElementById("edgeSensitivity");
const sensitivityValue = document.getElementById("sensitivityValue");

const manualCheckButton = document.getElementById("manualCheckButton");
const autoMeasureButton = document.getElementById("autoMeasureButton");
const saveChecksButton = document.getElementById("saveChecksButton");
const checkTableBody = document.getElementById("checkTableBody");

const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");

const passportList = document.getElementById("passportList");
const passportTotal = document.getElementById("passportTotal");
const passportLulus = document.getElementById("passportLulus");
const clearPassportButton = document.getElementById("clearPassportButton");

// =========================================================
// 2. VARIABLES
// =========================================================
let cameraStream = null;
let cameraActive = false;       // true semasa kamera hidup
let facingMode = "environment"; // "environment" = belakang, "user" = depan
let measurements = null;        // cm
let calibration = null;         // { cmPerPixel }
let captured = false;
let manualPoints = [];          // [{x, y}, {x, y}]
let lastChecks = [];            // baris semakan semasa
let autoMeasure = null;         // { cm, lengthPx, ok, source }
let visionResult = null;        // { edges, w, h, pieces, scaleBack }
let selectedPiece = 0;
let sensitivity = 5;            // 1-10
let sensitivityTimer = null;
let pieceNames = {};            // { "0": "Depan", ... } ikut indeks keping
const PIECE_COLORS = ["#22d3ee", "#f59e0b", "#a78bfa", "#34d399", "#f472b6", "#facc15"];

const PATTERN_PARTS = {
  baju: [
    { value: "badan-hadapan", label: "Badan Hadapan" },
    { value: "badan-belakang", label: "Badan Belakang" },
    { value: "lengan", label: "Lengan" },
    { value: "kolar", label: "Kolar" },
    { value: "manset", label: "Manset" }
  ],
  skirt: [
    { value: "skirt-hadapan", label: "Skirt Hadapan" },
    { value: "skirt-belakang", label: "Skirt Belakang" },
    { value: "ben-pinggang", label: "Ben Pinggang" }
  ],
  seluar: [
    { value: "seluar-hadapan", label: "Seluar Hadapan" },
    { value: "seluar-belakang", label: "Seluar Belakang" },
    { value: "ben-pinggang", label: "Ben Pinggang" }
  ],
  dress: [
    { value: "badan-hadapan", label: "Badan Hadapan" },
    { value: "badan-belakang", label: "Badan Belakang" }
  ]
};

const TOLERANCE = 0.5; // cm

const STORAGE_KEYS = {
  measurements: "smartpola_measurements",
  calibration: "smartpola_calibration",
  passport: "smartpola_passport",
  sensitivity: "smartpola_sensitivity",
  pieceNames: "smartpola_piece_names",
  manualTargets: "smartpola_manual_targets"
};

// =========================================================
// 3. STATUS & UNIT
// =========================================================
function updateStatus(message) {
  if (status) {
    status.textContent = message;
  }
}

const unitLabels = document.querySelectorAll(".unit-label");
function updateUnitLabels() {
  const label = unitSelect.value === "in" ? "in" : "cm";
  unitLabels.forEach((span) => {
    span.textContent = label;
  });
  const calibLabel = document.getElementById("calibrationUnitLabel");
  if (calibLabel) {
    calibLabel.textContent = label;
  }
}

function getDisplayUnit() {
  return unitSelect.value === "in" ? "in" : "cm";
}
function cmToDisplay(cm) {
  return getDisplayUnit() === "in" ? cm / 2.54 : cm;
}
function fmtCm(cm) {
  const unit = getDisplayUnit();
  const decimals = unit === "in" ? 2 : 1;
  return `${cmToDisplay(cm).toFixed(decimals)} ${unit}`;
}
function fmtDiff(diff) {
  const unit = getDisplayUnit();
  const decimals = unit === "in" ? 2 : 1;
  return `${diff >= 0 ? "+" : ""}${cmToDisplay(diff).toFixed(decimals)} ${unit}`;
}

function convertInputValues(fromUnit, toUnit) {
  if (fromUnit === toUnit) return;
  const toCm = fromUnit === "in" ? 2.54 : 1;
  const fromCm = toUnit === "in" ? 1 / 2.54 : 1;
  for (const key of Object.keys(measurementInputs)) {
    const input = measurementInputs[key];
    const raw = input.value.trim();
    if (raw === "") continue;
    const num = parseFloat(raw);
    if (isNaN(num) || num < 0) continue;
    input.value = Math.round(num * toCm * fromCm * 100) / 100;
  }
  const calibRaw = calibrationWidthInput.value.trim();
  if (calibRaw !== "") {
    const calibNum = parseFloat(calibRaw);
    if (!isNaN(calibNum) && calibNum >= 0) {
      calibrationWidthInput.value = Math.round(calibNum * toCm * fromCm * 100) / 100;
    }
  }
}

// =========================================================
// 4. DATA UKURAN BADAN
// =========================================================
function readMeasurementInputs() {
  const unit = unitSelect.value;
  const factor = unit === "in" ? 2.54 : 1;
  const values = {};
  let valid = true;

  for (const key of Object.keys(measurementInputs)) {
    const input = measurementInputs[key];
    const raw = input.value.trim();
    if (raw === "") {
      values[key] = null;
      continue;
    }
    const num = parseFloat(raw);
    if (isNaN(num) || num < 0) {
      valid = false;
      break;
    }
    values[key] = num * factor;
  }

  if (!valid) {
    return null;
  }
  return values;
}

function saveMeasurementsFunction() {
  const values = readMeasurementInputs();
  if (!values) {
    measurementStatus.textContent = "⚠️ Sila masukkan ukuran nombor yang sah.";
    return;
  }
  if (Object.values(values).every(v => v === null)) {
    measurementStatus.textContent = "⚠️ Sila isikan sekurang-kurangnya satu ukuran badan.";
    return;
  }

  measurements = values;
  try {
    localStorage.setItem(STORAGE_KEYS.measurements, JSON.stringify(measurements));
  } catch (e) { /* teruskan */ }

  const filled = Object.values(values).filter(v => v !== null).length;
  measurementStatus.textContent = `🟢 ${filled} ukuran disimpan. Pilih bahagian pola untuk melihat sasaran.`;
  refreshTargetInfo();
}

function loadSavedMeasurements() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.measurements);
    if (!saved) return;
    const data = JSON.parse(saved);
    if (!data || typeof data !== "object") return;
    measurements = data;
    reflectMeasurementsToInputs();
    measurementStatus.textContent = "🟢 Ukuran tersimpan dimuatkan daripada sesi sebelumnya.";
    refreshTargetInfo();
  } catch (e) { /* abaikan */ }
}

function reflectMeasurementsToInputs() {
  if (!measurements) return;
  const unit = unitSelect.value;
  const factor = unit === "in" ? 1 / 2.54 : 1;
  for (const key of Object.keys(measurementInputs)) {
    const cm = measurements[key];
    if (cm !== null && cm !== undefined) {
      measurementInputs[key].value = Math.round(cm * factor * 10) / 10;
    }
  }
}

// =========================================================
// 5. TETAPAN POLA / SASARAN
// =========================================================
function populatePatternParts() {
  const type = garmentType.value;
  patternPart.innerHTML = "";
  if (!type) {
    patternPart.disabled = true;
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "-- Pilih jenis pakaian dahulu --";
    patternPart.appendChild(option);
    return;
  }
  patternPart.disabled = false;
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "-- Pilih bahagian pola --";
  patternPart.appendChild(placeholder);
  for (const part of PATTERN_PARTS[type]) {
    const option = document.createElement("option");
    option.value = part.value;
    option.textContent = part.label;
    patternPart.appendChild(option);
  }
  refreshTargetInfo();
}

// =========================================================
// SASARAN MANUAL
// =========================================================
let manualTargets = {}; // { "baju/badan-hadapan": cm, ... }
let currentTargetKey = null; // "baju/badan-hadapan"

function getTargetKey(type, part) {
  return `${type}/${part}`;
}

function loadManualTargets() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.manualTargets) || "{}");
    if (saved && typeof saved === "object") {
      manualTargets = saved;
    }
  } catch (e) { /* abaikan */ }
}

function saveManualTargets() {
  try {
    localStorage.setItem(STORAGE_KEYS.manualTargets, JSON.stringify(manualTargets));
  } catch (e) { /* abaikan */ }
}

function refreshTargetInfo() {
  const type = garmentType.value;
  const part = patternPart.value;

  // Sorok/munculkan medan input sasaran manual
  if (targetInputGroup) {
    targetInputGroup.style.display = (type && part) ? "block" : "none";
  }

  if (!type || !part) {
    targetInfo.textContent =
      "Sasaran ukuran akan dipaparkan di sini selepas bahagian pola dipilih dan sasaran dimasukkan.";
    updateFormulaDetail(null);
    if (targetInput) targetInput.value = "";
    updateCheckButtons();
    return;
  }

  currentTargetKey = getTargetKey(type, part);
  const partLabel = getPartLabel(type, part);
  const saved = manualTargets[currentTargetKey];

  if (saved === undefined || saved === null || isNaN(saved)) {
    targetInfo.textContent = `⚠️ Sasaran bagi ${partLabel} belum dimasukkan. Sila isikan di bawah.`;
    updateFormulaDetail(null);
    if (targetInput) targetInput.value = "";
    updateCheckButtons();
    return;
  }

  targetInfo.innerHTML =
    `🎯 <strong>Sasaran ${partLabel}:</strong> ${fmtCm(saved)} (toleransi ±${fmtCm(TOLERANCE)})`;
  if (targetInput) targetInput.value = String(Math.round(cmToDisplay(saved) * 100) / 100);
  updateFormulaDetail(
    `${partLabel} = sasaran manual = ${fmtCm(saved)} (toleransi ±${fmtCm(TOLERANCE)})`
  );
  updateCheckButtons();
}

function saveTargetFunction() {
  const type = garmentType.value;
  const part = patternPart.value;
  if (!type || !part) {
    if (targetStatus) targetStatus.textContent = "⚠️ Pilih jenis pakaian dan bahagian pola dahulu.";
    return;
  }
  const raw = targetInput ? targetInput.value.trim() : "";
  const num = parseFloat(raw);
  if (raw === "" || isNaN(num) || num < 0) {
    if (targetStatus) targetStatus.textContent = "⚠️ Sila masukkan sasaran nombor yang sah.";
    return;
  }
  // Simpan secara dalaman dalam cm (konsisten dengan ukuran badan)
  const cm = getDisplayUnit() === "in" ? num * 2.54 : num;
  const key = getTargetKey(type, part);
  manualTargets[key] = cm;
  saveManualTargets();

  const partLabel = getPartLabel(type, part);
  if (targetStatus) {
    targetStatus.textContent = `🟢 Sasaran ${partLabel} = ${fmtCm(cm)} disimpan.`;
  }
  refreshTargetInfo();
}

function getPartLabel(type, part) {
  const found = (PATTERN_PARTS[type] || []).find(p => p.value === part);
  return found ? found.label : part;
}

function updateFormulaDetail(text) {
  formulaDetail.textContent = text ? text : "Belum tersedia";
}

// =========================================================
// 6-8. KAMERA 1 BUTANG: buka -> ambil (kamera berhenti automatik)
// =========================================================
async function startCameraFunction() {
  try {
    if (cameraButton) cameraButton.disabled = true;
    // Papar semula kotak kamera & kosongkan overlay lama (elak hijau melekat)
    if (cameraContainer) cameraContainer.style.display = "block";
    clearOverlays();

    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facingMode } },
      audio: false
    });
    camera.srcObject = cameraStream;
    await camera.play();
    cameraActive = true;
    if (cameraButton) cameraButton.disabled = false;
    if (cameraButton) cameraButton.textContent = "📸 Ambil Gambar";
    if (flipCameraButton) flipCameraButton.hidden = false;
    updateStatus("Kamera aktif. Letakkan pola dan kad penentukuran dalam pandangan, kemudian tekan 📸 Ambil Gambar.");
  } catch (error) {
    console.error(error);
    cameraActive = false;
    if (cameraButton) cameraButton.disabled = false;
    if (cameraButton) cameraButton.textContent = "📷 Buka Kamera";
    if (flipCameraButton) flipCameraButton.hidden = true;
    updateStatus("Kamera tidak dapat diaktifkan. Sila semak kebenaran kamera. Gunakan https:// atau localhost.");
  }
}

function stopCameraFunction() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  camera.srcObject = null;
  cameraActive = false;
  if (cameraButton) cameraButton.textContent = "📷 Buka Kamera";
  if (flipCameraButton) flipCameraButton.hidden = true;
}

function captureImageFunction() {
  if (!cameraStream || camera.videoWidth === 0) {
    updateStatus("Kamera belum sedia. Cuba lagi sebentar.");
    return;
  }

  canvasInput.width = camera.videoWidth;
  canvasInput.height = camera.videoHeight;
  const context = canvasInput.getContext("2d");
  context.drawImage(camera, 0, 0, canvasInput.width, canvasInput.height);

  const imageData = canvasInput.toDataURL("image/png");
  showCapturedImage(imageData);
  stopCameraFunction();
  updateStatus("Gambar pola berjaya diambil. Kamera dihentikan.");
  analyzePattern();
}

async function flipCameraFunction() {
  if (!cameraActive) return;
  facingMode = facingMode === "environment" ? "user" : "environment";
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  camera.srcObject = null;
  cameraActive = false;
  if (flipCameraButton) flipCameraButton.hidden = true;
  await startCameraFunction();
  updateStatus(facingMode === "user" ? "Kamera depan diaktifkan." : "Kamera belakang diaktifkan.");
}

async function onCameraButtonClick() {
  if (!cameraActive) {
    await startCameraFunction();
  } else {
    captureImageFunction();
  }
}

function clearOverlays() {
  overlayCanvas.width = 0;
  overlayCanvas.height = 0;
  measureCanvas.width = 0;
  measureCanvas.height = 0;
}

function showCapturedImage(dataUrl) {
  capturedImage.src = dataUrl;
  capturedImage.style.display = "block";
  noImageMessage.style.display = "none";
  captured = true;
  manualPoints = [];
  visionResult = null;
  lastChecks = [];
  // Nama keping adalah khusus bagi setiap gambar
  pieceNames = {};
  try {
    localStorage.removeItem(STORAGE_KEYS.pieceNames);
  } catch (e) { /* abaikan */ }
  selectedPiece = 0;
  renderCheckTable();
  // Sembunyikan kotak kamera: analisis dipaparkan pada gambar di bawah
  if (cameraContainer) cameraContainer.style.display = "none";
  clearOverlays();
  lineStatus.textContent = "Belum dianalisis";
  patternMeasurement.textContent = "Menunggu imbasan";
  if (autoChips) autoChips.style.display = "none";
  if (pieceChips) pieceChips.style.display = "none";
  if (pieceRename) pieceRename.style.display = "none";
  calibrateButton.disabled = false;
  updateCheckButtons();
}

// =========================================================
// 9. VISI: PENGESANAN GARISAN POLA SEBENAR
// =========================================================
function runVision() {
  const width = canvasInput.width;
  const height = canvasInput.height;
  if (!width || !height) return null;

  const maxSide = 1400;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  let srcData;
  if (scale === 1) {
    srcData = canvasInput.getContext("2d").getImageData(0, 0, w, h);
  } else {
    const tmp = document.createElement("canvas");
    tmp.width = w;
    tmp.height = h;
    const tctx = tmp.getContext("2d");
    tctx.drawImage(canvasInput, 0, 0, w, h);
    srcData = tctx.getImageData(0, 0, w, h);
  }

  // Kawasan kad penentukuran dikeluarkan
  const cardFull = detectBlackCard();
  let cardBox = null;
  if (cardFull) {
    cardBox = {
      minX: Math.max(0, Math.floor(cardFull.x0 * scale) - 10),
      maxX: Math.min(w - 1, Math.ceil(cardFull.x1 * scale) + 10),
      minY: Math.max(0, Math.floor(cardFull.top * scale) - 10),
      maxY: Math.min(h - 1, Math.ceil(cardFull.bottom * scale) + 10)
    };
  }

  const gray = new Float32Array(w * h);
  {
    const src = srcData.data;
    for (let i = 0, p = 0; i < src.length; i += 4, p++) {
      gray[p] = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
    }
  }
  // Blur dua laluan [1 2 1]
  const tmpF = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const a = gray[row + (x > 0 ? x - 1 : 0)];
      const b = gray[row + x];
      const c = gray[row + (x < w - 1 ? x + 1 : w - 1)];
      tmpF[row + x] = (a + 2 * b + c) / 4;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const a = tmpF[(y > 0 ? y - 1 : 0) * w + x];
      const b = tmpF[y * w + x];
      const c = tmpF[(y < h - 1 ? y + 1 : h - 1) * w + x];
      gray[y * w + x] = (a + 2 * b + c) / 4;
    }
  }

  // Sobel + ambang adaptif (dikawal slider kepekaan)
  const mag = new Float32Array(w * h);
  let maxMag = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const tl = gray[i - w - 1], t = gray[i - w], tr = gray[i - w + 1];
      const l = gray[i - 1], r = gray[i + 1];
      const bl = gray[i + w - 1], b = gray[i + w], br = gray[i + w + 1];
      const gx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const gy = (bl + 2 * b + br) - (tl + 2 * t + tr);
      const m = gx * gx + gy * gy;
      mag[i] = m;
      if (m > maxMag) maxMag = m;
    }
  }
  let edges = new Uint8Array(w * h);
  if (maxMag > 0) {
    const bins = 256;
    const hist = new Uint32Array(bins);
    const s = (bins - 1) / maxMag;
    for (let i = 0; i < mag.length; i++) hist[(mag[i] * s) | 0]++;
    // 1 = ketat (~4% tepi), 10 = longgar (~22% tepi)
    const frac = 0.04 + (sensitivity - 1) * (0.18 / 9);
    const target = Math.floor(w * h * frac);
    let acc = 0, bin = bins - 1;
    for (let b = 0; b < bins; b++) {
      acc += hist[b];
      if (acc >= target) { bin = b; break; }
    }
    const thr = bin / s;
    for (let i = 0; i < mag.length; i++) {
      if (mag[i] >= thr) edges[i] = 1;
    }
    if (cardBox) {
      for (let y = cardBox.minY; y <= cardBox.maxY; y++) {
        for (let x = cardBox.minX; x <= cardBox.maxX; x++) {
          edges[y * w + x] = 0;
        }
      }
    }
    edges = morphClose(edges, w, h);
  }

  const { components } = connectedComponents(edges, w, h);
  if (!components.length) {
    return { edges, w, h, pieces: [], scaleBack: 1 / scale };
  }

  components.sort((a, b) => b.size - a.size);
  const minSize = Math.max(150, components[0].size * 0.12);
  const kept = components.filter(c => c.size >= minSize).slice(0, 6);

  const pieces = kept.map((comp) => {
    const box = { minX: comp.minX, maxX: comp.maxX, minY: comp.minY, maxY: comp.maxY };
    return {
      bbox: box,
      longest: longestExtentInBox(edges, w, h, box),
      widthPx: box.maxX - box.minX + 1,
      heightPx: box.maxY - box.minY + 1,
      edgeCount: comp.size
    };
  });

  return { edges, w, h, pieces, scaleBack: 1 / scale };
}

function longestExtentInBox(edges, w, h, box) {
  const pad = 2;
  const x0 = Math.max(0, box.minX - pad), x1 = Math.min(w - 1, box.maxX + pad);
  const y0 = Math.max(0, box.minY - pad), y1 = Math.min(h - 1, box.maxY + pad);
  let longest = 0;
  for (let a = 0; a < 12; a++) {
    const rad = (a * Math.PI) / 12;
    const dx = Math.cos(rad), dy = Math.sin(rad);
    for (let oy = y0; oy <= y1; oy += 2) {
      for (let ox = x0; ox <= x1; ox += 2) {
        const px = ox - dx, py = oy - dy;
        if (px >= x0 && px <= x1 && py >= y0 && py <= y1) continue;
        let run = 0;
        let cx = ox, cy = oy;
        while (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) {
          if (edges[(cy | 0) * w + (cx | 0)]) {
            run++;
            if (run > longest) longest = run;
          } else {
            run = 0;
          }
          cx += dx;
          cy += dy;
        }
      }
    }
  }
  return longest;
}

function morphClose(edges, w, h) {
  const dil = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (edges[i]) {
        dil[i] = 1;
        continue;
      }
      if (
        (x > 0 && edges[i - 1]) || (x < w - 1 && edges[i + 1]) ||
        (y > 0 && edges[i - w]) || (y < h - 1 && edges[i + w]) ||
        (x > 0 && y > 0 && edges[i - w - 1]) ||
        (x < w - 1 && y > 0 && edges[i - w + 1]) ||
        (x > 0 && y < h - 1 && edges[i + w - 1]) ||
        (x < w - 1 && y < h - 1 && edges[i + w + 1])
      ) {
        dil[i] = 1;
      }
    }
  }
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!dil[i]) continue;
      let all = true;
      for (let dy = -1; dy <= 1 && all; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || !dil[ny * w + nx]) {
            all = false;
            break;
          }
        }
      }
      if (all) out[i] = 1;
    }
  }
  return out;
}

function connectedComponents(edges, w, h) {
  const labels = new Int32Array(w * h).fill(-1);
  const components = [];
  const queue = new Int32Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (!edges[start] || labels[start] !== -1) continue;
    const id = components.length;
    let head = 0, tail = 0;
    queue[tail++] = start;
    labels[start] = id;
    let size = 0;
    let minX = w, maxX = 0, minY = h, maxY = 0;
    while (head < tail) {
      const idx = queue[head++];
      const x = idx % w;
      const y = (idx / w) | 0;
      size++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const n = ny * w + nx;
          if (edges[n] && labels[n] === -1) {
            labels[n] = id;
            queue[tail++] = n;
          }
        }
      }
    }
    components.push({ size, minX, maxX, minY, maxY });
  }
  return { labels, components };
}

function analyzePattern() {
  if (!captured) {
    lineStatus.textContent = "Tiada gambar";
    patternMeasurement.textContent = "Tiada data";
    return;
  }
  updateStatus("Menganalisis garisan pola (Sobel)...");
  setTimeout(() => {
    try {
      visionResult = runVision();
      selectedPiece = 0;
      autoMeasure = null;
      renderMeasureCanvas();
      renderPieceChips();
      if (visionResult && visionResult.pieces.length) {
        lineStatus.textContent = visionResult.pieces.length > 1
          ? `${visionResult.pieces.length} keping pola dikesan`
          : "Garisan dikesan";
        updateStatus(
          "Analisis selesai. Hasil dikesan dipaparkan pada gambar pola di bawah. " +
          "Tentukan skala, kemudian pilih ukuran atau klik dua titik pada gambar."
        );
      } else {
        lineStatus.textContent = "Garisan tidak jelas";
        updateStatus(
          "Garisan pola tidak dapat dikesan. Laraskan slider kepekaan, atau cuba cahaya cukup, garisan lebih tebal, dan pola mengisi bingkai."
        );
      }
    } catch (error) {
      console.error(error);
      updateStatus("Analisis pola tidak dapat dilakukan.");
    }
  }, 60);
}

// =========================================================
// 9b. PAPARAN ANALISIS PADA GAMBAR CAPTURED (measureCanvas)
// =========================================================
function renderMeasureCanvas() {
  const w = canvasInput.width || capturedImage.naturalWidth;
  const h = canvasInput.height || capturedImage.naturalHeight;
  if (!w || !h) return;
  measureCanvas.width = w;
  measureCanvas.height = h;
  const ctx = measureCanvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);

  drawVisionLayer(ctx, w, h);
  drawPointsLayer(ctx);
  updateChipsFromVision();
}

function drawVisionLayer(ctx, w, h) {
  if (!visionResult || !visionResult.pieces || !visionResult.pieces.length) return;
  const s = visionResult.scaleBack || 1;

  // 1. Titik tepi hijau
  ctx.fillStyle = "rgba(0,255,120,0.5)";
  const step = Math.max(1, Math.floor(visionResult.w / 420));
  for (let y = 0; y < visionResult.h; y += step) {
    for (let x = 0; x < visionResult.w; x += step) {
      if (visionResult.edges[y * visionResult.w + x]) {
        ctx.fillRect(x * s, y * s, 3, 3);
      }
    }
  }

  // 2. Kotak keping + nama + label dimensi
  ctx.font = "bold 16px Arial";
  const cmpp = calibration ? calibration.cmPerPixel : null;
  visionResult.pieces.forEach((piece, idx) => {
    const color = PIECE_COLORS[idx % PIECE_COLORS.length];
    const b = piece.bbox;
    const name = getPieceDisplayName(idx);
    const bx = b.minX * s;
    const by = b.minY * s;
    const bw = (b.maxX - b.minX) * s;
    const bh = (b.maxY - b.minY) * s;

    ctx.strokeStyle = color;
    ctx.lineWidth = idx === selectedPiece ? 4 : 2;
    ctx.setLineDash(idx === selectedPiece ? [] : [8, 6]);
    ctx.strokeRect(bx, by, bw, bh);
    ctx.setLineDash([]);

    // Label nama (latar gelap supaya sentiasa terbaca)
    const labelWidth = ctx.measureText(name).width + 12;
    const labelY = Math.max(20, by - 8);
    ctx.fillStyle = "rgba(17,24,39,0.75)";
    ctx.fillRect(bx, labelY - 18, labelWidth, 22);
    ctx.fillStyle = color;
    ctx.fillText(name, bx + 6, labelY - 2);

    // Anak panah dimensi untuk keping dipilih (dalam unit paparan)
    if (idx === selectedPiece) {
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = 2;

      const yW = by + bh + 22;
      drawArrow(ctx, bx, yW, bx + bw, yW);
      const xH = bx + bw + 22;
      drawArrow(ctx, xH, by, xH, by + bh);

      if (cmpp) {
        ctx.font = "bold 14px Arial";
        const wCm = fmtCm(piece.widthPx * s * cmpp);
        const wLabel = `W = ${wCm}`;
        ctx.fillText(wLabel, bx + bw / 2 - ctx.measureText(wLabel).width / 2, yW + 18);

        const hCm = fmtCm(piece.heightPx * s * cmpp);
        const hLabel = `T = ${hCm}`;
        ctx.save();
        ctx.translate(xH + 14, by + bh / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(hLabel, -ctx.measureText(hLabel).width / 2, 0);
        ctx.restore();
        ctx.font = "bold 16px Arial";
      }
    }
  });
}

function drawArrow(ctx, x0, y0, x1, y1) {
  const head = 8;
  const angle = Math.atan2(y1 - y0, x1 - x0);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - head * Math.cos(angle - Math.PI / 6), y1 - head * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x1 - head * Math.cos(angle + Math.PI / 6), y1 - head * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0 + head * Math.cos(angle - Math.PI / 6), y0 + head * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x0 + head * Math.cos(angle + Math.PI / 6), y0 + head * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function drawPointsLayer(ctx) {
  if (!manualPoints.length) return;
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,0,0.9)";
  ctx.fillStyle = "rgba(255,60,60,0.95)";
  ctx.font = "16px Arial";

  manualPoints.forEach((p, idx) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(`${idx + 1}`, p.x + 10, p.y - 10);
  });

  if (manualPoints.length === 2) {
    ctx.beginPath();
    ctx.moveTo(manualPoints[0].x, manualPoints[0].y);
    ctx.lineTo(manualPoints[1].x, manualPoints[1].y);
    ctx.stroke();
  }
}

function updateChipsFromVision() {
  if (!visionResult || !visionResult.pieces || !visionResult.pieces.length) {
    if (autoChips) autoChips.style.display = "none";
    return;
  }
  const piece = visionResult.pieces[selectedPiece] || visionResult.pieces[0];
  if (autoChips) autoChips.style.display = "flex";
  if (chipLength) chipLength.textContent = `📐 Lebar: ${piece.widthPx} px`;
  if (chipWidth) chipWidth.textContent = `📏 Terpanjang: ${piece.longest} px`;
  if (chipHeight) chipHeight.textContent = `↕️ Tinggi: ${piece.heightPx} px`;
}

// =========================================================
// 10. PENENTUKURAN (kad hitam dikesan secara automatik)
// =========================================================
function calibrateFunction() {
  if (!captured) {
    calibrationStatus.textContent = "⚠️ Ambil gambar pola terlebih dahulu.";
    return;
  }
  const rawWidth = parseFloat(calibrationWidthInput.value);
  const targetCm = unitSelect.value === "in" ? rawWidth * 2.54 : rawWidth;
  if (isNaN(targetCm) || targetCm <= 0) {
    calibrationStatus.textContent = "⚠️ Sila masukkan lebar kad (contoh: 5.00).";
    return;
  }

  const card = detectBlackCard();
  if (!card) {
    calibrationStatus.textContent =
      "🔴 Kad penentukuran hitam tidak dikesan. Pastikan kad hitam kelihatan penuh dalam gambar.";
    calibration = null;
    formulaStatus.textContent = "Belum ditentukur";
    updateCheckButtons();
    return;
  }

  const cmPerPixel = targetCm / card.widthPx;
  calibration = { cmPerPixel };
  try {
    localStorage.setItem(STORAGE_KEYS.calibration, JSON.stringify(calibration));
  } catch (e) { /* teruskan */ }

  formulaStatus.textContent = `${cmPerPixel.toFixed(4)} cm/piksel`;
  calibrationStatus.textContent =
    `🟢 Kad dikesan (${card.widthPx} px). Skala: ${cmPerPixel.toFixed(4)} cm/piksel. Label dimensi pada gambar kini dalam cm.`;
  updateCheckButtons();
  if (manualPoints.length === 2) {
    computeManualMeasurement();
  }
  renderMeasureCanvas();
}

function detectBlackCard() {
  const width = canvasInput.width;
  const height = canvasInput.height;
  if (!width || !height) return null;

  const ctx = canvasInput.getContext("2d");
  const img = ctx.getImageData(0, 0, width, height);
  const data = img.data;

  const isBlack = (x, y) => {
    const i = (y * width + x) * 4;
    return (data[i] + data[i + 1] + data[i + 2]) / 3 < 60;
  };

  let best = null;
  for (let y = 0; y < height; y += 2) {
    let runStart = -1;
    for (let x = 0; x <= width; x++) {
      const black = x < width && isBlack(x, y);
      if (black && runStart === -1) {
        runStart = x;
      } else if (!black && runStart !== -1) {
        const span = x - runStart;
        if (!best || span > best.span) {
          best = { y, x0: runStart, x1: x - 1, span };
        }
        runStart = -1;
      }
    }
  }

  if (!best || best.span < width * 0.15) {
    return null;
  }

  const midX = Math.floor((best.x0 + best.x1) / 2);
  let top = best.y;
  let bottom = best.y;
  while (top > 0 && isBlack(midX, top - 1)) top--;
  while (bottom < height - 1 && isBlack(midX, bottom + 1)) bottom++;
  const thickness = bottom - top + 1;
  if (thickness < 8 || thickness > height * 0.5) {
    return null;
  }

  const midY = Math.floor((top + bottom) / 2);
  let x0 = best.x0;
  let x1 = best.x1;
  while (x0 > 0 && isBlack(x0 - 1, midY)) x0--;
  while (x1 < width - 1 && isBlack(x1 + 1, midY)) x1++;

  return { x0, x1, top, bottom, widthPx: x1 - x0 + 1 };
}

// =========================================================
// 11. UKUR MANUAL: KLIK DUA TITIK PADA GAMBAR
// =========================================================
function onCapturedImageClick(event) {
  if (!captured) return;
  const rect = capturedImage.getBoundingClientRect();
  const natural = { w: capturedImage.naturalWidth, h: capturedImage.naturalHeight };
  if (!natural.w || !natural.h) return;

  const x = Math.round((event.clientX - rect.left) * (natural.w / rect.width));
  const y = Math.round((event.clientY - rect.top) * (natural.h / rect.height));

  if (manualPoints.length === 0) {
    manualPoints = [{ x, y }];
    updateStatus("Titik mula ditanda. Klik titik tamat pada gambar.");
  } else {
    manualPoints[1] = { x, y };
    updateStatus("Dua titik ditanda. Tekan ✅ Tambah ke Semakan.");
  }

  renderMeasureCanvas();

  if (manualPoints.length === 2) {
    computeManualMeasurement();
  }
}

function computeManualMeasurement() {
  if (manualPoints.length !== 2) return;
  if (!calibration) {
    patternMeasurement.textContent = "Perlu penentukuran";
    updateStatus("⚠️ Tentukan skala terlebih dahulu (kad penentukuran).");
    updateCheckButtons();
    return;
  }
  const dx = manualPoints[1].x - manualPoints[0].x;
  const dy = manualPoints[1].y - manualPoints[0].y;
  const lengthPx = Math.sqrt(dx * dx + dy * dy);
  const cm = lengthPx * calibration.cmPerPixel;
  patternMeasurement.textContent = fmtCm(cm);
  autoMeasure = { cm, lengthPx, ok: true, source: "manual" };
  updateStatus(`Ukur manual: ${lengthPx.toFixed(0)} px = ${fmtCm(cm)}. Tekan ✅ Tambah ke Semakan.`);
  updateCheckButtons();
}

// =========================================================
// 12. UKUR AUTOMATIK (daripada hasil visi sebenar)
// =========================================================
function resetChips() {
  if (chipLength) chipLength.classList.remove("active");
  if (chipWidth) chipWidth.classList.remove("active");
  if (chipHeight) chipHeight.classList.remove("active");
}

function setAutoMeasureFromChip(which) {
  if (!captured) {
    updateStatus("⚠️ Ambil gambar pola terlebih dahulu.");
    return;
  }
  if (!calibration) {
    updateStatus("⚠️ Tentukan skala penentukuran terlebih dahulu (Seksyen 3).");
    return;
  }
  if (!visionResult || !visionResult.pieces || !visionResult.pieces.length) {
    updateStatus("⚠️ Tiada pola dikesan. Cuba gambar semula dengan garisan lebih jelas.");
    return;
  }
  const piece = visionResult.pieces[selectedPiece] || visionResult.pieces[0];
  resetChips();
  const s = visionResult.scaleBack || 1;
  let px;
  let label;
  if (which === "length") {
    px = piece.widthPx * s;
    if (chipLength) chipLength.classList.add("active");
    label = "Lebar pola";
  } else if (which === "width") {
    px = piece.longest * s;
    if (chipWidth) chipWidth.classList.add("active");
    label = "Garisan terpanjang";
  } else {
    px = piece.heightPx * s;
    if (chipHeight) chipHeight.classList.add("active");
    label = "Tinggi pola";
  }

  const cm = px * calibration.cmPerPixel;
  patternMeasurement.textContent = fmtCm(cm);
  autoMeasure = { cm, lengthPx: px, ok: true, source: which };
  lineStatus.textContent = "Garisan dikesan";
  updateStatus(`${label} (${getPieceDisplayName(selectedPiece)}) dipilih: ${px.toFixed(0)} px = ${fmtCm(cm)}. Tekan ✅ Tambah ke Semakan.`);
  updateCheckButtons();
}

function autoMeasureFunction() {
  setAutoMeasureFromChip("length");
}

// Keping pola: nama & chips
function getPieceDisplayName(idx) {
  return pieceNames[idx] || `Keping ${idx + 1}`;
}

function renderPieceChips() {
  if (!pieceChips) return;
  pieceChips.innerHTML = "";
  if (!visionResult || !visionResult.pieces || !visionResult.pieces.length) {
    pieceChips.style.display = "none";
    if (pieceRename) pieceRename.style.display = "none";
    return;
  }
  // Baris nama keping dipaparkan walaupun 1 keping (nama masuk jadual & Passport)
  if (pieceRename) pieceRename.style.display = "flex";
  if (visionResult.pieces.length <= 1) {
    pieceChips.style.display = "none";
    if (pieceNameInput) pieceNameInput.value = pieceNames[selectedPiece] || "";
    return;
  }
  pieceChips.style.display = "flex";
  visionResult.pieces.forEach((piece, idx) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip" + (idx === selectedPiece ? " active" : "");
    const name = getPieceDisplayName(idx);
    chip.textContent = `${name} (${piece.widthPx}×${piece.heightPx})`;
    chip.addEventListener("click", () => {
      selectedPiece = idx;
      autoMeasure = null;
      resetChips();
      renderPieceChips();
      renderMeasureCanvas();
      updateStatus(`${name} dipilih. Pilih ukuran automatik di bawah.`);
    });
    pieceChips.appendChild(chip);
  });
  if (pieceNameInput) pieceNameInput.value = pieceNames[selectedPiece] || "";
}

function renamePieceFunction() {
  if (!pieceNameInput) return;
  const name = pieceNameInput.value.trim();
  if (!name) {
    updateStatus("⚠️ Taip nama keping dahulu (cth: Depan, Belakang, Lengan).");
    return;
  }
  pieceNames[selectedPiece] = name;
  try {
    localStorage.setItem(STORAGE_KEYS.pieceNames, JSON.stringify(pieceNames));
  } catch (e) { /* abaikan */ }
  renderPieceChips();
  renderMeasureCanvas();
  updateStatus(`🟢 Keping ${selectedPiece + 1} dinamakan "${name}".`);
}

// =========================================================
// 13. SEMAKAN UKURAN (multi-baris)
// =========================================================
function updateCheckButtons() {
  const key = getTargetKey(garmentType.value, patternPart.value);
  const hasTarget = manualTargets[key] !== undefined && manualTargets[key] !== null && !isNaN(manualTargets[key]);
  const ready = garmentType.value && patternPart.value && hasTarget;
  if (manualCheckButton) {
    manualCheckButton.disabled = !(ready && autoMeasure && autoMeasure.ok);
  }
  if (autoMeasureButton) {
    autoMeasureButton.disabled = !captured;
  }
  if (saveChecksButton) {
    saveChecksButton.disabled = !lastChecks.length;
  }
}

function resetMeasurement() {
  autoMeasure = null;
  manualPoints = [];
  patternMeasurement.textContent = "Menunggu imbasan";
  resetChips();
  renderMeasureCanvas();
}

function runCheck() {
  const type = garmentType.value;
  const part = patternPart.value;
  if (!type || !part) {
    updateStatus("⚠️ Pilih jenis pakaian dan bahagian pola dahulu.");
    return;
  }
  if (!autoMeasure || !autoMeasure.ok) {
    updateStatus("⚠️ Ukur pola dahulu (pilih butiran ukuran atau klik dua titik).");
    return;
  }

  const target = manualTargets[getTargetKey(type, part)];
  if (target === undefined || target === null || isNaN(target)) {
    updateStatus("⚠️ Sasaran ukuran belum dimasukkan. Sila isikan sasaran manual di Seksyen 2.");
    return;
  }

  const label = getPartLabel(type, part);
  const pieceLabel = visionResult && visionResult.pieces && visionResult.pieces.length > 1
    ? getPieceDisplayName(selectedPiece)
    : null;
  const fullLabel = pieceLabel ? `${label} — ${pieceLabel}` : label;
  lastChecks = lastChecks.filter(check => check.label !== fullLabel);

  const measured = autoMeasure.cm;
  const diff = measured - target;
  const pass = Math.abs(diff) <= TOLERANCE;

  lastChecks.push({ label: fullLabel, target, measured, diff, pass });

  renderCheckTable();
  renderResult(pass, measured, target, diff, fullLabel);
  updateCheckButtons();
  updateStatus(pass
    ? `🟢 ${fullLabel} LULUS ditambah. Pilih bahagian lain atau 💾 Simpan Semakan.`
    : `🔴 ${fullLabel} PERLU PEMBETULAN ditambah. Pilih bahagian lain atau 💾 Simpan Semakan.`);
}

function saveChecksFunction() {
  if (!lastChecks.length) {
    updateStatus("⚠️ Tiada baris semakan untuk disimpan.");
    return;
  }
  addToPassport(lastChecks);
  const count = lastChecks.length;
  const lulus = lastChecks.filter(check => check.pass).length;
  lastChecks = [];
  renderCheckTable();
  updateCheckButtons();
  updateStatus(`🟢 ${count} semakan disimpan dalam Passport (${lulus} lulus). Ambil gambar baharu atau pilih bahagian lain.`);
}

function renderCheckTable() {
  checkTableBody.innerHTML = "";
  if (!lastChecks.length) {
    const row = document.createElement("tr");
    row.className = "empty-row";
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "Belum ada data semakan.";
    row.appendChild(cell);
    checkTableBody.appendChild(row);
    return;
  }
  for (const check of lastChecks) {
    const row = document.createElement("tr");

    const tdLabel = document.createElement("td");
    tdLabel.textContent = check.label;
    tdLabel.setAttribute("data-label", "Ukuran");

    const tdTarget = document.createElement("td");
    tdTarget.textContent = fmtCm(check.target);
    tdTarget.setAttribute("data-label", "Sasaran");

    const tdMeasured = document.createElement("td");
    tdMeasured.textContent = fmtCm(check.measured);
    tdMeasured.setAttribute("data-label", "Ukuran Pola");

    const tdDiff = document.createElement("td");
    tdDiff.textContent = fmtDiff(check.diff);
    tdDiff.setAttribute("data-label", "Beza");

    const tdResult = document.createElement("td");
    tdResult.textContent = check.pass ? "LULUS" : "PEMBETULAN";
    tdResult.className = check.pass ? "result-pass" : "result-fail";
    tdResult.setAttribute("data-label", "Keputusan");

    row.appendChild(tdLabel);
    row.appendChild(tdTarget);
    row.appendChild(tdMeasured);
    row.appendChild(tdDiff);
    row.appendChild(tdResult);
    checkTableBody.appendChild(row);
  }
}

function renderResult(pass, measured, target, diff, label) {
  if (pass) {
    resultTitle.textContent = "🟢 LULUS";
    resultTitle.className = "result-pass";
    resultMessage.textContent =
      `${label}: ukuran pola ${fmtCm(measured)} berada dalam toleransi sasaran ${fmtCm(target)} (beza ${fmtDiff(diff)}).`;
  } else {
    resultTitle.textContent = "🔴 PERLU PEMBETULAN";
    resultTitle.className = "result-fail";
    const advice = diff > 0 ? "Kurangkan ukuran pola." : "Tambahkan ukuran pola.";
    resultMessage.textContent =
      `${label}: sasaran ${fmtCm(target)}, ukuran pola ${fmtCm(measured)} (beza ${fmtDiff(diff)}). ${advice}`;
  }
}

// =========================================================
// 14. SMART-POLA PASSPORT
// =========================================================
function loadPassport() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.passport);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

function savePassport(entries) {
  try {
    localStorage.setItem(STORAGE_KEYS.passport, JSON.stringify(entries));
  } catch (e) { /* teruskan */ }
}

function addToPassport(checks) {
  const entries = loadPassport();
  entries.unshift({
    date: new Date().toLocaleString("ms-MY"),
    checks
  });
  while (entries.length > 30) {
    entries.pop();
  }
  savePassport(entries);
  renderPassport();
}

function renderPassport() {
  const entries = loadPassport();
  passportList.innerHTML = "";

  let total = 0;
  let lulus = 0;
  for (const entry of entries) {
    total += entry.checks.length;
    lulus += entry.checks.filter(c => c.pass).length;
  }
  passportTotal.textContent = String(total);
  passportLulus.textContent = String(lulus);

  if (!entries.length) {
    const item = document.createElement("li");
    item.className = "passport-empty";
    item.textContent = "Belum ada rekod semakan.";
    passportList.appendChild(item);
    return;
  }

  for (const entry of entries) {
    const item = document.createElement("li");
    const date = document.createElement("div");
    date.className = "passport-date";
    date.textContent = entry.date;
    item.appendChild(date);

    for (const check of entry.checks) {
      const line = document.createElement("div");
      line.className = "passport-line";
      line.innerHTML =
        `${check.pass ? "🟢" : "🔴"} <strong>${check.label}</strong>: ` +
        `${fmtCm(check.measured)} (sasaran ${fmtCm(check.target)}, beza ${fmtDiff(check.diff)}) — ` +
        (check.pass ? "LULUS" : "PERLU PEMBETULAN");
      item.appendChild(line);
    }
    passportList.appendChild(item);
  }
}

function clearPassportFunction() {
  savePassport([]);
  renderPassport();
  updateStatus("Rekod Passport dikosongkan.");
}

// =========================================================
// 15. EVENT
// =========================================================
function safeListen(element, type, handler) {
  if (element) {
    element.addEventListener(type, handler);
  } else {
    console.error("SMART-POLA: elemen tidak ditemui untuk acara:", type);
  }
}

safeListen(saveMeasurementsBtn, "click", saveMeasurementsFunction);

let previousUnit = unitSelect.value;
safeListen(unitSelect, "change", () => {
  convertInputValues(previousUnit, unitSelect.value);
  previousUnit = unitSelect.value;
  updateUnitLabels();
  refreshTargetInfo();
  renderCheckTable();
  renderPassport();
});

safeListen(garmentType, "change", () => {
  populatePatternParts();
  resetMeasurement();
});
safeListen(patternPart, "change", () => {
  resetMeasurement();
  refreshTargetInfo();
  if (targetStatus) targetStatus.textContent = "";
});
safeListen(saveTargetButton, "click", saveTargetFunction);

safeListen(cameraButton, "click", onCameraButtonClick);
safeListen(flipCameraButton, "click", flipCameraFunction);

safeListen(calibrateButton, "click", calibrateFunction);
safeListen(capturedImage, "click", onCapturedImageClick);

safeListen(manualCheckButton, "click", runCheck);
safeListen(autoMeasureButton, "click", autoMeasureFunction);
safeListen(saveChecksButton, "click", saveChecksFunction);

safeListen(chipLength, "click", () => setAutoMeasureFromChip("length"));
safeListen(chipWidth, "click", () => setAutoMeasureFromChip("width"));
safeListen(chipHeight, "click", () => setAutoMeasureFromChip("height"));
safeListen(renamePieceButton, "click", renamePieceFunction);

// Slider kepekaan: analisis semula secara langsung (dengan debounce)
safeListen(edgeSensitivity, "input", () => {
  sensitivity = parseInt(edgeSensitivity.value, 10) || 5;
  if (sensitivityValue) sensitivityValue.textContent = String(sensitivity);
  if (!captured) return;
  if (sensitivityTimer) clearTimeout(sensitivityTimer);
  sensitivityTimer = setTimeout(() => {
    updateStatus("Menganalisis semula (kepekaan " + sensitivity + ")...");
    setTimeout(() => {
      try {
        visionResult = runVision();
        if (selectedPiece >= visionResult.pieces.length) {
          selectedPiece = 0;
        }
        autoMeasure = null;
        renderMeasureCanvas();
        renderPieceChips();
        updateStatus(visionResult.pieces.length
          ? `Analisis selesai (kepekaan ${sensitivity}): ${visionResult.pieces.length} keping dikesan.`
          : `Tiada garisan pada kepekaan ${sensitivity}. Cuba laraskan slider.`);
      } catch (error) {
        console.error(error);
        updateStatus("Analisis semula gagal.");
      }
    }, 30);
  }, 250);
});
safeListen(edgeSensitivity, "change", () => {
  try {
    localStorage.setItem(STORAGE_KEYS.sensitivity, String(sensitivity));
  } catch (e) { /* abaikan */ }
});

safeListen(clearPassportButton, "click", clearPassportFunction);

// =========================================================
// 16. INITIAL STATUS
// =========================================================
updateStatus("Kamera belum diaktifkan.");
updateUnitLabels();
try {
  const savedSensitivity = parseInt(localStorage.getItem(STORAGE_KEYS.sensitivity), 10);
  if (savedSensitivity >= 1 && savedSensitivity <= 10) {
    sensitivity = savedSensitivity;
  }
  const savedNames = JSON.parse(localStorage.getItem(STORAGE_KEYS.pieceNames) || "{}");
  if (savedNames && typeof savedNames === "object") {
    pieceNames = savedNames;
  }
} catch (e) { /* abaikan */ }
if (edgeSensitivity) edgeSensitivity.value = String(sensitivity);
if (sensitivityValue) sensitivityValue.textContent = String(sensitivity);
loadManualTargets();
loadSavedMeasurements();
populatePatternParts();
renderPassport();
