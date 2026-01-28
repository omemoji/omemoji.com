import React, { useState, useEffect } from "react";
import { type ArtworkData } from "@/lib/artworks";
import EditModal from "./EditModal";

interface ArtworkListProps {
  refreshTrigger?: number;
  onMessage: (message: string) => void;
}

export const ArtworkList: React.FC<ArtworkListProps> = ({ refreshTrigger, onMessage }) => {
  const [artworks, setArtworks] = useState<ArtworkData[]>([]);
  const [editingArtwork, setEditingArtwork] = useState<ArtworkData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0); // 現在のページ（0-based）

  const ITEMS_PER_PAGE = 10; // 5行×2列

  useEffect(() => {
    loadArtworks();
  }, [refreshTrigger]);

  const loadArtworks = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:3001/artworks");
      if (response.ok) {
        const data = await response.json();
        // 作品を逆順に並べ替え（最新が最初に表示される）
        const reversedArtworks = (data || []).reverse();
        setArtworks(reversedArtworks);
      } else {
        throw new Error("Failed to load artworks");
      }
    } catch (error) {
      console.error("Error loading artworks:", error);
      onMessage(
        "Error loading artworks: " + (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteArtwork = async (artworkId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    if (!confirm("Are you sure you want to delete this artwork?")) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/artworks/${artworkId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onMessage("Artwork deleted successfully!");
        loadArtworks();
        // 削除後、現在のページが有効か確認
        const newTotalPages = Math.ceil((artworks.length - 1) / ITEMS_PER_PAGE);
        if (currentPage >= newTotalPages && newTotalPages > 0) {
          setCurrentPage(newTotalPages - 1);
        }
      } else {
        throw new Error("Failed to delete artwork");
      }
    } catch (error) {
      onMessage(
        "Error deleting artwork: " + (error instanceof Error ? error.message : "Unknown error")
      );
    }
  };

  const handleEditArtwork = (artwork: ArtworkData) => {
    setEditingArtwork(artwork);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (editedArtwork: ArtworkData) => {
    try {
      const response = await fetch(`http://localhost:3001/artworks/${editedArtwork.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editedArtwork),
      });

      if (response.ok) {
        onMessage("Artwork updated successfully!");
        loadArtworks();
      } else {
        throw new Error("Failed to update artwork");
      }
    } catch (error) {
      onMessage(
        "Error updating artwork: " + (error instanceof Error ? error.message : "Unknown error")
      );
    }
  };

  // ページネーション計算
  const totalPages = Math.ceil(artworks.length / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const displayedArtworks = artworks.slice(startIndex, endIndex);

  // ページ選択オプション生成
  const pageOptions = Array.from({ length: totalPages }, (_, index) => {
    const start = index * ITEMS_PER_PAGE + 1;
    const end = Math.min((index + 1) * ITEMS_PER_PAGE, artworks.length);
    return {
      value: index,
      label: `${start}-${end} of ${artworks.length}`,
    };
  });

  const handlePageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentPage(parseInt(event.target.value));
  };

  if (loading) {
    return (
      <div className="border-t pt-8">
        <h2 className="text-2xl font-bold mb-6">Loading Artworks...</h2>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="border rounded-lg p-4 animate-pulse">
              <div className="bg-gray-300 w-full h-32 rounded mb-3"></div>
              <div className="bg-gray-300 h-4 rounded mb-2"></div>
              <div className="bg-gray-300 h-3 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border-t pt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Artworks ({artworks.length})</h2>

        {/* Page Selection Dropdown */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <label htmlFor="page-select" className="text-sm font-medium text-gray-700">
              Show:
            </label>
            <select
              id="page-select"
              value={currentPage}
              onChange={handlePageChange}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {pageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {displayedArtworks.map((artwork) => (
          <div
            key={artwork.id}
            className="border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer relative group"
            onClick={() => handleEditArtwork(artwork)}
          >
            <button
              onClick={(e) => handleDeleteArtwork(artwork.id, e)}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete artwork"
            >
              ×
            </button>

            <div className="mb-3">
              <img
                src={artwork.src.replace("/public", "")}
                alt={artwork.title}
                className="w-2/3 aspect-square m-auto object-cover"
                onError={(e) => {
                  e.currentTarget.src =
                    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDIwMCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iNjQiIGZpbGw9IiM5Q0EzQUYiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=";
                }}
              />
            </div>

            <h3 className="font-semibold text-lg mb-2 truncate" title={artwork.title}>
              {artwork.title}
            </h3>

            <div className="flex flex-wrap gap-1 mb-2">
              {artwork.tag.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                >
                  {tag}
                </span>
              ))}
              {artwork.tag.length > 3 && (
                <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                  +{artwork.tag.length - 3} more
                </span>
              )}
            </div>

            <p className="text-sm text-gray-600">ID: {artwork.id}</p>
          </div>
        ))}
      </div>

      {artworks.length === 0 && (
        <p className="text-gray-500 text-center py-8">
          No artworks found. Add some artworks to get started!
        </p>
      )}

      {/* Pagination Info */}
      {totalPages > 1 && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(endIndex, artworks.length)} of {artworks.length}{" "}
            artworks (Page {currentPage + 1} of {totalPages})
          </p>
        </div>
      )}

      {/* Navigation Buttons */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editingArtwork && (
        <EditModal
          artwork={editingArtwork}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingArtwork(null);
          }}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
};

export default ArtworkList;
