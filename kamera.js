function bukaKamera() {
    document.getElementById("gambarPola").click();
}

function paparGambar(event) {
    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {
        document.getElementById("previewPola").src = e.target.result;
        document.getElementById("previewPola").style.display = "block";
        document.getElementById("statusKamera").innerHTML =
            "🟢 Gambar pola berjaya dimuat naik.";
    };

    reader.readAsDataURL(file);
}
