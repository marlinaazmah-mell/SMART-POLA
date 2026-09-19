function bukaKamera() {
    document.getElementById("gambarPola").click();
}

function paparGambar(event) {
    const file = event.target.files[0];
    if (!file) return;

    const gambar = document.getElementById("previewPola");
    const canvas = document.getElementById("canvasPola");
    const status = document.getElementById("statusKamera");

    const reader = new FileReader();

    reader.onload = function(e) {
        gambar.src = e.target.result;
        gambar.style.display = "block";

        // Sembunyikan hasil lama
        canvas.style.display = "none";

        status.innerHTML = "🟢 Gambar pola berjaya dimuat naik.";
    };

    reader.readAsDataURL(file);
}
