function semakUkuran() {
    const pinggang = Number(document.getElementById("pinggang").value);
    const punggung = Number(document.getElementById("punggung").value);

    if (!pinggang || !punggung) {
        document.getElementById("result").innerHTML =
            "⚠️ Sila masukkan semua ukuran.";
        return;
    }

    const sukuPinggang = pinggang / 4;
    const sukuPunggung = punggung / 4;

    document.getElementById("formula").innerHTML =
        "¼ Pinggang = " + sukuPinggang.toFixed(1) +
        " cm<br>¼ Punggung = " + sukuPunggung.toFixed(1) + " cm";

    document.getElementById("result").innerHTML =
        "🟢 UKURAN BERJAYA DIKIRA<br><br>" +
        "¼ Pinggang: " + sukuPinggang.toFixed(1) + " cm<br>" +
        "¼ Punggung: " + sukuPunggung.toFixed(1) + " cm";
}
