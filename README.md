# NeighborhoodFit

NeighborhoodFit is a location-based web application that helps users evaluate neighborhoods using housing data, infrastructure layers, and geospatial analysis. It provides an interactive way to explore livability factors such as parks, roads, industrial zones, lighting, and nearby amenities.

## Overview

NeighborhoodFit allows users to:

- View neighborhoods on an interactive map  
- Browse housing listings by city  
- Analyze nearby parks and amenities  
- Visualize zoning and industrial areas  
- Explore infrastructure layers like roads and lighting  
- Compare different cities within Orange County  

The platform integrates processed spatial data with a modern React frontend to create a dynamic and intuitive experience.

## Tech Stack

### Frontend
- React (Vite)
- Tailwind CSS
- JavaScript (ES6+)
- GeoJSON rendering

### Backend
- Python
- SQLite
- Data processing scripts
- GeoJSON spatial layers
- FASTAPI

### Data Sources
- Redfin housing data
- City boundary GeoJSON files
- Processed infrastructure layers (parks, roads, industrial zones, lighting, POIs)

## Project Structure

```
NeighborhoodFit/
│
├── src/
│   ├── components/
│   │   ├── HomeList.jsx
│   │   ├── MapView.jsx
│   │   └── SliderPanel.jsx
│   ├── App.jsx
│   ├── api.js
│   ├── constants.js
│   └── main.jsx
│
├── city_data/                     # Raw city GeoJSON files
├── processed_data/                # Cleaned spatial layers
├── build_database.py              # Builds core database tables
├── build_listings.py              # Processes and inserts housing listings
├── generate_db.py                 # Generates final database file
├── initialize_database.py         # Initializes SQLite schema
├── prepare_spatial_layers.py      # Processes GeoJSON layers
├── main.py                        # Backend entry point
├── redfin_OC_data.csv             # Raw housing dataset
├── package.json                   # Frontend dependencies
├── tailwind.config.js             # Tailwind configuration
└── vite.config.js                 # Vite configuration
```
## Local Development Setup

### 1️⃣ Clone the Repository

git clone https://github.com/aditip17/IrvineHacks2026.git

cd IrvineHacks2026

### 2️⃣ Backend Setup (Python + SQLite)

#### Create virtual environment:

python3 -m venv venv

source venv/bin/activate   # macOS/Linux

#### Install dependencies:

pip install -r requirements.txt

#### Initialize database:

python initialize_database.py

python build_database.py

python build_listings.py redfin_OC_data.csv

#### Run backend:

python -m uvicorn main:app --reload --port 8000

### 3️⃣ Frontend Setup (React + Vite)

#### Install dependencies:

npm install

#### Run development server:

npm run dev

#### Frontend runs locally at:

http://localhost:5173

## Deployment
### Frontend (Vercel)

The React frontend is deployed on Vercel.

Live URL:
https://irvine-hacks26.vercel.app?_vercel_share=Ne8p9v0LcEkGOkzvurbwjIeLBYKARTHs

### Backend (Render)

The Python backend is deployed on Render.

API Base URL:
https://neighborhoodfit-api.onrender.com/

### Deployment Architecture

- Frontend hosted on Vercel

- Backend API hosted on Render

- Frontend communicates with backend via REST API

- SQLite database initialized during deployment or build phase

## Supported Cities

- Anaheim

- Fullerton

- Garden Grove

- Huntington Beach

- Irvine

- Lake Forest

- Newport Beach

- Orange

## Future Improvements

- Saved neighborhoods & authentication

- Real-time housing API integration

- Cloud database migration (PostgreSQL)

## Contributors

Built for IrvineHacks 2026.
