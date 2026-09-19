function semakPola() {

    const pinggang = Number(document.getElementById("pinggang").value);
    const punggung = Number(document.getElementById("punggung").value);

    const polaPinggang = Number(document.getElementById("polaPinggang").value);
    const polaPunggung = Number(document.getElementById("polaPunggung").value);

    const sasaranPinggang = pinggang / 4;
    const sasaranPunggung = punggung / 4;

    const toleransi = 0.5;

    const bezaPinggang = polaPinggang - sasaranPinggang;
    const bezaPunggung = polaPunggung - sasaranPunggung;

    const pinggangBetul = Math.abs(bezaPinggang) <= toleransi;
    const punggungBetul = Math.abs(bezaPunggung) <= toleransi;

    let keputusan = "";

    if (pinggangBetul && punggungBetul) {

        keputusan = `
            <div class="lulus">
                🟢 <strong>LULUS</strong><br><br>
                Kedua-dua ukuran pola berada dalam toleransi.
            </div>
        `;

    } else {

        keputusan = `
            <div class="gagal">
                🔴 <strong>PERLU PEMBETULAN</strong><br><br>

                ${pinggangBetul
                    ? "🟢 Pinggang: BETUL"
                    : `🔴 Pinggang: SALAH<br>
                       Sasaran: ${sasaranPinggang.toFixed(1)} cm<br>
                       Ukuran pola: ${polaPinggang.toFixed(1)} cm<br>
                       Beza: ${Math.abs(bezaPinggang).toFixed(1)} cm<br>
                       ${bezaPinggang > 0
                           ? "➡️ Kurangkan ukuran pola."
                           : "➡️ Tambahkan ukuran pola."
                       }`
                }

                <br><br>

                ${punggungBetul
                    ? "🟢 Punggung: BETUL"
                    : `🔴 Punggung: SALAH<br>
                       Sasaran: ${sasaranPunggung.toFixed(1)} cm<br>
                       Ukuran pola: ${polaPunggung.toFixed(1)} cm<br>
                       Beza: ${Math.abs(bezaPunggung).toFixed(1)} cm<br>
                       ${bezaPunggung > 0
                           ? "➡️ Kurangkan ukuran pola."
                           : "➡️ Tambahkan ukuran pola."
                       }`
                }
            </div>
        `;
    }

    document.getElementById("semakan").innerHTML = keputusan;
}
