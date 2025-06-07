import React, { useState } from "react";
import { type ArtworkData } from "@/lib/artworks";
import ArtworkList from "./ArtworkList";

interface AdminProps {}

export const Admin: React.FC<AdminProps> = () => {
  const [formData, setFormData] = useState<ArtworkData>({
    id: "",
    src: "",
    title: "",
    tag: [],
    href: "",
    description: "",
  });

  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    console.log("Form data updated:", formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);

      // Extract filename without extension for ID
      const fileName = file.name;
      const fileNameWithoutExt =
        fileName.substring(0, fileName.lastIndexOf(".")) || fileName;

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      // Auto-set form data
      setFormData((prev) => ({
        ...prev,
        id: fileNameWithoutExt,
        src: `/public/images/artworks/${fileName}`, // Assuming images will be stored in /images/ folder
      }));
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tag.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tag: [...prev.tag, tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tag: prev.tag.filter((tag) => tag !== tagToRemove),
    }));
  };

  const uploadImage = async (file: File): Promise<string> => {
    const uploadFormData = new FormData();
    if (file && file instanceof File) {
      uploadFormData.append("image", file);
    } else {
      console.log("Invalid file:", file);
    }

    const response = await fetch("/api/handle-image", {
      method: "POST",
      body: uploadFormData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to upload image");
    }

    const data = await response.json();
    return data.path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (formData.tag.length === 0) {
      alert("At least one tag is required!");
      return;
    }
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    try {
      let finalSrc = formData.src;

      // Upload image if a file was selected
      if (selectedFile) {
        try {
          finalSrc = await uploadImage(selectedFile);
        } catch (uploadError) {
          throw new Error(
            `Image upload failed: ${
              uploadError instanceof Error
                ? uploadError.message
                : "Unknown error"
            }`
          );
        }
      }

      const artworkData = {
        ...formData,
        src: finalSrc,
      };
      // Ensure ID is generated if not provided
      // Send data to API endpoint
      const response = await fetch("http://localhost:3001/artworks/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(artworkData),
      });

      if (response.ok) {
        setMessage("Artwork added successfully!");
        setFormData({
          id: "",
          src: "",
          title: "",
          tag: [],
          href: "",
          description: "",
        });
        setSelectedFile(null);
        setImagePreview("");

        setRefreshTrigger((prev) => prev + 1);
      } else {
        throw new Error("Failed to save artwork");
      }
    } catch (error) {
      setMessage(
        "Error saving artwork: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  React.useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  return (
    <article className="py-6">
      <h1 className="text-3xl font-bold mb-6">Admin Panel - Add Artwork</h1>

      {message && (
        <div
          className={`p-4 mb-4 rounded ${
            message.includes("Error")
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="imageFile"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Upload Image *
          </label>
          <input
            type="file"
            id="imageFile"
            accept="image/*"
            required
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            The filename (without extension) will be used as the ID
            automatically.
          </p>

          {/* Image Preview */}
          {imagePreview && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
              <img
                src={imagePreview}
                alt="Preview"
                className="max-w-xs max-h-48 object-contain border border-gray-300 rounded"
              />
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="href"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Link URL (optional)
          </label>
          <input
            type="url"
            id="href"
            name="href"
            value={formData.href}
            onChange={handleInputChange}
            placeholder="https://example.com/artwork-detail"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description (optional)
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="tag"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Tags *
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add a tag"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tag.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-200 text-gray-700"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-2 text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Saving..." : "Add Artwork"}
        </button>
      </form>
      {/* Artworks List Component */}
      <ArtworkList refreshTrigger={refreshTrigger} onMessage={setMessage} />
    </article>
  );
};

export default Admin;
