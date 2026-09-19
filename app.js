document.addEventListener("DOMContentLoaded", () => {

    // =====================================================
    // ELEMENT HTML
    // =====================================================

    const garmentType = document.getElementById("garmentType");
    const patternPart = document.getElementById("patternPart");
    const patternSelectionStatus =
        document.getElementById("patternSelectionStatus");

    const unitSelect = document.getElementById("unit");

    const startCameraBtn =
        document.getElementById("startCameraBtn");

    const stopCameraBtn =
        document.getElementById("stopCameraBtn");

    const camera = document.getElementById("camera");
    const overlayCanvas =
        document.getElementById("overlayCanvas");

    const cameraStatus =
        document.getElementById("cameraStatus");

    const detectionStatus =
        document.getElementById("detectionStatus");

    const analyzeBtn =
        document.getElementById("analyzeBtn");

    const resultTitle =
        document.getElementById("resultTitle");

    const resultMessage =
        document.getElementById("resultMessage");

    const measuredValue =
        document.getElementById("measuredValue");

    const expectedValue =
        document.getElementById("expectedValue");

    const differenceValue =
        document.getElementById("differenceValue");


    // =====================================================
    // BAHAGIAN POLA
    // =====================================================

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


    function updatePatternParts() {

        const selected = garmentType.value;

        patternPart.innerHTML = "";

        const firstOption =
            document.createElement("option");

        firstOption.value = "";
        firstOption.textContent =
            "-- Pilih bahagian pola --";

        patternPart.appendChild(firstOption);


        if (!selected) {

            patternSelectionStatus.textContent =
                "Sila pilih jenis pakaian dahulu.";

            return;
        }


        const parts =
            patternOptions[selected] || [];


        parts.forEach((part) => {

            const option =
                document.createElement("option");

            option.value = part;
            option.textContent = part;

            patternPart.appendChild(option);

        });


        patternSelectionStatus.textContent =
            "Sila pilih bahagian pola.";

    }


    garmentType.addEventListener(
        "change",
        updatePatternParts
    );


    patternPart.addEventListener(
        "change",
        () => {

            if (patternPart.value) {

                patternSelectionStatus.textContent =
                    "Bahagian pola dipilih: " +
                    patternPart.value;

            } else {

                patternSelectionStatus.textContent =
                    "Sila pilih bahagian pola.";

            }

        }
    );


    // =====================================================
    // UNIT
    // =====================================================

    unitSelect.addEventListener(
        "change",
        () => {

            document
                .querySelectorAll(".unit-label")
                .forEach((label) => {

                    label.textContent =
                        unitSelect.value;

                });

        }
    );


    // =====================================================
    // KAMERA
    // =====================================================

    let cameraStream = null;
    let animationFrame = null;

    let currentPattern = null;


    async function startCamera() {

        try {

            cameraStream =
                await navigator.mediaDevices.getUserMedia({

                    video: {
                        facingMode: {
                            ideal: "environment"
                        },

                        width: {
                            ideal: 1280
                        },

                        height: {
                            ideal: 720
                        }
                    },

                    audio: false

                });


            camera.srcObject =
                cameraStream;

            await camera.play();


            cameraStatus.textContent =
                "Kamera sedang aktif.";

            startCameraBtn.disabled = true;
            stopCameraBtn.disabled = false;


            startPatternScan();

        } catch (error) {

            console.error(error);

            cameraStatus.textContent =
                "Kamera tidak dapat dibuka. Sila benarkan akses kamera.";

        }

    }


    function stopCamera() {

        if (cameraStream) {

            cameraStream
                .getTracks()
                .forEach((track) => track.stop());

            cameraStream = null;

        }


        if (animationFrame) {

            cancelAnimationFrame(animationFrame);

            animationFrame = null;

        }


        camera.srcObject = null;


        const ctx =
            overlayCanvas.getContext("2d");

        ctx.clearRect(
            0,
            0,
            overlayCanvas.width,
            overlayCanvas.height
        );


        currentPattern = null;


        cameraStatus.textContent =
            "Kamera dihentikan.";

        detectionStatus.textContent =
            "Pengesanan pola tidak aktif.";

        startCameraBtn.disabled = false;
        stopCameraBtn.disabled = true;

    }


    startCameraBtn.addEventListener(
        "click",
        startCamera
    );


    stopCameraBtn.addEventListener(
        "click",
        stopCamera
    );


    // =====================================================
    // PATTERN SCAN ENGINE
    // =====================================================

    function startPatternScan() {

        const ctx =
            overlayCanvas.getContext("2d");

        const processingCanvas =
            document.createElement("canvas");

        const processingCtx =
            processingCanvas.getContext("2d");


        function scan() {

            if (!cameraStream) {
                return;
            }


            if (
                camera.videoWidth === 0 ||
                camera.videoHeight === 0
            ) {

                animationFrame =
                    requestAnimationFrame(scan);

                return;

            }


            // -------------------------------------------------
            // KECILKAN IMAGE UNTUK PEMPROSESAN
            // -------------------------------------------------

            const scale = 0.30;

            const width =
                Math.floor(
                    camera.videoWidth * scale
                );

            const height =
                Math.floor(
                    camera.videoHeight * scale
                );


            processingCanvas.width = width;
            processingCanvas.height = height;


            overlayCanvas.width =
                camera.videoWidth;

            overlayCanvas.height =
                camera.videoHeight;


            processingCtx.drawImage(
                camera,
                0,
                0,
                width,
                height
            );


            const imageData =
                processingCtx.getImageData(
                    0,
                    0,
                    width,
                    height
                );


            const pixels =
                imageData.data;


            // -------------------------------------------------
            // CARI EDGE / GARISAN
            // -------------------------------------------------

            const edges =
                new Uint8Array(
                    width * height
                );


            for (
                let y = 1;
                y < height - 1;
                y++
            ) {

                for (
                    let x = 1;
                    x < width - 1;
                    x++
                ) {

                    const left =
                        ((y * width) + (x - 1)) * 4;

                    const right =
                        ((y * width) + (x + 1)) * 4;

                    const top =
                        (((y - 1) * width) + x) * 4;

                    const bottom =
                        (((y + 1) * width) + x) * 4;


                    const grayLeft =
                        (
                            pixels[left] +
                            pixels[left + 1] +
                            pixels[left + 2]
                        ) / 3;


                    const grayRight =
                        (
                            pixels[right] +
                            pixels[right + 1] +
                            pixels[right + 2]
                        ) / 3;


                    const grayTop =
                        (
                            pixels[top] +
                            pixels[top + 1] +
                            pixels[top + 2]
                        ) / 3;


                    const grayBottom =
                        (
                            pixels[bottom] +
                            pixels[bottom + 1] +
                            pixels[bottom + 2]
                        ) / 3;


                    const gx =
                        grayRight - grayLeft;

                    const gy =
                        grayBottom - grayTop;


                    const magnitude =
                        Math.sqrt(
                            (gx * gx) +
                            (gy * gy)
                        );


                    if (magnitude > 55) {

                        edges[
                            y * width + x
                        ] = 1;

                    }

                }

            }


            // -------------------------------------------------
            // CARI BOUNDING BOX
            // -------------------------------------------------

            let minX = width;
            let minY = height;
            let maxX = 0;
            let maxY = 0;

            let detectedPixels = 0;


            for (
                let y = 1;
                y < height - 1;
                y++
            ) {

                for (
                    let x = 1;
                    x < width - 1;
                    x++
                ) {

                    if (
                        edges[
                            y * width + x
                        ] === 1
                    ) {

                        detectedPixels++;

                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;

                    }

                }

            }


            // -------------------------------------------------
            // PAPARKAN HASIL SCAN
            // -------------------------------------------------

            ctx.clearRect(
                0,
                0,
                overlayCanvas.width,
                overlayCanvas.height
            );


            if (detectedPixels > 150) {

                const scaleX =
                    camera.videoWidth / width;

                const scaleY =
                    camera.videoHeight / height;


                const boxX =
                    minX * scaleX;

                const boxY =
                    minY * scaleY;

                const boxWidth =
                    (maxX - minX) * scaleX;

                const boxHeight =
                    (maxY - minY) * scaleY;


                // Kotak kawasan pola

                ctx.strokeStyle =
                    "rgba(0,255,0,0.9)";

                ctx.lineWidth = 4;

                ctx.setLineDash([]);

                ctx.strokeRect(
                    boxX,
                    boxY,
                    boxWidth,
                    boxHeight
                );


                // Titik tengah

                const centerX =
                    boxX + boxWidth / 2;

                const centerY =
                    boxY + boxHeight / 2;


                ctx.beginPath();

                ctx.arc(
                    centerX,
                    centerY,
                    8,
                    0,
                    Math.PI * 2
                );

                ctx.fillStyle =
                    "rgba(0,255,0,0.9)";

                ctx.fill();


                // Simpan data pola

                currentPattern = {

                    pixelWidth: boxWidth,

                    pixelHeight: boxHeight,

                    detectedPixels: detectedPixels

                };


                detectionStatus.textContent =
                    "Pola dikesan — kawasan pola dikenal pasti.";

            } else {

                currentPattern = null;

                detectionStatus.textContent =
                    "Halakan kamera pada pola sehingga garisan dapat dikesan.";

            }


            animationFrame =
                requestAnimationFrame(scan);

        }


        scan();

    }


    // =====================================================
    // ANALISIS POLA
    // =====================================================

    analyzeBtn.addEventListener(
        "click",
        () => {

            if (!garmentType.value) {

                resultTitle.textContent =
                    "Maklumat belum lengkap";

                resultMessage.textContent =
                    "Sila pilih jenis pakaian.";

                return;

            }


            if (!patternPart.value) {

                resultTitle.textContent =
                    "Maklumat belum lengkap";

                resultMessage.textContent =
                    "Sila pilih bahagian pola.";

                return;

            }


            if (!currentPattern) {

                resultTitle.textContent =
                    "Pola belum dikesan";

                resultMessage.textContent =
                    "Sila buka kamera dan halakan pada pola terlebih dahulu.";

                return;

            }


            const widthPx =
                currentPattern.pixelWidth;

            const heightPx =
                currentPattern.pixelHeight;


            // Buat masa ini ukuran masih dalam PIXEL.
            // Skala cm/inci akan dimasukkan selepas
            // kaedah calibration ditetapkan.


            measuredValue.textContent =
                `${Math.round(widthPx)} px × ${Math.round(heightPx)} px`;


            expectedValue.textContent =
                "Belum ditetapkan";


            differenceValue.textContent =
                "Belum dikira";


            resultTitle.textContent =
                "Pola berjaya diimbas";


            resultMessage.textContent =
                "SMART-POLA telah mengenal pasti kawasan pola dan mendapatkan ukuran awal. Skala sebenar serta formula GIATMARA akan disambungkan pada langkah seterusnya.";

        }
    );


    // =====================================================
    // STATUS AWAL
    // =====================================================

    patternSelectionStatus.textContent =
        "Sila pilih jenis pakaian dahulu.";

    cameraStatus.textContent =
        "Kamera belum diaktifkan.";

    detectionStatus.textContent =
        "Pengesanan pola tidak aktif.";

    stopCameraBtn.disabled = true;

});
