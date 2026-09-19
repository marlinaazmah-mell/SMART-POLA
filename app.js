document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // 1. AMBIL ELEMEN HTML
    // =========================================================

    const garmentType = document.getElementById("garmentType");
    const patternPart = document.getElementById("patternPart");
    const patternSelectionStatus = document.getElementById("patternSelectionStatus");

    const unitSelect = document.getElementById("unit");

    const startCameraBtn = document.getElementById("startCameraBtn");
    const stopCameraBtn = document.getElementById("stopCameraBtn");

    const camera = document.getElementById("camera");
    const overlayCanvas = document.getElementById("overlayCanvas");

    const cameraStatus = document.getElementById("cameraStatus");
    const detectionStatus = document.getElementById("detectionStatus");

    const analyzeBtn = document.getElementById("analyzeBtn");

    const resultTitle = document.getElementById("resultTitle");
    const resultMessage = document.getElementById("resultMessage");

    const measuredValue = document.getElementById("measuredValue");
    const expectedValue = document.getElementById("expectedValue");
    const differenceValue = document.getElementById("differenceValue");


    // =========================================================
    // 2. SENARAI BAHAGIAN POLA
    // =========================================================

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


    // =========================================================
    // 3. DROPDOWN BAHAGIAN POLA
    // =========================================================

    function updatePatternParts() {

        const selectedGarment = garmentType.value;

        // Kosongkan pilihan lama
        patternPart.innerHTML = "";

        // Pilihan pertama
        const defaultOption = document.createElement("option");

        defaultOption.value = "";
        defaultOption.textContent = "-- Pilih bahagian pola --";

        patternPart.appendChild(defaultOption);


        // Jika belum pilih jenis pakaian
        if (!selectedGarment) {

            patternSelectionStatus.textContent =
                "Sila pilih jenis pakaian dahulu.";

            return;
        }


        // Dapatkan senarai bahagian pola
        const parts = patternOptions[selectedGarment] || [];


        // Masukkan setiap bahagian ke dropdown
        parts.forEach((part) => {

            const option = document.createElement("option");

            option.value = part;
            option.textContent = part;

            patternPart.appendChild(option);

        });


        patternSelectionStatus.textContent =
            "Sila pilih bahagian pola.";

    }


    // Bila Jenis Pakaian berubah
    if (garmentType) {

        garmentType.addEventListener("change", updatePatternParts);

    }


    // Bila Bahagian Pola dipilih
    if (patternPart) {

        patternPart.addEventListener("change", () => {

            if (patternPart.value) {

                patternSelectionStatus.textContent =
                    "Bahagian pola dipilih: " + patternPart.value;

            } else {

                patternSelectionStatus.textContent =
                    "Sila pilih bahagian pola.";

            }

        });

    }


    // =========================================================
    // 4. UNIT UKURAN
    // =========================================================

    if (unitSelect) {

        unitSelect.addEventListener("change", () => {

            const selectedUnit = unitSelect.value;

            const unitLabels = document.querySelectorAll(".unit-label");

            unitLabels.forEach((label) => {

                label.textContent = selectedUnit;

            });

        });

    }


    // =========================================================
    // 5. KAMERA
    // =========================================================

    let cameraStream = null;
    let detectionAnimation = null;


    async function startCamera() {

        try {

            cameraStream = await navigator.mediaDevices.getUserMedia({

                video: {
                    facingMode: "environment"
                },

                audio: false

            });


            camera.srcObject = cameraStream;

            await camera.play();


            cameraStatus.textContent =
                "Kamera sedang aktif.";

            startCameraBtn.disabled = true;
            stopCameraBtn.disabled = false;


            startDetection();


        } catch (error) {

            console.error(error);

            cameraStatus.textContent =
                "Kamera tidak dapat dibuka. Sila benarkan akses kamera.";

        }

    }


    function stopCamera() {

        if (cameraStream) {

            cameraStream.getTracks().forEach((track) => {

                track.stop();

            });

            cameraStream = null;

        }


        camera.srcObject = null;


        if (detectionAnimation) {

            cancelAnimationFrame(detectionAnimation);

            detectionAnimation = null;

        }


        const ctx = overlayCanvas.getContext("2d");

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


    if (startCameraBtn) {

        startCameraBtn.addEventListener("click", startCamera);

    }


    if (stopCameraBtn) {

        stopCameraBtn.addEventListener("click", stopCamera);

    }


    // =========================================================
    // 6. PENGESANAN GARISAN ASAS
    // =========================================================

    function startDetection() {

        if (!camera || !overlayCanvas) {
            return;
        }


        const ctx = overlayCanvas.getContext("2d");


        function detect() {

            if (!cameraStream) {
                return;
            }


            if (
                camera.videoWidth === 0 ||
                camera.videoHeight === 0
            ) {

                detectionAnimation =
                    requestAnimationFrame(detect);

                return;

            }


            // Samakan saiz canvas dengan video
            overlayCanvas.width = camera.videoWidth;
            overlayCanvas.height = camera.videoHeight;


            ctx.clearRect(
                0,
                0,
                overlayCanvas.width,
                overlayCanvas.height
            );


            /*
             * Buat masa ini kita bina kawasan panduan
             * untuk pola.
             *
             * Sistem pengesanan garisan sebenar
             * akan dimasukkan selepas modul formula
             * dan pengukuran disediakan.
             */


            const marginX =
                overlayCanvas.width * 0.08;

            const marginY =
                overlayCanvas.height * 0.08;


            const width =
                overlayCanvas.width - (marginX * 2);

            const height =
                overlayCanvas.height - (marginY * 2);


            ctx.setLineDash([12, 8]);

            ctx.lineWidth = 3;

            ctx.strokeStyle = "rgba(255,255,255,0.9)";


            ctx.strokeRect(
                marginX,
                marginY,
                width,
                height
            );


            ctx.setLineDash([]);


            detectionStatus.textContent =
                "Kamera aktif — halakan kamera pada pola.";


            detectionAnimation =
                requestAnimationFrame(detect);

        }


        detect();

    }


    // =========================================================
    // 7. ANALISIS POLA
    // =========================================================

    if (analyzeBtn) {

        analyzeBtn.addEventListener("click", () => {

            const selectedGarment =
                garmentType.value;

            const selectedPattern =
                patternPart.value;


            // Semak jenis pakaian
            if (!selectedGarment) {

                resultTitle.textContent =
                    "Maklumat belum lengkap";

                resultMessage.textContent =
                    "Sila pilih jenis pakaian.";

                return;

            }


            // Semak bahagian pola
            if (!selectedPattern) {

                resultTitle.textContent =
                    "Maklumat belum lengkap";

                resultMessage.textContent =
                    "Sila pilih bahagian pola.";

                return;

            }


            // Buat masa ini belum gunakan formula sebenar.
            // Formula GIATMARA akan dimasukkan kemudian.


            resultTitle.textContent =
                "Pola sedia untuk dianalisis";

            resultMessage.textContent =
                "SMART-POLA telah menerima pilihan pola. Formula pengiraan akan digunakan selepas dimasukkan ke dalam sistem.";


            if (measuredValue) {

                measuredValue.textContent =
                    "--";

            }


            if (expectedValue) {

                expectedValue.textContent =
                    "--";

            }


            if (differenceValue) {

                differenceValue.textContent =
                    "--";

            }

        });

    }


    // =========================================================
    // 8. STATUS AWAL
    // =========================================================

    if (patternSelectionStatus) {

        patternSelectionStatus.textContent =
            "Sila pilih jenis pakaian dahulu.";

    }


    if (cameraStatus) {

        cameraStatus.textContent =
            "Kamera belum diaktifkan.";

    }


    if (detectionStatus) {

        detectionStatus.textContent =
            "Pengesanan garisan tidak aktif.";

    }


    if (stopCameraBtn) {

        stopCameraBtn.disabled = true;

    }


});
