// създаваме qr код с линк към стаята
const qrCodeImg = document.getElementById("qr-code")

qrCodeImg.setAttribute("src", "https://api.qrserver.com/v1/create-qr-code/?&size=200x200&data=".concat(window.location.href))

// signaling websocket с неговите събития
const ws = new WebSocket(`ws://${window.location.host}/${document.getElementById("uuid-div").dataset.uuid}/ws/signaling/`)

let isRemoteDescInit = false;
let iceCandidates = []; 

ws.addEventListener("message", async event => { // при получаване
    const msg = JSON.parse(event.data)

    switch (msg.title) {
        case "peer-status":
            switch (msg.message) {
                case "peer-joined":
                    console.log("peer-joined")
        
                    const offer = await pc.createOffer()
                    // задава описанието от офертата ни, с която почваме да търсим ice кандидати
                    await pc.setLocalDescription(offer)

                    ws.send(JSON.stringify({"title": "sdp-offer", "message": offer}))
                    console.log("sdp-offer sent")

                    break;
                case "peer-left":
                    console.log("peer-left")
                    break;
            }
            break; 
        case "sdp-offer": // SDP offers
            console.log("remote sdp-offer received")
            // разфасоваме sdp офертата
            remoteSDP = JSON.parse(msg.message).message;

            await pc.setRemoteDescription(new RTCSessionDescription(remoteSDP))
            isRemoteDescInit = true
            
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            
            ws.send(JSON.stringify({"title": "sdp-answer", "message": answer}))
            console.log("sdp-answer sent")

            break;
        case "sdp-answer":
            console.log("remote sdp-answer received")
            remoteSDP = JSON.parse(msg.message).message;

            await pc.setRemoteDescription(new RTCSessionDescription(remoteSDP))
            isRemoteDescInit = true
            
            break;
        case "ice-candidate":
            const candidate = msg.candidate
            
            if (isRemoteDescInit) {
                await pc.addIceCandidate(candidate)
                console.log("Ice candidate added")
                
                while (iceCandidates.length > 0) {
                    await pc.addIceCandidate(iceCandidates.shift())
                }

                break;
            }

            iceCandidates.push(candidate)

            break;
    }
});

ws.addEventListener("open", () => {
    console.log("WebSocket connection initialized.");
});

ws.addEventListener("error", event => {
    console.error("WebSocket error:", event);
});

// оправяме локалното видео
const videoGrid = document.getElementById("video-grid")
const myVideo = document.createElement("video")
myVideo.muted = true

const pc = new RTCPeerConnection({
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
        pc.addTrack(track, stream)
    })
})

// дефинираме RTP transeivers за видео и за аудио
pc.addTransceiver("video", {
    direction: "sendrecv"
});

pc.addTransceiver("audio", {
    direction: "sendrecv"
});

pc.addEventListener("icecandidate", (e) => { // когато намери ice кандидат
    ws.send(JSON.stringify({"title": "ice-candidate", "candidate": e.candidate}))
})

// чуждото аудио-видео
const remoteVideo = document.createElement("video")

pc.addEventListener("track", (e) => {
    addVideoStream(remoteVideo, e.streams[0]);
})

function addVideoStream(video, stream) {
    video.srcObject = stream
    video.addEventListener("loadedmetadata", () => {
        video.play()
    })
    videoGrid.append(video)
}