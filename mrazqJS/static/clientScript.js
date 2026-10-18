const qrCodeImg = Object.assign(document.getElementById("qr-code"), { src: "https://api.qrserver.com/v1/create-qr-code/?&size=200x200&data=".concat(window.location.href)})

const videoGrid = document.getElementById("video-grid")

const remoteVideo = document.createElement("video")
const myVideo = Object.assign(document.createElement("video"), { muted: true });

const ws = new WebSocket(`ws://${window.location.host}/${document.getElementById("uuid-div").dataset.uuid}/ws/signaling/`)
const pc = new RTCPeerConnection({
    "iceServers": [
        {
            urls: "stun:stun.l.google.com:19302"
        }
    ]
})

pc.addTransceiver("video", {
    direction: "sendrecv"
});

pc.addTransceiver("audio", {
    direction: "sendrecv"
});

let iceCandidates = []; 


async function flushIceCandidates() {
    while (iceCandidates.length > 0) {
        const candidate = iceCandidates.shift();
        await pc.addIceCandidate(candidate);
        console.log("Queued ICE candidate added");
    }
}

async function setUpLocalStream() {
    let localStream = await navigator.mediaDevices.getUserMedia({"audio": true, "video": true})
    addVideoStream(myVideo, localStream, "local-stream")

    localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream)
    })
}

function addVideoStream(video, stream, elementId) {
    video.srcObject = stream
    video.id = elementId

    video.addEventListener("loadedmetadata", () => {
        video.play()
    })

    videoGrid.append(video)
}

ws.addEventListener("message", async event => {
    const msg = JSON.parse(event.data)

    switch (msg.title) {
        case "peer-status":
            switch (msg.message) {
                case "peer-joined":
                    console.log("peer-joined")

                    await setUpLocalStream()
        
                    const offer = await pc.createOffer()

                    await pc.setLocalDescription(offer)

                    ws.send(JSON.stringify({"title": "sdp-offer", "message": offer}))
                    console.log("sdp-offer sent")

                    break;
                case "peer-left":
                    console.log("peer-left")
                    break;
            }
            break; 
        case "sdp-offer":
            console.log("remote sdp-offer received")

            await setUpLocalStream()

            remoteSDP = JSON.parse(msg.message).message;

            await pc.setRemoteDescription(new RTCSessionDescription(remoteSDP))
            
            await flushIceCandidates();
            
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            
            ws.send(JSON.stringify({"title": "sdp-answer", "message": answer}))
            console.log("sdp-answer sent")

            break;
        case "sdp-answer":
            console.log("remote sdp-answer received")
            remoteSDP = JSON.parse(msg.message).message;

            await pc.setRemoteDescription(new RTCSessionDescription(remoteSDP))
            
            await flushIceCandidates();
            
            break;
        case "ice-candidate":
            const candidate = msg.candidate
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

pc.addEventListener("icecandidate", (e) => {
    ws.send(JSON.stringify({"title": "ice-candidate", "candidate": e.candidate}))
})

pc.addEventListener("track", (e) => {
    addVideoStream(remoteVideo, e.streams[0], "remote-stream");
})
