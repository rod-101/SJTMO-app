import React, { useRef, useState } from "react";
import { resizeImageToSquare } from "../utils/resizeImage";

// "Change photo" / "Remove" buttons. `onUpload(blob)` and `onRemove()` should
// return promises that resolve to the updated profile.
export default function EnforcerPhotoControls({ hasPhoto, onUpload, onRemove, onError }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setBusy(true);
    try {
      const blob = await resizeImageToSquare(file);
      await onUpload(blob);
    } catch (err) {
      onError?.(err.message || "Failed to upload photo.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm("Remove this profile photo?")) return;
    setBusy(true);
    try {
      await onRemove();
    } catch (err) {
      onError?.(err.message || "Failed to remove photo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="enf-photo-controls">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        hidden
      />
      <button
        type="button"
        className="enf-link-btn"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Saving…" : hasPhoto ? "Change photo" : "Add photo"}
      </button>
      {hasPhoto && !busy && (
        <button type="button" className="enf-link-btn enf-link-btn--danger" onClick={handleRemove}>
          Remove
        </button>
      )}
    </div>
  );
}
