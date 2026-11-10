import React, { useEffect, useState } from "react";
import { getEnforcerPhotoBlobUrl } from "../services/api";

// Blob URLs keyed by `${id}:${version}` so a directory list doesn't refetch
// the same photo for every render. A new photo_updated_at busts the entry.
const cache = new Map();

function loadPhoto(id, version) {
  const key = `${id}:${version || ""}`;
  if (!cache.has(key)) {
    const p = getEnforcerPhotoBlobUrl(id).catch((err) => {
      cache.delete(key);
      throw err;
    });
    cache.set(key, p);
  }
  return cache.get(key);
}

export default function EnforcerAvatar({
  id,
  name,
  hasPhoto,
  version,
  size = 56,
  className = "",
}) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    if (id && hasPhoto) {
      loadPhoto(id, version)
        .then((url) => !cancelled && setSrc(url))
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [id, hasPhoto, version]);

  const style = { width: size, height: size, fontSize: size * 0.42 };
  const initial = (name || "?").trim().charAt(0).toUpperCase();

  return src ? (
    <img
      src={src}
      alt={name ? `${name}'s photo` : "Enforcer photo"}
      className={`enf-avatar enf-avatar--img ${className}`}
      style={style}
    />
  ) : (
    <div className={`enf-avatar ${className}`} style={style} aria-hidden="true">
      {initial}
    </div>
  );
}
