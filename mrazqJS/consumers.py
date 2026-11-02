import json
from channels.generic.websocket import WebsocketConsumer
from asgiref.sync import async_to_sync

from .views import roomID_to_users_count
from .logger import logger

from datetime import datetime

class WSConsumer(WebsocketConsumer):
    def __log(self, message_type: str, log_message: str):
        logger.info(f"[{message_type}] {log_message}")

    def chat_message(self, event):
        if event.get("sender_id") == self.channel_name:
            return

        self.send(text_data=json.dumps({
            "title": event["title"], 
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
                "title": "peer-joined",
                "message": "",
            }
        )

        self.__log("user-joined", f"{self.channel_name[-2:]} in room {self.room_id[:3]}")

        self.accept()


    def send(self, text_data = None, bytes_data = None, close = False):
        return super().send(text_data, bytes_data, close)

    def receive(self, text_data = None, bytes_data = None):
        async_to_sync(self.channel_layer.group_send)(
            self.room_id,
            {
                "type": "chat.message",
                "sender_id": self.channel_name,
                "title": json.loads(text_data)["title"],
                "message": text_data,
            }
        )

        if json.loads(text_data)["title"] == "chat":
            self.__log("sent-message", f'{self.channel_name[-2:]}: "{json.loads(text_data).get("message")}" in room {self.room_id[:3]}')

    def disconnect(self, code):
        roomID_to_users_count[self.room_id] -= 1

        if roomID_to_users_count[self.room_id] == 0:
            del roomID_to_users_count[self.room_id]

        async_to_sync(self.channel_layer.group_send)(
            self.room_id,
            {
                "type": "chat.message",
                "sender_id": self.channel_name,
                "title": "peer-left",
                "message": "",
            }
        )

        async_to_sync(self.channel_layer.group_discard)(
            self.room_id,
            self.channel_name
        )

        self.__log("user-left", f"{self.channel_name[-2:]} from room {self.room_id[:3]}")