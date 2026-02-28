import sqlite3
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

# load data from home.db
# Required columns: home_id, lat, lon,
#   dist_to_freeway, dist_to_major_road, dist_to_park, poi_count_500m
# Optional columns: dist_to_industrial, light_pollution_score
def get_df() -> pd.DataFrame:
    try:
        conn = sqlite3.connect("homes.db")
        df = pd.read_sql("SELECT * FROM homes", conn)
        conn.close()
        return df
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not load homes.db: {e}")
#normalization
def normalize(s: pd.Series) -> pd.Series:
    """Scale values to 0-1. Higher = more of that thing."""
    rng = s.max() - s.min()
    if rng == 0:
        return pd.Series([0.5] * len(s), index=s.index)
    return (s - s.min()) / rng
def invert(s: pd.Series) -> pd.Series:
    """Distance to something BAD — farther is better, so flip the scale."""
    return 1 - normalize(s)

#scoring
def compute_scores(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    # quiet_score: farther from freeways + major roads = better (always present)
    # dist_to_industrial is optional
    if "dist_to_industrial" in df.columns:
        df["quiet_score"] = (
            invert(df["dist_to_freeway"])    * 0.5 +
            invert(df["dist_to_major_road"]) * 0.3 +
            invert(df["dist_to_industrial"]) * 0.2
        )
    else:
        df["quiet_score"] = (
            invert(df["dist_to_freeway"])    * 0.6 +
            invert(df["dist_to_major_road"]) * 0.4
        )
    # green_score: closer to park = better
    df["green_score"] = invert(df["dist_to_park"])

    # activity_score: more POIs within 500m = better
    df["activity_score"] = normalize(df["poi_count_500m"])

    # light_score: optional — only scored if home.db includes it
    if "light_pollution_score" in df.columns:
        df["light_score"] = invert(df["light_pollution_score"])
    else:
        df["light_score"] = 0.5  # neutral placeholder

    return df
#create endpoint
@app.get("/homes")
def get_homes():
    """
    Returns all homes with computed sub-scores.
    Rohit's frontend calls this on load to populate the map.
    """
    result = compute_scores(get_df())
    return result.to_dict(orient="records")

class WeightInput(BaseModel):
    w_quiet:    float = 0.4
    w_green:    float = 0.3
    w_activity: float = 0.2
    w_light:    float = 0.1

@app.post("/score")
def score_homes(weights: WeightInput):
    """
    called by frontend: Returns homes ranked best to worst by fit_score.
    Example request body:
    {
        "w_quiet": 0.4,
        "w_green": 0.3,
        "w_activity": 0.2,
        "w_light": 0.1
    }
    Each home in the response includes:
      home_id, lat, lon, quiet_score, green_score,
      activity_score, light_score, fit_score
    """
    total = weights.w_quiet + weights.w_green + weights.w_activity + weights.w_light
    if total == 0:
        raise HTTPException(status_code=400, detail="At least one weight must be non-zero.")

    result = compute_scores(get_df())
    # Auto-normalize weights so sliders don't need to sum to exactly 1.0
    result["fit_score"] = (
        (weights.w_quiet    / total) * result["quiet_score"]    +
        (weights.w_green    / total) * result["green_score"]    +
        (weights.w_activity / total) * result["activity_score"] +
        (weights.w_light    / total) * result["light_score"]
    )

    result = result.sort_values("fit_score", ascending=False)
    return result.to_dict(orient="records")


@app.get("/health")
def health():
    """ping this to confirm the backend is up"""
