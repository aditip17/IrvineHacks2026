import sqlite3
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="SensoryNeighborhoods API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = Path(__file__).with_name("neighborhoodfit.db")

REQUIRED_COLS = [
    "listing_id",
    "lat",
    "lon",
    "dist_to_freeway",
    "dist_to_major_road",
    "dist_to_park",
    "poi_count_500m",
]

LISTING_COLS = [
    "address",
    "city",
    "state",
    "zip",
    "price",
    "beds",
    "baths",
    "square_feet",
    "lot_size",
    "year_built",
    "days_on_market",
    "price_per_sqft",
    "hoa_month",
    "property_type",
    "status",
    "next_open_house_start",
    "next_open_house_end",
    "url",
]


def _clean_for_json(df: pd.DataFrame) -> pd.DataFrame:
    # Ensure JSON-safe: inf -> NaN, then force object dtype so NaN can become None.
    df = df.replace([np.inf, -np.inf], np.nan)
    df = df.astype(object).where(pd.notnull(df), None)
    return df


def _table_exists(conn: sqlite3.Connection, table_name: str) -> bool:
    q = "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    return conn.execute(q, (table_name,)).fetchone() is not None


def get_df() -> pd.DataFrame:
    try:
        conn = sqlite3.connect(DB_PATH)

        # Load features table
        if _table_exists(conn, "listing_features"):
            features_table = "listing_features"
        elif _table_exists(conn, "listings_features"):
            features_table = "listings_features"
        else:
            raise HTTPException(status_code=500, detail="Could not find listing_features table")

        df = pd.read_sql(f"SELECT * FROM {features_table}", conn)

        # Join listings table if it exists (for price, beds, baths, etc.)
        if _table_exists(conn, "listings"):
            listings_df = pd.read_sql("SELECT * FROM listings", conn)
            listings_df = listings_df.rename(
                columns={
                    "latitude": "_lst_lat",
                    "longitude": "_lst_lon",
                }
            )

            keep = ["listing_id"] + [c for c in LISTING_COLS if c in listings_df.columns]

            # If features table lacks lat/lon but listings has it, use listings coords
            if "lat" not in df.columns and "_lst_lat" in listings_df.columns:
                keep += ["_lst_lat", "_lst_lon"]

            listings_df = listings_df[keep]
            df = df.merge(listings_df, on="listing_id", how="left")

            if "_lst_lat" in df.columns:
                if "lat" not in df.columns:
                    df["lat"] = df["_lst_lat"]
                else:
                    df["lat"] = df["lat"].fillna(df["_lst_lat"])

                if "lon" not in df.columns:
                    df["lon"] = df["_lst_lon"]
                else:
                    df["lon"] = df["lon"].fillna(df["_lst_lon"])

                df = df.drop(columns=["_lst_lat", "_lst_lon"])

        conn.close()

        missing = [c for c in REQUIRED_COLS if c not in df.columns]
        if missing:
            raise HTTPException(status_code=500, detail=f"Missing required columns: {missing}")

        # Coerce numerics
        num_cols = [
            "lat",
            "lon",
            "dist_to_freeway",
            "dist_to_major_road",
            "dist_to_park",
            "poi_count_500m",
        ]
        opt_num_cols = [
            "dist_to_industrial",
            "light_pollution_score",
            "price",
            "beds",
            "baths",
            "square_feet",
            "lot_size",
            "year_built",
            "days_on_market",
            "price_per_sqft",
            "hoa_month",
        ]

        for c in num_cols:
            df[c] = pd.to_numeric(df[c], errors="coerce")
        for c in opt_num_cols:
            if c in df.columns:
                df[c] = pd.to_numeric(df[c], errors="coerce")

        # Keep only valid coordinates (Mapbox needs lon/lat)
        df = df.dropna(subset=["lat", "lon"])
        df = df[(df["lat"].between(-90, 90)) & (df["lon"].between(-180, 180))]

        # Fill NaNs so scoring never generates NaN
        df["poi_count_500m"] = df["poi_count_500m"].fillna(0)

        for c in ["dist_to_freeway", "dist_to_major_road", "dist_to_park"]:
            med = df[c].median()
            if pd.isna(med):
                raise HTTPException(status_code=500, detail=f"Column '{c}' has no numeric values.")
            df[c] = df[c].fillna(med)

        if "dist_to_industrial" in df.columns:
            med = df["dist_to_industrial"].median()
            if not pd.isna(med):
                df["dist_to_industrial"] = df["dist_to_industrial"].fillna(med)
            else:
                # If entire column is empty, make it neutral-ish
                df["dist_to_industrial"] = df["dist_to_industrial"].fillna(0)

        if "light_pollution_score" in df.columns:
            med = df["light_pollution_score"].median()
            if not pd.isna(med):
                df["light_pollution_score"] = df["light_pollution_score"].fillna(med)
            else:
                df["light_pollution_score"] = df["light_pollution_score"].fillna(0)

        return df

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not load neighborhoodfit.db: {e}")


def normalize(s: pd.Series) -> pd.Series:
    s = pd.to_numeric(s, errors="coerce")
    rng = s.max() - s.min()
    if pd.isna(rng) or rng == 0:
        return pd.Series([0.5] * len(s), index=s.index)
    return (s - s.min()) / rng


def invert(s: pd.Series) -> pd.Series:
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
        df["quiet_score"] = invert(df["dist_to_freeway"]) * 0.6 + invert(df["dist_to_major_road"]) * 0.4

    df["green_score"] = invert(df["dist_to_park"])
    df["activity_score"] = normalize(df["poi_count_500m"])

    if "light_pollution_score" in df.columns:
        df["light_score"] = invert(df["light_pollution_score"])
    else:
        df["light_score"] = 0.5

    # Force scores to be finite & non-null
    for c in ["quiet_score", "green_score", "activity_score", "light_score"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")
        df[c] = df[c].replace([np.inf, -np.inf], np.nan).fillna(0.5)

    return df


@app.get("/homes")
def get_homes():
    result = compute_scores(get_df())
    result = _clean_for_json(result)
    return jsonable_encoder(result.to_dict(orient="records"))


class WeightInput(BaseModel):
    w_quiet: float = 0.4
    w_green: float = 0.3
    w_activity: float = 0.2
    w_light: float = 0.1


@app.post("/score")
def score_homes(weights: WeightInput):
    total = weights.w_quiet + weights.w_green + weights.w_activity + weights.w_light
    if total == 0:
        raise HTTPException(status_code=400, detail="At least one weight must be non-zero.")

    result = compute_scores(get_df())
    result["fit_score"] = (
        (weights.w_quiet / total) * result["quiet_score"]
        + (weights.w_green / total) * result["green_score"]
        + (weights.w_activity / total) * result["activity_score"]
        + (weights.w_light / total) * result["light_score"]
    )

    result["fit_score"] = pd.to_numeric(result["fit_score"], errors="coerce")
    result["fit_score"] = result["fit_score"].replace([np.inf, -np.inf], np.nan).fillna(0.0)

    result = result.sort_values("fit_score", ascending=False)
    result = _clean_for_json(result)
    return jsonable_encoder(result.to_dict(orient="records"))


@app.get("/health")
def health():
    return {"ok": True}