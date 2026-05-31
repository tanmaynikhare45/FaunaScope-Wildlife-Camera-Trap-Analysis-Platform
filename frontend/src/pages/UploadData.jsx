import React, { useState, useEffect, useRef } from "react";
import { CloudUpload, Trash2, X, FolderOpen, Image as ImageIcon, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { useApi } from "../utils/api.js";
import { extractMultipleExifCoordinates } from "../utils/exifExtractor.js";
import PredictionDisplay from "../components/common/PredictionDisplay";
import FolderUpload from "../components/common/FolderUpload";
import ExportNonBlank from "../components/common/ExportNonBlank";
import { BackgroundPaths } from "../components/common/BackgroundPaths.jsx";

function UploadData() {
  const [uploadMode, setUploadMode] = useState(0);
  const [files, setFiles] = useState([]);
  const [folderData, setFolderData] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [predictions, setPredictions] = useState({});
  const [loadingPredictions, setLoadingPredictions] = useState({});
  const [selectedFileForPreview, setSelectedFileForPreview] = useState(null);
  const { makeRequest } = useApi();
  
  const pollingIntervalsRef = useRef({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      Object.values(pollingIntervalsRef.current).forEach(interval => {
        clearInterval(interval);
      });
    };
  }, []);

  const pollPredictions = async (mediaId) => {
    try {
      const result = await makeRequest(`predictions/${mediaId}`);
      if (result) {
        console.log(`📌 Predictions received for ${mediaId}:`, result);
        console.log(`   Latitude: ${result.latitude}, Longitude: ${result.longitude}`);
        setPredictions(prev => ({ ...prev, [mediaId]: result }));
        setLoadingPredictions(prev => ({ ...prev, [mediaId]: false }));
        return true;
      }
      return false;
    } catch (err) {
      if (err.status === 404) return false;
      console.error(`Error polling predictions for ${mediaId}:`, err);
      setLoadingPredictions(prev => ({ ...prev, [mediaId]: false }));
      return true;
    }
  };

  const startPolling = (mediaId) => {
    let attempts = 0;
    const maxAttempts = 60;
    const pollInterval = 1000;
    
    setLoadingPredictions(prev => ({ ...prev, [mediaId]: true }));
    
    const interval = setInterval(async () => {
      attempts++;
      const found = await pollPredictions(mediaId);
      
      if (found || attempts >= maxAttempts) {
        clearInterval(interval);
        delete pollingIntervalsRef.current[mediaId];
        
        if (attempts >= maxAttempts && !found) {
          console.warn(`Polling timeout for media ${mediaId}`);
          setLoadingPredictions(prev => ({ ...prev, [mediaId]: false }));
        }
      }
    }, pollInterval);
    
    pollingIntervalsRef.current[mediaId] = interval;
  };

  const handleTabChange = (newValue) => {
    setUploadMode(newValue);
    setFiles([]);
    setFolderData(null);
    setError(null);
  };

  const handleFolderSelect = (data) => {
    setFolderData(data);
    setFiles(data.files);
  };

  const handleFolderClear = () => {
    setFolderData(null);
    setFiles([]);
  };

  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files);
    const validFiles = selectedFiles.filter(file => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) console.warn(`Skipping non-image file: ${file.name}`);
      return isImage;
    });
    
    if (validFiles.length !== selectedFiles.length) {
      setError(`${selectedFiles.length - validFiles.length} non-image file(s) skipped`);
      setTimeout(() => setError(null), 3000);
    }
    
    setFiles(validFiles);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    const filesToUpload = uploadMode === 1 && folderData ? folderData.files : files;
    if (filesToUpload.length === 0) return;
    
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Extract EXIF coordinates from all files
      console.log("🌍 Extracting EXIF coordinates from uploaded images...");
      const exifResults = await extractMultipleExifCoordinates(filesToUpload);
      
      console.log("📍 EXIF Results:", exifResults);
      exifResults.forEach((result, idx) => {
        if (result.hasGPS) {
          console.log(`✅ ${result.file.name}: lat=${result.latitude}, lon=${result.longitude}`);
        } else {
          console.log(`⚠️  ${result.file.name}: No GPS data (will use fallback)`);
        }
      });
      
      const fileNames = filesToUpload.map(f => 
        uploadMode === 1 ? (f.webkitRelativePath || f.name) : f.name
      );
      
      const presignResp = await makeRequest(`media/presign-batch`, {
        method: "POST",
        body: JSON.stringify({ file_names: fileNames })
      });

      let presigns = Array.isArray(presignResp) ? presignResp : presignResp?.files || [];
      if (presigns.length !== filesToUpload.length) {
        throw new Error(`Mismatch: ${filesToUpload.length} files but ${presigns.length} presigned URLs`);
      }

      const uploads = presigns.map((item, idx) => ({
        file: filesToUpload[idx],
        upload_url: item.upload_url,
        file_url: item.file_url,
        file_type: "image",
        folder_path: uploadMode === 1 ? (filesToUpload[idx].webkitRelativePath || filesToUpload[idx].name) : null,
        latitude: exifResults[idx].latitude,
        longitude: exifResults[idx].longitude
      }));

      let completedUploads = 0;
      await Promise.all(uploads.map(async (u) => {
        const contentType = u.file.type || "image/jpeg";
        const res = await fetch(u.upload_url, {
          method: "PUT",
          headers: { "Content-Type": contentType },
          body: u.file
        });
        
        if (!res.ok) {
          const errorText = await res.text().catch(() => 'Unknown error');
          throw new Error(`S3 upload failed for ${u.file.name}: ${res.status} ${errorText}`);
        }
        
        completedUploads++;
        setUploadProgress((completedUploads / uploads.length) * 100);
      }));

      const batchPayload = {
        files: uploads.map(u => ({ 
          file_url: u.file_url, 
          file_type: u.file_type,
          folder_path: u.folder_path,
          latitude: u.latitude,
          longitude: u.longitude
        }))
      };
      
      console.log("📤 Sending batch to backend:", batchPayload);
      
      const dbResp = await makeRequest("media/batch", {
        method: "POST",
        body: JSON.stringify(batchPayload)
      });

      const uploadedFilesArray = Array.isArray(dbResp) ? dbResp : dbResp?.files || [];
      if (uploadedFilesArray.length === 0) throw new Error('No files returned from backend');

      console.log("✅ Upload successful. Files:", uploadedFilesArray);
      
      setUploadedFiles(prev => [...uploadedFilesArray, ...prev]);
      setFiles([]);
      setFolderData(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      uploadedFilesArray.forEach(file => {
        if (file.id) {
          console.log(`📌 File ${file.id} stored at: lat=${file.latitude}, lon=${file.longitude}`);
          startPolling(file.id);
        }
      });
      
    } catch (err) {
      console.error("❌ Upload error:", err);
      setError(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const removeUploadedFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    setPredictions(prev => {
      const newPreds = { ...prev };
      delete newPreds[fileId];
      return newPreds;
    });
    if (pollingIntervalsRef.current[fileId]) {
      clearInterval(pollingIntervalsRef.current[fileId]);
      delete pollingIntervalsRef.current[fileId];
    }
    if (selectedFileForPreview?.id === fileId) {
      setSelectedFileForPreview(null);
    }
  };

  const openPreview = (file) => {
    setSelectedFileForPreview(file);
  };

  const closePreview = () => {
    setSelectedFileForPreview(null);
  };

  return (
    <div className="upload-container relative min-h-screen">
      {/* Wildlife background pattern */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <BackgroundPaths />
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 relative z-10">
        
        {/* Header */}
        <div className="upload-section text-center mb-8 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold text-green-800 mb-2 animate-slide-up">
            Wildlife Image Analysis
          </h1>
          <p className="text-green-700 text-lg animate-slide-up" style={{animationDelay: '0.1s'}}>
            Upload images and let AI detect animals automatically
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center animate-slide-up" style={{animationDelay: '0.2s'}}>
          <div className="upload-form rounded-xl shadow-lg p-1.5 inline-flex gap-2">
            <button
              onClick={() => handleTabChange(0)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                uploadMode === 0
                  ? "bg-green-800 text-white shadow-lg scale-105"
                  : "text-gray-600 hover:bg-gray-50 hover:scale-105"
              }`}
            >
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Upload Files
              </div>
            </button>
            <button
              onClick={() => handleTabChange(1)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                uploadMode === 1
                  ? "bg-green-800 text-white shadow-lg scale-105"
                  : "text-gray-600 hover:bg-gray-50 hover:scale-105"
              }`}
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                Upload Folder
              </div>
            </button>
          </div>
        </div>

        {/* Upload Area */}
        <div className="upload-form rounded-xl shadow-lg p-6 animate-slide-up" style={{animationDelay: '0.3s'}}>
          {uploadMode === 0 ? (
            // File Upload Mode
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 px-6 py-3 bg-green-800 text-white rounded-lg hover:bg-green-900 transition-all cursor-pointer shadow-md hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
                  <CloudUpload className="w-5 h-5" />
                  <span className="font-semibold">Select Images</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>

                {files.length > 0 && (
                  <>
                    <button
                      onClick={uploadFiles}
                      disabled={isUploading}
                      className="flex items-center gap-2 px-6 py-3 bg-green-800 text-white rounded-lg hover:bg-green-900 transition-all shadow-md hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="font-semibold">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <CloudUpload className="w-5 h-5" />
                          <span className="font-semibold">Upload {files.length} {files.length === 1 ? 'File' : 'Files'}</span>
                        </>
                      )}
                    </button>

                    {!isUploading && (
                      <button
                        onClick={() => {
                          setFiles([]);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="px-4 py-3 text-gray-600 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all transform hover:scale-105"
                      >
                        Clear All
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            // Folder Upload Mode
            <div className="space-y-6">
              <div className="border-2 border-dashed border-green-300 rounded-xl p-6 bg-green-50">
                <FolderUpload
                  onFolderSelect={handleFolderSelect}
                  onClear={handleFolderClear}
                  disabled={isUploading}
                />
              </div>
              
              {folderData && (
                <div className="bg-white border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-green-800 flex items-center gap-2">
                        <FolderOpen className="w-5 h-5" />
                        Selected Folder
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {folderData.folderName} • {folderData.files.length} images
                      </p>
                    </div>
                    <button
                      onClick={handleFolderClear}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      disabled={isUploading}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
              
              {folderData && folderData.files.length > 0 && (
                <button
                  onClick={uploadFiles}
                  disabled={isUploading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-800 text-white rounded-xl hover:bg-green-900 transition-all shadow-md hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="font-semibold text-lg">Uploading {Math.round(uploadProgress)}%...</span>
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-5 h-5" />
                      <span className="font-semibold text-lg">
                        Upload Folder ({folderData.files.length} images)
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Progress Bar */}
          {isUploading && uploadProgress > 0 && (
            <div className="mt-4 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Upload Progress</span>
                <span className="text-sm font-bold text-green-800">{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                <div
                  className="h-full bg-green-800 transition-all duration-300 ease-out relative overflow-hidden"
                  style={{ width: `${uploadProgress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
                </div>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg flex items-start gap-3 animate-shake shadow-md">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                <X className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-sm text-red-800 flex-1 font-medium">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 transition-colors transform hover:scale-110">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Selected Files Preview */}
        {uploadMode === 0 && files.length > 0 && (
          <div className="upload-form rounded-xl shadow-lg p-6 animate-slide-up" style={{animationDelay: '0.4s'}}>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ImageIcon className="w-6 h-6 text-green-800" />
              Selected Files ({files.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all group transform hover:scale-[1.02] shadow-sm hover:shadow-md"
                >
                  <ImageIcon className="w-5 h-5 text-green-800 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    disabled={isUploading}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-0 transform hover:scale-110"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Uploaded Files Grid */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-4 animate-slide-up" style={{animationDelay: '0.5s'}}>
            <div className="flex items-center justify-between upload-form rounded-xl shadow-lg p-5">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <CheckCircle className="w-7 h-7 text-green-800" />
                Uploaded Files ({uploadedFiles.length})
              </h2>
              <ExportNonBlank 
                uploadedFiles={uploadedFiles}
                predictions={predictions}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {uploadedFiles.map((file, index) => (
                <div
                  key={file.id}
                  className="upload-form rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-gray-200 hover:border-green-800 animate-scale-in transform hover:scale-[1.03] cursor-pointer relative group"
                  style={{animationDelay: `${index * 0.05}s`}}
                  onClick={() => openPreview(file)}
                >
                  <div className="relative">
                    <img
                      src={file.file_url}
                      alt="Uploaded"
                      className="w-full h-40 object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="hidden w-full h-40 bg-gradient-to-br from-gray-100 to-gray-200 items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeUploadedFile(file.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 transform hover:scale-110"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Loading overlay */}
                    {loadingPredictions[file.id] && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="p-2">
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      {file.file_url.split('/').pop()}
                    </p>
                    {predictions[file.id] && (
                      <div className="mt-1">
                        {predictions[file.id].classification === "blank" ? (
                          <span className="text-xs text-gray-500">Blank</span>
                        ) : predictions[file.id].classification === "non-blank" ? (
                          <span className="text-xs text-green-800 font-semibold">
                            {(predictions[file.id].confidence * 100).toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-xs text-red-500">Error</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Full Screen Preview Modal */}
      {selectedFileForPreview && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={closePreview}
        >
          <button
            onClick={closePreview}
            className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 transition-all z-10"
          >
            <X className="w-6 h-6" />
          </button>

          <div 
            className="max-w-7xl w-full grid md:grid-cols-2 gap-4 max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center bg-gray-900 rounded-lg">
              <img
                src={selectedFileForPreview.file_url}
                alt="Preview"
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            </div>

            <div className="bg-white rounded-lg overflow-hidden">
              <PredictionDisplay 
                prediction={predictions[selectedFileForPreview.id]} 
                loading={loadingPredictions[selectedFileForPreview.id]} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadData;