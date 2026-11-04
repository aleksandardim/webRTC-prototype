from django.shortcuts import render, redirect
from django.shortcuts import HttpResponse

from collections import defaultdict

import re
import uuid

roomID_to_users_count: defaultdict = defaultdict(int)

# Create your views here.
def home(request):
    return redirect(str(f"/{uuid.uuid4()}"))

def room(request, slug):
    if len(slug) >= 100 or re.fullmatch(r"[A-Za-z0-9_.-]+", slug) is None:
        return HttpResponse("", status=400)

    if roomID_to_users_count[slug] == 2:
        return HttpResponse("", status=403)

    roomID_to_users_count[slug] += 1

    return render(request, "room.html", {"uuid": slug})
