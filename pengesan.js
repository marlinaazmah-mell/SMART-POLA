ffunction kesanGarisan() {

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

    canvas.width = gambar.naturalWidth;
    canvas.height = gambar.naturalHeight;

    const ctx = canvas.getContext("2d");

    ctx.drawImage(gambar, 0, 0);

    let src = cv.imread(canvas);
    let gray = new cv.Mat();
    let edges = new cv.Mat();

    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    cv.Canny(gray, edges, 50, 150);

    cv.imshow(canvas, edges);

    canvas.style.display = "block";

    src.delete();
    gray.delete();
    edges.delete();

    status.innerHTML = `
        🟢 <strong>GARISAN DIKESAN</strong><br><br>
        Imej telah diproses oleh OpenCV.
    `;
}
