import math
import ee, requests
from datetime import date
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

ee.Initialize(project="shining-domain-513816-d7")

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

SMAP_ID = "NASA/SMAP/SPL4SMGP/008"
CHIRPS_ID = "UCSB-CHG/CHIRPS/DAILY"
STORM_MM = 50          # extreme storm = daily rainfall >= this (mm/day)
RELIABLE_FRAC = 0.75   # a year is "reliable" if rain >= 75% of long-term mean
HIST_YEARS = 20        # years of history for reliability
DIFFUSE = 0.25         # share of sunlight assumed diffuse (not slope dependent)
S2_RADIUS_KM = 5       # max radius for 10 m layers (keeps them fast)

# layer name -> (SMAP band, min, max)
SMAP = {
    "sm_surface":  ("sm_surface", 0.05, 0.50),
    "sm_rootzone": ("sm_rootzone", 0.05, 0.50),
    "sm_profile":  ("sm_profile", 0.05, 0.50),
    "sm_rootzone_pctl": ("sm_rootzone_pctl", 0, 100),
}
SM_PALETTE = ["a50026", "fdae61", "ffffbf", "abd9e9", "2c7bb6"]   # dry -> wet


def box(lat, lon, km):
    return ee.Geometry.Point([lon, lat]).buffer(km * 1000).bounds()


def landsat(start, end, region):
    """Landsat 8 + 9, cloud/shadow masked, ready for NDVI and temperature."""
    def prep(img):
        qa = img.select("QA_PIXEL")
        clear = (qa.bitwiseAnd(1 << 1).eq(0)
                 .And(qa.bitwiseAnd(1 << 2).eq(0))
                 .And(qa.bitwiseAnd(1 << 3).eq(0))
                 .And(qa.bitwiseAnd(1 << 4).eq(0)))
        sr = img.select(["SR_B4", "SR_B5"]).multiply(0.0000275).add(-0.2)
        st = img.select("ST_B10").multiply(0.00341802).add(149.0).subtract(273.15)
        return sr.addBands(st).updateMask(clear)

    c8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
    c9 = ee.ImageCollection("LANDSAT/LC09/C02/T1_L2")
    return c8.merge(c9).filterBounds(region).filterDate(start, end).map(prep)


def sentinel2(start, end, region):
    """Sentinel-2 L2A (10 m), cloud/shadow masked with the SCL band."""
    def prep(img):
        scl = img.select("SCL")
        clear = scl.eq(4).Or(scl.eq(5)).Or(scl.eq(6)).Or(scl.eq(7))
        return (img.select(["B4", "B8", "B11"]).multiply(0.0001)
                .updateMask(clear))

    return (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(region).filterDate(start, end)
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 60))
            .map(prep))


def s2_composite(start, end, region):
    col = sentinel2(start, end, region)
    scenes = col.size().getInfo()
    if scenes == 0:
        raise HTTPException(404, "No clear Sentinel-2 images found for this date range. Try a longer range.")
    return col.median(), scenes


def chirps(start, end):
    return (ee.ImageCollection(CHIRPS_ID).filterDate(start, end)
            .select("precipitation"))


def past_totals(start, end, n):
    """Rainfall total of the same date window for each of the previous n years."""
    def one(k):
        k = ee.Number(k).multiply(-1)
        s = ee.Date(start).advance(k, "year")
        e = ee.Date(end).advance(k, "year")
        return chirps(s, e).sum().rename("p")
    return ee.ImageCollection.fromImages(ee.List.sequence(1, n).map(one))


def landsat_ndvi(start, end, region):
    col = landsat(start, end, region)
    scenes = col.size().getInfo()
    if scenes == 0:
        raise HTTPException(404, "No clear Landsat images found for this date range. Try a longer range.")
    ndvi = col.median().normalizedDifference(["SR_B5", "SR_B4"]).rename("ndvi")
    return ndvi, scenes


def solar_noon(lat, d):
    """Sun elevation and azimuth (0 = north, 180 = south) at solar noon."""
    n = d.timetuple().tm_yday
    dec = 23.45 * math.sin(math.radians(360 / 365 * (284 + n)))
    elev = 90 - abs(lat - dec)
    az = 180 if lat > dec else 0
    return elev, az


@app.get("/api/gee/map")
def gee_map(layer: str, start: str, end: str, lat: float, lon: float, radius_km: float = 10):
    try:
        scenes = None
        note = None

        if layer in ("ndvi", "lst"):
            region = box(lat, lon, radius_km)
            col = landsat(start, end, region)
            scenes = col.size().getInfo()
            if scenes == 0:
                raise HTTPException(404, "No clear Landsat images found for this date range. Try a longer range.")
            comp = col.median()
            scale = 30
            if layer == "ndvi":
                img = comp.normalizedDifference(["SR_B5", "SR_B4"]).rename("v")
                vis = {"min": 0, "max": 0.8,
                       "palette": ["d73027", "fee08b", "a6d96a", "1a9850"]}
            else:
                img = comp.select("ST_B10").rename("v")
                vis = {"min": 15, "max": 45,
                       "palette": ["313695", "ffffbf", "a50026"]}

        elif layer == "rain":
            region = box(lat, lon, radius_km)
            img = chirps(start, end).sum().rename("v")
            vis = {"min": 0, "max": 200, "palette": ["ffffff", "74add1", "08306b"]}
            scale = 5566

        elif layer == "rain_reliability":
            region = box(lat, lon, radius_km)
            n = min(HIST_YEARS, int(start[:4]) - 1982)    # CHIRPS starts in 1981
            if n < 5:
                raise HTTPException(400, "Need at least 5 past years of data. Choose a start date after 1987.")
            tot = past_totals(start, end, n)
            mean = tot.mean()
            ok = tot.map(lambda i: i.gte(mean.multiply(RELIABLE_FRAC)))
            img = ok.mean().multiply(100).rename("v")
            vis = {"min": 0, "max": 100,
                   "palette": ["a50026", "f46d43", "fee08b", "a6d96a", "1a9850"]}
            scale = 5566
            note = f"% of last {n} years with rain >= {int(RELIABLE_FRAC*100)}% of average (same dates)"

        elif layer == "storm_freq":
            region = box(lat, lon, radius_km)
            img = (chirps(start, end).map(lambda i: i.gte(STORM_MM))
                   .sum().rename("v"))
            vis = {"min": 0, "max": 5,
                   "palette": ["ffffff", "ffeda0", "feb24c", "f03b20", "800026"]}
            scale = 5566
            note = f"Days with rain >= {STORM_MM} mm/day"

        elif layer == "erosion":
            region = box(lat, lon, radius_km)
            ndvi, scenes = landsat_ndvi(start, end, region)
            R = chirps(start, end).map(lambda i: i.pow(1.5)).sum()
            slope = ee.Terrain.slope(ee.Image("USGS/SRTMGL1_003"))
            LS = slope.multiply(math.pi / 180).sin().divide(0.0896).pow(1.3)
            nd = ndvi.clamp(0, 0.9)
            C = nd.divide(ee.Image(1).subtract(nd)).multiply(-2).exp()
            img = R.divide(1000).multiply(LS).multiply(C).multiply(100).rename("v")
            vis = {"min": 0, "max": 50,
                   "palette": ["1a9850", "a6d96a", "fee08b", "f46d43", "a50026"]}
            scale = 30
            note = "Relative erosion index (RUSLE-style, no soil K factor)"

        elif layer == "water_input":
            region = box(lat, lon, radius_km)
            ndvi, scenes = landsat_ndvi(start, end, region)
            nd = ndvi.clamp(0, 0.8)
            cn = ee.Image(85).subtract(nd.divide(0.8).multiply(20))
            S = ee.Image(25400).divide(cn).subtract(254)
            Ia = S.multiply(0.2)

            def infiltrated(p):
                q = (p.subtract(Ia).max(ee.Image(0)).pow(2)
                     .divide(p.add(S.multiply(0.8))))
                return p.subtract(q)

            img = chirps(start, end).map(infiltrated).sum().rename("v")
            vis = {"min": 0, "max": 250,
                   "palette": ["ffffff", "c7e9b4", "41b6c4", "225ea8", "081d58"]}
            scale = 30
            note = "Rain minus runoff (SCS-CN), rain data 5 km"

        # ---------- NEW: Sentinel-2, 10 m ----------
        elif layer in ("ndvi10", "ndmi"):
            region = box(lat, lon, min(radius_km, S2_RADIUS_KM))
            comp, scenes = s2_composite(start, end, region)
            scale = 10
            if layer == "ndvi10":
                img = comp.normalizedDifference(["B8", "B4"]).rename("v")
                vis = {"min": 0, "max": 0.8,
                       "palette": ["d73027", "fee08b", "a6d96a", "1a9850"]}
            else:
                img = comp.normalizedDifference(["B8", "B11"]).rename("v")
                vis = {"min": -0.2, "max": 0.6,
                       "palette": ["8c510a", "dfc27d", "f6e8c3", "80cdc1", "01665e"]}
                note = "NDMI: higher = more water in vegetation"

        elif layer == "productivity":
            region = box(lat, lon, min(radius_km, S2_RADIUS_KM))
            n = min(3, int(start[:4]) - 2019)
            if n < 1:
                raise HTTPException(400, "Need at least 1 past Sentinel-2 year. Choose a start date in 2020 or later.")
            cur_comp, scenes = s2_composite(start, end, region)
            cur = cur_comp.normalizedDifference(["B8", "B4"])

            def base_year(k):
                k = ee.Number(k).multiply(-1)
                s = ee.Date(start).advance(k, "year")
                e = ee.Date(end).advance(k, "year")
                return (sentinel2(s, e, region).median()
                        .normalizedDifference(["B8", "B4"]).rename("n"))

            base = ee.ImageCollection.fromImages(
                ee.List.sequence(1, n).map(base_year)).mean()
            img = (cur.subtract(base).divide(base).multiply(100)
                   .updateMask(base.gt(0.1)).rename("v"))
            vis = {"min": -40, "max": 40,
                   "palette": ["a50026", "f46d43", "ffffbf", "a6d96a", "1a9850"]}
            scale = 10
            note = f"NDVI change vs average of previous {n} yr (same dates). Red = declining, green = improving"

        # ---------- NEW: radiation ----------
        elif layer == "radiation":
            region = box(lat, lon, radius_km)
            col = (ee.ImageCollection("ECMWF/ERA5_LAND/DAILY_AGGR")
                   .filterDate(start, end)
                   .select("surface_solar_radiation_downwards_sum"))
            scenes = col.size().getInfo()
            if scenes == 0:
                raise HTTPException(404, "No ERA5-Land radiation data for this date range. "
                                         "It lags by a few days, so try an earlier end date.")
            base = col.mean().divide(1e6)                    # J/m2/day -> MJ/m2/day

            d0, d1 = date.fromisoformat(start), date.fromisoformat(end)
            elev, az = solar_noon(lat, d0 + (d1 - d0) / 2)
            e, a = math.radians(elev), math.radians(az)
            dem = ee.Image("USGS/SRTMGL1_003")
            slope = ee.Terrain.slope(dem).multiply(math.pi / 180)
            aspect = ee.Terrain.aspect(dem).multiply(math.pi / 180)
            cos_i = (slope.cos().multiply(math.sin(e))
                     .add(slope.sin().multiply(math.cos(e))
                          .multiply(aspect.subtract(a).cos())))
            factor = cos_i.max(ee.Image(0)).divide(math.sin(e))   # 1 = flat ground
            adj = ee.Image(DIFFUSE).add(factor.multiply(1 - DIFFUSE))
            img = base.multiply(adj).rename("v")
            vis = {"min": 8, "max": 26,
                   "palette": ["313695", "74add1", "ffffbf", "f46d43", "a50026"]}
            scale = 30
            note = "ERA5-Land (9 km) adjusted for slope/aspect at 30 m. MJ/m2/day"

        # ---------- NEW: water availability (ET/PET) ----------
        elif layer == "water_stress":
            region = box(lat, lon, radius_km)
            col = ee.ImageCollection("MODIS/061/MOD16A2").filterDate(start, end)
            scenes = col.size().getInfo()
            if scenes == 0:
                raise HTTPException(404, "No MODIS ET data for this date range. Try an earlier end date.")

            def clean(i):
                et, pet = i.select("ET"), i.select("PET")
                ok = et.lt(32700).And(pet.lt(32700)).And(pet.gt(0))
                return i.select(["ET", "PET"]).updateMask(ok)

            c = col.map(clean)
            ratio = c.select("ET").sum().divide(c.select("PET").sum())
            img = ratio.clamp(0, 1).rename("v")
            vis = {"min": 0, "max": 1,
                   "palette": ["a50026", "f46d43", "fee08b", "a6d96a", "1a9850"]}
            scale = 500
            note = "ET/PET: 1 = plants get enough water, 0 = severe water stress"

        # ---------- NEW: soil nitrogen ----------
        elif layer == "soil_n":
            region = box(lat, lon, radius_km)
            sg = ee.Image("projects/soilgrids-isric/nitrogen_mean")
            n0 = sg.select("nitrogen_0-5cm_mean")
            n1 = sg.select("nitrogen_5-15cm_mean")
            n2 = sg.select("nitrogen_15-30cm_mean")
            mean_cgkg = n0.multiply(5).add(n1.multiply(10)).add(n2.multiply(15)).divide(30)
            img = mean_cgkg.divide(1000).rename("v")        # cg/kg -> %
            vis = {"min": 0.02, "max": 0.20,
                   "palette": ["ffffcc", "c2e699", "78c679", "31a354", "006837"]}
            scale = 250
            note = "SoilGrids model estimate, 0-30 cm, does not change with date"

        # ---------- NEW: land productivity (GPP) ----------
        elif layer == "gpp":
            region = box(lat, lon, radius_km)
            col = ee.ImageCollection("MODIS/061/MOD17A2H").filterDate(start, end).select("Gpp")
            scenes = col.size().getInfo()
            if scenes == 0:
                raise HTTPException(404, "No MODIS GPP data for this date range. Try an earlier end date.")
            col = col.map(lambda i: i.updateMask(i.lt(30000)))
            img = col.sum().multiply(0.0001).multiply(1000).rename("v")   # kg C -> g C per m2
            vis = {"min": 0, "max": 300,
                   "palette": ["ffffcc", "c2e699", "78c679", "31a354", "006837"]}
            scale = 500
            note = "Gross primary productivity (g C/m2) summed over the dates"

        elif layer in SMAP:
            band, vmin, vmax = SMAP[layer]
            region = box(lat, lon, 60)
            col = ee.ImageCollection(SMAP_ID).filterDate(start, end).select(band)
            scenes = col.size().getInfo()
            if scenes == 0:
                raise HTTPException(404, "No SMAP soil moisture data for this date range. "
                                         "SMAP L4 can lag by a few days, so try an earlier end date.")
            img = col.mean().rename("v")
            vis = {"min": vmin, "max": vmax, "palette": SM_PALETTE}
            scale = 9000
        else:
            raise HTTPException(404, "Unknown layer")

        img = img.clip(region)
        m = img.getMapId(vis)
        stats = img.reduceRegion(ee.Reducer.mean(), region, scale,
                                 bestEffort=True, maxPixels=1e9).getInfo()
        return {"tile_url": m["tile_fetcher"].url_format, "mean": stats.get("v"),
                "layer": layer, "scenes": scenes, "resolution_m": scale, "note": note}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/api/smap/timeseries")
def smap_timeseries(lat: float, lon: float, start: str, end: str):
    """Daily mean surface + root-zone soil moisture at a point (SMAP L4)."""
    try:
        d0, d1 = date.fromisoformat(start), date.fromisoformat(end)
        n_days = (d1 - d0).days
        if n_days < 1:
            raise HTTPException(400, "End date must be after start date.")
        if n_days > 180:
            raise HTTPException(400, "Soil moisture chart supports up to 180 days. Shorten the range.")

        pt = ee.Geometry.Point([lon, lat])
        col = (ee.ImageCollection(SMAP_ID).filterDate(start, end)
               .select(["sm_surface", "sm_rootzone"]))

        def daily(i):
            day0 = ee.Date(start).advance(ee.Number(i), "day")
            sub = col.filterDate(day0, day0.advance(1, "day"))
            vals = ee.Dictionary(ee.Algorithms.If(
                sub.size().gt(0),
                sub.mean().reduceRegion(ee.Reducer.first(), pt, 9000),
                ee.Dictionary({"sm_surface": None, "sm_rootzone": None})))
            return ee.Feature(None, vals).set("date", day0.format("YYYY-MM-dd"))

        fc = ee.FeatureCollection(ee.List.sequence(0, n_days - 1).map(daily))
        rows = fc.getInfo()["features"]
        return {
            "dates": [r["properties"]["date"] for r in rows],
            "sm_surface": [r["properties"].get("sm_surface") for r in rows],
            "sm_rootzone": [r["properties"].get("sm_rootzone") for r in rows],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/api/power")
def power(lat: float, lon: float, start: str, end: str, params: str = "T2M,PRECTOTCORR"):
    r = requests.get(
        "https://power.larc.nasa.gov/api/temporal/daily/point",
        params={"parameters": params, "community": "AG", "longitude": lon,
                "latitude": lat, "start": start.replace("-", ""),
                "end": end.replace("-", ""), "format": "JSON"},
        timeout=60)
    if r.status_code != 200:
        raise HTTPException(r.status_code, r.text[:300])
    data = r.json()["properties"]["parameter"]
    return {k: {d: (None if v == -999 else v) for d, v in vals.items()}
            for k, vals in data.items()}