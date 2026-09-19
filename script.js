function semakUkuran() {

    const pinggang = parseFloat(document.getElementById("pinggang").value);
    const punggung = parseFloat(document.getElementById("punggung").value);
    const panjang = parseFloat(document.getElementById("panjang").value);

    const formula = document.getElementById("formula");
    const result = document.getElementById("result");

    if (isNaN(pinggang) || isNaN(punggung) || isNaN(panjang)) {
        formula.innerHTML = "⚠️ Lengkapkan semua ukuran dahulu.";
        result.innerHTML = "";
        return;
    }

    const sukuPinggang = pinggang / 4;
    const sukuPunggung = punggung / 4;

    formula.innerHTML = `
        <strong>Formula yang digunakan:</strong><br><br>
        ¼ Pinggang = ${pinggang} ÷ 4 = 
        <strong>${sukuPinggang.toFixed(1)} cm</strong><br><br>

        ¼ Punggung = ${punggung} ÷ 4 = 
        <strong>${sukuPunggung.toFixed(1)} cm</strong><br><br>

        Panjang Pola = 
        <strong>${panjang.toFixed(1)} cm</strong>
    `;

    result.innerHTML = `
        🟢 <strong>POLA BERJAYA DIKIRA</strong><br><br>
        Lebar Pinggang: ${sukuPinggang.toFixed(1)} cm<br>
        Lebar Punggung: ${sukuPunggung.toFixed(1)} cm<br>
        Panjang Pola: ${panjang.toFixed(1)} cm
    `;
}
