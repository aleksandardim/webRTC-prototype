// създаваме qr код с линк към стаята
const qrCodeImg = document.getElementById("qr-code")

qrCodeImg.setAttribute("src", "https://api.qrserver.com/v1/create-qr-code/?&size=200x200&data=".concat(window.location.href))

// signaling websocket с неговите събития
const signalingWebSocket = new WebSocket(`ws://${window.location.host}/${document.getElementById("uuid-div").dataset.uuid}/ws/signaling/`)

signalingWebSocket.addEventListener("message", event => { // при получаване
    const msg = JSON.parse(event.data)

    switch (msg.message) {
        case "peer-joined":
            console.log("peer-joined")
        
            videoConnection.createOffer()
            .then((offer) => {
                // задава описанието от офертата ни, с която почваме да търсим ice кандидати
                videoConnection.setLocalDescription(offer)

                signalingWebSocket.send(JSON.stringify(offer))
            })

            break;
        case "peer-left":
            console.log("peer-left")
            break;
        default: // SDP offers
            // разфасоваме sdp офертата
            remoteSDP = JSON.parse(msg.message);

            // ако е отговор?:
            if (remoteSDP.type === "answer") {
                videoConnection.setRemoteDescription(remoteSDP)
                
                break;
            }

            videoConnection.setRemoteDescription(msg);
            
            videoConnection.createAnswer()
            .then(answer => {
                videoConnection.setLocalDescription(answer)
                
                signalingWebSocket.send(JSON.stringify(answer))
            })

            break;
    }
});

signalingWebSocket.addEventListener("open", () => {
    console.log("Осъществена е WebSocket връзка.");
});

signalingWebSocket.addEventListener("error", event => {
    console.error("WebSocket грешка:", event);
});

// оправяме локалното видео
const videoGrid = document.getElementById("video-grid")
const myVideo = document.createElement("video")
myVideo.muted = true

const videoConnection = new RTCPeerConnection({
    "iceServers": [
        {
            urls: "stun:stun.l.google.com:19302"
        }
    ]
})

navigator.mediaDevices.getUserMedia({
    "audio": true,
    "video": true
}).then(stream => {
    addVideoStream(myVideo, stream) // нашия видим видео поток

    stream.getTracks().forEach((track) => {
        videoConnection.addTrack(track, stream)
    })
})

// дефинираме RTP transeivers за видео и за аудио
videoConnection.addTransceiver("video", {
    direction: "sendrecv"
});

videoConnection.addTransceiver("audio", {
    direction: "sendrecv"
});

videoConnection.addEventListener("icecandidate", (e) => { // когато намери ice кандидат
    signalingWebSocket.send(JSON.stringify({"type": "ice-candidate", "candidate": e.candidate}))
})

function addVideoStream(video, stream) {
    video.srcObject = stream
    video.addEventListener("loadedmetadata", () => {
        video.play()
    })
    videoGrid.append(video)
}