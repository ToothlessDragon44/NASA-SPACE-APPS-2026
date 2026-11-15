import requests

url = "https://power.larc.nasa.gov/api/temporal/daily/point"
params = {
    "parameters": "T2M,PRECTOTCORR",   # temperature aur rainfall
    "community": "AG",
    "longitude": 74.74,
    "latitude": 19.09,
    "start": "20260801",
    "end": "20260831",
    "format": "JSON",
}

r = requests.get(url, params=params, timeout=60)
data = r.json()["properties"]["parameter"]

for day, temp in data["T2M"].items():
    print(day, "temp:", temp, "rain:", data["PRECTOTCORR"][day])