import { useState } from "react";

import type { Discovery } from "./discoveryContent";
import { DestinationArt } from "./DestinationArt";
import type { DiscoveryImageProvider } from "./images/imageProvider";
import { useDiscoveryImage } from "./images/useDiscoveryImage";

interface DestinationImageProps {
  discovery: Discovery;
  enabled: boolean;
  provider?: DiscoveryImageProvider;
}

export function DestinationImage({ discovery, enabled, provider }: DestinationImageProps) {
  const image = useDiscoveryImage(discovery.imageSearch, enabled, provider);
  const [settled, setSettled] = useState<{ src: string; ok: boolean } | null>(null);
  const data = image.data ?? null;
  const status = !data || settled?.src !== data.src ? "loading" : settled.ok ? "loaded" : "failed";

  const showPhoto = data !== null && status !== "failed";
  const isContextImage = discovery.kind === "ocean" || data?.subject !== discovery.title;
  const alt = data
    ? discovery.kind === "ocean"
      ? `Fotografia de ${data.subject}, referência de terra firme próxima ao antípoda`
      : `Fotografia de ${data.subject}, região do antípoda`
    : "";

  return (
    <figure className="destination-media" data-state={showPhoto ? status : image.isFetching ? "searching" : "fallback"}>
      <div className="destination-media__frame">
        <DestinationArt antipode={discovery.antipode} />
        {showPhoto && (
          <img
            key={data.src}
            className={`destination-media__photo${status === "loaded" ? " is-loaded" : ""}`}
            src={data.src}
            width={data.width}
            height={data.height}
            alt={alt}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => setSettled({ src: data.src, ok: true })}
            onError={() => setSettled({ src: data.src, ok: false })}
          />
        )}
        {showPhoto && status === "loaded" && isContextImage && (
          <span className="destination-media__tag">
            {discovery.kind === "ocean" ? "Referência próxima" : "Região"} · {data.subject}
          </span>
        )}
      </div>
      {showPhoto && status === "loaded" ? (
        <figcaption className="destination-media__credit">
          <span>Foto: {data.author ?? "autor não informado"}</span>
          {data.license && (
            <>
              {" · "}
              {data.licenseUrl ? (
                <a href={data.licenseUrl} target="_blank" rel="noopener noreferrer">
                  {data.license}
                </a>
              ) : (
                <span>{data.license}</span>
              )}
            </>
          )}
          {" · "}
          <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer">
            {data.sourceName}
          </a>
        </figcaption>
      ) : (
        <figcaption className="destination-media__credit destination-media__credit--muted">
          {image.isFetching ? "Procurando imagem da região…" : "Ilustração: posição do antípoda no globo"}
        </figcaption>
      )}
    </figure>
  );
}
