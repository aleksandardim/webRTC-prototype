from django.shortcuts import render
from django.shortcuts import HttpResponse

from collections import defaultdict

roomID_to_users_count: defaultdict = defaultdict(int)

# Create your views here.
def home(request):
    return render(request, "home.html")

def room(request, slug):
    if roomID_to_users_count[slug] == 2:
        return HttpResponse("", status=403)

    roomID_to_users_count[slug] += 1

    return render(request, "room.html", {"uuid": slug})
