"use client";

import { QRCodeCanvas } from "qrcode.react";

interface QRGeneratorProps {
  value: string;
  size?: number;
  className?: string;
}

export default function QRGenerator({
  value,
  size = 128,
  className = "",
}: QRGeneratorProps) {
  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      <QRCodeCanvas
        value={value}
        size={size}
        bgColor="#ffffff"
        fgColor="#000000"
        level="H"
        includeMargin={true}
        aria-label={`QR code for ${value}`}
      />
      <p className="text-sm text-gray-600 text-center break-all max-w-[128px]">
        Scan to join: {value}
      </p>
    </div>
  );
}
