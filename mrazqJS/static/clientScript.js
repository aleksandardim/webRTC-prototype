const localVideo = document.getElementById("local-stream")
const remoteVideo = document.getElementById("remote-stream")

const ws = new WebSocket(`wss://${window.location.host}/${document.getElementById("uuid-div").dataset.uuid}/ws/signaling/`)
const pc = new RTCPeerConnection({
    "iceServers": [
        {
            urls: "stun:stun.l.google.com:19302"
        }
    ]
})

let iceCandidates = [];

async function flushIceCandidates(peerConnection, candidates) {
    while (candidates.length > 0) {
        const candidate = candidates.shift();
        await peerConnection.addIceCandidate(candidate);
        console.log("Queued ICE candidate added");
    }
}

const isLocalStreamReady = navigator.mediaDevices.getUserMedia({"audio": true, "video": true})
.then((localStream) => {
    localVideo.srcObject = localStream;

    localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream)
    })
})

localVideo.addEventListener("loadedmetadata", () => {
    localVideo.play()
})

remoteVideo.addEventListener("loadedmetadata", () => {
    remoteVideo.play()
})

ws.addEventListener("message", async event => {
    const msg = JSON.parse(event.data)

    switch (msg.title) {
        case "peer-status":
            switch (msg.message) {
                case "peer-joined":
                    console.log("peer-joined")

                    await isLocalStreamReady
        
                    const localSdpOffer = await pc.createOffer()

                    await pc.setLocalDescription(localSdpOffer)

                    ws.send(JSON.stringify({"title": "sdp-offer", "message": localSdpOffer}))
                    console.log("sdp-offer sent")

                    break;
                case "peer-left":
                    console.log("peer-left")

                    pc.close()
                    remoteVideo.srcObject = null

                    break;
            }
            break; 
        case "sdp-offer":
            console.log("remote sdp-offer received")

            await isLocalStreamReady

            RemoteSdpOffer = JSON.parse(msg.message).message;

            await pc.setRemoteDescription(new RTCSessionDescription(RemoteSdpOffer))
            
            await flushIceCandidates(pc, iceCandidates);
            
            const sdpAnswer = await pc.createAnswer()
            await pc.setLocalDescription(localSdpAnswer)
            
            ws.send(JSON.stringify({"title": "sdp-answer", "message": localSdpAnswer}))
            console.log("sdp-answer sent")

            break;
        case "sdp-answer":
            console.log("remote sdp-answer received")
            remoteSdpAnswer = JSON.parse(msg.message).message;

            await pc.setRemoteDescription(new RTCSessionDescription(remoteSdpAnswer))
            
            await flushIceCandidates(pc, iceCandidates);
            
            break;
        case "ice-candidate":
            let candidate = JSON.parse(msg.message).candidate

            if (pc.remoteDescription) {
                await pc.addIceCandidate(candidate)
            } else {
                iceCandidates.push(candidate)
            }

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
    if (!e.candidate) {
        return
    }

    ws.send(JSON.stringify({"title": "ice-candidate", "candidate": e.candidate}))
})

pc.addEventListener("track", e => {
    remoteVideo.srcObject = e.streams[0]
});
