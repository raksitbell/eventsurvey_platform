import QRCode from "qrcode";

const qrOptions = {
  errorCorrectionLevel: "M",
  margin: 4,
} as const;

export function eventQrPng(url: string) {
  return QRCode.toBuffer(url, { ...qrOptions, scale: 12 });
}

export function eventQrDataUrl(url: string) {
  return QRCode.toDataURL(url, { ...qrOptions, scale: 6 });
}
