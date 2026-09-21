// =========================================================
// SMART-POLA V4.0
// Ukuran badan + sasaran pola + kamera + penentukuran
// kad hitam + semakan automatik & manual + Passport
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
  labuhSkirt: document.getElementById("labuhSkirt")
};
const saveMeasurementsBtn = document.getElementById("saveMeasurements");
const measurementStatus = document.getElementById("measurementStatus");

const garmentType = document.getElementById("garmentType");
const patternPart = document.getElementById("patternPart");
const targetInfo = document.getElementById("targetInfo");
const patternSelectionStatus = document.getElementById("patternSelectionStatus");

const camera = document.getElementById("camera");
const canvasInput = document.getElementById("canvasInput");
const overlayCanvas = document.getElementById("overlayCanvas");
const startCameraBtn = document.getElementById("startCamera");
const stopCameraBtn = document.getElementById("stopCamera");
const captureImageBtn = document.getElementById("captureImage");
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
let measurements = null;      // cm: { shoulder, chest, waist, hip, neck, backLength, labuhSkirt }
let calibration = null;       // { cmPerPixel }
let captured = false;
let autoMeasure = null;       // { cm, lengthPx, ok } hasil ukur automatik
let manualPoints = [];        // [{x, y}, {x, y}] titik klik pengguna
let lastChecks = [];          // baris semakan semasa (belum disimpan)

// Senarai bahagian pola bagi setiap jenis pakaian
const PATTERN_PARTS = {
  baju: [
    { value: "shoulder", label: "Lebar Bahu" },
    { value: "chest", label: "Keliling Dada (÷4)" },
    { value: "waist", label: "Keliling Pinggang (÷4)" },
    { value: "hip", label: "Keliling Pinggul (÷4)" },
    { value: "neck", label: "Keliling Leher" },
    { value: "backLength", label: "Labuh Tengah Belakang" }
  ],
  kain: [
    { value: "waist", label: "Lebar Pinggang Kain (÷4)" },
    { value: "hip", label: "Lebar Pinggul Kain (÷4)" },
    { value: "labuhSkirt", label: "Labuh Kain" }
  ],
  seluar: [
    { value: "waist", label: "Lebar Pinggang Seluar (÷4)" },
    { value: "hip", label: "Lebar Punggung Seluar (÷4)" },
    { value: "labuhSkirt", label: "Panjang Seluar" }
  ],
  lain: [
    { value: "shoulder", label: "Lebar Bahu" },
    { value: "chest", label: "Keliling Dada (÷4)" },
    { value: "waist", label: "Keliling Pinggang (÷4)" },
    { value: "hip", label: "Keliling Pinggul (÷4)" },
    { value: "labuhSkirt", label: "Panjang Pola" }
  ]
};

// Bahagian yang sasarannya ¼ daripada ukuran keliling
const QUARTER_PARTS = ["chest", "waist", "hip"];
const TOLERANCE = 0.5; // cm

const STORAGE_KEYS = {
  measurements: "smartpola_measurements",
  calibration: "smartpola_calibration",
  passport: "smartpola_passport"
};

// =========================================================
// 3. STATUS
// =========================================================
function updateStatus(message) {
  if (status) {
    status.textContent = message;
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
    measurementStatus.textContent =
      "⚠️ Sila masukkan ukuran nombor yang sah.";
    return;
  }
  if (Object.values(values).every(v => v === null)) {
    measurementStatus.textContent =
      "⚠️ Sila isikan sekurang-kurangnya satu ukuran badan.";
    return;
  }

  measurements = values;
  try {
    localStorage.setItem(STORAGE_KEYS.measurements, JSON.stringify(measurements));
  } catch (e) {
    // localStorage mungkin tidak tersedia; teruskan tanpa simpanan
  }

  const filled = Object.values(values).filter(v => v !== null).length;
  measurementStatus.textContent =
    `🟢 ${filled} ukuran disimpan. Pilih bahagian pola untuk melihat sasaran.`;

  refreshTargetInfo();
}

function loadSavedMeasurements() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.measurements);
    if (!saved) return;
    const data = JSON.parse(saved);
    if (!data || typeof data !== "object") return;
    // Nilai disimpan sentiasa dalam cm; paparkan semula mengikut unit dipilih
    measurements = data;
    reflectMeasurementsToInputs();
    measurementStatus.textContent =
      "🟢 Ukuran tersimpan dimuatkan daripada sesi sebelumnya.";
    refreshTargetInfo();
  } catch (e) {
    // abaikan kerosakan data
  }
}

function reflectMeasurementsToInputs() {
  if (!measurements) return;
  const unit = unitSelect.value;
  const factor = unit === "in" ? 1 / 2.54 : 1;
  for (const key of Object.keys(measurementInputs)) {
    const cm = measurements[key];
    if (cm !== null && cm !== undefined) {
      const display = cm * factor;
      measurementInputs[key].value = Math.round(display * 10) / 10;
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

function computeTargets() {
  if (!measurements) return null;
  const targets = {};
  // Sasaran asas: ¼ bagi ukuran keliling, 1:1 bagi yang lain
  for (const key of Object.keys(measurements)) {
    const cm = measurements[key];
    if (cm === null || cm === undefined) continue;
    targets[key] = QUARTER_PARTS.includes(key) ? cm / 4 : cm;
  }
  // Sasaran khusus seluar: punggung = pinggul ÷ 4
  if (measurements.hip !== null && measurements.hip !== undefined) {
    targets.hip = measurements.hip / 4;
  }
  return targets;
}

function refreshTargetInfo() {
  const type = garmentType.value;
  const part = patternPart.value;
  if (!measurements || !type || !part) {
    if (!measurements) {
      targetInfo.textContent =
        "Sasaran ukuran akan dipaparkan di sini selepas ukuran badan disimpan dan bahagian pola dipilih.";
    } else {
      targetInfo.textContent = "Pilih bahagian pola untuk melihat sasaran ukuran.";
    }
    return;
  }

  const targets = computeTargets();
  const cm = targets[part];
  if (cm === undefined) {
    targetInfo.textContent =
      "⚠️ Ukuran badan bagi bahagian ini belum diisi. Sila lengkapkan Seksyen 1.";
    updateFormulaDetail(null, null);
    return;
  }

  const partLabel = getPartLabel(type, part);
  const isQuarter = QUARTER_PARTS.includes(part);
  const formulaText = isQuarter
    ? `${partLabel} = ukuran badan ÷ 4 = ${cm.toFixed(1)} cm (toleransi ±${TOLERANCE} cm)`
    : `${partLabel} = ukuran badan = ${cm.toFixed(1)} cm (toleransi ±${TOLERANCE} cm)`;

  targetInfo.innerHTML =
    `🎯 <strong>Sasaran ${partLabel}:</strong> ${cm.toFixed(1)} cm ` +
    `(toleransi ±${TOLERANCE} cm)`;
  updateFormulaDetail(formulaText, cm);
  updateCheckButtons();
}

function getPartLabel(type, part) {
  const found = (PATTERN_PARTS[type] || []).find(p => p.value === part);
  return found ? found.label : part;
}

function updateFormulaDetail(text) {
  if (text) {
    formulaDetail.textContent = text;
  } else {
    formulaDetail.textContent = "Belum tersedia";
  }
}

// =========================================================
// 6. MULA KAMERA
// =========================================================
async function startCameraFunction() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment"
      },
      audio: false
    });
    camera.srcObject = cameraStream;
    await camera.play();

    // Aktifkan kawalan kamera
    startCameraBtn.disabled = true;
    stopCameraBtn.disabled = false;
    captureImageBtn.disabled = false;
    updateStatus("Kamera sedang aktif. Letakkan pola dan kad penentukuran dalam pandangan kamera, kemudian ambil gambar.");
  } catch (error) {
    console.error(error);
    updateStatus("Kamera tidak dapat diaktifkan. Sila semak kebenaran kamera. Gunakan https:// atau localhost.");
  }
}

// =========================================================
// 7. HENTIKAN KAMERA
// =========================================================
function stopCameraFunction() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => {
      track.stop();
    });
    cameraStream = null;
  }
  camera.srcObject = null;
  startCameraBtn.disabled = false;
  stopCameraBtn.disabled = true;
  captureImageBtn.disabled = true;
  updateStatus("Kamera dihentikan.");
}

// =========================================================
// 8. AMBIL GAMBAR
// =========================================================
function captureImageFunction() {
  if (!cameraStream) {
    updateStatus("Sila mulakan kamera terlebih dahulu.");
    return;
  }
  if (camera.videoWidth === 0) {
    updateStatus("Kamera belum sedia. Cuba lagi sebentar.");
    return;
  }

  canvasInput.width = camera.videoWidth;
  canvasInput.height = camera.videoHeight;
  const context = canvasInput.getContext("2d");
  context.drawImage(camera, 0, 0, canvasInput.width, canvasInput.height);

  const imageData = canvasInput.toDataURL("image/png");
  showCapturedImage(imageData);
  updateStatus("Gambar pola berjaya diambil. Sedia untuk analisis.");

  analyzePattern();
}

function showCapturedImage(dataUrl) {
  capturedImage.src = dataUrl;
  capturedImage.style.display = "block";
  noImageMessage.style.display = "none";
  captured = true;
  manualPoints = [];
  autoMeasure = null;
  lastChecks = [];
  renderCheckTable();
  overlayCanvas.width = 0;
  overlayCanvas.height = 0;
  measureCanvas.style.display = "block";
  measureCanvas.width = 0;
  measureCanvas.height = 0;
  lineStatus.textContent = "Belum dianalisis";
  patternMeasurement.textContent = "Menunggu imbasan";
  calibrateButton.disabled = false;
  updateCheckButtons();
}

// =========================================================
// 9. ANALISIS POLA (kiraan piksel gelap)
// =========================================================
function analyzePattern() {
  if (!captured) {
    lineStatus.textContent = "Tiada gambar";
    patternMeasurement.textContent = "Tiada data";
    return;
  }
  updateStatus("Menganalisis garisan pola...");
  setTimeout(() => {
    try {
      detectPatternLines();
    } catch (error) {
      console.error(error);
      updateStatus("Analisis pola tidak dapat dilakukan.");
    }
  }, 100);
}

function detectPatternLines() {
  const context = canvasInput.getContext("2d");
  const imageData = context.getImageData(0, 0, canvasInput.width, canvasInput.height);
  let darkPixels = 0;
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (r + g + b) / 3;
    if (brightness < 150) {
      darkPixels++;
    }
  }

  drawPatternOverlay();
  if (darkPixels > 100) {
    lineStatus.textContent = "Garisan dikesan";
    updateStatus("Analisis selesai. Garisan pola berjaya dikesan. Skala boleh ditentukur, kemudian ukur pola.");
  } else {
    lineStatus.textContent = "Garisan tidak jelas";
    updateStatus("Garisan pola kurang jelas. Cuba ambil gambar semula dengan cahaya yang cukup.");
  }
}

function drawPatternOverlay() {
  overlayCanvas.width = canvasInput.width;
  overlayCanvas.height = canvasInput.height;
  const ctx = overlayCanvas.getContext("2d");
  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  const data = canvasInput.getContext("2d").getImageData(0, 0, canvasInput.width, canvasInput.height).data;

  for (let y = 0; y < overlayCanvas.height; y += 4) {
    for (let x = 0; x < overlayCanvas.width; x += 4) {
      const index = (y * overlayCanvas.width + x) * 4;
      const brightness = (data[index] + data[index + 1] + data[index + 2]) / 3;
      if (brightness < 100) {
        ctx.fillStyle = "rgba(0,255,0,0.55)";
        ctx.fillRect(x, y, 3, 3);
      }
    }
  }

}

// =========================================================
// 10. PENENTUKURAN (kad hitam dikesan secara automatik)
// =========================================================
function calibrateFunction() {
  if (!captured) {
    calibrationStatus.textContent = "⚠️ Ambil gambar pola terlebih dahulu.";
    return;
  }
  const targetCm = parseFloat(calibrationWidthInput.value);
  if (isNaN(targetCm) || targetCm <= 0) {
    calibrationStatus.textContent = "⚠️ Sila masukkan lebar kad dalam cm (contoh: 5.00).";
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
  } catch (e) {
    // teruskan tanpa simpanan
  }

  formulaStatus.textContent = `${cmPerPixel.toFixed(4)} cm/piksel`;
  calibrationStatus.textContent =
    `🟢 Kad dikesan (${card.widthPx} px). Skala: ${cmPerPixel.toFixed(4)} cm/piksel. Klik dua titik pada gambar untuk mengukur.`;
  updateCheckButtons();
  if (manualPoints.length === 2) {
    computeManualMeasurement();
  }
}

/**
 * Cari segi empat hitam besar (kad penentukuran) dalam gambar.
 * Strategi ringkas tanpa OpenCV:
 * 1. Tanda piksel "hitam" (sangat gelap).
 * 2. Cari baris dengan jarak hitam paling panjang, ambil bingkai
 *    berturutan yang mempunyai jarak serupa.
 */
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

  let best = null; // { y, x0, x1, span }
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
    return null; // terlalu kecil untuk kad
  }

  // Sahkan kad: semak ketebalan menegak di tengah jalur hitam
  const midX = Math.floor((best.x0 + best.x1) / 2);
  let top = best.y;
  let bottom = best.y;
  while (top > 0 && isBlack(midX, top - 1)) top--;
  while (bottom < height - 1 && isBlack(midX, bottom + 1)) bottom++;
  const thickness = bottom - top + 1;
  if (thickness < 8 || thickness > height * 0.5) {
    return null;
  }

  // Haluskan tepi kiri/kanan pada baris tengah kad
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
    updateStatus("Dua titik ditanda. Tekan ✅ Semak Ukuran Sekarang.");
  }

  drawPointsOverlay(natural.w, natural.h);

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
  patternMeasurement.textContent = `${cm.toFixed(1)} cm`;
  autoMeasure = { cm, lengthPx, ok: true };
  updateStatus(`Ukur manual: ${lengthPx.toFixed(0)} px = ${cm.toFixed(1)} cm. Tekan ✅ Semak Ukuran Sekarang.`);
  updateCheckButtons();
}

function drawPointsOverlay(w, h) {
  measureCanvas.width = w;
  measureCanvas.height = h;
  const ctx = measureCanvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
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

// =========================================================
// 12. UKUR AUTOMATIK (panjang sempadan terpanjang)
// =========================================================
function autoMeasureFunction() {
  if (!captured) {
    updateStatus("⚠️ Ambil gambar pola terlebih dahulu.");
    return;
  }
  if (!calibration) {
    updateStatus("⚠️ Tentukan skala penentukuran terlebih dahulu.");
    return;
  }

  const width = canvasInput.width;
  const height = canvasInput.height;
  const ctx = canvasInput.getContext("2d");
  const data = ctx.getImageData(0, 0, width, height).data;
  const isDark = (x, y) => {
    const i = (y * width + x) * 4;
    return (data[i] + data[i + 1] + data[i + 2]) / 3 < 120;
  };

  // Cari jalur gelap paling panjang (mendatar dan menegak)
  let longest = 0;
  for (let y = 0; y < height; y += 2) {
    let run = 0;
    for (let x = 0; x < width; x++) {
      if (isDark(x, y)) {
        run++;
        if (run > longest) longest = run;
      } else {
        run = 0;
      }
    }
  }
  for (let x = 0; x < width; x += 2) {
    let run = 0;
    for (let y = 0; y < height; y++) {
      if (isDark(x, y)) {
        run++;
        if (run > longest) longest = run;
      } else {
        run = 0;
      }
    }
  }

  if (longest < 20) {
    lineStatus.textContent = "Garisan tidak jelas";
    autoMeasure = { cm: null, lengthPx: longest, ok: false };
    updateStatus("Garisan pola tidak dikesan dengan jelas untuk ukuran automatik. Gunakan ukuran manual (klik dua titik).");
    updateCheckButtons();
    return;
  }

  const cm = longest * calibration.cmPerPixel;
  autoMeasure = { cm, lengthPx: longest, ok: true };
  lineStatus.textContent = "Garisan dikesan";
  patternMeasurement.textContent = `${cm.toFixed(1)} cm`;
  updateStatus(`Ukur automatik: garisan terpanjang ${longest} px ≈ ${cm.toFixed(1)} cm. Tekan ✅ Semak Ukuran Sekarang.`);
  updateCheckButtons();
}

// =========================================================
// 13. SEMAKAN UKURAN (multi-baris)
// =========================================================
function updateCheckButtons() {
  const ready = measurements && garmentType.value && patternPart.value;
  manualCheckButton.disabled = !(ready && autoMeasure && autoMeasure.ok);
  autoMeasureButton.disabled = !captured;
  saveChecksButton.disabled = !lastChecks.length;
}

function resetMeasurement() {
  autoMeasure = null;
  manualPoints = [];
  patternMeasurement.textContent = "Menunggu imbasan";
  if (measureCanvas) {
    const ctx = measureCanvas.getContext("2d");
    ctx.clearRect(0, 0, measureCanvas.width, measureCanvas.height);
  }
}

function runCheck() {
  const type = garmentType.value;
  const part = patternPart.value;
  if (!measurements || !type || !part) {
    updateStatus("⚠️ Lengkapkan ukuran badan dan pilih bahagian pola dahulu.");
    return;
  }
  if (!autoMeasure || !autoMeasure.ok) {
    updateStatus("⚠️ Ukur pola dahulu (klik dua titik atau gunakan ukur automatik).");
    return;
  }

  const targets = computeTargets();
  const target = targets[part];
  if (target === undefined) {
    updateStatus("⚠️ Ukuran badan bagi bahagian ini belum diisi.");
    return;
  }

  // Ganti baris sedia ada untuk bahagian yang sama (dua kali ukur)
  const label = getPartLabel(type, part);
  lastChecks = lastChecks.filter(check => check.label !== label);

  const measured = autoMeasure.cm;
  const diff = measured - target;
  const pass = Math.abs(diff) <= TOLERANCE;

  lastChecks.push({ label, target, measured, diff, pass });

  renderCheckTable();
  renderResult(pass, measured, target, diff, label);
  updateCheckButtons();
  updateStatus(pass
    ? `🟢 ${label} LULUS ditambah. Pilih bahagian lain atau 💾 Simpan Semakan.`
    : `🔴 ${label} PERLU PEMBETULAN ditambah. Pilih bahagian lain atau 💾 Simpan Semakan.`);
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
    tdTarget.textContent = `${check.target.toFixed(1)} cm`;
    tdTarget.setAttribute("data-label", "Sasaran");

    const tdMeasured = document.createElement("td");
    tdMeasured.textContent = `${check.measured.toFixed(1)} cm`;
    tdMeasured.setAttribute("data-label", "Ukuran Pola");

    const tdDiff = document.createElement("td");
    tdDiff.textContent = `${check.diff >= 0 ? "+" : ""}${check.diff.toFixed(1)} cm`;
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
      `${label}: ukuran pola ${measured.toFixed(1)} cm berada dalam toleransi sasaran ${target.toFixed(1)} cm (beza ${diff >= 0 ? "+" : ""}${diff.toFixed(1)} cm).`;
  } else {
    resultTitle.textContent = "🔴 PERLU PEMBETULAN";
    resultTitle.className = "result-fail";
    const advice = diff > 0
      ? "Kurangkan ukuran pola."
      : "Tambahkan ukuran pola.";
    resultMessage.textContent =
      `${label}: sasaran ${target.toFixed(1)} cm, ukuran pola ${measured.toFixed(1)} cm (beza ${diff >= 0 ? "+" : ""}${diff.toFixed(1)} cm). ${advice}`;
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
  } catch (e) {
    // teruskan tanpa simpanan
  }
}

function addToPassport(checks) {
  const entries = loadPassport();
  const now = new Date();
  entries.unshift({
    date: now.toLocaleString("ms-MY"),
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
        `${check.measured.toFixed(1)} cm (sasaran ${check.target.toFixed(1)} cm, ` +
        `beza ${check.diff >= 0 ? "+" : ""}${check.diff.toFixed(1)} cm) — ` +
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
saveMeasurementsBtn.addEventListener("click", saveMeasurementsFunction);
unitSelect.addEventListener("change", () => {
  reflectMeasurementsToInputs();
});

garmentType.addEventListener("change", () => {
  populatePatternParts();
  // Tukar jenis pakaian → ukuran mesti diukur semula
  resetMeasurement();
});
patternPart.addEventListener("change", () => {
  // Tukar bahagian pola → ukuran mesti diukur semula
  resetMeasurement();
  refreshTargetInfo();
});

startCameraBtn.addEventListener("click", startCameraFunction);
stopCameraBtn.addEventListener("click", stopCameraFunction);
captureImageBtn.addEventListener("click", captureImageFunction);

calibrateButton.addEventListener("click", calibrateFunction);
capturedImage.addEventListener("click", onCapturedImageClick);

manualCheckButton.addEventListener("click", runCheck);
autoMeasureButton.addEventListener("click", autoMeasureFunction);
saveChecksButton.addEventListener("click", saveChecksFunction);

clearPassportButton.addEventListener("click", clearPassportFunction);

// =========================================================
// 16. INITIAL STATUS
// =========================================================
updateStatus("Kamera belum diaktifkan.");
loadSavedMeasurements();
populatePatternParts();
renderPassport();
