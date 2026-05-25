import type { ImageRecord } from "../../shared/types.js";
import { imageFileUrl } from "../api/client.js";
import { formatBytes, formatDate, middleEllipsis } from "../utils/format.js";

interface GalleryProps {
  images: ImageRecord[];
  selectedId: string | null;
  loading: boolean;
  metaVisible: boolean;
  viewMode: "grid" | "list";
  onSelect: (image: ImageRecord) => void;
}

export function Gallery({ images, selectedId, loading, metaVisible, viewMode, onSelect }: GalleryProps) {
  if (loading && images.length === 0) {
    return <div className="gallery-state">Loading</div>;
  }

  if (images.length === 0) {
    return <div className="gallery-state">No images</div>;
  }

  if (viewMode === "list") {
    return (
      <main className="gallery-list" aria-label="Generated images">
        {images.map((image) => (
          <button
            key={image.id}
            className={selectedId === image.id ? "image-list-row selected" : "image-list-row"}
            onClick={() => onSelect(image)}
          >
            <span className="list-thumb-frame">
              <img src={imageFileUrl(image)} alt={image.threadName ?? image.fileName} loading="lazy" />
            </span>
            <span className="list-row-main">
              <strong>{image.threadName ?? "Untitled"}</strong>
              <span>{middleEllipsis(image.fileName, 54)}</span>
            </span>
            <span className="list-row-meta">
              <em>{formatDate(image.generatedAt ?? image.fileModifiedAt)}</em>
              <small>{formatImageSize(image)}</small>
            </span>
            <span className={image.hasPrompt ? "list-row-prompt has-prompt" : "list-row-prompt"}>{image.hasPrompt ? "Prompt" : "No prompt"}</span>
          </button>
        ))}
      </main>
    );
  }

  return (
    <main className={metaVisible ? "gallery" : "gallery gallery-clean"} aria-label="Generated images">
      {images.map((image) => (
        <button
          key={image.id}
          className={selectedId === image.id ? "image-tile selected" : "image-tile"}
          onClick={() => onSelect(image)}
        >
          <span className="thumb-frame">
            <img src={imageFileUrl(image)} alt={image.threadName ?? image.fileName} loading="lazy" />
          </span>
          {metaVisible ? (
            <span className="tile-meta">
              <strong>{image.threadName ?? "Untitled"}</strong>
              <span>{formatDate(image.generatedAt ?? image.fileModifiedAt)}</span>
              <small>{middleEllipsis(image.fileName)}</small>
            </span>
          ) : null}
        </button>
      ))}
    </main>
  );
}

function formatImageSize(image: ImageRecord): string {
  if (image.width && image.height) {
    return `${image.width} x ${image.height} · ${formatBytes(image.sizeBytes)}`;
  }

  return formatBytes(image.sizeBytes);
}
