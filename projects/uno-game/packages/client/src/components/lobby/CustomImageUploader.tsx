import React, { useState } from 'react';

interface CustomImageUploaderProps {
  roomId: string;
  onUploaded: (slot: string, url: string) => void;
}

export const CustomImageUploader: React.FC<CustomImageUploaderProps> = ({ roomId, onUploaded }) => {
  const [selectedSlot, setSelectedSlot] = useState<string>('card_back');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage('Error: File size exceeds 2MB limit');
      return;
    }

    setIsUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('slot', selectedSlot);
    formData.append('image', file);

    try {
      const res = await fetch(`/api/rooms/${roomId}/custom-images`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        onUploaded(selectedSlot, data.url);
        setMessage(`Custom image for "${selectedSlot}" applied!`);
      } else {
        setMessage(`Upload failed: ${data.error}`);
      }
    } catch (err: any) {
      setMessage(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4 bg-stone-800/80 rounded-2xl border border-stone-700 text-left">
      <h4 className="text-sm font-bold text-yellow-400 mb-1">Optional: Custom Card Art</h4>
      <p className="text-xs text-stone-400 mb-3">
        Upload custom image files (PNG/JPG/WebP &lt; 2MB) for everyone in this room.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <select
          value={selectedSlot}
          onChange={(e) => setSelectedSlot(e.target.value)}
          className="bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-200 focus:outline-hidden focus:border-yellow-400"
        >
          <option value="card_back">Card Back Skin</option>
          <option value="wild">Wild Card Art</option>
          <option value="wild_draw4">Wild Draw 4 Art</option>
          <option value="skip">Skip Card Art</option>
          <option value="reverse">Reverse Card Art</option>
          <option value="draw2">Draw 2 Card Art</option>
        </select>

        <label className="cursor-pointer inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-stone-700 hover:bg-stone-600 text-xs font-semibold text-stone-200 transition-colors">
          <span>{isUploading ? 'Uploading...' : 'Choose Image'}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
          />
        </label>
      </div>

      {message && (
        <p className="mt-2 text-xs font-medium text-emerald-400">
          {message}
        </p>
      )}
    </div>
  );
};
