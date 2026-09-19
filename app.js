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


        const parts = patternOptions[selected] || [];


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


            startLineDetection();


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


        cameraStatus.textContent =
            "Kamera dihentikan.";

        detectionStatus.textContent =
            "Pengesanan garisan tidak aktif.";

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
    // LINE DETECTION
    // =====================================================

    function startLineDetection() {

        const ctx =
            overlayCanvas.getContext("2d");

        const processingCanvas =
            document.createElement("canvas");

        const processingCtx =
            processingCanvas.getContext("2d");


        function detectLines() {

            if (!cameraStream) {
                return;
            }


            if (
                camera.videoWidth === 0 ||
                camera.videoHeight === 0
            ) {

                animationFrame =
                    requestAnimationFrame(
                        detectLines
                    );

                return;

            }


            // Saiz pemprosesan lebih kecil
            // supaya telefon/laptop tidak terlalu berat

            const scale = 0.35;

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


            // Ambil imej kamera

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


            // =================================================
            // SOBEL EDGE DETECTION
            // =================================================

            const edges =
                new Uint8ClampedArray(
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

                    const p =
                        (y * width + x) * 4;

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
                            gx * gx +
                            gy * gy
                        );


                    edges[
                        y * width + x
                    ] =
                        magnitude > 55
                            ? 255
                            : 0;

                }

            }


            // =================================================
            // PAPAR GARISAN YANG DIKESAN
            // =================================================

            ctx.clearRect(
                0,
                0,
                overlayCanvas.width,
                overlayCanvas.height
            );


            const scaleX =
                camera.videoWidth / width;

            const scaleY =
                camera.videoHeight / height;


            ctx.fillStyle =
                "rgba(255,255,255,0.9)";


            // Lukis titik/gabungan garisan yang dikesan

            for (
                let y = 2;
                y < height - 2;
                y += 2
            ) {

                for (
                    let x = 2;
                    x < width - 2;
                    x += 2
                ) {

                    const index =
                        y * width + x;


                    if (edges[index] === 255) {

                        ctx.fillRect(
                            x * scaleX,
                            y * scaleY,
                            2,
                            2
                        );

                    }

                }

            }


            detectionStatus.textContent =
                "Garisan pola sedang dikesan...";


            animationFrame =
                requestAnimationFrame(
                    detectLines
                );

        }


        detectLines();

    }


    // =====================================================
    // ANALISIS
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


            resultTitle.textContent =
                "Pola berjaya diimbas";


            resultMessage.textContent =
                "SMART-POLA telah mengesan garisan pola. Pengiraan ukuran dan semakan formula akan digunakan dalam modul seterusnya.";


            measuredValue.textContent =
                "--";

            expectedValue.textContent =
                "--";

            differenceValue.textContent =
                "--";

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
        "Pengesanan garisan tidak aktif.";

    stopCameraBtn.disabled = true;

});
