export function getReceiptQrPayload(accessToken) {
  if (!accessToken || typeof window === "undefined") return "";
  return `${window.location.origin}/receipt/${accessToken}`;
}
