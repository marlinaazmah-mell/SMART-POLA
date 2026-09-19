function semakUkuran() {

    const pinggang = Number(document.getElementById("pinggang").value);
    const punggung = Number(document.getElementById("punggung").value);
    const panjang = Number(document.getElementById("panjang").value);

    if (!pinggang || !punggung || !panjang) {

        document.getElementById("result").innerHTML =
            "⚠️ Sila lengkapkan semua ukuran.";

        return;
    }

    // FORMULA ASAS POLA
    const sukuPinggang = pinggang / 4;
    const sukuPunggung = punggung / 4;

    document.getElementById("formula").innerHTML =

        "¼ Pinggang = " +
        sukuPinggang.toFixed(1) +
        " cm<br><br>" +

        "¼ Punggung = " +
        sukuPunggung.toFixed(1) +
        " cm<br><br>" +

        "Panjang Pola = " +
        panjang.toFixed(1) +
        " cm";

    document.getElementById("result").innerHTML =

        "🟢 <strong>POLA BERJAYA DIKIRA</strong><br><br>" +

        "Lebar Pinggang: " +
        sukuPinggang.toFixed(1) +
        " cm<br>" +

        "Lebar Punggung: " +
        sukuPunggung.toFixed(1) +
        " cm<br>" +

        "Panjang Pola: " +
        panjang.toFixed(1) +
        " cm";
}
