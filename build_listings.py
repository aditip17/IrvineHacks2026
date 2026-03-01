import sys
import math
import json
import sqlite3
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import pandas as pd

DB_PATH = "neighborhoodfit.db"

HOME_TABLE = "home_features"         
LISTINGS_TABLE = "listings"
LISTING_FEATURES_TABLE = "listing_features"

FEATURE_COLS = [
    "dist_to_freeway",
    "dist_to_major_road",
    "dist_to_park",
    "poi_count_500m",
    "dist_to_industrial",
    "light_pollution_score",
]

RADII_KM = [2.0, 5.0, 10.0]
MIN_NEIGHBORS = 5
EPS_METERS = 50.0


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in meters."""
    R = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)

    a = (math.sin(dphi / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(dl / 2) ** 2))
    return 2 * R * math.asin(math.sqrt(a))


def bbox_deltas(lat: float, radius_km: float) -> Tuple[float, float]:
    """Return (lat_delta, lon_delta) degrees for a radius around latitude lat."""
    lat_delta = radius_km / 111.0
    cos_lat = max(0.1, math.cos(math.radians(lat)))
    lon_delta = radius_km / (111.0 * cos_lat)
    return lat_delta, lon_delta


def ensure_tables(conn: sqlite3.Connection) -> None:
    """Create listings + listing_features tables if missing."""
    cur = conn.cursor()

    cur.execute(f"""
    CREATE TABLE IF NOT EXISTS {LISTINGS_TABLE} (
        listing_id INTEGER PRIMARY KEY AUTOINCREMENT,

        sale_type TEXT,
        property_type TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        zip TEXT,

        price REAL,
        beds REAL,
        baths REAL,
        location TEXT,

        square_feet REAL,
        lot_size REAL,
        year_built REAL,
        days_on_market REAL,
        price_per_sqft REAL,
        hoa_month REAL,

        status TEXT,
        next_open_house_start TEXT,
        next_open_house_end TEXT,

        url TEXT,
        source TEXT,
        mls TEXT,

        favorite TEXT,
        interested TEXT,

        latitude REAL NOT NULL,
        longitude REAL NOT NULL
    );
    """)

    cur.execute(f"""
    CREATE TABLE IF NOT EXISTS {LISTING_FEATURES_TABLE} (
        listing_id INTEGER PRIMARY KEY,
        neighbor_count INTEGER NOT NULL,
        radius_used_km REAL NOT NULL,
        neighbor_home_ids TEXT, -- JSON list for debugging

        dist_to_freeway REAL,
        dist_to_major_road REAL,
        dist_to_park REAL,
        poi_count_500m REAL,
        dist_to_industrial REAL,
        light_pollution_score REAL,

        FOREIGN KEY(listing_id) REFERENCES {LISTINGS_TABLE}(listing_id)
    );
    """)

    cur.execute(f"CREATE INDEX IF NOT EXISTS idx_listings_lat_lon ON {LISTINGS_TABLE}(latitude, longitude);")
    cur.execute(f"CREATE INDEX IF NOT EXISTS idx_listing_features_listing_id ON {LISTING_FEATURES_TABLE}(listing_id);")

    conn.commit()


def load_redfin_csv(csv_path: str) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    df.columns = [c.strip() for c in df.columns]

    # Required
    if "LATITUDE" not in df.columns or "LONGITUDE" not in df.columns:
        raise ValueError("CSV must contain LATITUDE and LONGITUDE columns.")

    # Helper: safely fetch optional column
    def col(name: str):
        return df[name] if name in df.columns else None

    out = pd.DataFrame({
        "sale_type": col("SALE TYPE"),
        "property_type": col("PROPERTY TYPE"),
        "address": col("ADDRESS"),
        "city": col("CITY"),
        "state": col("STATE OR PROVINCE"),
        "zip": col("ZIP OR POSTAL CODE"),

        "price": pd.to_numeric(col("PRICE"), errors="coerce") if col("PRICE") is not None else None,
        "beds": pd.to_numeric(col("BEDS"), errors="coerce") if col("BEDS") is not None else None,
        "baths": pd.to_numeric(col("BATHS"), errors="coerce") if col("BATHS") is not None else None,
        "location": col("LOCATION"),

        "square_feet": pd.to_numeric(col("SQUARE FEET"), errors="coerce") if col("SQUARE FEET") is not None else None,
        "lot_size": pd.to_numeric(col("LOT SIZE"), errors="coerce") if col("LOT SIZE") is not None else None,
        "year_built": pd.to_numeric(col("YEAR BUILT"), errors="coerce") if col("YEAR BUILT") is not None else None,
        "days_on_market": pd.to_numeric(col("DAYS ON MARKET"), errors="coerce") if col("DAYS ON MARKET") is not None else None,
        "price_per_sqft": pd.to_numeric(col("$/SQUARE FEET"), errors="coerce") if col("$/SQUARE FEET") is not None else None,
        "hoa_month": pd.to_numeric(col("HOA/MONTH"), errors="coerce") if col("HOA/MONTH") is not None else None,

        "status": col("STATUS"),
        "next_open_house_start": col("NEXT OPEN HOUSE START TIME"),
        "next_open_house_end": col("NEXT OPEN HOUSE END TIME"),

        "url": col("URL"),
        "source": col("SOURCE"),
        "mls": col("MLS#"),

        "favorite": col("FAVORITE"),
        "interested": col("INTERESTED"),

        "latitude": pd.to_numeric(df["LATITUDE"], errors="coerce"),
        "longitude": pd.to_numeric(df["LONGITUDE"], errors="coerce"),
    })

    out = out.dropna(subset=["latitude", "longitude"]).copy()
    return out


def insert_listings(conn: sqlite3.Connection, listings_df: pd.DataFrame) -> List[int]:
    """Insert listings, return listing_id list in the inserted order."""
    cur = conn.cursor()

    cols = list(listings_df.columns)
    placeholders = ", ".join(["?"] * len(cols))
    col_sql = ", ".join(cols)

    cur.executemany(
        f"INSERT INTO {LISTINGS_TABLE} ({col_sql}) VALUES ({placeholders});",
        listings_df.itertuples(index=False, name=None)
    )
    conn.commit()

    last_id = cur.execute("SELECT last_insert_rowid();").fetchone()[0]
    n = len(listings_df)
    first_id = last_id - n + 1
    return list(range(first_id, last_id + 1))


def fetch_candidates(conn: sqlite3.Connection, lat: float, lon: float, radius_km: float) -> pd.DataFrame:
    """Use bbox filter (fast with lat/lon index), then refine by true distance in Python."""
    lat_d, lon_d = bbox_deltas(lat, radius_km)
    min_lat, max_lat = lat - lat_d, lat + lat_d
    min_lon, max_lon = lon - lon_d, lon + lon_d

    cols = ["home_id", "lat", "lon"] + FEATURE_COLS
    sql = f"""
    SELECT {", ".join(cols)}
    FROM {HOME_TABLE}
    WHERE lat BETWEEN ? AND ?
      AND lon BETWEEN ? AND ?;
    """
    return pd.read_sql_query(sql, conn, params=(min_lat, max_lat, min_lon, max_lon))


def weighted_aggregate(lat: float, lon: float, candidates: pd.DataFrame, radius_km: float) -> Optional[Dict]:
    """Compute distance-weighted average of features for candidates within radius."""
    if candidates.empty:
        return None

    max_m = radius_km * 1000.0
    candidates = candidates.copy()

    # distances
    dists = []
    for r in candidates.itertuples(index=False):
        dists.append(haversine_m(lat, lon, float(r.lat), float(r.lon)))
    candidates["dist_m"] = dists

    within = candidates[candidates["dist_m"] <= max_m].copy()
    if within.empty:
        return None

    within["w"] = 1.0 / (within["dist_m"] + EPS_METERS)

    out: Dict[str, Optional[float]] = {}
    for c in FEATURE_COLS:
        col = pd.to_numeric(within[c], errors="coerce")
        mask = col.notna()
        if mask.any():
            out[c] = float((col[mask] * within.loc[mask, "w"]).sum() / within.loc[mask, "w"].sum())
        else:
            out[c] = None

    return {
        "neighbor_count": int(len(within)),
        "radius_used_km": float(radius_km),
        "neighbor_home_ids": json.dumps(within["home_id"].astype(str).tolist()),
        **out
    }


def compute_features_for_listing(conn: sqlite3.Connection, lat: float, lon: float) -> Dict:
    """Tiered search: 2km -> 5km -> 10km; if none, fallback to nearest."""
    best = None

    for r_km in RADII_KM:
        candidates = fetch_candidates(conn, lat, lon, r_km)
        agg = weighted_aggregate(lat, lon, candidates, r_km)

        if agg and agg["neighbor_count"] >= MIN_NEIGHBORS:
            return agg

        if agg and (best is None or agg["neighbor_count"] > best["neighbor_count"]):
            best = agg

    if best is not None:
        return best

    # fallback nearest (pull a wider bbox)
    candidates = fetch_candidates(conn, lat, lon, 20.0)
    if candidates.empty:
        return {
            "neighbor_count": 0,
            "radius_used_km": 0.0,
            "neighbor_home_ids": json.dumps([]),
            **{c: None for c in FEATURE_COLS},
        }

    # find nearest by haversine
    dmin = None
    nearest = None
    for r in candidates.itertuples(index=False):
        d = haversine_m(lat, lon, float(r.lat), float(r.lon))
        if dmin is None or d < dmin:
            dmin = d
            nearest = r

    feat = {
        "neighbor_count": 1,
        "radius_used_km": float((dmin or 0.0) / 1000.0),
        "neighbor_home_ids": json.dumps([str(nearest.home_id)]),
    }
    for c in FEATURE_COLS:
        feat[c] = getattr(nearest, c)
    return feat


def upsert_listing_features(conn: sqlite3.Connection, listing_id: int, feat: Dict) -> None:
    cols = ["listing_id", "neighbor_count", "radius_used_km", "neighbor_home_ids"] + FEATURE_COLS
    values = [
        listing_id,
        feat["neighbor_count"],
        feat["radius_used_km"],
        feat["neighbor_home_ids"],
        *[feat[c] for c in FEATURE_COLS]
    ]

    placeholders = ", ".join(["?"] * len(cols))
    update_set = ", ".join([f"{c}=excluded.{c}" for c in cols[1:]])

    sql = f"""
    INSERT INTO {LISTING_FEATURES_TABLE} ({", ".join(cols)})
    VALUES ({placeholders})
    ON CONFLICT(listing_id) DO UPDATE SET {update_set};
    """
    conn.execute(sql, values)
    conn.commit()


def main():
    if len(sys.argv) < 2:
        print("Usage: python build_listing_features.py redfin_OC_data.csv")
        sys.exit(1)

    csv_path = sys.argv[1]
    if not Path(csv_path).exists():
        raise FileNotFoundError(csv_path)

    listings_df = load_redfin_csv(csv_path)

    conn = sqlite3.connect(DB_PATH)
    try:
        ensure_tables(conn)

        listing_ids = insert_listings(conn, listings_df)

        for listing_id, row in zip(listing_ids, listings_df.itertuples(index=False)):
            lat = float(row.latitude)
            lon = float(row.longitude)

            feat = compute_features_for_listing(conn, lat, lon)
            upsert_listing_features(conn, listing_id, feat)

        print(f"Inserted {len(listing_ids)} listings and computed features for all of them.")
        print(f"DB: {DB_PATH}")
        print(f"Tables: {LISTINGS_TABLE}, {LISTING_FEATURES_TABLE}")

    finally:
        conn.close()


if __name__ == "__main__":
    main()