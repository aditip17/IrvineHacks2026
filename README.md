# IrvineHacks2026

Organized as separate frontend and backend apps with shared project-level data.

## Structure

```text
.
|-- frontend/              # React + Vite UI
|   |-- src/
|   |-- index.html
|   `-- package.json
|-- backend/
|   |-- api/
|   |   `-- main.py        # FastAPI app
|   |-- scripts/           # Data prep / DB build scripts
|   |-- data/
|   |   `-- neighborhoodfit.db
|   `-- requirements.txt
|-- data/
|   |-- raw/               # Input datasets (csv/geojson)
|   `-- processed/         # Processed geo layers
`-- README.md
```

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Run Backend

```bash
pip install -r backend/requirements.txt
uvicorn backend.api.main:app --reload --port 8000
```

Backend runs on `http://localhost:8000`.

## Common Data Scripts

```bash
python backend/scripts/initialize_database.py
python backend/scripts/prepare_spatial_layers.py
python backend/scripts/build_database.py
python backend/scripts/build_listings.py data/raw/redfin_OC_data.csv
```
