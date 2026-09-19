const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const startButton = document.getElementById("startCamera");
const stopButton = document.getElementById("stopCamera");
const statusText = document.getElementById("status");

let stream = null;
let animationFrame = null;

startButton.addEventListener("click", async () => {
try {
stream = await navigator.mediaDevices.getUserMedia({
video: {
facingMode: "environment",
width: { ideal: 1280 },
height: { ideal: 720 }
},
audio: false
});

    video.srcObject = stream;
    await video.play();

    statusText.textContent =
        "Kamera aktif — Sila letakkan pola dalam paparan kamera.";

    startButton.disabled = true;
    stopButton.disabled = false;

    detectPatternLines();

} catch (error) {
    console.error(error);

    statusText.textContent =
        "Kamera tidak dapat diakses. Sila benarkan akses kamera.";
}



});

stopButton.addEventListener("click", () => {
stopCamera();
});

function stopCamera() {
if (stream) {
stream.getTracks().forEach(track => track.stop());
stream = null;
}

if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
}

video.srcObject = null;

startButton.disabled = false;
stopButton.disabled = true;

statusText.textContent = "Kamera belum diaktifkan.";



}

function detectPatternLines() {
if (!stream || video.readyState < 2) {
animationFrame = requestAnimationFrame(detectPatternLines);
return;
}

const context = canvas.getContext("2d", {
    willReadFrequently: true
});

canvas.width = video.videoWidth;
canvas.height = video.videoHeight;

context.drawImage(
    video,
    0,
    0,
    canvas.width,
    canvas.height
);

const image = context.getImageData(
    0,
    0,
    canvas.width,
    canvas.height
);

const data = image.data;

let edgePixels = 0;

// Basic edge/contrast detection
// This is an initial prototype before advanced computer vision.
for (let y = 1; y < canvas.height - 1; y += 4) {
    for (let x = 1; x < canvas.width - 1; x += 4) {

        const currentIndex =
            (y * canvas.width + x) * 4;

        const rightIndex =
            (y * canvas.width + (x + 1)) * 4;

        const currentBrightness =
            (
                data[currentIndex] +
                data[currentIndex + 1] +
                data[currentIndex + 2]
            ) / 3;

        const rightBrightness =
            (
                data[rightIndex] +
                data[rightIndex + 1] +
                data[rightIndex + 2]
            ) / 3;

        const difference =
            Math.abs(
                currentBrightness -
                rightBrightness
            );

        if (difference > 45) {
            edgePixels++;
        }
    }
}

const detectionLevel =
    edgePixels / ((canvas.width * canvas.height) / 16);

if (detectionLevel > 0.015) {
    statusText.textContent =
        "Garisan pola dikesan.";
} else {
    statusText.textContent =
        "Mengesan garisan pola...";
}

animationFrame =
    requestAnimationFrame(detectPatternLines);



}
