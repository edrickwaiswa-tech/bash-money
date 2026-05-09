import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, ShieldCheck } from "lucide-react";

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute("crossOrigin", "anonymous");
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function getCroppedDataUrl(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const size = Math.max(pixelCrop.width, pixelCrop.height);
  canvas.width = size;
  canvas.height = size;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    (size - pixelCrop.width) / 2,
    (size - pixelCrop.height) / 2,
    pixelCrop.width,
    pixelCrop.height
  );
  return canvas.toDataURL("image/jpeg", 0.92);
}

interface PhotoCropModalProps {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onApply: (dataUrl: string) => void;
  isUploading?: boolean;
}

export function PhotoCropModal({ open, imageSrc, onClose, onApply, isUploading }: PhotoCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleApply = async () => {
    if (!croppedAreaPixels) return;
    const dataUrl = await getCroppedDataUrl(imageSrc, croppedAreaPixels);
    onApply(dataUrl);
  };

  const handleClose = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/50">
          <DialogTitle className="text-base font-semibold text-[#0f2557]">
            Crop Profile Photo
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Drag to reposition · Pinch or scroll to zoom
          </p>
        </DialogHeader>

        {/* Cropper Area */}
        <div className="relative bg-[#0f1f3d]" style={{ height: 320 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { background: "#0f1f3d" },
              cropAreaStyle: {
                border: "3px solid #c9a144",
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
              },
            }}
          />
        </div>

        {/* Zoom Controls */}
        <div className="px-6 py-3 bg-[#f8f9fc] border-b border-border/50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setZoom(Math.max(1, zoom - 0.1))}
              className="text-muted-foreground hover:text-[#0f2557] transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-[#0f2557] h-1 cursor-pointer"
            />
            <button
              onClick={() => setZoom(Math.min(3, zoom + 0.1))}
              className="text-muted-foreground hover:text-[#0f2557] transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setZoom(1); setCrop({ x: 0, y: 0 }); }}
              className="text-muted-foreground hover:text-[#0f2557] transition-colors ml-1"
              title="Reset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Trust badge + actions */}
        <DialogFooter className="px-6 py-4 flex-col gap-3">
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
            <ShieldCheck className="w-3 h-3 text-[#c9a144]" />
            <span>Secure upload · Photos are encrypted and stored safely</span>
          </div>
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1 rounded-xl h-10" onClick={handleClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl h-10 bg-[#0f2557] hover:bg-[#1a3570] text-white"
              onClick={handleApply}
              disabled={isUploading}
            >
              {isUploading ? "Uploading…" : "Apply Photo"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
