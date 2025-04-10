const socket = new WebSocket("ws://localhost:8080");

// Variables de contrôle
let isCameraOn = null;
let currentZone = null;

// Éléments DOM
const videoElement = document.getElementById('videoElement');
const videoCanvas = document.getElementById('videoCanvas');
const canvasCtx = videoCanvas.getContext('2d');
const leftZone = document.getElementById('left');
const middleZone = document.getElementById('middle');
const rightZone = document.getElementById('right');
const faceSize = 500;

// Création d'un canvas pour afficher le visage flottant
const faceCanvas = document.createElement('canvas');
faceCanvas.width = faceSize;
faceCanvas.height = faceSize;
faceCanvas.style.position = 'absolute';
faceCanvas.style.top = '50%';
faceCanvas.style.left = '50%';
faceCanvas.style.transform = 'translate(-50%, -50%)';
faceCanvas.style.display = 'none'; // masqué par défaut
middleZone.appendChild(faceCanvas);
const faceCtx = faceCanvas.getContext('2d');

// Fonction utilitaire pour envoyer des messages OSC
function sendOSC(zone, action = null) {
    const address = action ? `/zone${zone}/${action}` : `/zone/${zone}`;
    const message = { address };
    socket.send(JSON.stringify(message));
    console.log("Message envoyé:", message);
}

// Fonction pour effacer les zones
function clearZones() {
    leftZone.style.backgroundColor = "white";
    middleZone.style.backgroundColor = "white";
    rightZone.style.backgroundColor = "white";
    faceCanvas.style.display = "none";
}

// Initialisation de Pose
const pose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`,
});

pose.setOptions({
    modelComplexity: 0,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
});

// Gestion des résultats de détection
pose.onResults((results) => {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, videoCanvas.width, videoCanvas.height);
    canvasCtx.drawImage(results.image, 0, 0, videoCanvas.width, videoCanvas.height);

    if (results.poseLandmarks) {
        const nose = results.poseLandmarks[0];
        const x = nose.x;
        let newZone = null;

        // Logique de détection de zone
        if (x < 0.33) {
            newZone = 1;
        } else if (x < 0.66) {
            newZone = 2;
            const sx = nose.x * videoElement.videoWidth - faceSize / 2;
            const sy = nose.y * videoElement.videoHeight - faceSize / 2;

            faceCtx.clearRect(0, 0, faceSize, faceSize);
            faceCtx.save();
            faceCtx.translate(faceSize, 0); // Déplacement du point (0, 0) à droite du canvas
            faceCtx.scale(-1, 1); // Inversion de l’axe X
            faceCtx.drawImage(videoElement, sx, sy, faceSize, faceSize, 0, 0, faceSize, faceSize);
            faceCtx.restore();
        } else {
            newZone = 3;
        }

        // Gestion des transitions de zone
        if (newZone !== currentZone) {
            currentZone = newZone;
            clearZones();

    // Gestion explicite de la visibilité caméra hors bloc de transition de zone
        if (newZone === 2 && !isCameraOn) {
            sendOSC(2, 'toggleCamera');
            isCameraOn = true;
            console.log("Camera ON");
        } else if (newZone !== 2 && isCameraOn) {
            sendOSC(2, 'toggleCamera');
            isCameraOn = false;
            console.log("Camera OFF");
        }


            // Logique d'activation des zones
            if (newZone == 1) {
                rightZone.style.backgroundColor = "blue";
                sendOSC(1, 'play');
                sendOSC(2, 'stop');
                sendOSC(3, 'stop');
            } else if (newZone == 2) {
                middleZone.style.backgroundColor = "blue";
                faceCanvas.style.display = "block";
                sendOSC(1, 'stop');
                sendOSC(2, 'play');
                sendOSC(3, 'stop');
            } else if (newZone == 3) {
                leftZone.style.backgroundColor = "blue";
                sendOSC(1, 'stop');
                sendOSC(2, 'play');
                sendOSC(3, 'play');
            }
        }
    }

    canvasCtx.restore();
});

// Initialisation de la caméra
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await pose.send({ image: videoElement });
    },
    width: 640,
    height: 480,
});

camera.start();
