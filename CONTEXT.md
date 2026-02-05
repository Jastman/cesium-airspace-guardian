# Project Context: NYC Airspace Guardian

## Overview
This application is a **Common Operating Picture (COP)** designed for defense and public safety demos. It visualizes airspace data in a high-fidelity 3D urban environment.

## Terminology
- **Blue Force**: The friendly tactical asset under our control. In the current implementation, this is the **SH-60B Seahawk** helicopter, visualized as a "Digital Twin" with a holographic shader.
- **Civilian Traffic**: Real-time commercial and private aircraft data fetched from the **OpenSky Network API**.
    - **Threat Detection**: Civilian traffic below 1,000 meters is automatically flagged as a potential threat/interest.

## Architecture
- **Tech Stack**: CesiumJS (3D Engine), Vite (Build Tool).
- **Data Sources**: 
    - Google Photorealistic 3D Tiles (Urban Environment).
    - OpenSky Network (Live Signals).
    - Cesium Ion (Asset Hosting).

## Sales/Demo Goals
- Demonstrate "Line of Sight" analysis with high-precision 3D tiles.
- Show ability to mix real-time intelligence (OpenSky) with tactical assets (Blue Force).
- "Sales Engineer" feature: Client-side filtering to turn raw data into actionable intelligence (Threat isolation).