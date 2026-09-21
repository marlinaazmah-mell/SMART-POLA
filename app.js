document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // SMART-POLA V4
    // Camera + Pattern Line Detection + Measurement + Status
    // Diselaraskan dengan index.html semasa
    // =========================================================


    // =========================================================
    // 1. ELEMENT HTML
    // =========================================================

    const garmentType =
        document.getElementById("garmentType");

    const patternPart =
        document.getElementById("patternPart");

    const patternSelectionStatus =
        document.getElementById("patternSelectionStatus");

    const unitSelect =
        document.getElementById("unit");

    const saveMeasurements =
        document.getElementById("saveMeasurements");

    const measurementStatus =
        document.getElementById("measurementStatus");

    const startCameraBtn =
        document.getElementById("startCamera");

    const stopCameraBtn =
        document.getElementById("stopCamera");

    const camera =
        document.getElementById("camera");

    const overlayCanvas =
        document.getElementById("overlayCanvas");

    const cameraStatus =
        document.getElementById("status");

    const lineStatus =
        document.getElementById("lineStatus");

    const patternMeasurement =
        document.getElementById("patternMeasurement");

    const formulaStatus =
        document.getElementById("formulaStatus");

    const resultTitle =
        document.getElementById("resultTitle");

    const resultMessage =
        document.getElementById("resultMessage");


    // =========================================================
    // 2. PILIHAN BAHAGIAN POLA
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

        const selected =
            garmentType.value;

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


    // =========================================================
    // 3. UNIT UKURAN
    // =========================================================

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


    // =========================================================
    // 4. SIMPAN UKURAN
    // =========================================================

    saveMeasurements.addEventListener(
        "click",
        () => {

            const measurements = {

                shoulder:
                    document.getElementById("shoulder").value,

                chest:
                    document.getElementById("chest").value,

                waist:
                    document.getElementById("waist").value,

                hip:
                    document.getElementById("hip").value,

                neck:
                    document.getElementById("neck").value,

                backLength:
                    document.getElementById("backLength").value,

                unit:
                    unitSelect.value
            };


            const values = [
                measurements.shoulder,
                measurements.chest,
                measurements.waist,
                measurements.hip,
                measurements.neck,
                measurements.backLength
            ];


            const incomplete =
                values.some(
                    value =>
                        value === "" ||
                        Number(value) <= 0
                );


            if (incomplete) {

                measurementStatus.textContent =
                    "Sila lengkapkan semua ukuran badan.";

                return;
            }


            localStorage.setItem(
                "smartPolaMeasurements",
                JSON.stringify(measurements)
            );


            measurementStatus.textContent =
                "✓ Ukuran badan berjaya disimpan.";
        }
    );


    // =========================================================
    // 5. CAMERA
    // =========================================================

    let cameraStream = null;

    let animationFrame = null;

    let currentPattern = null;

    let lastScanTime = 0;

    const SCAN_INTERVAL = 100;


    // Canvas pemprosesan dalaman
    const processingCanvas =
        document.createElement("canvas");

    const processingCtx =
        processingCanvas.getContext(
            "2d",
            {
                willReadFrequently: true
            }
        );


    // =========================================================
    // 6. MULAKAN CAMERA
    // =========================================================

    async function startCamera() {

        try {

            if (
                !navigator.mediaDevices ||
                !navigator.mediaDevices.getUserMedia
            ) {

                cameraStatus.textContent =
                    "Pelayar tidak menyokong akses kamera.";

                return;
            }


            cameraStream =
                await navigator.mediaDevices
                    .getUserMedia({

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


            lineStatus.textContent =
                "Mengesan garisan...";


            resultTitle.textContent =
                "Imbasan sedang dijalankan";


            resultMessage.textContent =
                "Halakan kamera pada pola.";


            startPatternScan();

        } catch (error) {

            console.error(error);

            cameraStatus.textContent =
                "Kamera tidak dapat dibuka. Sila benarkan akses kamera.";
        }
    }


    // =========================================================
    // 7. HENTIKAN CAMERA
    // =========================================================

    function stopCamera() {

        if (cameraStream) {

            cameraStream
                .getTracks()
                .forEach((track) => {

                    track.stop();

                });

            cameraStream = null;
        }


        if (animationFrame) {

            cancelAnimationFrame(
                animationFrame
            );

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

        lineStatus.textContent =
            "Belum dianalisis";

        patternMeasurement.textContent =
            "Menunggu imbasan";

        formulaStatus.textContent =
            "Belum tersedia";


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
    // 8. BLUR
    // =========================================================

    function blurImage(
        gray,
        width,
        height
    ) {

        const blurred =
            new Float32Array(
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

                let total = 0;


                for (
                    let dy = -1;
                    dy <= 1;
                    dy++
                ) {

                    for (
                        let dx = -1;
                        dx <= 1;
                        dx++
                    ) {

                        total +=
                            gray[
                                (y + dy) *
                                width +
                                (x + dx)
                            ];
                    }
                }


                blurred[
                    y * width + x
                ] =
                    total / 9;
            }
        }


        return blurred;
    }


    // =========================================================
    // 9. EDGE DETECTION
    // =========================================================

    function detectEdges(
        gray,
        width,
        height
    ) {

        const edges =
            new Uint8Array(
                width * height
            );


        for (
            let y = 2;
            y < height - 2;
            y++
        ) {

            for (
                let x = 2;
                x < width - 2;
                x++
            ) {

                const left =
                    gray[
                        y * width +
                        (x - 1)
                    ];

                const right =
                    gray[
                        y * width +
                        (x + 1)
                    ];

                const top =
                    gray[
                        (y - 1) * width +
                        x
                    ];

                const bottom =
                    gray[
                        (y + 1) * width +
                        x
                    ];


                const gx =
                    right - left;

                const gy =
                    bottom - top;


                const magnitude =
                    Math.sqrt(
                        gx * gx +
                        gy * gy
                    );


                if (magnitude > 65) {

                    edges[
                        y * width + x
                    ] = 1;
                }
            }
        }


        return edges;
    }


    // =========================================================
    // 10. FILTER NOISE
    // =========================================================

    function filterNoise(
        edges,
        width,
        height
    ) {

        const filtered =
            new Uint8Array(
                width * height
            );


        for (
            let y = 3;
            y < height - 3;
            y++
        ) {

            for (
                let x = 3;
                x < width - 3;
                x++
            ) {

                const index =
                    y * width + x;


                if (!edges[index]) {

                    continue;
                }


                let horizontal = 0;

                let vertical = 0;

                let diagonal1 = 0;

                let diagonal2 = 0;


                for (
                    let d = 1;
                    d <= 3;
                    d++
                ) {

                    if (
                        edges[
                            y * width +
                            (x - d)
                        ]
                    ) {
                        horizontal++;
                    }

                    if (
                        edges[
                            y * width +
                            (x + d)
                        ]
                    ) {
                        horizontal++;
                    }


                    if (
                        edges[
                            (y - d) *
                            width +
                            x
                        ]
                    ) {
                        vertical++;
                    }

                    if (
                        edges[
                            (y + d) *
                            width +
                            x
                        ]
                    ) {
                        vertical++;
                    }


                    if (
                        edges[
                            (y - d) *
                            width +
                            (x + d)
                        ]
                    ) {
                        diagonal1++;
                    }

                    if (
                        edges[
                            (y + d) *
                            width +
                            (x - d)
                        ]
                    ) {
                        diagonal1++;
                    }


                    if (
                        edges[
                            (y - d) *
                            width +
                            (x - d)
                        ]
                    ) {
                        diagonal2++;
                    }

                    if (
                        edges[
                            (y + d) *
                            width +
                            (x + d)
                        ]
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


                if (strongest >= 3) {

                    filtered[index] = 1;
                }
            }
        }


        return filtered;
    }


    // =========================================================
    // 11. CARI KAWASAN POLA
    // =========================================================

    function findPatternRegion(
        edges,
        width,
        height
    ) {

        let minX = width;

        let minY = height;

        let maxX = 0;

        let maxY = 0;

        let count = 0;


        const marginX =
            Math.floor(
                width * 0.05
            );

        const marginY =
            Math.floor(
                height * 0.05
            );


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
                    edges[
                        y * width + x
                    ] === 1
                ) {

                    count++;


                    if (x < minX)
                        minX = x;

                    if (x > maxX)
                        maxX = x;

                    if (y < minY)
                        minY = y;

                    if (y > maxY)
                        maxY = y;
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
    // 12. LUKIS GARIS POLA
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


        ctx.strokeStyle =
            "rgba(0,255,120,0.85)";

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
                    edges[
                        y * width + x
                    ] === 1;


                if (
                    detected &&
                    runStart === -1
                ) {

                    runStart = x;
                }


                const endOfRun =
                    !detected ||
                    x === region.maxX;


                if (
                    endOfRun &&
                    runStart !== -1
                ) {

                    const runEnd =
                        detected &&
                        x === region.maxX
                            ? x
                            : x - 1;


                    if (
                        runEnd -
                        runStart >= 4
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
    // 13. ANALISIS AUTOMATIK
    // =========================================================

    function updateAnalysis(
        region,
        scaleX,
        scaleY
    ) {

        if (!region) {

            lineStatus.textContent =
                "Garisan belum dikesan";

            patternMeasurement.textContent =
                "Menunggu imbasan";

            formulaStatus.textContent =
                "Belum tersedia";

            return;
        }


        const widthPx =
            region.width * scaleX;

        const heightPx =
            region.height * scaleY;


        currentPattern = {

            pixelWidth: widthPx,

            pixelHeight: heightPx,

            detectedPixels:
                region.count
        };


        lineStatus.textContent =
            "✓ Garisan pola dikesan";


        patternMeasurement.textContent =
            Math.round(widthPx) +
            " px × " +
            Math.round(heightPx) +
            " px";


        formulaStatus.textContent =
            "Menunggu formula pola";


        resultTitle.textContent =
            "Pola berjaya diimbas";


        resultMessage.textContent =
            "Kawasan pola telah dikenal pasti. Semakan formula ukuran akan disambungkan ke modul seterusnya.";
    }


    // =========================================================
    // 14. CAMERA SCAN
    // =========================================================

    function startPatternScan() {

        const ctx =
            overlayCanvas.getContext("2d");


        function scan(timestamp) {

            if (!cameraStream) {

                return;
            }


            animationFrame =
                requestAnimationFrame(
                    scan
                );


            if (
                timestamp -
                lastScanTime <
                SCAN_INTERVAL
            ) {

                return;
            }


            lastScanTime =
                timestamp;


            if (
                camera.videoWidth === 0 ||
                camera.videoHeight === 0
            ) {

                return;
            }


            // Resolusi pemprosesan rendah
            const scale = 0.25;


            const width =
                Math.floor(
                    camera.videoWidth *
                    scale
                );


            const height =
                Math.floor(
                    camera.videoHeight *
                    scale
                );


            processingCanvas.width =
                width;

            processingCanvas.height =
                height;


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


            // Grayscale
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
                    pixels[p] * 0.299 +
                    pixels[p + 1] * 0.587 +
                    pixels[p + 2] * 0.114;
            }


            // Blur
            const blurred =
                blurImage(
                    gray,
                    width,
                    height
                );


            // Edge
            const edges =
                detectEdges(
                    blurred,
                    width,
                    height
                );


            // Noise filter
            const filtered =
                filterNoise(
                    edges,
                    width,
                    height
                );


            // Cari pola
            const region =
                findPatternRegion(
                    filtered,
                    width,
                    height
                );


            if (region) {

                const scaleX =
                    camera.videoWidth /
                    width;

                const scaleY =
                    camera.videoHeight /
                    height;


                drawDetectedLines(
                    ctx,
                    filtered,
                    width,
                    height,
                    scaleX,
                    scaleY,
                    region
                );


                // Kotak pola
                const boxX =
                    region.minX *
                    scaleX;

                const boxY =
                    region.minY *
                    scaleY;

                const boxWidth =
                    region.width *
                    scaleX;

                const boxHeight =
                    region.height *
                    scaleY;


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
                    boxX +
                    boxWidth / 2;

                const centerY =
                    boxY +
                    boxHeight / 2;


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


                updateAnalysis(
                    region,
                    scaleX,
                    scaleY
                );


                cameraStatus.textContent =
                    "Kamera sedang aktif — pola dikesan.";


            } else {

                ctx.clearRect(
                    0,
                    0,
                    overlayCanvas.width,
                    overlayCanvas.height
                );


                currentPattern = null;


                lineStatus.textContent =
                    "Mengesan garisan...";


                patternMeasurement.textContent =
                    "Menunggu imbasan";


                cameraStatus.textContent =
                    "Kamera aktif — halakan pada pola.";
            }
        }


        animationFrame =
            requestAnimationFrame(
                scan
            );
    }


    // =========================================================
    // 15. STATUS AWAL
    // =========================================================

    patternSelectionStatus.textContent =
        "Sila pilih jenis pakaian dahulu.";

    cameraStatus.textContent =
        "Kamera belum diaktifkan.";

    lineStatus.textContent =
        "Belum dianalisis";

    patternMeasurement.textContent =
        "Menunggu imbasan";

    formulaStatus.textContent =
        "Belum tersedia";

    stopCameraBtn.disabled = true;


    // =========================================================
    // 16. LOAD UKURAN YANG PERNAH DISIMPAN
    // =========================================================

    const saved =
        localStorage.getItem(
            "smartPolaMeasurements"
        );


    if (saved) {

        try {

            const measurements =
                JSON.parse(saved);


            const fields = [
                "shoulder",
                "chest",
                "waist",
                "hip",
                "neck",
                "backLength"
            ];


            fields.forEach((field) => {

                const element =
                    document.getElementById(
                        field
                    );


                if (
                    element &&
                    measurements[field]
                ) {

                    element.value =
                        measurements[field];
                }
            });


            if (measurements.unit) {

                unitSelect.value =
                    measurements.unit;


                document
                    .querySelectorAll(
                        ".unit-label"
                    )
                    .forEach((label) => {

                        label.textContent =
                            measurements.unit;
                    });
            }


            measurementStatus.textContent =
                "Ukuran terdahulu dimuatkan.";

        } catch (error) {

            console.log(
                "Tiada data ukuran terdahulu."
            );
        }
    }

});
