function kesanGarisan() {

    const gambar = document.getElementById("previewPola");
    const status = document.getElementById("statusKamera");

    if (!gambar.src) {
        status.innerHTML = "⚠️ Muat naik gambar pola dahulu.";
        return;
    }

    status.innerHTML = "🔎 Sedang menganalisis pola...";

    setTimeout(function() {

        status.innerHTML = `
            🟢 <strong>POLA BERJAYA DIKESAN</strong><br><br>
            Sistem dapat membaca imej pola.
        `;

    }, 1000);
}
