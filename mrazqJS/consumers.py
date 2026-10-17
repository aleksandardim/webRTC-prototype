import json
from channels.generic.websocket import WebsocketConsumer
from asgiref.sync import async_to_sync

class SignalingConsumer(WebsocketConsumer):
    def chat_message(self, event):
        if event.get("sender_id") == self.channel_name:
            return

        self.send(text_data=json.dumps({
            "message": event["message"]
        }))

    def connect(self):
        self.room_id = str(self.scope["url_route"]["kwargs"]["endpoint_id"])

        async_to_sync(self.channel_layer.group_add)(
            self.room_id,
            self.channel_name,
        )

        async_to_sync(self.channel_layer.group_send)(
            self.room_id,
            {
                "type": "chat.message",
                "sender_id": self.channel_name,
                "message": "peer-joined",
            }
        )

        self.accept()


    def send(self, text_data = None, bytes_data = None, close = False):
        return super().send(text_data, bytes_data, close)

    def receive(self, text_data = None, bytes_data = None):
        async_to_sync(self.channel_layer.group_send)(
            self.room_id,
            {
                "type": "chat.message",
                "sender_id": self.channel_name,
                "message": text_data,
            }
        )

    def disconnect(self, code):
        async_to_sync(self.channel_layer.group_send)(
            self.room_id,
            {
                "type": "chat.message",
                "sender_id": self.channel_name,
                "message": "peer-left",
            }
        )

        async_to_sync(self.channel_layer.group_discard)(
            self.room_id,
            self.channel_name
        )