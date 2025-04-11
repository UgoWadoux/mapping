const socket = new WebSocket("ws://localhost:8080");

// Variables de contrôle
let cameraToggleState = 'off';
let currentZone = null;

// File d'attente OSC
const oscGroupQueue = [];
let isProcessingGroup = false;

// Éléments DOM
const videoElement = document.getElementById('videoElement');
const videoCanvas = document.getElementById('videoCanvas');
const canvasCtx = videoCanvas.getContext('2d');
const leftZone = document.getElementById('left');
const middleZone = document.getElementById('middle');
const rightZone = document.getElementById('right');
const faceSize = 1000;

// Création d'un canvas pour afficher le visage flottant
const faceCanvas = document.createElement('canvas');
faceCanvas.width = faceSize;
faceCanvas.height = faceSize;
faceCanvas.style.position = 'fixed';
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

// Fonction utilitaire pour attendre
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Envoi d'un groupe de messages avec délai entre chaque
function sendOSCGroup(messages) {
    oscGroupQueue.push(messages);
    if (!isProcessingGroup) processOSCGroupQueue();
}

async function processOSCGroupQueue() {
    if (oscGroupQueue.length === 0) {
        isProcessingGroup = false;
        return;
    }
    isProcessingGroup = true;
    const group = oscGroupQueue.shift();
    for (const [zone, action] of group) {
        sendOSC(zone, action);
    }
    await delay(1000); // délai entre les groupes
    processOSCGroupQueue();
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
            const sx = (videoElement.videoWidth / 2) - (faceSize / 2);
            const sy = (videoElement.videoHeight / 2) - (faceSize / 2);

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
            if (newZone === 2 && cameraToggleState === 'off') {
                sendOSCGroup([
                    [2, 'proutCamera'],
                    [1, 'stop'],
                    [2, 'play'],
                    [3, 'stop']
                ]);
                cameraToggleState = 'on';
                console.log("Camera ON");
                middleZone.style.position = "fixed";
                middleZone.style.top = "0";
                middleZone.style.left = "0";
                middleZone.style.width = "100vw";
                middleZone.style.height = "100vh";
                middleZone.style.zIndex = "10";
            } else if (newZone !== 2 && cameraToggleState === 'on') {
                const exitMessages = [
                    [2, 'proutCamera'],
                    [1, 'stop'],
                    [2, 'stop'],
                    [3, 'stop']
                ];
            
                // Activer uniquement la zone dans laquelle on entre après la 2
                exitMessages.push([newZone, 'play']);
            
                sendOSCGroup(exitMessages);
                cameraToggleState = 'off';
                console.log("Camera OFF");
            }

            // Logique d'activation des zones
            if (newZone == 1) {
                rightZone.style.backgroundColor = "blue";
                sendOSC(1, 'play');
                middleZone.removeAttribute("style");
            } else if (newZone == 2) {
                middleZone.style.backgroundColor = "blue";
                faceCanvas.style.display = "block";
            } else if (newZone == 3) {
                leftZone.style.backgroundColor = "blue";
                middleZone.removeAttribute("style");
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
