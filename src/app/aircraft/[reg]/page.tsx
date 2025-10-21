"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useImagesReady } from "@/hooks/useImagesReady";
import StructuredData from "@/components/StructuredData";
import { getImagesData } from "@/lib/globalApiCache";
import { useAircraftData } from "@/hooks/useAircraftData";

/* ==========================================================
   TYPES & HELPERS GÉNÉRAUX
   ---------------------------------------------------------- */
type Aircraft = {
  registration?: string;
  typeName?: string;
  model?: string;
  airlineName?: string;
  operator?: string;
  hexIcao?: string | null;
};

function val(x: any, fallback = "—") {
  return x ?? fallback;
}
function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(+dt)) return "—";
  return dt.toISOString().slice(0, 10);
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
const isWiki = (u: string) =>
  /^https?:\/\/(upload|commons)\.wikimedia\.org\//i.test(u);
const uniq = (arr: string[]) => [...new Map(arr.map((u) => [u, true])).keys()];

/* ==========================================================
   SQUELETTE DE CHARGEMENT (Skeleton)
   ---------------------------------------------------------- */
function DetailSkeleton() {
  return (
    <div className="rounded-[24px] border border-gray-200 bg-white shadow-md p-6 sm:p-8">
      <div className="animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-40 bg-gray-200 rounded mb-6" />
        <div className="grid sm:grid-cols-2 gap-x-12 gap-y-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-baseline">
              <div className="w-40 h-4 bg-gray-200 rounded mr-4" />
              <div className="flex-1 h-4 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
        <div className="mt-6 h-[260px] sm:h-[300px] w-full bg-gray-100 rounded-2xl" />
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================
   PAGE PRINCIPALE : Détails de l’avion
   ---------------------------------------------------------- */
export default function AircraftDetailPage() {
  const router = useRouter();
  const { reg } = useParams<{ reg: string }>();

  // --- Utiliser le hook centralisé ---
  const { data: rawData, loading, error } = useAircraftData(reg || "");
  const [data, setData] = useState<ReturnType<typeof normalizeAircraft> | null>(
    null
  );
  const [err, setErr] = useState<string | null>(null);

  // 0) attendre la fin de l'anim du menu (shared element docké)
  const [docked, setDocked] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onDocked = () => setDocked(true);
    window.addEventListener("searchCluster:docked", onDocked, { once: true });
    const fallback = setTimeout(() => setDocked(true), 800); // sécurité si l'évènement est manqué
    return () => {
      window.removeEventListener("searchCluster:docked", onDocked);
      clearTimeout(fallback);
    };
  }, []);

  /* ----------------------------------------------------------
     1) NORMALISATION DES DONNÉES
  ---------------------------------------------------------- */
  useEffect(() => {
    if (rawData) {
      setData(normalizeAircraft(rawData));
      setErr(null);
    } else if (error) {
      setErr(error);
      setData(null);
    }
  }, [rawData, error]);

  /* ----------------------------------------------------------
     2) IMAGES COMMONS (fetch AU NIVEAU DE LA PAGE)
  ---------------------------------------------------------- */
  const queryForImages = (data?.registration || reg || "").trim();
  const {
    imgs,
    thumbs,
    loaded: commonsLoaded,
  } = useCommonsImages(queryForImages);

  // Construire la galerie (max 4) ici (plus dans la carte)
  const gallery = uniq((imgs || []).filter(isWiki)).slice(0, 4);
  const galleryThumbs = uniq((thumbs || []).filter(isWiki)).slice(0, 4);

  /* ----------------------------------------------------------
     3) PRÉCHARGEMENT DES IMAGES CLÉS (Héro + miniatures)
  ---------------------------------------------------------- */
  const urlsForPreload = [gallery[0], ...galleryThumbs.slice(0, 3)].filter(
    Boolean
  );
  const imagesReady = useImagesReady(urlsForPreload, 550); // délai mini 550ms pour un rendu premium

  /* ----------------------------------------------------------
     4) GATING D'AFFICHAGE - AFFICHAGE PROGRESSIF
  ---------------------------------------------------------- */
  // Afficher les données d'avion immédiatement, puis les images
  const aircraftReady = !!data && docked && !loading; // Données avion prêtes
  const imagesLoaded = commonsLoaded && imagesReady; // Images prêtes

  const showSkeleton = !aircraftReady && docked; // skeleton seulement si pas de données avion

  /* ----------------------------------------------------------
     5) RENDU FINAL : Squelette → Carte complète
  ---------------------------------------------------------- */
  return (
    <main className="mx-auto max-w-[980px] px-4 py-8">
      {err && <p className="text-red-600">{err}</p>}

      {/* Réserve de hauteur pour empêcher le footer de remonter pendant l'anim/chargement */}
      <div className="min-h-[820px]">
        {/* Squelette uniquement quand le menu est docké */}
        {showSkeleton && <DetailSkeleton />}

        {/* Carte d'avion immédiatement, puis images en arrière-plan */}
        {aircraftReady && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <StructuredData type="aircraft" data={data!} />
            <AircraftCard
              data={data!}
              imgs={gallery}
              thumbs={galleryThumbs}
              onClear={() => router.back()}
              imagesLoading={!imagesLoaded}
            />
          </motion.div>
        )}
      </div>
    </main>
  );
}

/* ==========================================================
   NORMALISATION DES DONNÉES AVION
   ---------------------------------------------------------- */
function normalizeAircraft(raw: any) {
  const a = raw || {};
  const typeOrModel = a.typeName || a.type || a.model || "";
  const manufacturer =
    a.manufacturer || a.maker || a.producer || typeOrModel.split(" ")[0] || "";

  // Calculer l'âge si pas fourni par l'API mais qu'on a une année
  let calculatedAge = a.ageYears ?? a.age ?? null;
  if (!calculatedAge && a.year) {
    const currentYear = new Date().getFullYear();
    calculatedAge = currentYear - parseInt(a.year);
  }

  return {
    registration: a.registration || a.reg || "",
    active: a.active ?? a.verified ?? true,
    typeName: typeOrModel,
    manufacturer,
    model: a.model || a.typeName || "",
    modelCode: a.modelCode || a.code || "",
    airlineName: a.airlineName || a.operator || a.owner || "",
    seats: a.numSeats ?? a.seats ?? null,
    hexIcao: a.hexIcao || a.modeS || a.icaoHex || null,
    ageYears: calculatedAge,
    firstFlightDate: a.firstFlightDate ?? null,
    deliveryDate: a.deliveryDate ?? null,
    registrationDate: a.registrationDate ?? null,
    engines: a.numEngines ? `${a.numEngines}` : null,
    engineType: a.engineType || null,
    photos: Array.isArray(a.photos) && a.photos.length ? a.photos : [],
  };
}

/* ==========================================================
   IMAGES WIKIMEDIA COMMONS (via API /api/images) — hook local
   ---------------------------------------------------------- */
function useCommonsImages(q?: string) {
  const [imgs, setImgs] = useState<string[]>([]);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let stop = false;
    setLoaded(false);
    if (!q) {
      setImgs([]);
      setThumbs([]);
      setLoaded(true);
      return;
    }
    (async () => {
      try {
        console.log(`[IMAGES] Fetching images for: ${q}`);
        // Temporairement désactiver le cache global pour debug
        const response = await fetch(
          `/api/images?q=${encodeURIComponent(q)}&cache=refresh`,
          {
            cache: "no-store",
          }
        );
        const json = await response.json();
        console.log(`[IMAGES] Received data:`, json);
        if (stop) return;
        const list = (json?.images || []) as Array<{
          url: string;
          original?: string;
        }>;
        console.log(`[IMAGES] Processed ${list.length} images:`, list);
        setImgs(list.map((x) => x.original || x.url)); // grandes images
        setThumbs(list.map((x) => x.url)); // miniatures
        console.log(
          `[IMAGES] Set imgs:`,
          list.map((x) => x.original || x.url)
        );
        console.log(
          `[IMAGES] Set thumbs:`,
          list.map((x) => x.url)
        );
      } catch (error: any) {
        console.error(`[IMAGES] Error fetching images:`, error);
        if (!stop) {
          setImgs([]);
          setThumbs([]);
        }
      } finally {
        if (!stop) setLoaded(true);
      }
    })();
    return () => {
      stop = true;
    };
  }, [q]);

  return { imgs, thumbs, loaded };
}

/* ==========================================================
   COMPOSANT PRINCIPAL : Carte de l’avion
   ---------------------------------------------------------- */
function AircraftCard({
  data,
  imgs,
  thumbs,
  onClear,
  imagesLoading = false,
}: {
  data: ReturnType<typeof normalizeAircraft>;
  imgs: string[];
  thumbs: string[];
  onClear: () => void;
  imagesLoading?: boolean;
}) {
  // Plus aucun fetch ici : on consomme les images déjà prêtes
  const gallery = uniq((imgs || []).filter(isWiki)).slice(0, 4);
  const galleryThumbs = uniq((thumbs || []).filter(isWiki)).slice(0, 4);

  const [idx, setIdx] = useState(0);
  const current = gallery[idx] || gallery[0];
  const [lightbox, setLightbox] = useState<number | null>(null);

  /* Gestion du lightbox */
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (lightbox !== null) {
      document.documentElement.classList.add("lb-open");
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.classList.remove("lb-open");
      document.body.style.overflow = prev;
    }
    return () => {
      document.documentElement.classList.remove("lb-open");
      document.body.style.overflow = prev;
    };
  }, [lightbox]);

  /* ----------------------------------------------------------
     RENDU VISUEL DE LA CARTE
  ---------------------------------------------------------- */
  return (
    <article className="rounded-[24px] border border-gray-200 bg-white shadow-md p-6 sm:p-8">
      {/* === HEADER === */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {data.registration.toUpperCase()}
            </h2>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                data.active
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {data.active ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Last updated {todayISO()}
          </p>
        </div>

        <a
          href={`/aircraft/${encodeURIComponent(data.registration)}/history`}
          className="inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-sm font-semibold bg-brand-600 text-white shadow-sm hover:bg-brand-700"
        >
          View flight history
        </a>
      </div>

      {/* === TABLEAU DE SPÉCIFICATIONS === */}
      <dl className="mt-4 grid sm:grid-cols-2 gap-x-12 gap-y-1.5 text-[15px] leading-[1.3]">
        {[
          ["Type", val(data.typeName)],
          [
            "Year",
            val(
              (data.firstFlightDate &&
                new Date(data.firstFlightDate).getFullYear()) ||
                (data.deliveryDate &&
                  new Date(data.deliveryDate).getFullYear()) ||
                (data.registrationDate &&
                  new Date(data.registrationDate).getFullYear()) ||
                null
            ),
          ],
          ["Manufacturer", val(data.manufacturer)],
          ["Age", val(data.ageYears ? `${data.ageYears} years` : null)],
          ["Model", val(data.model)],
          ["First Flight", fmtDate(data.firstFlightDate)],
          ["Model Code", val(data.modelCode)],
          ["Delivery Date", fmtDate(data.deliveryDate)],
          ["Airline", val(data.airlineName)],
          ["Registration Date", fmtDate(data.registrationDate)],
          ["Seats", val(data.seats)],
          [
            "Engines",
            val(
              data.engines || data.engineType
                ? `${data.engines ?? ""}${
                    data.engineType ? ` × ${data.engineType}` : ""
                  }`
                : null
            ),
          ],
        ].map(([label, value]) => (
          <div key={label as string} className="flex items-baseline w-full">
            <dt className="w-40 shrink-0 text-gray-500">{label}</dt>
            <dd
              className="ml-auto w-full text-right text-gray-900 font-normal"
              style={{ fontFamily: '"Comfortaa", sans-serif' }}
            >
              {value as React.ReactNode}
            </dd>
          </div>
        ))}
      </dl>

      {/* === GALERIE === */}
      <div className="mt-6">
        {imagesLoading ? (
          // Skeleton pour les images en cours de chargement
          <div className="w-full h-[240px] sm:h-[300px] md:h-[350px] bg-gray-100 rounded-2xl animate-pulse">
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600 mx-auto mb-3"></div>
                <p className="text-gray-600 text-sm">Loading images</p>
              </div>
            </div>
          </div>
        ) : current ? (
          <button
            type="button"
            onClick={() => setLightbox(idx)}
            className="block w-full group"
            aria-label="Open image"
          >
            <div className="w-full rounded-2xl overflow-hidden">
              <img
                src={current}
                alt={`${data.registration} ${data.model || "aircraft"} - ${
                  data.airlineName || "aviation"
                } photo`}
                className="w-full h-[240px] sm:h-[300px] md:h-[350px] object-cover object-center"
                draggable={false}
                loading="eager"
                decoding="sync"
              />
            </div>
          </button>
        ) : (
          <div className="w-full h-[240px] sm:h-[300px] md:h-[350px] bg-gray-100 rounded-2xl flex items-center justify-center">
            <p className="text-gray-600">Loading images....</p>
          </div>
        )}
        {!imagesLoading && galleryThumbs.length > 0 && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {galleryThumbs.map((url, i) => (
              <button
                key={`${url}-${i}`}
                type="button"
                onClick={() => setLightbox(i + 1)}
                className="relative block rounded-xl overflow-hidden border border-gray-200 aspect-[16/9] w-full"
                aria-label={`Open thumbnail ${i + 1}`}
              >
                <img
                  src={url}
                  alt={`${data.registration} ${
                    data.model || "aircraft"
                  } thumbnail ${i + 1}`}
                  className="h-full w-full object-cover"
                  draggable={false}
                  loading="lazy"
                  decoding="async"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* === LIGHTBOX === */}
      {lightbox !== null &&
        typeof window !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[2147483646]">
            {/* Fond noir cliquable pour fermer */}
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
              onClick={() => setLightbox(null)}
            />

            {/* Contenu centré */}
            <div className="absolute inset-0 z-[2147483647] flex items-center justify-center p-4">
              <div className="relative">
                {/* Image agrandie */}
                <img
                  src={gallery[lightbox!]}
                  alt=""
                  className="max-w-[min(92vw,1100px)] max-h-[80vh] object-contain rounded-2xl shadow-2xl"
                  draggable={false}
                />

                {/* Flèche gauche */}
                {gallery.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightbox((prev) =>
                        prev === null
                          ? prev
                          : (prev - 1 + gallery.length) % gallery.length
                      );
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 text-gray-900 shadow hover:bg-white"
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                )}

                {/* Flèche droite */}
                {gallery.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightbox((prev) =>
                        prev === null ? prev : (prev + 1) % gallery.length
                      );
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 text-gray-900 shadow hover:bg-white"
                    aria-label="Next image"
                  >
                    ›
                  </button>
                )}

                {/* Compteur (optionnel) */}
                {gallery.length > 1 && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 text-white text-xs px-3 py-1">
                    {lightbox! + 1} / {gallery.length}
                  </div>
                )}
              </div>
            </div>

            {/* Bouton Close */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightbox(null);
              }}
              className="fixed top-4 right-4 z-[2147483647] h-9 px-3 rounded-full bg-white text-gray-900 shadow hover:bg-gray-100"
              aria-label="Close"
            >
              Close
            </button>
          </div>,
          document.body
        )}

      <p className="mt-3 text-[12px] text-gray-500">
        Note: Photos are illustrative and may show similar aircraft or variants
        rather than the exact airframe.
      </p>
    </article>
  );
}
