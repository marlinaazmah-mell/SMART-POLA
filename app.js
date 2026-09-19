/* =========================================
   SMART-POLA v0.2
   ========================================= */

/* ---------- ELEMENT ---------- */

const garmentType = document.getElementById("garmentType");
const patternPart = document.getElementById("patternPart");
const patternSelectionStatus = document.getElementById("patternSelectionStatus");

const unitSelect = document.getElementById("unit");
const unitLabels = document.querySelectorAll(".unit-label");

const shoulder = document.getElementById("shoulder");
const chest = document.getElementById("chest");
const waist = document.getElementById("waist");
const hip = document.getElementById("hip");
const neck = document.getElementById("neck");
const backLength = document.getElementById("backLength");

const saveMeasurements = document.getElementById("saveMeasurements");
const measurementStatus = document.getElementById("measurementStatus");

const video = document.getElementById("camera");
const overlayCanvas = document.getElementById("overlayCanvas");

const startCamera = document.getElementById("startCamera");
const stopCameraBtn = document.getElementById("stopCamera");

const status = document.getElementById("status");
const lineStatus = document.getElementById("lineStatus");
const patternMeasurement = document.getElementById("patternMeasurement");
const formulaStatus = document.getElementById("formulaStatus");

const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");

/* ---------- DATA ---------- */

let stream = null;
let animationFrame = null;

const patternOptions = {
  baju: [
    "Badan Hadapan",
    "Badan Belakang",
    "Lengan",
    "Kolar",
    "Manset"
  ],
  kain: [
    "Pola Kain",
    "Pinggang"
  ],
  seluar: [
    "Badan Seluar Hadapan",
    "Badan Seluar Belakang",
    "Pinggang",
    "Poket"
  ],
  lain: [
    "Bahagian Lain"
  ]
};

/* =========================================
   DROPDOWN
   ========================================= */

function updatePatternParts() {

  const selected = garmentType.value;

  patternPart.innerHTML = "";

  const first = document.createElement("option");
  first.value = "";
  first.textContent = "-- Pilih bahagian pola --";
  patternPart.appendChild(first);

  if (!selected) {
    patternSelectionStatus.textContent = "";
    return;
  }

  patternOptions[selected].forEach(part => {

    const option = document.createElement("option");

    option.value = part;
    option.textContent = part;

    patternPart.appendChild(option);

  });

  patternSelectionStatus.textContent =
    "Sila pilih bahagian pola.";

}

garmentType.addEventListener("change", updatePatternParts);

patternPart.addEventListener("change", () => {

  if (!patternPart.value) return;

  const garmentName =
    garmentType.options[garmentType.selectedIndex].text;

  patternSelectionStatus.textContent =
    `Pola dipilih: ${garmentName} — ${patternPart.value}`;

  patternSelectionStatus.style.color = "#166534";

});

/* =========================================
   UNIT
   ========================================= */

unitSelect.addEventListener("change", () => {

  const label =
    unitSelect.value === "cm"
      ? "cm"
      : "in";

  unitLabels.forEach(el => el.textContent = label);

});

/* =========================================
   SIMPAN UKURAN
   ========================================= */

saveMeasurements.addEventListener("click", () => {

  const values = [
    shoulder.value,
    chest.value,
    waist.value,
    hip.value,
    neck.value,
    backLength.value
  ];

  const invalid =
    values.some(v => !v || Number(v) <= 0);

  if (invalid) {

    measurementStatus.textContent =
      "Lengkapkan semua 6 ukuran dahulu.";

    measurementStatus.style.color = "#b91c1c";

    return;
  }

  const data = {
    unit: unitSelect.value,
    shoulder: shoulder.value,
    chest: chest.value,
    waist: waist.value,
    hip: hip.value,
    neck: neck.value,
    backLength: backLength.value
  };

  localStorage.setItem(
    "smartPolaMeasurements",
    JSON.stringify(data)
  );

  measurementStatus.textContent =
    "Ukuran berjaya disimpan.";

  measurementStatus.style.color = "#166534";

});

/* =========================================
   LOAD UKURAN
   ========================================= */

(function loadMeasurements() {

  const saved =
    localStorage.getItem("smartPolaMeasurements");

  if (!saved) return;

  const data = JSON.parse(saved);

  unitSelect.value = data.unit || "cm";

  shoulder.value = data.shoulder || "";
  chest.value = data.chest || "";
  waist.value = data.waist || "";
  hip.value = data.hip || "";
  neck.value = data.neck || "";
  backLength.value = data.backLength || "";

  const label =
    unitSelect.value === "cm"
      ? "cm"
      : "in";

  unitLabels.forEach(el => el.textContent = label);

})();

/* =========================================
   KAMERA
   ========================================= */

startCamera.addEventListener("click", async () => {

  if (!garmentType.value || !patternPart.value) {

    status.textContent =
      "Pilih jenis pakaian dan bahagian pola dahulu.";

    return;
  }

  try {

    stream =
      await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

    video.srcObject = stream;

    await video.play();

    startCamera.disabled = true;
    stopCameraBtn.disabled = false;

    status.textContent =
      "Kamera aktif.";

    detectPatternLines();

  }

  catch (err) {

    status.textContent =
      "Gagal membuka kamera.";

    console.error(err);

  }

});

stopCameraBtn.addEventListener("click", stopCamera);

function stopCamera() {

  if (stream) {

    stream.getTracks().forEach(t => t.stop());

    stream = null;

  }

  if (animationFrame) {

    cancelAnimationFrame(animationFrame);

    animationFrame = null;

  }

  video.srcObject = null;

  startCamera.disabled = false;
  stopCameraBtn.disabled = true;

  status.textContent =
    "Kamera dihentikan.";

}

/* =========================================
   KESAN GARISAN
   ========================================= */

function detectPatternLines() {

  if (!stream || video.readyState < 2) {

    animationFrame =
      requestAnimationFrame(detectPatternLines);

    return;

  }

  const canvas = document.createElement("canvas");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx =
    canvas.getContext("2d", {
      willReadFrequently: true
    });

  const overlay =
    overlayCanvas.getContext("2d");

  overlayCanvas.width = canvas.width;
  overlayCanvas.height = canvas.height;

  ctx.drawImage(video, 0, 0);

  const image =
    ctx.getImageData(0, 0, canvas.width, canvas.height);

  const data = image.data;

  overlay.clearRect(0, 0, canvas.width, canvas.height);

  overlay.fillStyle =
    "rgba(0,255,0,0.8)";

  let edges = 0;

  for (let y = 1; y < canvas.height - 1; y += 3) {

    for (let x = 1; x < canvas.width - 1; x += 3) {

      const i =
        (y * canvas.width + x) * 4;

      const r =
        (y * canvas.width + x + 1) * 4;

      const b1 =
        (data[i] + data[i+1] + data[i+2]) / 3;

      const b2 =
        (data[r] + data[r+1] + data[r+2]) / 3;

      if (Math.abs(b1 - b2) > 55) {

        overlay.fillRect(x, y, 3, 3);

        edges++;

      }

    }

  }

  if (edges > 500) {

    lineStatus.textContent = "Dikesan";

    patternMeasurement.textContent =
      "Menunggu formula";

    formulaStatus.textContent =
      "Belum dikira";

    resultTitle.textContent =
      "Garisan pola dikesan";

    resultMessage.textContent =
      "Semakan formula akan ditambah pada versi seterusnya.";

  }

  animationFrame =
    requestAnimationFrame(detectPatternLines);

}
