class ChatMessage {
    constructor(message, isIncoming) {
        this.message = message;
        this.isIncoming = isIncoming;
    }

    prepareForSending() {
        this.isIncoming = !this.isIncoming;
    }
}

const localVideo = document.getElementById("local-stream")
const remoteVideo = document.getElementById("remote-stream")

const chatButton = document.getElementById("chat-button")

const main = document.querySelector("main")

const ws = new WebSocket(`wss://${window.location.host}/${document.getElementById("uuid-div").dataset.uuid}/ws/signaling/`)

const chatHTML = String.raw`
<div id="chat">
    <h2 style="text-align: center;">Чат</h2>

    <div id="chat-textspace" readonly></div>

    <form id="chat-form">
        <input type="text" name="message" id="message-field" placeholder="Съобщение" pattern=".*\S.*" required autocomplete="off" maxlength="500">
        <input type="submit">
    </form>
</div>
`

let iceCandidates = [];
let pc;
let localStream;

let chatMessages = [];

chatButton.hidden = false
chatButton.disabled = false

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

    return localStream;
})

function initializePeerConnection(webSocket, localStream) {
    const peerConnection = new RTCPeerConnection({
        "iceServers": [
            {
                urls: "stun:stun.l.google.com:19302"
            }
        ]
    })

    peerConnection.addEventListener("icecandidate", (e) => {
        if (!e.candidate) {
            return
        }

        webSocket.send(JSON.stringify({"title": "ice-candidate", "candidate": e.candidate}))
    })

    peerConnection.addEventListener("track", e => {
        remoteVideo.srcObject = e.streams[0]
    });

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream)
    })

    return peerConnection;
}

localVideo.addEventListener("loadedmetadata", () => {
    localVideo.play()
})

remoteVideo.addEventListener("loadedmetadata", () => {
    remoteVideo.play()
})

ws.addEventListener("message", async event => {
    const webSocketMessage = JSON.parse(event.data)

    switch (webSocketMessage.title) {
        case "peer-joined":
            console.log("peer-joined")

            localStream = await isLocalStreamReady
            
            pc = initializePeerConnection(ws, localStream)

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
        case "sdp-offer":
            console.log("remote sdp-offer received")

            localStream = await isLocalStreamReady
            
            pc = initializePeerConnection(ws, localStream)

            RemoteSdpOffer = JSON.parse(webSocketMessage.message).message;
            await pc.setRemoteDescription(new RTCSessionDescription(RemoteSdpOffer))
            
            await flushIceCandidates(pc, iceCandidates);
            
            const localSdpAnswer = await pc.createAnswer()
            await pc.setLocalDescription(localSdpAnswer)
            
            ws.send(JSON.stringify({"title": "sdp-answer", "message": localSdpAnswer}))
            console.log("sdp-answer sent")

            break;
        case "sdp-answer":
            console.log("remote sdp-answer received")
            remoteSdpAnswer = JSON.parse(webSocketMessage.message).message;

            await pc.setRemoteDescription(new RTCSessionDescription(remoteSdpAnswer))
            
            await flushIceCandidates(pc, iceCandidates);
            
            break;
        case "ice-candidate":
            let candidate = JSON.parse(webSocketMessage.message).candidate

            if (pc.remoteDescription) {
                await pc.addIceCandidate(candidate)
            } else {
                iceCandidates.push(candidate)
            }

            break;
        case "chat":
            const chatMessageInbound = JSON.parse(JSON.parse(event.data).message).message

            chatMessages.push(new ChatMessage(chatMessageInbound, true))

            if (main.id === "main") {
                document.getElementById("chat-textspace").innerHTML += '<i style="font-weight: bold">'.concat(chatMessageInbound, "</i>", "<br>")
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

chatButton.addEventListener("click", () => {
    // със променянето на id-то към "main" се обвързва тага с css дефинциите в style.css
    if (main.id === "main") {
        main.id = null
        document.getElementById("chat").remove()
    } else {
        main.id = "main"
        main.insertAdjacentHTML("beforeend", chatHTML)

        const chatTextSpace = document.getElementById("chat-textspace")

        chatMessages.forEach((chMsg) => {
            if (chMsg.isIncoming) {
                chatTextSpace.innerHTML += '<i style="font-weight: bold">'.concat(chMsg.message, "</i>", "<br>")
            } else {
                chatTextSpace.innerHTML += chMsg.message.concat("<br>")
            }
            
        })

        const chatForm = document.getElementById("chat-form")

        chatForm.addEventListener("submit", (e) => {
            e.preventDefault()

            const messageField = document.getElementById("message-field")

            const chatFormData = new FormData(chatForm);
            const chatMessageOutbound = Object.fromEntries(chatFormData.entries()).message.trim()

            // изпращаме го на другия човек, не на себе си
            ws.send(JSON.stringify({"title": "chat", "message": chatMessageOutbound}))

            chatMessages.push(new ChatMessage(chatMessageOutbound, false))

            chatTextSpace.innerHTML += chatMessageOutbound.concat("<br>")

            messageField.value = ""
            messageField.focus()
        })
    }
})



// редове, с които whitenoise да се храни
// редове, с които whitenoise да се храни
// редове, с които whitenoise да се храни
// редове, с които whitenoise да се храни
// редове, с които whitenoise да се храни
