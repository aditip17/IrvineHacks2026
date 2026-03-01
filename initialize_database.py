import sqlite3
from pathlib import Path 
from typing import List, Tuple

DB_PATH = "neighborhoodfit.db"
TABLE_NAME = "home_features"

COLUMNS: List[Tuple[str, str]] = [
    ("home_id", "TEXT PRIMARY KEY"),
    ("lat", "REAL NOT NULL"),
    ("lon", "REAL NOT NULL"),
    ("dist_to_freeway", "REAL"),
    ("dist_to_major_road", "REAL"),
    ("dist_to_park", "REAL"),
    ("poi_count_500m", "INTEGER"),
    ("dist_to_industrial", "REAL"),
    ("light_pollution_score", "REAL"),
]

INDEXES = [
    #WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?
    ("idx_home_features_lat_lon", TABLE_NAME, ["lat", "lon"]),
]

PRAGMAS = [
    "PRAGMA foreign_keys = ON;",
    "PRAGMA journal_mode = WAL;",
    "PRAGMA synchronous = NORMAL;",
]


def intialize(db_path: str = DB_PATH) -> None:
    """Create SQLite DB + table + indexes. Safe to run multiple times."""
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db_path)
    try:
        cur = connection.cursor()
        #apply pragmas
        for p in PRAGMAS:
            cur.execute(p)

        #create table
        col_sql = ",\n  ".join([f"{name} {dtype}" for name, dtype in COLUMNS])
        create_sql = f"CREATE TABLE IF NOT EXISTS {TABLE_NAME} (\n  {col_sql}\n);"
        cur.execute(create_sql)

        #create indexes
        for idx_name, table, cols in INDEXES:
            cols_sql = ", ".join(cols)
            cur.execute(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table}({cols_sql});")

        connection.commit()

        '''
        #sanity check
        cur.execute(f"PRAGMA table_info({TABLE_NAME});")
        cols = cur.fetchall()

        print(f"DB ready: {db_path}")
        print(f"Table: {TABLE_NAME}")
        print("Columns:")
        for cid, name, ctype, notnull, dflt, pk in cols:
            print(f"  - {name} ({ctype}){' NOT NULL' if notnull else ''}{' PRIMARY KEY' if pk else ''}")
        '''

    finally:
        connection.close()

if __name__ == "__main__":
    intialize()


