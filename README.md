# NYC Airspace Monitor: Situational Awareness Dashboard

**Deployment Link:** [Insert your GitHub Pages Link Here]

## 🎯 Executive Summary
This application demonstrates a **Common Operating Picture (COP)** for urban airspace monitoring. Designed for defense and public safety use cases, it combines high-fidelity 3D geospatial data with real-time signal intelligence to track aerial assets in dense urban environments.

## 🛠️ Key Capabilities (The "Why")
* **Static Ground Truth:** Utilizes **Google Photorealistic 3D Tiles** for sub-meter urban accuracy, allowing for line-of-sight analysis (e.g., "Can the sniper see the helicopter from this building?").
* **Live Signal Intelligence:** Integrates the **OpenSky Network API** to visualize real-time civilian air traffic, automatically filtering threats based on altitude (< 1000m).
* **Tactical Asset Integration:** Demonstrates the ability to ingest custom mission assets (US Navy SH-60B Seahawk) into the global context.

## 🚀 Technical Architecture
* **Runtime:** CesiumJS (Web-based, no install required)
* **Global Context:** Cesium Ion (Hosting Google 3D Tiles & World Terrain)
* **Custom Asset Pipeline:** Manual ingestion of `.glb` photogrammetry via Cesium Ion.
* **Live Data Feed:** REST API integration with OpenSky Network (transponder data).

## 👨‍💻 Developer Notes
This project was built using **Vite** for rapid prototyping.

### Quick Start
1.  Clone the repository.
2.  Run `npm install`.
3.  Run `npm run dev` to launch the local server.

### "Sales Engineer" Feature: The Threat Filter
To demonstrate the value of the Cesium API to a non-technical stakeholder, I implemented a client-side filter (The "Isolate Low Altitude" button). This parses the raw JSON from OpenSky and highlights only aircraft operating below 1,000 meters—turning raw "Data" into actionable "Intelligence."