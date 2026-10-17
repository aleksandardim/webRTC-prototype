from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path(r"<uuid:endpoint_id>/ws/signaling/", consumers.SignalingConsumer.as_asgi())
    #       1/ws/signaling/
]