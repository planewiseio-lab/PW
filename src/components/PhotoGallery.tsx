"use client";

import { useState } from "react";
import { interpolate, t, type Lang } from "@/lib/i18n";
import type { Photo } from "@/lib/types";

function creditLine(photo: Photo, lang: Lang): string {
  return `© ${photo.photographer} ${t(lang, "via")} ${photo.sourceName}`;
}

function FeaturedPhoto({
  photo,
  registration,
  lang,
}: {
  photo: Photo;
  registration: string;
  lang: Lang;
}) {
  return (
    <figure className="photo-figure">
      <div className="photo-frame">
        {/* Planespotters ToS: load their URL as-is in the browser, do not proxy. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={interpolate(t(lang, "photoAlt"), { reg: registration })}
          width={photo.width ?? 800}
          height={photo.height ?? 530}
          className="photo-main"
        />
        <span className="photo-credit">{creditLine(photo, lang)}</span>
      </div>
    </figure>
  );
}

export function PhotoGallery({
  photos,
  registration,
  lang,
}: {
  photos: Photo[];
  registration: string;
  lang: Lang;
}) {
  const [selected, setSelected] = useState(0);
  const featured = photos[selected] ?? photos[0];
  if (!featured) return null;

  const thumbs = photos
    .map((photo, index) => ({ photo, index }))
    .filter(({ index }) => index !== selected);

  return (
    <div className="photos">
      <FeaturedPhoto photo={featured} registration={registration} lang={lang} />
      {thumbs.length > 0 ? (
        <div className="photo-gallery">
          {thumbs.map(({ photo, index }) => (
            <figure key={photo.url} className="photo-thumb-figure">
              <button
                type="button"
                className="photo-frame photo-thumb-button"
                onClick={() => setSelected(index)}
                aria-label={interpolate(t(lang, "photoSelect"), {
                  reg: registration,
                })}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={interpolate(t(lang, "photoAltExtra"), {
                    reg: registration,
                  })}
                  width={photo.width ?? 320}
                  height={photo.height ?? 180}
                  loading="lazy"
                  className="photo-thumb"
                />
                <span className="photo-credit">{creditLine(photo, lang)}</span>
              </button>
            </figure>
          ))}
        </div>
      ) : null}
    </div>
  );
}
