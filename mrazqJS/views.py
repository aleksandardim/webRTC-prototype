from django.shortcuts import render
# from django.shortcuts import HttpResponse

# Create your views here.
def home(request):
    return render(request, "home.html")

def room(request, slug):
    return render(request, "room.html", {"uuid": slug})
