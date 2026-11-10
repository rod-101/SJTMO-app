// Center-crops an image file to a square and scales it down to `size` px,
// returning a JPEG Blob. Keeps profile photos small (~30–60 KB) so they can be
// stored directly in the database.
export function resizeImageToSquare(file, size = 256, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      const out = Math.min(size, side);
      const canvas = document.createElement("canvas");
      canvas.width = out;
      canvas.height = out;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff"; // flatten transparent PNGs onto white
      ctx.fillRect(0, 0, out, out);
      ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Could not process image."))),
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    img.src = url;
  });
}
