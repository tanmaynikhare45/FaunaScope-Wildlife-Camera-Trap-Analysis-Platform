import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  Cancel,
  Error as ErrorIcon,
  Warning,
} from "@mui/icons-material";

function PredictionDisplay({ prediction, loading, onLocationUpdate }) {
  const [manualLat, setManualLat] = useState("");
  const [manualLon, setManualLon] = useState("");
  const [manualSaved, setManualSaved] = useState(false);
  const [manualError, setManualError] = useState("");

  // Reset manual fields when prediction changes
  useEffect(() => {
    setManualLat("");
    setManualLon("");
    setManualSaved(false);
    setManualError("");
  }, [prediction?.media_id]);

  useEffect(() => {
    if (prediction) {
      console.log("PredictionDisplay received:", prediction);
      console.log("Latitude:", prediction.latitude);
      console.log("Longitude:", prediction.longitude);
    }
  }, [prediction]);

  const handleManualSave = () => {
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setManualError("Latitude must be between -90 and 90");
      return;
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      setManualError("Longitude must be between -180 and 180");
      return;
    }
    setManualError("");
    setManualSaved(true);
    if (onLocationUpdate) onLocationUpdate(lat, lon);
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 rounded-lg p-8">
        <div className="animate-spin rounded-full border-4 border-gray-200 border-t-green-800 h-16 w-16 mb-4" />
        <span className="text-gray-600 text-lg font-medium">Processing image...</span>
        <span className="text-gray-500 text-sm mt-2">Analyzing content</span>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 rounded-lg p-8">
        <div className="text-gray-400 mb-4">
          <CheckCircle className="text-4xl" />
        </div>
        <span className="text-gray-500 text-lg font-medium">Waiting for image</span>
        <span className="text-gray-400 text-sm mt-2">Upload an image to get predictions</span>
      </div>
    );
  }

  const classification = prediction.classification || "unknown";
  const confidence = prediction.confidence || 0;
  const species = prediction.species || "";
  const predictions = prediction.predictions || [];

  const speciesList = typeof species === "string"
    ? species.split(",").filter(Boolean)
    : Array.isArray(species) ? species : [];

  const predictionsList = typeof predictions === "string"
    ? (() => {
        try { return JSON.parse(predictions); } catch { return []; }
      })()
    : Array.isArray(predictions) ? predictions : [];

  const isBlank = classification === "blank";
  const isNonBlank = classification === "non-blank";
  const isError = classification === "error";

  // Get the highest confidence prediction
  const topPrediction = predictionsList.length > 0 
    ? predictionsList.reduce((max, current) => 
        (current.confidence || 0) > (max.confidence || 0) ? current : max
      )
    : null;

  const confidencePercentage = (confidence * 100).toFixed(1);
  const needsHumanReview = confidence < 0.85;
  const displayName = topPrediction?.class_name || topPrediction?.name || "Unknown";

  // Dynamic entity type detection
  const getEntityType = () => {
    if (!topPrediction) return "Object";
    
    const entityName = displayName.toLowerCase();
    
    // Animal detection
    if (entityName.includes('animal') || 
        entityName.includes('bird') || 
        entityName.includes('mammal') ||
        entityName.includes('reptile') ||
        entityName.includes('fish') ||
        entityName.includes('insect') ||
        entityName.includes('dog') ||
        entityName.includes('cat') ||
        entityName.includes('elephant') ||
        entityName.includes('tiger') ||
        entityName.includes('lion')) {
      return "Animal";
    }
    
    // Vehicle detection
    if (entityName.includes('vehicle') || 
        entityName.includes('car') || 
        entityName.includes('truck') ||
        entityName.includes('motorcycle') ||
        entityName.includes('bicycle') ||
        entityName.includes('bus')) {
      return "Vehicle";
    }
    
    // Person detection
    if (entityName.includes('person') || 
        entityName.includes('human') || 
        entityName.includes('face') ||
        entityName.includes('people')) {
      return "Person";
    }
    
    // Plant detection
    if (entityName.includes('plant') || 
        entityName.includes('tree') || 
        entityName.includes('flower') ||
        entityName.includes('leaf') ||
        entityName.includes('vegetation')) {
      return "Plant";
    }
    
    // Structure detection
    if (entityName.includes('building') || 
        entityName.includes('house') || 
        entityName.includes('structure') ||
        entityName.includes('bridge') ||
        entityName.includes('road')) {
      return "Structure";
    }
    
    return "Object";
  };

  const entityType = getEntityType();
  const entityTypePlural = entityType === "Person" ? "People" : `${entityType}s`;

  return (
    <div className="w-full h-full bg-gray-50 rounded-lg p-6">
      {/* Error State */}
      {isError && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 rounded-lg p-8">
          <ErrorIcon className="text-red-500 text-5xl mb-4" />
          <span className="text-red-700 text-xl font-bold mb-2">Processing Error</span>
          <span className="text-red-600 text-center">
            Unable to process the image. Please try again with a different image.
          </span>
        </div>
      )}

      {/* Blank Image */}
      {isBlank && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 rounded-lg p-8">
          <Cancel className="text-gray-500 text-5xl mb-4" />
          <span className="text-gray-700 text-xl font-bold mb-2">Blank Image</span>
          <span className="text-gray-600 text-center">
            No content detected in this image
          </span>
          <div className="mt-4 bg-gray-300 text-gray-700 px-4 py-2 rounded-full text-sm font-medium">
            Confidence: {confidencePercentage}%
          </div>
        </div>
      )}

      {/* Entity Detected */}
      {isNonBlank && (
        <div className="w-full h-full flex flex-col">
          {/* Header */}
          <div className={`flex items-center gap-4 p-6 rounded-t-lg ${
            needsHumanReview 
              ? "bg-yellow-50 border-b border-yellow-200"
              : "bg-green-50 border-b border-green-200"
          }`}>
            <div className={`p-3 rounded-full ${
              needsHumanReview ? "bg-yellow-100" : "bg-green-100"
            }`}>
              {needsHumanReview ? (
                <Warning className="text-yellow-600 text-3xl" />
              ) : (
                <CheckCircle className="text-green-800 text-3xl" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl font-bold text-gray-900">
                  {entityType} Detected
                </span>
                {needsHumanReview && (
                  <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Human Review Needed
                  </span>
                )}
              </div>
              <div className="text-gray-600">
                {needsHumanReview 
                  ? "Low confidence prediction requires verification"
                  : "High confidence prediction"
                }
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 space-y-6">
            {/* Confidence Meter */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <span className="text-lg font-semibold text-gray-900">Confidence Level</span>
                <span className={`text-2xl font-bold ${
                  confidence >= 0.85 ? "text-green-800" : 
                  confidence >= 0.7 ? "text-yellow-600" : "text-red-600"
                }`}>
                  {confidencePercentage}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className={`h-4 rounded-full ${
                    confidence >= 0.85 ? "bg-green-800" : 
                    confidence >= 0.7 ? "bg-yellow-500" : "bg-red-500"
                  }`}
                  style={{ width: `${confidencePercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>

            {/* Primary Detection */}
            {topPrediction && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Primary Detection</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-bold text-gray-900 block">
                      {displayName}
                    </span>
                    <span className="text-gray-500 text-sm">
                      Most confident prediction
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-green-800 block">
                      {((topPrediction.confidence || 0) * 100).toFixed(1)}%
                    </span>
                    <span className="text-gray-500 text-sm">confidence</span>
                  </div>
                </div>
              </div>
            )}

            {/* Species/Entities List */}
            {speciesList.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {entityTypePlural} Identified
                </h3>
                <div className="flex flex-wrap gap-2">
                  {speciesList.map((sp, idx) => (
                    <span
                      key={idx}
                      className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium border border-green-200"
                    >
                      {sp.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Location Information */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 shadow-sm border border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">📍</span>
                <span>Location Information</span>
              </h3>

              {/* Effective coordinates: from prediction or from manual entry */}
              {(() => {
                const effLat = (prediction.latitude !== undefined && prediction.latitude !== null)
                  ? prediction.latitude
                  : (manualSaved ? parseFloat(manualLat) : null);
                const effLon = (prediction.longitude !== undefined && prediction.longitude !== null)
                  ? prediction.longitude
                  : (manualSaved ? parseFloat(manualLon) : null);
                const fromExif = prediction.latitude !== undefined && prediction.latitude !== null;

                if (effLat !== null && effLon !== null) {
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                          <span className="text-gray-600 text-sm block mb-1 font-medium">Latitude</span>
                          <span className="text-2xl font-bold text-blue-900 block font-mono">
                            {typeof effLat === 'string' ? parseFloat(effLat).toFixed(6) : effLat.toFixed(6)}
                          </span>
                          <span className="text-xs text-gray-500 block mt-1">
                            {fromExif ? 'From EXIF' : 'Manually entered'}
                          </span>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                          <span className="text-gray-600 text-sm block mb-1 font-medium">Longitude</span>
                          <span className="text-2xl font-bold text-blue-900 block font-mono">
                            {typeof effLon === 'string' ? parseFloat(effLon).toFixed(6) : effLon.toFixed(6)}
                          </span>
                          <span className="text-xs text-gray-500 block mt-1">
                            {fromExif ? 'From EXIF' : 'Manually entered'}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-blue-100 mb-3">
                        <p className="text-sm text-gray-700"><strong>📌 GPS Coordinates:</strong></p>
                        <p className="text-sm font-mono text-blue-900 mt-1">
                          {(typeof effLat === 'string' ? parseFloat(effLat) : effLat).toFixed(6)},{" "}
                          {(typeof effLon === 'string' ? parseFloat(effLon) : effLon).toFixed(6)}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          ✓ Source: {fromExif ? 'EXIF Metadata' : 'Manual Entry'}
                        </p>
                      </div>
                      <a
                        href={`https://maps.google.com/?q=${typeof effLat === 'string' ? parseFloat(effLat) : effLat},${typeof effLon === 'string' ? parseFloat(effLon) : effLon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block w-full text-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        🗺️ View on Map
                      </a>
                      {/* Allow re-editing manual coords */}
                      {!fromExif && (
                        <button
                          onClick={() => setManualSaved(false)}
                          className="mt-2 w-full text-center text-xs text-blue-600 hover:underline"
                        >
                          Edit coordinates
                        </button>
                      )}
                    </>
                  );
                }

                // No GPS — show manual entry form
                return (
                  <div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-white p-4 rounded-lg border border-red-100 shadow-sm">
                        <span className="text-gray-600 text-sm block mb-1 font-medium">Latitude</span>
                        <span className="text-lg font-bold text-red-400 block font-mono">Not detected</span>
                        <span className="text-xs text-gray-400 block mt-1">No GPS data in image</span>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-red-100 shadow-sm">
                        <span className="text-gray-600 text-sm block mb-1 font-medium">Longitude</span>
                        <span className="text-lg font-bold text-red-400 block font-mono">Not detected</span>
                        <span className="text-xs text-gray-400 block mt-1">No GPS data in image</span>
                      </div>
                    </div>

                    {/* Manual entry */}
                    <div className="bg-white rounded-lg border border-blue-200 p-4">
                      <p className="text-sm font-semibold text-gray-700 mb-3">
                        📝 Enter coordinates manually
                      </p>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Latitude (-90 to 90)</label>
                          <input
                            type="number"
                            step="any"
                            min="-90"
                            max="90"
                            placeholder="e.g. 28.6139"
                            value={manualLat}
                            onChange={(e) => { setManualLat(e.target.value); setManualError(""); }}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Longitude (-180 to 180)</label>
                          <input
                            type="number"
                            step="any"
                            min="-180"
                            max="180"
                            placeholder="e.g. 77.2090"
                            value={manualLon}
                            onChange={(e) => { setManualLon(e.target.value); setManualError(""); }}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </div>
                      </div>
                      {manualError && (
                        <p className="text-xs text-red-500 mb-2">{manualError}</p>
                      )}
                      <button
                        onClick={handleManualSave}
                        disabled={!manualLat || !manualLon}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Save Location
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Additional Info */}
            {predictionsList.length > 1 && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-center text-gray-600 text-sm">
                  + {predictionsList.length - 1} more detection(s) available
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Debug info */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg border border-gray-300">
          <div className="text-xs text-gray-700 font-mono overflow-auto">
            <pre>{JSON.stringify(prediction, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default PredictionDisplay;