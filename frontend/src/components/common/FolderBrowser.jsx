import React, { useState, useEffect } from "react";
import { Folder, Image, ChevronRight, Home, FolderOpen, File, Loader2 } from "lucide-react";
import { useApi } from "../../utils/api.js";

function FolderBrowser({ onFolderSelect }) {
  const [folders, setFolders] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { makeRequest } = useApi();

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const response = await makeRequest("media/folders");
      setFolders(response.folders || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching folders:", err);
      setError("Failed to load folders");
    } finally {
      setLoading(false);
    }
  };

  const buildFolderTree = () => {
    const tree = {};
    folders.forEach((folderPath) => {
      const parts = folderPath.split("/").filter(part => part.trim() !== "");
      let current = tree;
      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = {
            name: part,
            path: parts.slice(0, index + 1).join("/"),
            children: {},
            isLeaf: index === parts.length - 1,
            hasChildren: index < parts.length - 1
          };
        }
        current = current[part].children;
      });
    });
    return tree;
  };

  const getCurrentLevelFolders = () => {
    const tree = buildFolderTree();
    let current = tree;
    currentPath.forEach((pathPart) => {
      if (current[pathPart]) current = current[pathPart].children;
    });
    return Object.values(current).sort((a, b) => {
      // Folders first, then files
      if (a.isLeaf && !b.isLeaf) return 1;
      if (!a.isLeaf && b.isLeaf) return -1;
      return a.name.localeCompare(b.name);
    });
  };

  const handleFolderClick = (folder) => {
    if (folder.isLeaf && onFolderSelect) {
      onFolderSelect(folder.path);
    } else {
      setCurrentPath([...currentPath, folder.name]);
    }
  };

  const handleBreadcrumbClick = (index) => {
    setCurrentPath(currentPath.slice(0, index));
  };

  const formatFolderName = (name) => {
    return name.replace(/_/g, ' ').replace(/-/g, ' ');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <div className="text-center">
            <p className="text-gray-900 font-medium">Loading folders</p>
            <p className="text-gray-500 text-sm">Organizing your directory structure...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <File className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Folders</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchFolders}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FolderOpen className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Folders Yet</h3>
        <p className="text-gray-600 mb-4">Upload folders to organize your wildlife images</p>
        <div className="text-sm text-gray-500">
          Supported formats: Camera trap folders, research datasets
        </div>
      </div>
    );
  }

  const currentFolders = getCurrentLevelFolders();

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Folder Browser</h2>
            <p className="text-sm text-gray-600">Navigate through your uploaded folders</p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Folder className="w-4 h-4" />
            <span>{folders.length} folders</span>
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-gray-100 px-6 py-3">
        <nav className="flex items-center space-x-2 text-sm">
          <button
            onClick={() => setCurrentPath([])}
            className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors px-2 py-1 rounded hover:bg-gray-50"
          >
            <Home className="w-4 h-4" />
            <span>Root</span>
          </button>
          
          {currentPath.map((part, index) => (
            <div key={index} className="flex items-center space-x-2">
              <ChevronRight className="w-4 h-4 text-gray-300" />
              <button
                onClick={() => handleBreadcrumbClick(index + 1)}
                className="text-gray-600 hover:text-gray-900 transition-colors px-2 py-1 rounded hover:bg-gray-50"
              >
                {formatFolderName(part)}
              </button>
            </div>
          ))}
        </nav>
      </div>

      {/* Folder List */}
      <div className="p-4">
        {currentFolders.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Empty Folder</h3>
            <p className="text-gray-600">This folder doesn't contain any subfolders or images</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {currentFolders.map((folder, index) => (
              <div
                key={folder.path}
                onClick={() => handleFolderClick(folder)}
                className={`group flex items-center space-x-4 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer ${
                  folder.isLeaf 
                    ? 'bg-white hover:bg-blue-50' 
                    : 'bg-gray-50 hover:bg-blue-50'
                }`}
              >
                <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                  folder.isLeaf 
                    ? 'bg-blue-100 text-blue-600 group-hover:bg-blue-200' 
                    : 'bg-green-100 text-green-600 group-hover:bg-green-200'
                } transition-colors`}>
                  {folder.isLeaf ? (
                    <Image className="w-6 h-6" />
                  ) : (
                    <Folder className="w-6 h-6" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-700 transition-colors truncate">
                      {formatFolderName(folder.name)}
                    </h3>
                    {!folder.isLeaf && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full font-medium">
                        Folder
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1 truncate">
                    {folder.isLeaf ? 'Image collection' : 'Contains subfolders and files'}
                  </p>
                </div>
                
                <div className="flex-shrink-0">
                  {!folder.isLeaf && (
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Folder className="w-4 h-4 text-green-600" />
              <span>Folders: {currentFolders.filter(f => !f.isLeaf).length}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Image className="w-4 h-4 text-blue-600" />
              <span>Collections: {currentFolders.filter(f => f.isLeaf).length}</span>
            </div>
          </div>
          <button
            onClick={fetchFolders}
            className="text-blue-600 hover:text-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

export default FolderBrowser;