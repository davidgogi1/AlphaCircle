import { useState, useCallback } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { getCroppedImageFile } from '../utils/cropImage';
import './AvatarCropModal.css';

interface Props {
  imageSrc: string;
  onCancel: () => void;
  onSave: (file: File) => void;
}

export default function AvatarCropModal({ imageSrc, onCancel, onSave }: Props) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const file = await getCroppedImageFile(imageSrc, croppedAreaPixels);
      onSave(file);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="acm-overlay">
      <div className="acm-modal">
        <h3 className="acm-title">Crop your photo</h3>

        <div className="acm-crop-area">
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
          />
        </div>

        <div className="acm-zoom-row">
          <span className="acm-zoom-label">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="acm-zoom-slider"
          />
        </div>

        <div className="acm-actions">
          <button type="button" className="acm-cancel-btn" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="acm-save-btn" onClick={handleSave} disabled={saving || !croppedAreaPixels}>
            {saving ? 'Saving…' : 'Save photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
