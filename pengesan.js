function kesanGarisan() {

    const gambar = document.getElementById("previewPola");
    const canvas = document.getElementById("canvasPola");
    const status = document.getElementById("statusKamera");

    if (!gambar.src) {
        status.innerHTML = "⚠️ Muat naik gambar pola dahulu.";
        return;
    }

    if (typeof cv === "undefined") {
        status.innerHTML = "🔴 OpenCV belum dimuatkan.";
        return;
    }

    status.innerHTML = "🔎 Sedang mengesan garisan...";

    const proses = () => {

        canvas.width = gambar.naturalWidth;
        canvas.height = gambar.naturalHeight;

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(gambar, 0, 0, canvas.width, canvas.height);

        let src = cv.imread(canvas);
        let gray = new cv.Mat();
        let blur = new cv.Mat();
        let edges = new cv.Mat();

        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        cv.GaussianBlur(gray, blur, new cv.Size(5,5), 0);
        cv.Canny(blur, edges, 80, 180);

        cv.imshow(canvas, edges);
        canvas.style.display = "block";

        src.delete();
        gray.delete();
        blur.delete();
        edges.delete();

        status.innerHTML = "🟢 Garisan tepi telah dikesan.";
    };

    if (gambar.complete && gambar.naturalWidth > 0) {
        proses();
    } else {
        gambar.onload = proses;
    }
}
