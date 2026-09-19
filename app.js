const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");

const startButton = document.getElementById("startCamera");
const stopButton = document.getElementById("stopCamera");

const statusText = document.getElementById("status");

const unitSelect = document.getElementById("unit");

const shoulderInput = document.getElementById("shoulder");
const chestInput = document.getElementById("chest");
const waistInput = document.getElementById("waist");
const hipInput = document.getElementById("hip");
const neckInput = document.getElementById("neck");
const backLengthInput = document.getElementById("backLength");

const unitLabels =
    document.querySelectorAll(".unit-label");

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


/*
    Data ukuran badan
*/

let bodyMeasurements = {
    unit: "cm",
    shoulder: null,
    chest: null,
    waist: null,
    hip: null,
    neck: null,
    backLength: null
};


/*
    Tukar label unit
*/

unitSelect.addEventListener("change", () => {

    const selectedUnit = unitSelect.value;

    const label =
        selectedUnit === "cm"
            ? "cm"
            : "in";

    unitLabels.forEach((element) => {
        element.textContent = label;
    });

});


/*
    Simpan ukuran badan
*/

saveMeasurementsButton.addEventListener("click", () => {

    const unit = unitSelect.value;

    const shoulder =
        parseFloat(shoulderInput.value);

    const chest =
        parseFloat(chestInput.value);

    const waist =
        parseFloat(waistInput.value);

    const hip =
        parseFloat(hipInput.value);

    const neck =
        parseFloat(neckInput.value);

    const backLength =
        parseFloat(backLengthInput.value);


    const values = [
        shoulder,
        chest,
        waist,
        hip,
        neck,
        backLength
    ];


    const invalidValue =
        values.some(
            value =>
                !Number.isFinite(value) ||
                value <= 0
        );


    if (invalidValue) {

        measurementStatus.textContent =
            "Sila lengkapkan semua 6 ukuran dengan nilai yang betul.";

        measurementStatus.style.color =
            "#b91c1c";

        return;
    }


    bodyMeasurements = {

        unit: unit,

        shoulder: shoulder,

        chest: chest,

        waist: waist,

        hip: hip,

        neck: neck,

        backLength: backLength

    };


    localStorage.setItem(
        "smartPolaMeasurements",
        JSON.stringify(bodyMeasurements)
    );


    const unitText =
        unit === "cm"
            ? "cm"
            : "in";


    measurementStatus.textContent =
        `Ukuran disimpan (${unitText}) — ` +
        `Bahu: ${shoulder} | ` +
        `Dada: ${chest} | ` +
        `Pinggang: ${waist} | ` +
        `Pinggul: ${hip} | ` +
        `Leher: ${neck} | ` +
        `Labuh Tengah Belakang: ${backLength}`;


    measurementStatus.style.color =
        "#166534";


    statusText.textContent =
        "Ukuran badan telah disimpan. Kamera sedia digunakan.";

});


/*
    Muat ukuran yang pernah disimpan
*/

function loadMeasurements() {

    const savedMeasurements =
        localStorage.getItem(
            "smartPolaMeasurements"
        );


    if (!savedMeasurements) {
        return;
    }


    try {

        bodyMeasurements =
            JSON.parse(savedMeasurements);


        unitSelect.value =
            bodyMeasurements.unit || "cm";


        shoulderInput.value =
            bodyMeasurements.shoulder ?? "";

        chestInput.value =
            bodyMeasurements.chest ?? "";

        waistInput.value =
            bodyMeasurements.waist ?? "";

        hipInput.value =
            bodyMeasurements.hip ?? "";

        neckInput.value =
            bodyMeasurements.neck ?? "";

        backLengthInput.value =
            bodyMeasurements.backLength ?? "";


        const label =
            bodyMeasurements.unit === "cm"
                ? "cm"
                : "in";


        unitLabels.forEach((element) => {
            element.textContent = label;
        });


        measurementStatus.textContent =
            "Ukuran badan sebelumnya telah dimuatkan.";

        measurementStatus.style.color =
            "#166534";


    } catch (error) {

        console.error(
            "Gagal memuatkan ukuran:",
            error
        );

    }

}


/*
    Mula kamera
*/

startButton.addEventListener(
    "click",
    async () => {

        const measurementsComplete =
            bodyMeasurements.shoulder &&
            bodyMeasurements.chest &&
            bodyMeasurements.waist &&
            bodyMeasurements.hip &&
            bodyMeasurements.neck &&
            bodyMeasurements.backLength;


        if (!measurementsComplete) {

            statusText.textContent =
                "Sila lengkapkan dan simpan semua ukuran badan terlebih dahulu.";

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


            video.srcObject =
                stream;


            await video.play();


            statusText.textContent =
                "Kamera aktif — Sila letakkan pola dalam paparan kamera.";


            startButton.disabled =
                true;

            stopButton.disabled =
                false;


            lineStatus.textContent =
                "Mengesan...";


            patternMeasurement.textContent =
                "Menganalisis...";


            formulaStatus.textContent =
                "Menunggu ukuran pola";


            detectPatternLines();

        }


        catch (error) {

            console.error(error);


            statusText.textContent =
                "Kamera tidak dapat diakses. Sila benarkan akses kamera.";

        }

    }
);


/*
    Henti kamera
*/

stopButton.addEventListener(
    "click",
    () => {

        stopCamera();

    }
);


function stopCamera() {

    if (stream) {

        stream
            .getTracks()
            .forEach(
                track =>
                    track.stop()
            );

        stream = null;
    }


    if (animationFrame) {

        cancelAnimationFrame(
            animationFrame
        );

        animationFrame = null;
    }


    video.srcObject =
        null;


    startButton.disabled =
        false;

    stopButton.disabled =
        true;


    statusText.textContent =
        "Kamera belum diaktifkan.";


    lineStatus.textContent =
        "Belum dianalisis";


    patternMeasurement.textContent =
        "Menunggu imbasan";


    formulaStatus.textContent =
        "Belum tersedia";

}


/*
    Kesan garisan pola
*/

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
        canvas.getContext(
            "2d",
            {
                willReadFrequently: true
            }
        );


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
        (
            (canvas.width *
            canvas.height) / 16
        );


    if (
        detectionLevel > 0.015
    ) {

        statusText.textContent =
            "Garisan pola dikesan.";

        lineStatus.textContent =
            "Dikesan";

    }

    else {

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


/*
    Jalankan sistem
*/

loadMeasurements();
