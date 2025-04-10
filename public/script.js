
const socket = new WebSocket("ws://localhost:8080");

function sendOSC(zone, action = null) {
    const address = action ? `/zone${zone}/${action}` : `/zone/${zone}`;
    const message = { address };
    socket.send(JSON.stringify(message));
    console.log("Message envoyé:", message);
  }


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

function clearZones() {
    leftZone.style.backgroundColor = "white";
    middleZone.style.backgroundColor = "white";
    rightZone.style.backgroundColor = "white";
    faceCanvas.style.display = "none";
}

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

pose.onResults((results) => {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, videoCanvas.width, videoCanvas.height);
    canvasCtx.drawImage(results.image, 0, 0, videoCanvas.width, videoCanvas.height);

    if (results.poseLandmarks) {
        const nose = results.poseLandmarks[0];
        const x = nose.x;

        clearZones();

        if (x < 0.33) {
            rightZone.style.backgroundColor = "blue";
            sendOSC(1, 'play');
            sendOSC(2, 'stop');
            sendOSC(3, 'stop');
            
        } else if (x < 0.66) {
            middleZone.style.backgroundColor = "blue";
            faceCanvas.style.display = "block";

            const sx = nose.x * videoElement.videoWidth - faceSize/2;
            const sy = nose.y * videoElement.videoHeight -  faceSize/2;

            faceCtx.clearRect(0, 0, faceSize, faceSize);
            faceCtx.save();
            faceCtx.translate(faceSize, 0);              // on déplace le point (0, 0) à droite du canvas
            faceCtx.scale(-1, 1);                   // puis on inverse l’axe X
            faceCtx.drawImage(videoElement, sx, sy, faceSize, faceSize, 0, 0, faceSize, faceSize);
            faceCtx.restore();
            sendOSC(1, 'stop');
            sendOSC(2, 'play');
            sendOSC(3, 'stop');       
         } else {
            leftZone.style.backgroundColor = "blue";
            sendOSC(1, 'stop');
            sendOSC(2, 'stop');
            sendOSC(3, 'play');        
         }
    }

    canvasCtx.restore();
});

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await pose.send({ image: videoElement });
    },
    width: 640,
    height: 480,
});

camera.start();
