import type { ImageRecord } from "../../shared/types.js";
import { Gallery } from "./Gallery.js";

interface GalleryPaneProps {
  images: ImageRecord[];
  loading: boolean;
  metaVisible: boolean;
  selectedId: string | null;
  viewMode: "grid" | "list";
  onSelect: (image: ImageRecord) => void;
}

export function GalleryPane({ images, loading, metaVisible, selectedId, viewMode, onSelect }: GalleryPaneProps) {
  return (
    <section className="gallery-pane" aria-label="Generated image library">
      <Gallery
        images={images}
        selectedId={selectedId}
        loading={loading}
        metaVisible={metaVisible}
        viewMode={viewMode}
        onSelect={onSelect}
      />
    </section>
  );
}
