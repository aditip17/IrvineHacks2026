import sqlite3
from pathlib import Path
import geopandas as gpd
import pandas as pd

DB_PATH = "neighborhoodfit.db"
TABLE = "home_features"

DATA_DIR = Path("processed_data")
PATHS = {
    "homes": DATA_DIR / "homes.geojson",
    "roads": DATA_DIR / "roads.geojson",
    "parks": DATA_DIR / "parks.geojson",
    "pois": DATA_DIR / "pois.geojson",
    "industrial": DATA_DIR / "industrial_zones.geojson",
    "light": DATA_DIR / "light_points.geojson",
}

WGS84 = "EPSG:4326" #lon/lat
METRIC = "EPSG:32611" #UTM Zone 11N


# data loading/cleaning helpers
def load_geojson(path: Path) -> gpd.GeoDataFrame:
    # load a GeoJSON file into a GeoDataFrame and ensure all CRS = WGS84
    gdf = gpd.read_file(path)
    if gdf.crs is None:
        gdf = gdf.set_crs(WGS84)
    else:
        gdf = gdf.to_crs(WGS84)
    return gdf

def drop_null_geoms(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    return gdf.dropna(subset=["geometry"]).copy()

def fix_polygons(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    gdf = gdf.copy()
    poly_mask = gdf.geom_type.isin(["Polygon", "MultiPolygon"])
    if poly_mask.any():
        gdf.loc[poly_mask, "geometry"] = gdf.loc[poly_mask, "geometry"].buffer(0)
    return gdf

def to_metric(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    return gdf.to_crs(METRIC)

def ensure_home_id(homes: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    #every home must have a 'home_id' column
    homes = homes.copy()
    if "home_id" not in homes.columns:
        for alt in ["id", "ID", "fid", "hash"]:
            if alt in homes.columns:
                homes = homes.rename(columns={alt: "home_id"})
                break
    if "home_id" not in homes.columns:
        homes["home_id"] = homes.index.astype(str)
    homes["home_id"] = homes["home_id"].astype(str)
    return homes

#calculations
def split_roads(roads: gpd.GeoDataFrame):
    if "highway" not in roads.columns:
        raise ValueError("roads.geojson must contain a 'highway' column.")
    # Motorways + trunk roads are your freeway proxy
    freeways = roads[roads["highway"].isin(["motorway", "trunk"])].copy()
    # Primary roads are your major road proxy
    majors = roads[roads["highway"].isin(["primary"])].copy()
    return freeways, majors

def dist_to_union(points_metric: gpd.GeoDataFrame, targets_metric: gpd.GeoDataFrame) -> pd.Series:
    if len(targets_metric) == 0:
        # No targets => unknown/None distances
        return pd.Series([None] * len(points_metric), index=points_metric.index, dtype="float64")
    # Merge many shapes into one geometry object
    union_geom = targets_metric.union_all()
    # Distance in meters 
    return points_metric.geometry.distance(union_geom)

def poi_count_within(points_metric: gpd.GeoDataFrame, pois_metric: gpd.GeoDataFrame, radius_m: float) -> pd.Series:
    if len(pois_metric) == 0:
        return pd.Series([0] * len(points_metric), index=points_metric.index, dtype="int64")

    # Create buffer polygons around each home
    buffers = points_metric[["home_id", "geometry"]].copy()
    buffers["geometry"] = buffers.geometry.buffer(radius_m)

    # Find POIs that fall inside each buffer polygon
    joined = gpd.sjoin(
        pois_metric[["geometry"]],
        buffers,
        predicate="within",
        how="inner")

    # Count matches per home
    counts = joined.groupby("home_id").size()

    # Map counts back to the homes; missing => 0
    return points_metric["home_id"].map(counts).fillna(0).astype(int)

def light_pollution_score(points_metric: gpd.GeoDataFrame, light_metric: gpd.GeoDataFrame, radius_m: float = 1000) -> pd.Series:
    if len(light_metric) == 0:
        return pd.Series([0.0] * len(points_metric), index=points_metric.index, dtype="float64")

    if "brightness" not in light_metric.columns:
        raise ValueError("light_points.geojson must contain a 'brightness' column/property.")

    # Ensure we only use needed columns
    homes = points_metric[["home_id", "geometry"]].copy()
    lights = light_metric[["brightness", "geometry"]].copy()

    # Buffer homes
    buffers = homes.copy()
    buffers["geometry"] = buffers.geometry.buffer(radius_m)

    # Spatial join: light points inside each home buffer
    joined = gpd.sjoin(lights, buffers, predicate="within", how="inner")

    if len(joined) == 0:
        return pd.Series([0.0] * len(points_metric), index=points_metric.index, dtype="float64")

    # Compute distance from each light to its matched home
    joined = joined.merge(homes.rename(columns={"geometry": "home_geom"}), on="home_id")

    joined["distance"] = joined.geometry.distance(joined["home_geom"])

    # Avoid division by zero
    epsilon = 1e-6
    joined["weight"] = 1 / (joined["distance"] + epsilon)

    # Weighted average per home
    joined["weighted_brightness"] = joined["brightness"] * joined["weight"]

    grouped = joined.groupby("home_id")

    weighted_avg = (grouped["weighted_brightness"].sum() / grouped["weight"].sum())

    # Map back to all homes
    return points_metric["home_id"].map(weighted_avg).fillna(0.0).astype(float)

#sqlite stuff
DB_COLS = [
    "home_id",
    "lat",
    "lon",
    "dist_to_freeway",
    "dist_to_major_road",
    "dist_to_park",
    "poi_count_500m",
    "dist_to_industrial",
    "light_pollution_score"
]

def update_insert(conn: sqlite3.Connection, df: pd.DataFrame) -> None:
    # Keep only columns the DB expects, in the correct order
    df = df[DB_COLS].copy()

    # Build (?, ?, ?, ...) placeholders for parameterized query
    placeholders = ", ".join(["?"] * len(DB_COLS))

    # home_id, lat, lon, ...
    col_list = ", ".join(DB_COLS)

    # Build update expression for every column except home_id (primary key)
    update_set = ", ".join([f"{c}=excluded.{c}" for c in DB_COLS[1:]])

    # Insert statement with UPSERT
    sql = f"""
    INSERT INTO {TABLE} ({col_list})
    VALUES ({placeholders})
    ON CONFLICT(home_id) DO UPDATE SET {update_set};
    """
    # execute many inserts many rows efficiently
    conn.executemany(sql, df.itertuples(index=False, name=None))
    conn.commit()


def run():
    # Load and clean each layer   
    homes = fix_polygons(drop_null_geoms(load_geojson(PATHS["homes"])))
    roads = fix_polygons(drop_null_geoms(load_geojson(PATHS["roads"])))
    parks = fix_polygons(drop_null_geoms(load_geojson(PATHS["parks"])))
    pois = fix_polygons(drop_null_geoms(load_geojson(PATHS["pois"])))
    industrial = fix_polygons(drop_null_geoms(load_geojson(PATHS["industrial"])))
    light = fix_polygons(drop_null_geoms(load_geojson(PATHS["light"])))

    # Standardize home ids   
    homes = ensure_home_id(homes)

    # Prepare WGS84 copy for DB lat/lon   
    # lat/lon are stored in degrees for frontend mapping
    homes_wgs = homes.to_crs(WGS84).copy()
    homes_wgs["lon"] = homes_wgs.geometry.x
    homes_wgs["lat"] = homes_wgs.geometry.y

    # Prepare metric copies for feature engineering   
    # All distances/500m buffers should use meters
    homes_m = to_metric(homes_wgs)
    roads_m = to_metric(roads)
    parks_m = to_metric(parks)
    pois_m = to_metric(pois)
    industrial_m = to_metric(industrial)
    light_m = to_metric(light)

    # Split roads into freeway + major   
    freeways_m, majors_m = split_roads(roads_m)

    # Compute features   

    # Distances to road categories (meters)
    homes_wgs["dist_to_freeway"] = dist_to_union(homes_m, freeways_m)
    homes_wgs["dist_to_major_road"] = dist_to_union(homes_m, majors_m)

    # Distance to nearest park geometry (park layer includes points AND multipolygons)
    homes_wgs["dist_to_park"] = dist_to_union(homes_m, parks_m)

    # Activity: POIs within 500m
    homes_wgs["poi_count_500m"] = poi_count_within(homes_m, pois_m, radius_m=500)

    # Industrial zones: layer includes points + polygons; union distance works for both
    homes_wgs["dist_to_industrial"] = dist_to_union(homes_m, industrial_m)

    # Light pollution: average brightness within 1km
    homes_wgs["light_pollution_score"] = light_pollution_score(homes_m, light_m, radius_m=1000)

    # Build final output table (exact DB columns)   
    out = homes_wgs[DB_COLS].copy()

    # Write to SQLite   
    conn = sqlite3.connect(DB_PATH)
    try:
        update_insert(conn, out)
    finally:
        conn.close()

    print(f"Stored {len(out)} homes into {DB_PATH}:{TABLE}")


if __name__ == "__main__":
    run()