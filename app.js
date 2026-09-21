// =========================================================
// SMART-POLA V3.2
// Camera + Capture Image + Pattern Line Detection
// =========================================================


// =========================================================
// 1. ELEMENT HTML
// =========================================================

const camera = document.getElementById("camera");
const canvasInput = document.getElementById("canvasInput");
const overlayCanvas = document.getElementById("overlayCanvas");

const startCamera = document.getElementById("startCamera");
const stopCamera = document.getElementById("stopCamera");
const captureImage = document.getElementById("captureImage");

const capturedImage = document.getElementById("capturedImage");
const noImageMessage = document.getElementById("noImageMessage");

const status = document.getElementById("status");

const lineStatus = document.getElementById("lineStatus");
const patternMeasurement = document.getElementById("patternMeasurement");
const formulaStatus = document.getElementById("formulaStatus");

const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");


// =========================================================
// 2. VARIABLES
// =========================================================

let cameraStream = null;


// =========================================================
// 3. STATUS
// =========================================================

function updateStatus(message) {

    if (status) {
        status.textContent = message;
    }

}


// =========================================================
// 4. MULA KAMERA
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

        // Tetapkan saiz canvas ikut kamera
        overlayCanvas.width = camera.videoWidth;
        overlayCanvas.height = camera.videoHeight;

        canvasInput.width = camera.videoWidth;
        canvasInput.height = camera.videoHeight;

        startCamera.disabled = true;
        stopCamera.disabled = false;
        captureImage.disabled = false;

        updateStatus("Kamera sedang aktif. Letakkan pola dalam pandangan kamera.");

    } catch (error) {

        console.error(error);

        updateStatus(
            "Kamera tidak dapat diaktifkan. Sila semak kebenaran kamera."
        );

    }

}


// =========================================================
// 5. HENTIKAN KAMERA
// =========================================================

function stopCameraFunction() {

    if (cameraStream) {

        cameraStream.getTracks().forEach(track => {
            track.stop();
        });

        cameraStream = null;

    }

    camera.srcObject = null;

    startCamera.disabled = false;
    stopCamera.disabled = true;
    captureImage.disabled = true;

    updateStatus("Kamera dihentikan.");

}


// =========================================================
// 6. AMBIL GAMBAR
// =========================================================

function captureImageFunction() {

    if (!cameraStream) {

        updateStatus("Sila mulakan kamera terlebih dahulu.");

        return;

    }


    // Pastikan saiz canvas sama dengan video
    canvasInput.width = camera.videoWidth;
    canvasInput.height = camera.videoHeight;


    // Ambil frame daripada kamera
    const context = canvasInput.getContext("2d");

    context.drawImage(
        camera,
        0,
        0,
        canvasInput.width,
        canvasInput.height
    );


    // Tukarkan canvas kepada gambar
    const imageData = canvasInput.toDataURL("image/png");


    // Paparkan gambar
    capturedImage.src = imageData;

    capturedImage.style.display = "block";

    noImageMessage.style.display = "none";


    updateStatus(
        "Gambar pola berjaya diambil. Sedia untuk analisis."
    );


    // Terus jalankan analisis
    analyzePattern();

}


// =========================================================
// 7. ANALISIS POLA
// =========================================================

function analyzePattern() {

    if (!capturedImage.src) {

        lineStatus.textContent = "Tiada gambar";

        patternMeasurement.textContent = "Tiada data";

        formulaStatus.textContent = "Belum tersedia";

        resultTitle.textContent = "Menunggu semakan pola";

        resultMessage.textContent =
            "Sila ambil gambar pola terlebih dahulu.";

        return;

    }


    updateStatus("Menganalisis garisan pola...");


    // Beri sedikit masa supaya gambar selesai dipaparkan
    setTimeout(() => {

        try {

            detectPatternLines();

        } catch (error) {

            console.error(error);

            updateStatus(
                "Analisis pola tidak dapat dilakukan."
            );

        }

    }, 300);

}


// =========================================================
// 8. KESAN GARISAN POLA
// =========================================================

function detectPatternLines() {

    const context = canvasInput.getContext("2d");

    const imageData = context.getImageData(
        0,
        0,
        canvasInput.width,
        canvasInput.height
    );


    // Semakan asas imej
    let darkPixels = 0;

    const data = imageData.data;


    for (let i = 0; i < data.length; i += 16) {

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const brightness =
            (r + g + b) / 3;


        if (brightness < 150) {
            darkPixels++;
        }

    }


    // Paparan overlay
    drawPatternOverlay();


    if (darkPixels > 100) {

        lineStatus.textContent =
            "Garisan dikesan";

        patternMeasurement.textContent =
            "Imej berjaya dibaca";

        formulaStatus.textContent =
            "Menunggu pengiraan ukuran";


        resultTitle.textContent =
            "Pola berjaya diimbas";

        resultMessage.textContent =
            "Garisan pola telah dikesan. Semakan ukuran boleh diteruskan.";


        updateStatus(
            "Analisis selesai. Garisan pola berjaya dikesan."
        );

    } else {

        lineStatus.textContent =
            "Garisan tidak jelas";

        patternMeasurement.textContent =
            "Perlu imbasan semula";

        formulaStatus.textContent =
            "Belum tersedia";


        resultTitle.textContent =
            "Pola perlu diimbas semula";

        resultMessage.textContent =
            "Pastikan pola berada di permukaan rata dan garisan pensel kelihatan jelas.";


        updateStatus(
            "Garisan pola kurang jelas. Cuba ambil gambar semula."
        );

    }

}


// =========================================================
// 9. OVERLAY GARISAN
// =========================================================

function drawPatternOverlay() {

    const ctx = overlayCanvas.getContext("2d");

    ctx.clearRect(
        0,
        0,
        overlayCanvas.width,
        overlayCanvas.height
    );


    // Saiz overlay ikut kamera
    overlayCanvas.width = canvasInput.width;
    overlayCanvas.height = canvasInput.height;


    const imageData =
        canvasInput.getContext("2d").getImageData(
            0,
            0,
            canvasInput.width,
            canvasInput.height
        );


    const data = imageData.data;


    ctx.lineWidth = 2;


    // Imbas garisan gelap secara ringkas
    for (
        let y = 0;
        y < canvasInput.height;
        y += 4
    ) {

        for (
            let x = 0;
            x < canvasInput.width;
            x += 4
        ) {

            const index =
                (y * canvasInput.width + x) * 4;


            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];


            const brightness =
                (r + g + b) / 3;


            if (brightness < 100) {

                ctx.fillStyle = "rgba(0,255,0,0.75)";

                ctx.fillRect(
                    x,
                    y,
                    3,
                    3
                );

            }

        }

    }

}


// =========================================================
// 10. EVENT BUTTON
// =========================================================

startCamera.addEventListener(
    "click",
    startCameraFunction
);


stopCamera.addEventListener(
    "click",
    stopCameraFunction
);


captureImage.addEventListener(
    "click",
    captureImageFunction
);


// =========================================================
// 11. INITIAL STATUS
// =========================================================

updateStatus(
    "Kamera belum diaktifkan."
);
