function semakPola() {

    const pinggang = Number(document.getElementById("pinggang").value);
    const punggung = Number(document.getElementById("punggung").value);

    const polaPinggang = Number(document.getElementById("polaPinggang").value);
    const polaPunggung = Number(document.getElementById("polaPunggung").value);

    const sasaranPinggang = pinggang / 4;
    const sasaranPunggung = punggung / 4;

    const toleransi = 0.5;

    const pinggangBetul =
        Math.abs(polaPinggang - sasaranPinggang) <= toleransi;

    const punggungBetul =
        Math.abs(polaPunggung - sasaranPunggung) <= toleransi;

    document.getElementById("semakan").innerHTML = `

        <h3>${pinggangBetul ? "🟢 PINGGANG BETUL" : "🔴 PINGGANG SALAH"}</h3>

        Sasaran: ${sasaranPinggang.toFixed(1)} cm<br>
        Ukuran pola: ${polaPinggang.toFixed(1)} cm<br><br>

        <h3>${punggungBetul ? "🟢 PUNGGUNG BETUL" : "🔴 PUNGGUNG SALAH"}</h3>

        Sasaran: ${sasaranPunggung.toFixed(1)} cm<br>
        Ukuran pola: ${polaPunggung.toFixed(1)} cm
    `;
}
