import * as Cesium from 'cesium';
import './style.css';

// ============================================================================
// 1. CONFIGURATION
// ============================================================================
// 🔑 YOUR TOKEN GOES HERE
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhNmM1MTVkZi1kZDMyLTQ0NGYtYWRkZC03Y2E4OTk3YTMwNGUiLCJpZCI6Mzg2MjQ2LCJpYXQiOjE3NzAwNTEzNzB9.bKhCblNe9ja74CrXTFkKWQ32FMJxgDiLDSP9LFel2FQ';

const GOOGLE_TILES_ID = 2275207;
const HELICOPTER_ID = 4417159;
import ms from 'milsymbol';

// HELPER: Generate MIL-STD-2525 Icon
function getMilSymbol(sidc, options = {}) {
  const sym = new ms.Symbol(sidc, {
    size: 25,
    ...options
  });
  return sym.toDataURL();
}

// EMPIRE STATE BUILDING LOCATION
const START_LONG = -73.985428;
const START_LAT = 40.748817;
const START_HEIGHT = 450;
const GEOFENCE_RADIUS = 3000; // 3km Dome

// ============================================================================
// 2. VIEWER SETUP
// ============================================================================
const viewer = new Cesium.Viewer('app', {
  terrainProvider: await Cesium.createWorldTerrainAsync(),
  baseLayerPicker: false,
  geocoder: false,
  homeButton: false,
  sceneModePicker: false,
  animation: false,
  timeline: false,
  fullscreenButton: false,
  infoBox: true,
  selectionIndicator: true,
  navigationHelpButton: true, // Explicitly enable help button
});

// --- GEOFENCE DOME ---
viewer.entities.add({
  position: Cesium.Cartesian3.fromDegrees(START_LONG, START_LAT),
  ellipsoid: {
    radii: new Cesium.Cartesian3(GEOFENCE_RADIUS, GEOFENCE_RADIUS, GEOFENCE_RADIUS),
    material: new Cesium.Color(1.0, 0.0, 0.0, 0.15),
    outline: true,
    outlineColor: new Cesium.Color(1.0, 0.0, 0.0, 0.5)
  }
});

// Enable depth check so things hide behind buildings
viewer.scene.globe.depthTestAgainstTerrain = true;

// ============================================================================
// 3. THE "DIGITAL TWIN" HOLOGRAM SHADER
// ============================================================================
const hologramShader = new Cesium.CustomShader({
  uniforms: {
    u_time: {
      type: Cesium.UniformType.FLOAT,
      value: 0
    }
  },
  fragmentShaderText: `
        void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
            vec3 cyan = vec3(0.0, 1.0, 1.0); // Sci-Fi Blue Color
            
            // 1. SCANLINE EFFECT
            float scan = fract((fsInput.attributes.positionMC.z / 10.0) - u_time * 1.0);
            float lineIntensity = step(0.8, scan); 

            // 2. PULSE EFFECT
            float pulse = 0.8 + 0.2 * sin(u_time * 3.0);

            // 3. COMBINE
            material.diffuse = cyan;
            material.alpha = 0.1 + (lineIntensity * 0.7);
            
            // *** FIX IS HERE: Changed 'emission' to 'emissive' ***
            material.emissive = cyan * pulse * 0.5;
        }
    `,
  translucencyMode: Cesium.CustomShaderTranslucencyMode.TRANSLUCENT
});

// ============================================================================
// 4. UI OVERLAY
// ============================================================================
// [REMOVED] HTML now statically defined in index.html for Lattice OS Design

// ============================================================================
// 5. LOAD ASSETS
// ============================================================================

// A. Global Context (Google 3D Tiles)
try {
  const cityTiles = await Cesium.Cesium3DTileset.fromIonAssetId(GOOGLE_TILES_ID);
  viewer.scene.primitives.add(cityTiles);
} catch (e) { console.log("Error loading Google Tiles"); }

// B. The Holographic Helicopter
let helicopterTileset;
let seahawkEntity; // GLOBAL SCOPE FOR CAMERA ACCESS
try {
  helicopterTileset = await Cesium.Cesium3DTileset.fromIonAssetId(HELICOPTER_ID);

  // APPLY THE SHADER
  helicopterTileset.customShader = hologramShader;

  viewer.scene.primitives.add(helicopterTileset);

  // POSITION & SCALE
  const position = Cesium.Cartesian3.fromDegrees(START_LONG, START_LAT, START_HEIGHT);
  const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position);

  // ⚠️ ADJUST SCALE HERE IF IT'S TOO BIG/SMALL
  const scale = 0.1;
  const scaleMatrix = Cesium.Matrix4.fromUniformScale(scale);
  const finalMatrix = Cesium.Matrix4.multiply(modelMatrix, scaleMatrix, new Cesium.Matrix4());

  helicopterTileset.root.transform = finalMatrix;

  // ANIMATION LOOP (Updates the shader time)
  viewer.scene.postUpdate.addEventListener(function () {
    const now = performance.now() / 1000.0;
    hologramShader.setUniform('u_time', now);
  });

  // TACTICAL LABEL (HUD MODE - ALWAYS ON TOP)
  seahawkEntity = viewer.entities.add({
    // 1. Height: Moved up to +50m to clear the rotors
    position: Cesium.Cartesian3.fromDegrees(START_LONG, START_LAT, START_HEIGHT), // Focus on the HELICOPTER (base), not the label above it
    label: {
      text: "SH-60B [FRIENDLY]",
      font: "bold 16px Courier New", // Bolder font
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineWidth: 3,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -60), // Push label up visually
      fillColor: Cesium.Color.CYAN,
      showBackground: true,
      backgroundColor: new Cesium.Color(0, 0, 0, 0.8),

      // 2. CRITICAL FIX: This disables the depth check so it renders ON TOP of the model
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      distanceDisplayCondition: undefined
    },
    polyline: {
      positions: [
        Cesium.Cartesian3.fromDegrees(START_LONG, START_LAT, START_HEIGHT),
        Cesium.Cartesian3.fromDegrees(START_LONG, START_LAT, START_HEIGHT + 50)
      ],
      width: 2,
      material: new Cesium.PolylineDashMaterialProperty({
        color: Cesium.Color.CYAN.withAlpha(0.5)
      })
    }
  });

  // C. Initial Camera View
  // 1. Trigger Fade-In MUCH Sooner (User Request)
  setTimeout(() => {
    const modal = document.getElementById('intro-modal');
    if (modal) modal.classList.add('reveal-map');
  }, 100); // Almost immediate

  // 2. Fly to Centered View on Seahawk
  // We use zoomTo on the entity so Cesium sets the camera target (pivot) to the entity itself.
  viewer.zoomTo(seahawkEntity, new Cesium.HeadingPitchRange(
    0, // Heading: North
    Cesium.Math.toRadians(-20), // Pitch: -20 degrees
    1500 // Range: 1500m
  ));

} catch (e) { console.log("Helicopter not found.", e); }







// ============================================================================
// 6. LIVE DATA (OpenSky API)
// ============================================================================
let flightEntities = [];

// HELPER: GUESS AIRCRAFT TYPE
function getAircraftType(callsign, speedKnots, altMeters) {
  const prefix = callsign.trim().substring(0, 3).toUpperCase();
  if (prefix === "JBU") return "JetBlue (Airbus A320)";
  if (prefix === "UAL") return "United (Boeing 737 MAX)";
  if (prefix === "DAL") return "Delta (Airbus A321)";
  if (prefix === "AAL") return "American (Boeing 737)";
  if (prefix === "RPA") return "Republic (Embraer E175)";
  if (prefix === "EDV") return "Endeavor (CRJ-900)";
  if (prefix === "FDX") return "FedEx (Boeing 767)";
  if (prefix === "UPS") return "UPS (MD-11F)";
  if (prefix === "PD") return "NYPD Aviation (Bell 429)";

  if (altMeters < 600 && speedKnots < 120) return "Helicopter / UAV";
  if (speedKnots < 200) return "General Aviation (Cessna/Piper)";
  return "Unknown Fixed Wing";
}

async function fetchFlights() {
  const btn = document.getElementById('btn-scan');
  const originalText = btn.innerText;
  btn.innerText = "📡 Parsing Signals...";
  btn.style.background = "#e67e22";

  const bounds = { lamin: 40.5, lomin: -74.2, lamax: 40.9, lomax: -73.7 };

  try {
    const url = `https://opensky-network.org/api/states/all?lamin=${bounds.lamin}&lomin=${bounds.lomin}&lamax=${bounds.lamax}&lomax=${bounds.lomax}`;
    const response = await fetch(url);
    const data = await response.json();

    // Cleanup
    flightEntities.forEach(e => viewer.entities.remove(e));
    flightEntities = [];

    if (data.states) {
      data.states.forEach(flight => {
        const callsign = flight[1] || 'Unknown';
        const country = flight[2] || 'Unknown';
        const lon = flight[5];
        const lat = flight[6];
        const velocity = flight[9] || 0;
        const heading = flight[10] || 0;
        const alt = flight[13] || 0;

        if (!lon || !lat) return;

        const isLow = alt < 1000;
        const color = isLow ? Cesium.Color.RED : Cesium.Color.CYAN;
        const speedKnots = velocity * 1.94;
        const aircraftType = getAircraftType(callsign, speedKnots, alt);

        // Trajectory Math
        const startPoint = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
        const headingRad = Cesium.Math.toRadians(heading);
        const dist = velocity * 60;
        const endPoint = new Cesium.Cartesian3();
        const velocityVector = new Cesium.Cartesian3(Math.sin(headingRad) * dist, Math.cos(headingRad) * dist, 0);
        const enu = Cesium.Transforms.eastNorthUpToFixedFrame(startPoint);
        const matrix = Cesium.Matrix4.getMatrix3(enu, new Cesium.Matrix3());
        const worldVector = Cesium.Matrix3.multiplyByVector(matrix, velocityVector, new Cesium.Cartesian3());
        Cesium.Cartesian3.add(startPoint, worldVector, endPoint);

        // --- GEOFENCE LOGIC ---
        const distToEmpire = Cesium.Cartesian3.distance(startPoint, Cesium.Cartesian3.fromDegrees(START_LONG, START_LAT, 0)); // Flat distance approx
        const inGeofence = distToEmpire < GEOFENCE_RADIUS;

        // SIDC (Symbol ID Code)
        // 30=Symbol Code, 1.X=Version, 2=Reality(Friend=3,Hostile=6,Neutral=4), 3=Dimension(Air), 4=Unit(FixedWing)
        // Friendly: SIDC "SFAPMF----" (Warfighting, Friend, Air, Fixed Wing)
        // Hostile: "SHAPMF----"
        // Neutral: "SNAPMF----"

        // Simplified Logic:
        // isLow + inGeofence = HOSTILE (Red Icon)
        // isLow = SUSPECT (Yellow Icon)
        // Normal = NEUTRAL (Cyan/Blue Icon)

        let sidc = "SNAPMF----"; // Neutral Fixed Wing
        if (isLow) sidc = "SUAPMF----"; // Unknown/Suspect
        if (inGeofence) sidc = "SHAPMF----"; // Hostile

        // --- ENTITY 2: THE PATH (Create first so we can link it) ---
        const pathEntity = viewer.entities.add({
          polyline: {
            positions: [startPoint, endPoint],
            width: 3,
            material: new Cesium.PolylineArrowMaterialProperty(inGeofence ? Cesium.Color.RED : Cesium.Color.YELLOW)
          },
          show: false
        });

        // --- ENTITY 1: THE PLANE (MIL-STD-2525) ---
        const planeEntity = viewer.entities.add({
          position: startPoint,
          name: `Flight ${callsign.trim()}`,
          billboard: {
            image: getMilSymbol(sidc, {
              uniqueDesignation: callsign, // Text on icon
              infoColor: inGeofence ? "red" : "white"
            }),
            scale: 1.2,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 500000),
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          },
          description: `
            <style>
              .cesium-info { font-family: 'Segoe UI', sans-serif; font-size: 13px; width: 100%; border-collapse: collapse; }
              .cesium-info td { padding: 6px; border-bottom: 1px solid #444; }
              .cesium-info tr:first-child td { border-top: 1px solid #444; }
              .alert-row { background: #550000; color: #ff9999; font-weight: bold; }
            </style>
            <table class="cesium-info">
              ${inGeofence ? '<tr class="alert-row"><td colspan="2">⚠ VIOLATION: RESTRICTED AIRSPACE</td></tr>' : ''}
              <tr><td style="color:#aaa">Callsign</td><td><strong>${callsign}</strong></td></tr>
              <tr><td style="color:#aaa">ID Estimate</td><td><strong>${aircraftType}</strong></td></tr>
              <tr><td style="color:#aaa">Origin</td><td>${country}</td></tr>
              <tr><td style="color:#aaa">Altitude</td><td>${Math.round(alt)} m</td></tr>
              <tr><td style="color:#aaa">Speed</td><td>${Math.round(speedKnots)} kts</td></tr>
            </table>
          `,
          userData: {
            isLow: isLow,
            inGeofence: inGeofence,
            category: 'flight',
            associatedPath: pathEntity,
            aircraftType: aircraftType, // STORE TYPE FOR MAPPING
            headingRad: headingRad      // STORE HEADING FOR 3D MODEL ORIENTATION
          }
        });

        // --- ENTITY 2: THE PATH (Create first so we can link it) ---
        // UPDATE PATH TO HAVE USERDATA TOO
        pathEntity.userData = { category: 'flight', inGeofence: inGeofence };

        flightEntities.push(planeEntity);
        flightEntities.push(pathEntity);
      });

      btn.innerText = `✅ Found ${data.states.length} Aircraft`;
      btn.style.background = "#27ae60";
      setTimeout(() => { btn.innerText = originalText; btn.style.background = ""; }, 3000);

      if (flightEntities.length > 0) {
        // RESTORED AUTO-ZOOM (User Request)
        // Modified to keep Seahawk centered but zoom out
        const target = seahawkEntity || flightEntities;

        viewer.flyTo(target, {
          duration: 2.0,
          offset: new Cesium.HeadingPitchRange(0, -0.5, 8000) // 8km Zoom out 
        });

        // REVEAL COMMAND ACTIONS
        document.getElementById('panel-actions').style.display = 'block';
      }
    }
  } catch (e) {
    console.error("Radar Offline", e);
    btn.innerText = "❌ Radar Offline";
    btn.style.background = "#c0392b";
  }
}

// 7. SELECTION HANDLER & 3D MODEL LOADING
// ============================================================================

const resetBtn = document.getElementById('btn-reset');

// --- 3D MODEL STATE ---
let currentModelTileset = null;
let modelUpdateListener = null;
let hiddenBillboardEntity = null;

const FALLBACK_ASSET_ID = 4423404; // Paper Airplane

// --- AIRCRAFT ASSET MAP ---
const AIRCRAFT_ASSET_DEFS = {
  // Generic / Default
  "Helicopter / UAV": { id: 4423338, scale: 10.0 },     // Scale UP
  "Bell 429": { id: 4423338, scale: 10.0 },             // Scale UP
  "General Aviation (Cessna/Piper)": { id: 4423405, scale: 0.2 }, // Scale DOWN

  // Commercial Liners (Default Scale 1.0)
  "JetBlue (Airbus A320)": { id: 4423340, scale: 1.0 },
  "United (Boeing 737 MAX)": { id: 4423342, scale: 1.0 },
  "American (Boeing 737)": { id: 4423342, scale: 1.0 },
  "Delta (Airbus A321)": { id: 4423346, scale: 1.0 },
  "Republic (Embraer E175)": { id: 4423348, scale: 1.0 },
  "Endeavor (CRJ-900)": { id: 4423351, scale: 1.0 },
  "FedEx (Boeing 767)": { id: 4423352, scale: 1.0 },
  "UPS (MD-11F)": { id: 4423353, scale: 1.0 }
};

// --- DYNAMIC LOAD/UNLOAD FUNCTIONS ---

async function loadAircraftModel(entity) {
  // 1. Unload any existing model first
  unloadAircraftModel();

  if (!entity || !entity.userData || !entity.userData.category === 'flight') return;

  // 2. Determine Asset ID
  const typeStr = entity.userData.aircraftType || "Unknown";
  let assetDef = AIRCRAFT_ASSET_DEFS[typeStr];
  let assetId, scaleFactor;

  if (assetDef) {
    assetId = assetDef.id;
    scaleFactor = assetDef.scale;
  } else {
    console.log(`No specific model for: ${typeStr}. Using Fallback.`);
    assetId = FALLBACK_ASSET_ID;
    scaleFactor = 1.0;
  }

  try {
    console.log(`Loading 3D Model for ${typeStr} (Asset ID: ${assetId} | Scale: ${scaleFactor})...`);

    // 3. Hide 2D Icon
    hiddenBillboardEntity = entity;
    entity.billboard.show = false;

    // 4. Load Tileset
    const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(assetId);
    viewer.scene.primitives.add(tileset);
    currentModelTileset = tileset;

    // 5. Sync Position Loop
    modelUpdateListener = viewer.scene.postUpdate.addEventListener(() => {
      if (!entity || !currentModelTileset) return;

      const time = viewer.clock.currentTime;
      const position = entity.position.getValue(time);

      // Get heading from userData (static for now as fetchFlights updates it)
      const heading = entity.userData.headingRad || 0;

      if (position) {
        // 1. Position Matrix (East-North-Up)
        const enuMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position);

        // 2. Rotation Matrix (Heading)
        // Standard Cesium Models face +X (East).
        // Heading 0 = North. To align, rotate +90 degrees (East -> North).
        const rotation = Cesium.Matrix3.fromHeadingPitchRoll(
          new Cesium.HeadingPitchRoll(heading + Cesium.Math.PI_OVER_TWO, 0, 0)
        );
        const rotationMatrix = Cesium.Matrix4.fromRotationTranslation(rotation);

        // 3. Scale Matrix
        const scaleMatrix = Cesium.Matrix4.fromUniformScale(scaleFactor);

        // 4. Combine: ModelMatrix = Position * Rotation * Scale
        const intermediate = Cesium.Matrix4.multiply(enuMatrix, rotationMatrix, new Cesium.Matrix4());
        const finalMatrix = Cesium.Matrix4.multiply(intermediate, scaleMatrix, new Cesium.Matrix4());

        currentModelTileset.root.transform = finalMatrix;
      }
    });

  } catch (err) {
    console.error("Failed to load aircraft model", err);
    // Restore icon if fail
    if (hiddenBillboardEntity) hiddenBillboardEntity.billboard.show = true;
  }
}

function unloadAircraftModel() {
  if (currentModelTileset) {
    viewer.scene.primitives.remove(currentModelTileset);
    currentModelTileset = null;
  }

  if (modelUpdateListener) {
    modelUpdateListener(); // Returns the remove function
    modelUpdateListener = null;
  }

  if (hiddenBillboardEntity) {
    hiddenBillboardEntity.billboard.show = true;
    hiddenBillboardEntity = null;
  }
}

// Listen for selection changes
viewer.selectedEntityChanged.addEventListener(function (selectedEntity) {
  if (Cesium.defined(selectedEntity)) {
    // User selected a plane -> Show "Back" button
    resetBtn.style.display = 'block';

    // LOAD MODEL
    // We need to fetch the type from userdata. 
    loadAircraftModel(selectedEntity);

  } else {
    // User clicked empty space -> Hide "Back" button
    resetBtn.style.display = 'none';

    // UNLOAD MODEL
    unloadAircraftModel();
  }
});

// "Back" Button Logic
resetBtn.onclick = () => {
  // 1. Clear selection
  viewer.selectedEntity = undefined; // This triggers the listener above -> unloads model

  // 2. Hide this button (redundant but safe)
  resetBtn.style.display = 'none';

  // 3. Fly back to "Sector View"
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(START_LONG, START_LAT - 0.05, 2000),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-30) }
  });
};

// Existing Buttons
document.getElementById('btn-drone').onclick = () => {
  if (helicopterTileset) {
    viewer.camera.flyToBoundingSphere(helicopterTileset.boundingSphere, {
      offset: new Cesium.HeadingPitchRange(Cesium.Math.toRadians(30), Cesium.Math.toRadians(-15), 400)
    });
  } else { alert("Asset offline"); }
};

// --- DIRECTIONAL CONTROLS ---
const offsets = {
  'N': { lat: 0.005, lon: 0, heading: 180 }, // Look South
  'S': { lat: -0.005, lon: 0, heading: 0 },   // Look North
  'E': { lat: 0, lon: 0.005, heading: 270 },  // Look West
  'W': { lat: 0, lon: -0.005, heading: 90 }   // Look East
};

function setActiveButton(id) {
  document.querySelectorAll('.direction-controls button').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function flyToView(direction) {
  const data = offsets[direction];
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(START_LONG + data.lon, START_LAT + data.lat, 600),
    orientation: { heading: Cesium.Math.toRadians(data.heading), pitch: Cesium.Math.toRadians(-20) }
  });
}

document.getElementById('btn-view-n').onclick = () => { flyToView('N'); setActiveButton('btn-view-n'); };
document.getElementById('btn-view-s').onclick = () => { flyToView('S'); setActiveButton('btn-view-s'); };
document.getElementById('btn-view-e').onclick = () => { flyToView('E'); setActiveButton('btn-view-e'); };
document.getElementById('btn-view-w').onclick = () => { flyToView('W'); setActiveButton('btn-view-w'); };

document.getElementById('btn-scan').onclick = fetchFlights;

let threatsIsolated = false;
document.getElementById('btn-threats').onclick = () => {
  const btn = document.getElementById('btn-threats');
  threatsIsolated = !threatsIsolated;

  if (threatsIsolated) {
    // ACTIVE STATE: Only show threats
    btn.style.color = '#ff9999';
    btn.style.borderColor = '#ff0000';
    btn.style.boxShadow = '0 0 10px rgba(255, 0, 0, 0.5)';
    btn.innerText = "⚠️ SHOW ALL TRAFFIC";

    // Iterate ALL entities in the viewer for robustness
    viewer.entities.values.forEach(entity => {
      // Check if it is a flight entity
      if (entity.userData && entity.userData.category === 'flight') {
        // Only show if it is a threat (in geofence)
        entity.show = !!entity.userData.inGeofence;
      }
    });

  } else {
    // INACTIVE STATE: Show everything
    btn.style.color = '';
    btn.style.borderColor = '';
    btn.style.boxShadow = '';
    btn.innerText = "ISOLATE THREATS";

    // Show all flight entities
    viewer.entities.values.forEach(entity => {
      if (entity.userData && entity.userData.category === 'flight') {
        entity.show = true;
      }
    });
  }
};

// ============================================================================
// 8. INTRO SCREEN LOGIC
// ============================================================================
const introModal = document.getElementById('intro-modal');
const initBtn = document.getElementById('btn-init-system');
const dontShowCheckbox = document.getElementById('dont-show-again');

// Check Storage
if (localStorage.getItem('cesium_demo_skip_intro') === 'true') {
  introModal.style.display = 'none';
}

// Handle Close
// Handle Close
initBtn.onclick = () => {
  if (dontShowCheckbox.checked) {
    localStorage.setItem('cesium_demo_skip_intro', 'true');
  }

  // Trigger Fade Out
  introModal.classList.add('dismissed');

  // Completely remove after transition (0.5s)
  setTimeout(() => {
    introModal.style.display = 'none';
  }, 500);
};

// ============================================================================
// 9. PROJECT INFO MODAL LOGIC
// ============================================================================
const infoBtn = document.getElementById('btn-project-info');
const infoModal = document.getElementById('info-modal');
const closeInfoBtn = document.getElementById('btn-close-info');

// Open
if (infoBtn && infoModal) {
  infoBtn.onclick = (e) => {
    e.stopPropagation(); // Prevent map click
    infoModal.style.display = 'flex';
  };
}

// Close (Button)
if (closeInfoBtn) {
  closeInfoBtn.onclick = () => {
    infoModal.style.display = 'none';
  };
}

// Close (Background Click)
if (infoModal) {
  infoModal.onclick = (e) => {
    if (e.target === infoModal) {
      infoModal.style.display = 'none';
    }
  };
}