import sqlite3
import json
from functools import lru_cache
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="SensoryNeighborhoods API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = Path(__file__).resolve().parents[1] / "data" / "neighborhoodfit.db"
RAW_DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "raw"

REQUIRED_COLS = [
    "listing_id",
    "dist_to_freeway",
    "dist_to_major_road",
    "dist_to_park",
    "poi_count_500m",
]

CITY_TO_GEOJSON = {
    "irvine": "irvine.geojson",
    "newport beach": "newportbeach.geojson",
    "santa ana": "santaana.geojson",
    "anaheim": "anaheim.geojson",
    "fullerton": "fullerton.geojson",
    "garden grove": "gardengrove.geojson",
    "huntington beach": "huntington.geojson",
    "lake forest": "lakeforest.geojson",
    "orange": "orange.geojson",
}


def _walk_coords(node):
    if isinstance(node, (list, tuple)):
        if len(node) >= 2 and isinstance(node[0], (int, float)) and isinstance(node[1], (int, float)):
            yield float(node[0]), float(node[1])
        else:
            for child in node:
                yield from _walk_coords(child)


@lru_cache(maxsize=64)
def _city_bounds(city: str):
    geo_name = CITY_TO_GEOJSON.get(city.strip().lower())
    if not geo_name:
        return None

    geo_path = RAW_DATA_DIR / geo_name
    if not geo_path.exists():
        return None

    raw_text = geo_path.read_text(encoding="utf-8").strip()
    coords = []

    try:
        data = json.loads(raw_text)
        if data.get("type") == "FeatureCollection":
            for feature in data.get("features", []):
                coords.extend(_walk_coords(feature.get("geometry", {}).get("coordinates", [])))
        elif data.get("type") == "Feature":
            coords.extend(_walk_coords(data.get("geometry", {}).get("coordinates", [])))
        else:
            coords.extend(_walk_coords(data.get("coordinates", [])))
    except json.JSONDecodeError:
        # Some files are NDJSON (one GeoJSON Feature per line).
        for line in raw_text.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                feature = json.loads(line)
            except json.JSONDecodeError:
                continue
            coords.extend(_walk_coords(feature.get("geometry", {}).get("coordinates", [])))

    if not coords:
        return None

    lons = [c[0] for c in coords]
    lats = [c[1] for c in coords]
    # Small padding protects against edge cases near city boundaries.
    pad = 0.015
    return min(lats) - pad, max(lats) + pad, min(lons) - pad, max(lons) + pad


def _clean_for_json(df: pd.DataFrame) -> pd.DataFrame:
    # Convert inf -> NaN, then NaN -> None so JSON serialization works.
    df = df.replace([np.inf, -np.inf], np.nan)
    return df.where(pd.notnull(df), None)


def _table_exists(conn: sqlite3.Connection, table_name: str) -> bool:
    q = "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    return conn.execute(q, (table_name,)).fetchone() is not None


def get_df(city: Optional[str] = None) -> pd.DataFrame:
    """
    Loads from SQLite and normalizes schema assumptions.
    lat/lon are NOT required.
    """
    try:
        conn = sqlite3.connect(DB_PATH)

        # Your earlier logs showed `listings_features` (plural). Your code now uses `listing_features`.
        # We'll support either to avoid silent failure.
        if _table_exists(conn, "listing_features"):
            table = "listing_features"
        elif _table_exists(conn, "listings_features"):
            table = "listings_features"
        else:
            raise HTTPException(
                status_code=500,
                detail="Could not find table 'listing_features' or 'listings_features' in neighborhoodfit.db",
            )

        if _table_exists(conn, "listings"):
            df = pd.read_sql(
                f"""
                SELECT f.*, l.address, l.city, l.state, l.zip
                FROM {table} AS f
                LEFT JOIN listings AS l
                ON l.listing_id = f.listing_id
                """,
                conn,
            )
        else:
            df = pd.read_sql(f"SELECT * FROM {table}", conn)
        conn.close()

        if city and "city" in df.columns:
            wanted = city.strip().lower()
            df = df[df["city"].fillna("").str.lower() == wanted].copy()

            bounds = _city_bounds(wanted)
            if bounds and {"lat", "lon"}.issubset(df.columns):
                min_lat, max_lat, min_lon, max_lon = bounds
                df = df[
                    (df["lat"] >= min_lat)
                    & (df["lat"] <= max_lat)
                    & (df["lon"] >= min_lon)
                    & (df["lon"] <= max_lon)
                ].copy()

        missing = [c for c in REQUIRED_COLS if c not in df.columns]
        if missing:
            raise HTTPException(status_code=500, detail=f"Missing required columns: {missing}")

        # Coerce numeric columns (SQLite sometimes returns strings)
        num_cols = [
            "dist_to_freeway",
            "dist_to_major_road",
            "dist_to_park",
            "poi_count_500m",
        ]
        opt_num_cols = ["dist_to_industrial", "light_pollution_score"]

        for c in num_cols:
            df[c] = pd.to_numeric(df[c], errors="coerce")

        for c in opt_num_cols:
            if c in df.columns:
                df[c] = pd.to_numeric(df[c], errors="coerce")

        # Fill missing values to prevent NaN scores
        # - poi_count: missing -> 0 (no POIs)
        df["poi_count_500m"] = df["poi_count_500m"].fillna(0)

        # - distances: missing -> median (reasonable neutral)
        for c in ["dist_to_freeway", "dist_to_major_road", "dist_to_park"]:
            med = df[c].median()
            if pd.isna(med):
                # Column is entirely NaN; can't score meaningfully
                raise HTTPException(status_code=500, detail=f"Column '{c}' has no numeric values.")
            df[c] = df[c].fillna(med)

        # Optional distance: fill with median if present
        if "dist_to_industrial" in df.columns:
            med = df["dist_to_industrial"].median()
            if not pd.isna(med):
                df["dist_to_industrial"] = df["dist_to_industrial"].fillna(med)

        # Optional score: fill with median if present
        if "light_pollution_score" in df.columns:
            med = df["light_pollution_score"].median()
            if not pd.isna(med):
                df["light_pollution_score"] = df["light_pollution_score"].fillna(med)

        return df

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not load neighborhoodfit.db: {e}")


def normalize(s: pd.Series) -> pd.Series:
    """Scale values to 0-1. Higher = more of that thing."""
    s = pd.to_numeric(s, errors="coerce")
    rng = s.max() - s.min()
    if pd.isna(rng) or rng == 0:
        return pd.Series([0.5] * len(s), index=s.index)
    return (s - s.min()) / rng


def invert(s: pd.Series) -> pd.Series:
    """Distance to something BAD — farther is better, so flip the scale."""
    return 1 - normalize(s)


def compute_scores(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    if "dist_to_industrial" in df.columns:
        df["quiet_score"] = (
            invert(df["dist_to_freeway"]) * 0.5
            + invert(df["dist_to_major_road"]) * 0.3
            + invert(df["dist_to_industrial"]) * 0.2
        )
    else:
        df["quiet_score"] = (
            invert(df["dist_to_freeway"]) * 0.6 + invert(df["dist_to_major_road"]) * 0.4
        )

    df["green_score"] = invert(df["dist_to_park"])
    df["activity_score"] = normalize(df["poi_count_500m"])

    if "light_pollution_score" in df.columns:
        df["light_score"] = invert(df["light_pollution_score"])
    else:
        df["light_score"] = 0.5

    return df


@app.get("/homes")
def get_homes(city: Optional[str] = None):
    result = compute_scores(get_df(city=city))
    result = _clean_for_json(result)
    return result.to_dict(orient="records")


class WeightInput(BaseModel):
    w_quiet: float = 0.4
    w_green: float = 0.3
    w_activity: float = 0.2
    w_light: float = 0.1


@app.post("/score")
def score_homes(weights: WeightInput, city: Optional[str] = None):
    total = weights.w_quiet + weights.w_green + weights.w_activity + weights.w_light
    if total == 0:
        raise HTTPException(status_code=400, detail="At least one weight must be non-zero.")

    result = compute_scores(get_df(city=city))
    result["fit_score"] = (
        (weights.w_quiet / total) * result["quiet_score"]
        + (weights.w_green / total) * result["green_score"]
        + (weights.w_activity / total) * result["activity_score"]
        + (weights.w_light / total) * result["light_score"]
    )

    result = result.sort_values("fit_score", ascending=False)
    result = _clean_for_json(result)
    return result.to_dict(orient="records")


@app.get("/health")
def health():
    return {"ok":True}
