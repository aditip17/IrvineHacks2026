import os
import pandas as pd
import geopandas as gpd
import osmnx as ox
import numpy as np
from shapely.geometry import Point

# =========================
# 1️⃣ Setup output folder
# =========================
output_folder = "processed_data"
os.makedirs(output_folder, exist_ok=True)  # create if doesn't exist

# =========================
# 2️⃣ Merge city GeoJSONs into homes
# =========================
city_folder = "city_data"
geojson_files = [
    os.path.join(city_folder, f) 
    for f in os.listdir(city_folder) 
    if f.endswith(".geojson")
]

# Read and merge
homes_list = [gpd.read_file(f) for f in geojson_files]
homes = gpd.GeoDataFrame(
    pd.concat(homes_list, ignore_index=True), 
    crs="EPSG:4326"
)

# Clean geometries
homes = homes[homes.geometry.notnull() & homes.is_valid]

# Sample 1000 homes
homes = homes.sample(n=1000, random_state=42)

# Add unique IDs
homes["home_id"] = range(1, len(homes)+1)

# Save merged homes
homes_file = os.path.join(output_folder, "homes.geojson")
homes.to_file(homes_file, driver="GeoJSON")
print(f"✅ {homes_file} ready with {len(homes)} homes")

# =========================
# 3️⃣ Download OpenStreetMap layers
# =========================
place = "Irvine, California, USA"

# Roads
roads = ox.features_from_place(place, {"highway": ["motorway", "trunk", "primary"]})
roads_file = os.path.join(output_folder, "roads.geojson")
roads.to_file(roads_file, driver="GeoJSON")
print(f"✅ {roads_file} ready with {len(roads)} features")

# Parks
parks = ox.features_from_place(place, {"leisure": "park"})
parks_file = os.path.join(output_folder, "parks.geojson")
parks.to_file(parks_file, driver="GeoJSON")
print(f"✅ {parks_file} ready with {len(parks)} features")

# Commercial POIs
pois = ox.features_from_place(place, {"amenity": ["restaurant", "cafe", "bar"], "shop": True})
pois_file = os.path.join(output_folder, "pois.geojson")
pois.to_file(pois_file, driver="GeoJSON")
print(f"✅ {pois_file} ready with {len(pois)} features")

# Industrial zones
industrial = ox.features_from_place(place, {"landuse": "industrial"})
industrial_file = os.path.join(output_folder, "industrial_zones.geojson")
industrial.to_file(industrial_file, driver="GeoJSON")
print(f"✅ {industrial_file} ready with {len(industrial)} features")

# =========================
# 4️⃣ Light pollution proxy
# =========================
bounds = homes.total_bounds  # [minx, miny, maxx, maxy]
xs = np.linspace(bounds[0], bounds[2], 20)
ys = np.linspace(bounds[1], bounds[3], 20)

light_points = gpd.GeoDataFrame(
    {"brightness": np.random.randint(0,100, size=400)},
    geometry=[Point(x, y) for x in xs for y in ys],
    crs="EPSG:4326"
)

light_file = os.path.join(output_folder, "light_points.geojson")
light_points.to_file(light_file, driver="GeoJSON")
print(f"✅ {light_file} ready with {len(light_points)} points")

# =========================
# 5️⃣ Sanity checks
# =========================
print("\n--- Sanity Checks ---")
print("Homes sample:")
print(homes.head())
print("Total homes:", len(homes))
print("Roads:", len(roads), "Parks:", len(parks))
print("POIs:", len(pois), "Industrial zones:", len(industrial))
print("Light points:", len(light_points))