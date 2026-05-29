import React, { useState, useRef } from "react";
import {
  FolderOpen,
  ExpandMore,
  ExpandLess,
  Image as ImageIcon,
  Close,
} from "@mui/icons-material";

function FolderUpload({ onFolderSelect, onClear, disabled = false }) {
  const [folderStructure, setFolderStructure] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const fileInputRef = useRef(null);

  const parseFilesToStructure = (files) => {
    const structure = {
      name: "root",
      path: "",
      folders: {},
      files: [],
      totalFiles: 0,
      totalSize: 0,
    };

    files.forEach((file) => {
      const path = file.webkitRelativePath || file.name;
      const parts = path.split("/");
      const fileName = parts[parts.length - 1];
      const folderPath = parts.slice(0, -1);

      if (!file.type.startsWith("image/")) return;

      structure.totalFiles++;
      structure.totalSize += file.size;

      let currentLevel = structure;
      folderPath.forEach((folderName, index) => {
        if (!currentLevel.folders[folderName]) {
          currentLevel.folders[folderName] = {
            name: folderName,
            path: folderPath.slice(0, index + 1).join("/"),
            folders: {},
            files: [],
            totalFiles: 0,
            totalSize: 0,
          };
        }
        currentLevel = currentLevel.folders[folderName];
        currentLevel.totalFiles++;
        currentLevel.totalSize += file.size;
      });

      currentLevel.files.push({
        name: fileName,
        path: path,
        size: file.size,
        type: file.type,
        file: file,
      });
    });

    return structure;
  };

  const handleFolderSelect = (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    const structure = parseFilesToStructure(files);
    setFolderStructure(structure);

    const rootFolders = Object.keys(structure.folders);
    setExpandedFolders(new Set(rootFolders.map((f) => structure.folders[f].path)));

    if (onFolderSelect) {
      onFolderSelect({
        structure,
        files: files.filter((f) => f.type.startsWith("image/")),
      });
    }
  };

  const toggleFolder = (path) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) newExpanded.delete(path);
    else newExpanded.add(path);
    setExpandedFolders(newExpanded);
  };

  const handleClear = () => {
    setFolderStructure(null);
    setExpandedFolders(new Set());
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (onClear) onClear();
  };

  const renderFolder = (folder, level = 0) => {
    const isExpanded = expandedFolders.has(folder.path);
    const hasSubfolders = Object.keys(folder.folders).length > 0;
    const hasFiles = folder.files.length > 0;

    return (
      <div key={folder.path}>
        {folder.name !== "root" && (
          <div
            className={`flex items-center pl-${level * 3} py-1 cursor-pointer hover:bg-gray-100`}
            onClick={() => (hasSubfolders || hasFiles) && toggleFolder(folder.path)}
          >
            <FolderOpen className="text-yellow-500 mr-2" />
            <div className="flex-1">
              <div className="font-medium text-gray-800">{folder.name}</div>
              <div className="text-xs text-gray-500">
                {folder.totalFiles} images • {(folder.totalSize / 1024).toFixed(1)} KB
              </div>
            </div>
            {hasSubfolders || hasFiles ? (
              isExpanded ? <ExpandLess /> : <ExpandMore />
            ) : null}
          </div>
        )}

        {(folder.name === "root" || isExpanded) && (
          <div className="pl-3">
            {hasSubfolders &&
              Object.values(folder.folders).map((subfolder) =>
                renderFolder(subfolder, level + 1)
              )}
            {hasFiles &&
              folder.files.map((file) => (
                <div
                  key={file.path}
                  className={`flex items-center pl-${level + 1} py-1`}
                >
                  <ImageIcon className="text-gray-400 mr-2 text-sm" />
                  <div className="flex-1">
                    <div className="text-sm text-gray-700">{file.name}</div>
                    <div className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <label
          className={`flex items-center gap-2 border border-gray-300 px-3 py-1 rounded cursor-pointer ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <FolderOpen />
          <span>Select Folder</span>
          <input
            ref={fileInputRef}
            type="file"
            webkitdirectory="true"
            directory="true"
            multiple
            onChange={handleFolderSelect}
            className="hidden"
            disabled={disabled}
          />
        </label>

        {folderStructure && (
          <div
            className="px-2 py-1 border border-blue-500 rounded text-blue-600 cursor-pointer"
            onClick={handleClear}
          >
            {folderStructure.totalFiles} images selected &times;
          </div>
        )}
      </div>

      {folderStructure && folderStructure.totalFiles > 0 && (
        <div className="border border-gray-300 rounded p-2 max-h-96 overflow-auto">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold">Folder Structure:</span>
            <button onClick={handleClear}>
              <Close fontSize="small" />
            </button>
          </div>
          <div>{renderFolder(folderStructure)}</div>
        </div>
      )}

      {folderStructure && folderStructure.totalFiles === 0 && (
        <div className="text-sm text-gray-500 mt-2">
          No image files found in the selected folder.
        </div>
      )}
    </div>
  );
}

export default FolderUpload;
