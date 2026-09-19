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

    status.innerHTML = `
        🟢 <strong>OpenCV BERJAYA DIHUBUNGKAN</strong><br><br>
        Sistem sedia untuk membaca garisan pola.
    `;
}
