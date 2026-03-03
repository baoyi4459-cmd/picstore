import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, Image as ImageIcon, Trash2, Maximize2, Loader2, Plus } from 'lucide-react';

interface Photo {
  id: number;
  filename: string;
  original_name: string;
  mimetype: string;
  size: number;
  created_at: string;
}

export default function App() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fetchPhotos = async () => {
    try {
      const response = await fetch('/api/photos');
      const data = await response.json();
      setPhotos(data);
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('photo', file);

    try {
      const response = await fetch('/api/photos', {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        const newPhoto = await response.json();
        setPhotos((prev) => [newPhoto, ...prev]);
      } else {
        alert('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Upload error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      const response = await fetch(`/api/photos/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== id));
        if (selectedPhoto?.id === id) setSelectedPhoto(null);
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleUpload(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-black/5 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <ImageIcon className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Visionary</h1>
        </div>
        
        <label className="cursor-pointer bg-black text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>Upload Photo</span>
          <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
        </label>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Upload Area */}
        {photos.length === 0 && !loading && (
          <div 
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`
              mt-12 border-2 border-dashed rounded-3xl p-20 flex flex-col items-center justify-center transition-all
              ${isDragging ? 'border-black bg-black/5 scale-[1.01]' : 'border-black/10 bg-white'}
            `}
          >
            <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mb-6">
              <Upload className="w-8 h-8 text-black/40" />
            </div>
            <h2 className="text-2xl font-medium mb-2">No photos yet</h2>
            <p className="text-zinc-500 mb-8">Drag and drop your first photo here or click to browse</p>
            <label className="cursor-pointer bg-black text-white px-8 py-3 rounded-full font-medium hover:bg-zinc-800 transition-colors">
              Browse Files
              <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
            </label>
          </div>
        )}

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {photos.map((photo) => (
              <motion.div
                key={photo.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -4 }}
                className="group relative aspect-[4/5] bg-white rounded-2xl overflow-hidden shadow-sm border border-black/5 cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img
                  src={`/uploads/${photo.filename}`}
                  alt={photo.original_name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4">
                  <div className="flex justify-end">
                    <button
                      onClick={(e) => handleDelete(e, photo.id)}
                      className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="text-white">
                      <p className="text-sm font-medium truncate max-w-[150px]">{photo.original_name}</p>
                      <p className="text-xs opacity-70">{new Date(photo.created_at).toLocaleDateString()}</p>
                    </div>
                    <Maximize2 className="text-white w-5 h-5" />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-black/20" />
          </div>
        )}
      </main>

      {/* Uploading Indicator */}
      {uploading && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">Uploading your photo...</span>
        </div>
      )}

      {/* Modal View */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 md:p-10"
            onClick={() => setSelectedPhoto(null)}
          >
            <button 
              className="absolute top-6 right-6 p-2 text-white/50 hover:text-white transition-colors"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="w-8 h-8" />
            </button>
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={`/uploads/${selectedPhoto.filename}`}
                alt={selectedPhoto.original_name}
                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
                referrerPolicy="no-referrer"
              />
              <div className="mt-6 text-white text-center">
                <h3 className="text-xl font-medium">{selectedPhoto.original_name}</h3>
                <p className="text-white/50 text-sm mt-1">
                  Uploaded on {new Date(selectedPhoto.created_at).toLocaleString()} • {(selectedPhoto.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
