import React, { useState } from "react";
import { Download, X, CheckCircle, AlertCircle, FileArchive } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";

function ExportNonBlank({ uploadedFiles, predictions }) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const { getToken } = useAuth();

  // Filter non-blank images
  const getNonBlankImages = () => {
    return uploadedFiles.filter(file => {
      const pred = predictions[file.id];
      return pred && pred.classification === "non-blank";
    });
  };

  const nonBlankImages = getNonBlankImages();
  
  // Download ZIP file from backend
  const handleDownloadZip = async () => {
  if (nonBlankImages.length === 0) return;

  setDownloading(true);
  setError(null);

  try {
    const API_BASE_URL = 'http://localhost:8000/api';

    // Call getToken from the top-level hook
    const token = await getToken();

    const response = await fetch(`${API_BASE_URL}/media/export/zip`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Export failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `non_blank_images_${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    setOpen(false);
  } catch (err) {
    console.error("ZIP download failed:", err);
    setError(err.message || "Failed to download ZIP file");
  } finally {
    setDownloading(false);
  }
};

  // Download CSV metadata
  const downloadMetadataCSV = async () => {
    try {
    const token = await getToken();

    const response = await fetch('http://localhost:8000/api/media/export/csv', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('CSV export failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `non_blank_metadata_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    console.error("CSV download failed:", err);
    setError("Failed to download CSV");
  }
};

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        disabled={nonBlankImages.length === 0}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
          nonBlankImages.length === 0
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-green-800 text-white hover:bg-green-900 shadow-md hover:shadow-lg transform hover:scale-105"
        }`}
      >
        <Download className="w-5 h-5" />
        Export Non-Blank ({nonBlankImages.length})
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={() => !downloading && setOpen(false)}
          />
          
          {/* Dialog */}
          <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-green-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Export Non-Blank Images
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Download as ZIP with organized folders
                </p>
              </div>
              <button
                onClick={() => !downloading && setOpen(false)}
                disabled={downloading}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 p-2 hover:bg-white rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 animate-shake">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                    <button 
                      onClick={() => setError(null)}
                      className="text-xs text-red-600 hover:text-red-800 mt-1"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  Found <span className="font-bold text-green-800">{nonBlankImages.length}</span> non-blank images with animal detections.
                </p>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Total Uploaded</p>
                    <p className="text-3xl font-bold text-gray-900">{uploadedFiles.length}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <p className="text-sm text-green-700 mb-1">Non-Blank</p>
                    <p className="text-3xl font-bold text-green-900">{nonBlankImages.length}</p>
                  </div>
                </div>

                {/* ZIP Info */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                  <div className="flex items-start gap-3">
                    <FileArchive className="w-5 h-5 text-green-800 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900 mb-1">
                        ZIP Archive Contents:
                      </p>
                      <ul className="text-xs text-green-800 space-y-1">
                        <li>• All non-blank images organized by species or folder</li>
                        <li>• metadata.csv with detection details</li>
                        <li>• Preserved folder structure (if uploaded as folder)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Image List Preview */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Images to Export ({nonBlankImages.length}):
                </h3>
                <div className="max-h-64 overflow-y-auto border rounded-lg bg-gray-50">
                  {nonBlankImages.slice(0, 10).map(file => {
                    const pred = predictions[file.id];
                    return (
                      <div key={file.id} className="p-3 border-b last:border-b-0 hover:bg-white transition-colors">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-800 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.file_url.split('/').pop()}
                            </p>
                            <div className="flex gap-2 mt-1 flex-wrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                {pred.species || "Unknown"}
                              </span>
                              <span className="text-xs text-gray-500">
                                {(pred.confidence * 100).toFixed(1)}% confident
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {nonBlankImages.length > 10 && (
                    <div className="p-3 text-center text-sm text-gray-500 bg-gray-100">
                      + {nonBlankImages.length - 10} more images
                    </div>
                  )}
                </div>
              </div>

              {/* Download Progress */}
              {downloading && (
                <div className="mb-6 animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Preparing ZIP archive...</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-green-800 animate-pulse" style={{width: '100%'}} />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">This may take a moment for large collections</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={downloadMetadataCSV}
                disabled={downloading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Download CSV Only
              </button>
              <button
                onClick={handleDownloadZip}
                disabled={downloading || nonBlankImages.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-green-800 rounded-lg hover:bg-green-900 transition-all shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {downloading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Preparing ZIP...
                  </>
                ) : (
                  <>
                    <FileArchive className="w-4 h-4" />
                    Download ZIP Archive
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { 
            opacity: 0;
            transform: scale(0.95);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </>
  );
}

export default ExportNonBlank;