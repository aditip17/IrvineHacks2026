import sqlite3
import pandas as pd

# --- Fake DB (run once to generate homes.db) ---
conn = sqlite3.connect("homes.db")
pd.DataFrame({
    "home_id": range(1, 11),
    "lat": [33.68 + i*0.01 for i in range(10)],
    "lon": [-117.80 + i*0.01 for i in range(10)],
    "dist_to_freeway":    [0.2, 1.5, 0.8, 2.1, 0.4, 1.9, 0.6, 2.5, 1.1, 0.3],
    "dist_to_major_road": [0.1, 0.8, 0.3, 1.2, 0.5, 1.0, 0.2, 1.5, 0.7, 0.4],
    "dist_to_park":       [0.3, 0.5, 1.2, 0.2, 0.8, 0.4, 1.5, 0.3, 0.6, 1.0],
    "poi_count_500m":     [12,  4,   7,   2,   15,  5,   3,   8,   11,  6  ],
    "dist_to_industrial": [0.5, 2.0, 1.0, 3.0, 0.3, 2.5, 0.8, 1.5, 1.2, 0.6],
    "light_pollution_score": [0.8, 0.3, 0.5, 0.2, 0.9, 0.4, 0.6, 0.3, 0.7, 0.8]
}).to_sql("homes", conn, if_exists="replace", index=False)
conn.close()
