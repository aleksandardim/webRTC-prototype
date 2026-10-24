from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path(r"<endpoint_id>/ws/", consumers.WSConsumer.as_asgi()),
]