document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // SMART-POLA V3.1
    // Noise Reduction + Continuous Pattern Line Detection
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
    // 1. PILIHAN BAHAGIAN POLA
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


    function updatePatternParts() {

        const selected = garmentType.value;

        patternPart.innerHTML = "";

        const firstOption = document.createElement("option");

        firstOption.value = "";
        firstOption.textContent = "-- Pilih bahagian pola --";

        patternPart.appendChild(firstOption);

        if (!selected) {

            patternSelectionStatus.textContent =
                "Sila pilih jenis pakaian dahulu.";

            return;
        }

        const parts = patternOptions[selected] || [];

        parts.forEach((part) => {

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

        if (patternPart.value) {

            patternSelectionStatus.textContent =
                "Bahagian pola dipilih: " + patternPart.value;

        } else {

            patternSelectionStatus.textContent =
                "Sila pilih bahagian pola.";
        }
    });


    // =========================================================
    // 2. UNIT
    // =========================================================

    unitSelect.addEventListener("change", () => {

        document.querySelectorAll(".unit-label").forEach((label) => {

            label.textContent = unitSelect.value;

        });

    });


    // =========================================================
    // 3. CAMERA
    // =========================================================

    let cameraStream = null;
    let animationFrame = null;

    let currentPattern = null;

    let lastScanTime = 0;

    const SCAN_INTERVAL = 100;


    async function startCamera() {

        try {

            if (!navigator.mediaDevices ||
                !navigator.mediaDevices.getUserMedia) {

                cameraStatus.textContent =
                    "Pelayar tidak menyokong akses kamera.";

                return;
            }


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


            camera.srcObject = cameraStream;

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

            cameraStream.getTracks().forEach((track) => {
                track.stop();
            });

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


    // =========================================================
    // 4. HELPER: BLUR
    // =========================================================

    function blurImage(gray, width, height) {

        const blurred =
            new Float32Array(width * height);


        for (let y = 1; y < height - 1; y++) {

            for (let x = 1; x < width - 1; x++) {

                let total = 0;

                total += gray[(y - 1) * width + (x - 1)];
                total += gray[(y - 1) * width + x];
                total += gray[(y - 1) * width + (x + 1)];

                total += gray[y * width + (x - 1)];
                total += gray[y * width + x];
                total += gray[y * width + (x + 1)];

                total += gray[(y + 1) * width + (x - 1)];
                total += gray[(y + 1) * width + x];
                total += gray[(y + 1) * width + (x + 1)];


                blurred[y * width + x] =
                    total / 9;
            }
        }


        return blurred;
    }


    // =========================================================
    // 5. HELPER: EDGE DETECTION
    // =========================================================

    function detectEdges(gray, width, height) {

        const edges =
            new Uint8Array(width * height);


        for (let y = 2; y < height - 2; y++) {

            for (let x = 2; x < width - 2; x++) {

                const left =
                    gray[y * width + (x - 1)];

                const right =
                    gray[y * width + (x + 1)];

                const top =
                    gray[(y - 1) * width + x];

                const bottom =
                    gray[(y + 1) * width + x];


                const gx =
                    right - left;

                const gy =
                    bottom - top;


                const magnitude =
                    Math.sqrt(
                        (gx * gx) +
                        (gy * gy)
                    );


                // Hanya ambil edge yang agak kuat
                if (magnitude > 70) {

                    edges[y * width + x] = 1;

                }
            }
        }


        return edges;
    }


    // =========================================================
    // 6. FILTER NOISE
    // Hanya kekalkan edge yang mempunyai sokongan
    // =========================================================

    function filterNoise(edges, width, height) {

        const filtered =
            new Uint8Array(width * height);


        for (let y = 3; y < height - 3; y++) {

            for (let x = 3; x < width - 3; x++) {

                const index =
                    y * width + x;


                if (!edges[index]) {
                    continue;
                }


                let horizontal = 0;
                let vertical = 0;
                let diagonal1 = 0;
                let diagonal2 = 0;


                // Sokongan kiri/kanan
                for (let d = 1; d <= 3; d++) {

                    if (
                        edges[y * width + (x - d)]
                    ) {
                        horizontal++;
                    }

                    if (
                        edges[y * width + (x + d)]
                    ) {
                        horizontal++;
                    }
                }


                // Sokongan atas/bawah
                for (let d = 1; d <= 3; d++) {

                    if (
                        edges[(y - d) * width + x]
                    ) {
                        vertical++;
                    }

                    if (
                        edges[(y + d) * width + x]
                    ) {
                        vertical++;
                    }
                }


                // Diagonal /
                for (let d = 1; d <= 3; d++) {

                    if (
                        edges[(y - d) * width + (x + d)]
                    ) {
                        diagonal1++;
                    }

                    if (
                        edges[(y + d) * width + (x - d)]
                    ) {
                        diagonal1++;
                    }
                }


                // Diagonal \
                for (let d = 1; d <= 3; d++) {

                    if (
                        edges[(y - d) * width + (x - d)]
                    ) {
                        diagonal2++;
                    }

                    if (
                        edges[(y + d) * width + (x + d)]
                    ) {
                        diagonal2++;
                    }
                }


                const strongest =
                    Math.max(
                        horizontal,
                        vertical,
                        diagonal1,
                        diagonal2
                    );


                // Edge mesti mempunyai kesinambungan
                if (strongest >= 3) {

                    filtered[index] = 1;

                }
            }
        }


        return filtered;
    }


    // =========================================================
    // 7. CARI KAWASAN POLA
    // =========================================================

    function findPatternRegion(edges, width, height) {

        let minX = width;
        let minY = height;

        let maxX = 0;
        let maxY = 0;

        let count = 0;


        // Abaikan kawasan tepi kamera
        const marginX =
            Math.floor(width * 0.05);

        const marginY =
            Math.floor(height * 0.05);


        for (
            let y = marginY;
            y < height - marginY;
            y++
        ) {

            for (
                let x = marginX;
                x < width - marginX;
                x++
            ) {

                if (
                    edges[y * width + x] === 1
                ) {

                    count++;


                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;

                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }


        if (count < 80) {

            return null;
        }


        const boxWidth =
            maxX - minX;

        const boxHeight =
            maxY - minY;


        // Tolak kawasan yang terlalu kecil
        if (
            boxWidth < width * 0.12 ||
            boxHeight < height * 0.12
        ) {

            return null;
        }


        return {
            minX,
            minY,
            maxX,
            maxY,
            width: boxWidth,
            height: boxHeight,
            count
        };
    }


    // =========================================================
    // 8. PAPARKAN GARIS SAHAJA
    // =========================================================

    function drawDetectedLines(
        ctx,
        edges,
        width,
        height,
        scaleX,
        scaleY,
        region
    ) {

        ctx.clearRect(
            0,
            0,
            overlayCanvas.width,
            overlayCanvas.height
        );


        /*
         * Kita TIDAK lukis semua pixel edge.
         * Hanya lukis setiap beberapa pixel.
         * Ini kurangkan efek "semut berjalan".
         */

        ctx.strokeStyle =
            "rgba(0, 255, 120, 0.85)";

        ctx.lineWidth = 3;

        ctx.lineCap = "round";


        const step = 2;


        for (
            let y = region.minY;
            y <= region.maxY;
            y += step
        ) {

            let runStart = -1;


            for (
                let x = region.minX;
                x <= region.maxX;
                x++
            ) {

                const detected =
                    edges[y * width + x] === 1;


                if (
                    detected &&
                    runStart === -1
                ) {

                    runStart = x;

                }


                const endOfRun =
                    (!detected || x === region.maxX);


                if (
                    endOfRun &&
                    runStart !== -1
                ) {

                    const runEnd =
                        detected &&
                        x === region.maxX
                            ? x
                            : x - 1;


                    // Hanya lukis garisan yang cukup panjang
                    if (
                        runEnd - runStart >= 4
                    ) {

                        ctx.beginPath();

                        ctx.moveTo(
                            runStart * scaleX,
                            y * scaleY
                        );

                        ctx.lineTo(
                            runEnd * scaleX,
                            y * scaleY
                        );

                        ctx.stroke();
                    }


                    runStart = -1;
                }
            }
        }
    }


    // =========================================================
    // 9. CAMERA SCAN
    // =========================================================

    function startPatternScan() {

        const ctx =
            overlayCanvas.getContext("2d");


        const processingCanvas =
            document.createElement("canvas");


        const processingCtx =
            processingCanvas.getContext("2d", {
                willReadFrequently: true
            });


        function scan(timestamp) {

            if (!cameraStream) {
                return;
            }


            animationFrame =
                requestAnimationFrame(scan);


            if (
                timestamp - lastScanTime <
                SCAN_INTERVAL
            ) {

                return;
            }


            lastScanTime = timestamp;


            if (
                camera.videoWidth === 0 ||
                camera.videoHeight === 0
            ) {

                return;
            }


            // Kurangkan saiz untuk pemprosesan lebih ringan
            const scale = 0.25;


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


            // =================================================
            // Tukar kepada grayscale
            // =================================================

            const gray =
                new Float32Array(
                    width * height
                );


            for (
                let i = 0, p = 0;
                i < gray.length;
                i++, p += 4
            ) {

                gray[i] =
                    (
                        pixels[p] * 0.299 +
                        pixels[p + 1] * 0.587 +
                        pixels[p + 2] * 0.114
                    );
            }


            // =================================================
            // Blur untuk kurangkan noise
            // =================================================

            const blurred =
                blurImage(
                    gray,
                    width,
                    height
                );


            // =================================================
            // Cari edge
            // =================================================

            const edges =
                detectEdges(
                    blurred,
                    width,
                    height
                );


            // =================================================
            // Tapis edge yang isolated
            // =================================================

            const filtered =
                filterNoise(
                    edges,
                    width,
                    height
                );


            // =================================================
            // Cari kawasan pola
            // =================================================

            const region =
                findPatternRegion(
                    filtered,
                    width,
                    height
                );


            ctx.clearRect(
                0,
                0,
                overlayCanvas.width,
                overlayCanvas.height
            );


            // =================================================
            // JIKA POLA DIKESAN
            // =================================================

            if (region) {

                const scaleX =
                    camera.videoWidth / width;

                const scaleY =
                    camera.videoHeight / height;


                // Lukis garisan yang lebih bersih
                drawDetectedLines(
                    ctx,
                    filtered,
                    width,
                    height,
                    scaleX,
                    scaleY,
                    region
                );


                // Kotak kawasan pola
                const boxX =
                    region.minX * scaleX;

                const boxY =
                    region.minY * scaleY;

                const boxWidth =
                    region.width * scaleX;

                const boxHeight =
                    region.height * scaleY;


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
                    7,
                    0,
                    Math.PI * 2
                );


                ctx.fillStyle =
                    "rgba(0,255,0,0.9)";

                ctx.fill();


                // Simpan ukuran pixel
                currentPattern = {

                    pixelWidth: boxWidth,

                    pixelHeight: boxHeight,

                    detectedPixels:
                        region.count
                };


                detectionStatus.textContent =
                    "Pola dikesan — garisan pola dikenal pasti.";


            } else {

                currentPattern = null;


                detectionStatus.textContent =
                    "Halakan kamera pada pola sehingga garisan pola dikesan.";
            }
        }


        animationFrame =
            requestAnimationFrame(scan);
    }


    // =========================================================
    // 10. ANALISIS
    // =========================================================

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


            measuredValue.textContent =
                `${Math.round(widthPx)} px × ${Math.round(heightPx)} px`;


            expectedValue.textContent =
                "Belum ditetapkan";


            differenceValue.textContent =
                "Belum dikira";


            resultTitle.textContent =
                "Pola berjaya diimbas";


            resultMessage.textContent =
                "SMART-POLA telah mengenal pasti kawasan pola dan mendapatkan ukuran awal. Formula berdasarkan ukuran badan akan disambungkan pada langkah seterusnya.";
        }
    );


    // =========================================================
    // 11. STATUS AWAL
    // =========================================================

    patternSelectionStatus.textContent =
        "Sila pilih jenis pakaian dahulu.";

    cameraStatus.textContent =
        "Kamera belum diaktifkan.";

    detectionStatus.textContent =
        "Pengesanan pola tidak aktif.";

    stopCameraBtn.disabled = true;

});
