import ee

ee.Authenticate()
ee.Initialize(project="shining-domain-513816-d7")

img = ee.ImageCollection("MODIS/061/MOD13A2").first()
print("GEE connected! Image ID:", img.getInfo()["id"])