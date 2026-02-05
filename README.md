# NYC Airspace Guardian: Tactical Situational Awareness

**Deployment Link:** [https://jastman.github.io/cesium-airspace-guardian/](https://jastman.github.io/cesium-airspace-guardian/)

## 🎯 Executive Summary
**NYC Airspace Guardian** is a high-fidelity **Common Operating Picture (COP)** dashboard designed for urban monitoring. It fuses photorealistic 3D geospatial data with live signal intelligence to provide a real-time view of the New York City airspace.

Built with **CesiumJS** and the **OpenSky Network API**, this application demonstrates how web technologies can deliver mission-critical visualization capabilities with a "Lattice OS" aesthetic—prioritizing clarity, performance, and situational awareness.

## 🛠️ Key Capabilities

### 1. High-Fidelity Urban Environment
*   **Google Photorealistic 3D Tiles:** Leverages the OGC 3D Tiles standard to render NYC with sub-meter accuracy, enabling true line-of-sight analysis.
*   **Tactical "Seahawk" Asset:** A detailed 3D model of an SH-60B Seahawk helicopter serves as the primary tactical POV, complete with a custom hologram shader effect.
*   **Dynamic Asset Loading:** Implements a Level-of-Detail (LOD) strategy where detected aircraft are represented by lightweight icons (MIL-STD-2525) until selected, at which point high-fidelity 3D models (Boeing, Airbus, Cessna) are dynamically loaded and synchronized with the live flight path.

### 2. Live Intelligence & Visualization
*   **Real-Time Traffic:** Integration with OpenSky Network to track live commercial and general aviation traffic in the NY Terminal Control Area (TCA).
*   **Smart Classification:** Automatically filters and classifies aircraft:
    *   **Hostile/Restricted:** Low altitude (<1000m) or inside geofence (Red).
    *   **Suspect:** Low altitude (Yellow).
    *   **Neutral:** Standard traffic (Cyan).
*   **Volumetric Radar:** Visualizes sensor coverage with a custom animated radar dome effect.

### 3. "Lattice OS" User Experience
*   **Mission-Critical UI:** A custom dark-mode interface featuring glassmorphism, responsive data panels, and tactical typography (`Inter` / `JetBrains Mono`).
*   **Smart Camera Control:**
    *   **Orbit Logic:** Camera stays locked on the tactical asset (Seahawk) for precise inspection.
    *   **Directional Pad:** Rapidly switch between cardinal vantage points (N/S/E/W) for situational assessment.
    *   **Intro Sequence:** Cinematic fade-in transition tied to asset loading.

## 🚀 Technical Architecture

*   **Core Engine:** [CesiumJS](https://cesium.com/platform/cesiumjs/)
*   **Build Tool:** Vite (ES Modules)
*   **Data Sources:**
    *   **Terrain/Tiles:** Google Earth 3D Tiles via Cesium Ion.
    *   **Live Data:** OpenSky Network REST API.
    *   **Symbology:** `milsymbol.js` for NATO standard icons.
*   **Hosting:** GitHub Pages (Automated CI/CD via GitHub Actions).

## 👨‍💻 Developer Notes

### Performance Optimization
*   **Entity Pooling:** Efficiently recycles Cesium entities during radar updates to minimize garbage collection.
*   **On-Demand Loading:** 3D models for traffic are only fetched from Cesium Ion when a user inspects a specific flight, keeping the initial load time fast (`loadAircraftModel` / `unloadAircraftModel` pattern).
*   **Fallback Handling:** Robust error handling ensures "Paper Airplane" fallback models are used if specific asset mapping fails.

### Quick Start
1.  Clone the repository.
2.  Run `npm install`.
3.  Run `npm run dev` to launch the local server.
