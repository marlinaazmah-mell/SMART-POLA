function kesanGarisan() {

    const gambar = document.getElementById("previewPola");
    const status = document.getElementById("statusKamera");

    if (!gambar.src) {
        status.innerHTML = "⚠️ Muat naik gambar pola dahulu.";
        return;
    }

    if (typeof cv === "undefined") {
        status.innerHTML = "🔴 OpenCV belum dimuatkan.";
        return;
    }

    status.innerHTML = "🔎 Sedang mengesan garisan pola...";

    gambar.onload = function () {

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = gambar.naturalWidth;
        canvas.height = gambar.naturalHeight;

        ctx.drawImage(gambar, 0, 0);

        let src = cv.imread(canvas);
        let gray = new cv.Mat();
        let edges = new cv.Mat();

        // Tukar gambar kepada grayscale
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

        // Kesan garisan/tepi objek
        cv.Canny(gray, edges, 50, 150);

        // Paparkan hasil
        cv.imshow(canvas, edges);

        gambar.src = canvas.toDataURL();

        src.delete();
        gray.delete();
        edges.delete();

        status.innerHTML = `
            🟢 <strong>GARISAN POLA DIKESAN</strong><br><br>
            Sistem telah memproses imej pola.
        `;
    };

    // Paksa proses semula jika gambar sudah dimuatkan
    if (gambar.complete) {
        gambar.onload();
    }
}
