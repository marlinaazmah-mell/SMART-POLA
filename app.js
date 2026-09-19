const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");

const startButton = document.getElementById("startCamera");
const stopButton = document.getElementById("stopCamera");

const statusText = document.getElementById("status");

const shoulderInput = document.getElementById("shoulder");
const neckInput = document.getElementById("neck");
const chestInput = document.getElementById("chest");

const saveMeasurementsButton =
    document.getElementById("saveMeasurements");

const measurementStatus =
    document.getElementById("measurementStatus");

const lineStatus =
    document.getElementById("lineStatus");

const patternMeasurement =
    document.getElementById("patternMeasurement");

const formulaStatus =
    document.getElementById("formulaStatus");


let stream = null;
let animationFrame = null;

let bodyMeasurements = {
    shoulder: null,
    neck: null,
    chest: null
};


/* =========================
   SIMPAN UKURAN BADAN
========================= */

saveMeasurementsButton.addEventListener("click", () => {

    const shoulder = parseFloat(shoulderInput.value);
    const neck = parseFloat(neckInput.value);
    const chest = parseFloat(chestInput.value);

    if (
        !Number.isFinite(shoulder) ||
        !Number.isFinite(neck) ||
        !Number.isFinite(chest) ||
        shoulder <= 0 ||
        neck <= 0 ||
        chest <= 0
    ) {
        measurementStatus.textContent =
            "Sila masukkan semua ukuran dengan nilai yang betul.";

        measurementStatus.style.color = "#b91c1c";

        return;
    }

    bodyMeasurements = {
        shoulder: shoulder,
        neck: neck,
        chest: chest
    };

    localStorage.setItem(
        "smartPolaMeasurements",
        JSON.stringify(bodyMeasurements)
    );

    measurementStatus.textContent =
        `Ukuran disimpan — Bahu: ${shoulder} cm | Leher: ${neck} cm | Dada: ${chest} cm`;

    measurementStatus.style.color = "#166534";

    statusText.textContent =
        "Ukuran badan telah disimpan. Kamera sedia digunakan.";
});


/* =========================
   MUAT SEMULA UKURAN
========================= */

function loadMeasurements() {

    const savedMeasurements =
        localStorage.getItem("smartPolaMeasurements");

    if (!savedMeasurements) {
        return;
    }

    try {

        bodyMeasurements =
            JSON.parse(savedMeasurements);

        shoulderInput.value =
            bodyMeasurements.shoulder ?? "";

        neckInput.value =
            bodyMeasurements.neck ?? "";

        chestInput.value =
            bodyMeasurements.chest ?? "";

        measurementStatus.textContent =
            "Ukuran badan sebelumnya telah dimuatkan.";

        measurementStatus.style.color = "#166534";

    } catch (error) {

        console.error(
            "Gagal memuatkan ukuran:",
            error
        );

    }
}


/* =========================
   MULA KAMERA
========================= */

startButton.addEventListener("click", async () => {

    if (
        !bodyMeasurements.shoulder ||
        !bodyMeasurements.neck ||
        !bodyMeasurements.chest
    ) {

        statusText.textContent =
            "Sila simpan ukuran badan terlebih dahulu.";

        return;
    }

    try {

        stream =
            await navigator.mediaDevices.getUserMedia({

                video: {
                    facingMode: "environment",
                    width: {
                        ideal: 1280
                    },
                    height: {
                        ideal: 720
                    }
                },

                audio: false
            });

        video.srcObject = stream;

        await video.play();

        statusText.textContent =
            "Kamera aktif — Sila letakkan pola dalam paparan kamera.";

        startButton.disabled = true;
        stopButton.disabled = false;

        lineStatus.textContent =
            "Mengesan...";

        patternMeasurement.textContent =
            "Menganalisis...";

        formulaStatus.textContent =
            "Menunggu ukuran pola";

        detectPatternLines();

    } catch (error) {

        console.error(error);

        statusText.textContent =
            "Kamera tidak dapat diakses. Sila benarkan akses kamera.";

    }
});


/* =========================
   HENTI KAMERA
========================= */

stopButton.addEventListener("click", () => {

    stopCamera();

});


function stopCamera() {

    if (stream) {

        stream
            .getTracks()
            .forEach(track => track.stop());

        stream = null;
    }

    if (animationFrame) {

        cancelAnimationFrame(
            animationFrame
        );

        animationFrame = null;
    }

    video.srcObject = null;

    startButton.disabled = false;
    stopButton.disabled = true;

    statusText.textContent =
        "Kamera belum diaktifkan.";

    lineStatus.textContent =
        "Belum dianalisis";

    patternMeasurement.textContent =
        "Menunggu imbasan";

    formulaStatus.textContent =
        "Belum tersedia";
}


/* =========================
   KESAN GARISAN POLA
========================= */

function detectPatternLines() {

    if (
        !stream ||
        video.readyState < 2
    ) {

        animationFrame =
            requestAnimationFrame(
                detectPatternLines
            );

        return;
    }

    const context =
        canvas.getContext("2d", {
            willReadFrequently: true
        });

    canvas.width =
        video.videoWidth;

    canvas.height =
        video.videoHeight;

    context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );

    const image =
        context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
        );

    const data =
        image.data;

    let edgePixels = 0;

    for (
        let y = 1;
        y < canvas.height - 1;
        y += 4
    ) {

        for (
            let x = 1;
            x < canvas.width - 1;
            x += 4
        ) {

            const currentIndex =
                (y * canvas.width + x) * 4;

            const rightIndex =
                (y * canvas.width + (x + 1)) * 4;

            const currentBrightness =
                (
                    data[currentIndex] +
                    data[currentIndex + 1] +
                    data[currentIndex + 2]
                ) / 3;

            const rightBrightness =
                (
                    data[rightIndex] +
                    data[rightIndex + 1] +
                    data[rightIndex + 2]
                ) / 3;

            const difference =
                Math.abs(
                    currentBrightness -
                    rightBrightness
                );

            if (difference > 45) {
                edgePixels++;
            }
        }
    }

    const detectionLevel =
        edgePixels /
        ((canvas.width * canvas.height) / 16);


    if (detectionLevel > 0.015) {

        statusText.textContent =
            "Garisan pola dikesan.";

        lineStatus.textContent =
            "Dikesan";

    } else {

        statusText.textContent =
            "Mengesan garisan pola...";

        lineStatus.textContent =
            "Mengesan...";
    }


    animationFrame =
        requestAnimationFrame(
            detectPatternLines
        );
}


/* =========================
   MULAKAN SISTEM
========================= */

loadMeasurements();
