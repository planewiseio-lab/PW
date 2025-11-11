"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useRef, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useUserStatus } from "@/contexts/UserStatusContext";
import Link from "next/link";
import Image from "next/image";

// Composant pour le décompte en temps réel avec style amélioré
function LiveCountdown({ arrivalTime }: { arrivalTime: string }) {
  const [timeSince, setTimeSince] = useState("");
  
  useEffect(() => {
    if (!arrivalTime) return;
    
    const updateTime = () => {
      try {
        const arrival = new Date(arrivalTime);
        const now = new Date();
        const diffMs = now.getTime() - arrival.getTime();
        if (diffMs > 0) {
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
          
          if (hours > 0) {
            setTimeSince(`${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`);
          } else if (minutes > 0) {
            setTimeSince(`${minutes}m ${seconds.toString().padStart(2, '0')}s`);
          } else {
            setTimeSince(`${seconds.toString().padStart(2, '0')}s`);
          }
        }
      } catch (e) {
        console.error("Error calculating time since:", e);
      }
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, [arrivalTime]);
  
  if (!timeSince) return null;
  
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg font-mono font-bold text-blue-700 text-base">
      <svg className="w-4 h-4 text-blue-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      {timeSince}
    </span>
  );
}

// Composant pour le décompte du temps de vol en temps réel
function FlightTimeCountdown({ departureTime }: { departureTime: string }) {
  const [flightTime, setFlightTime] = useState("");

  useEffect(() => {
    if (!departureTime) return;

    const updateTime = () => {
      try {
        const departure = new Date(departureTime);
        const now = new Date();
        const diffMs = now.getTime() - departure.getTime();
        if (diffMs > 0) {
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

          if (hours > 0) {
            setFlightTime(`${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`);
          } else if (minutes > 0) {
            setFlightTime(`${minutes}m ${seconds.toString().padStart(2, '0')}s`);
          } else {
            setFlightTime(`${seconds.toString().padStart(2, '0')}s`);
          }
        }
      } catch (e) {
        console.error("Error calculating flight time:", e);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [departureTime]);

  if (!flightTime) return null;

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg font-mono font-bold text-blue-700 text-base">
      <svg className="w-4 h-4 text-blue-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      {flightTime}
    </span>
  );
}

// Composant pour calculer la progression et l'ETA du vol
function useFlightProgress(departureTime: string, arrivalTime: string) {
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState("");

  useEffect(() => {
    if (!departureTime || !arrivalTime) return;

    const updateProgress = () => {
      try {
        const departure = new Date(departureTime);
        const arrival = new Date(arrivalTime);
        const now = new Date();

        const totalDuration = arrival.getTime() - departure.getTime();
        const elapsed = now.getTime() - departure.getTime();
        const remaining = arrival.getTime() - now.getTime();

        if (totalDuration > 0) {
          const progressPercent = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
          setProgress(progressPercent);
        }

        if (remaining > 0) {
          const hours = Math.floor(remaining / (1000 * 60 * 60));
          const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
          setEta(`${hours}h ${minutes}m`);
        } else {
          setEta("Arrived");
        }
      } catch (e) {
        console.error("Error calculating flight progress:", e);
      }
    };

    updateProgress();
    const interval = setInterval(updateProgress, 1000);

    return () => clearInterval(interval);
  }, [departureTime, arrivalTime]);

  return { progress, eta };
}

// Composant d'affichage de la progression du vol avec barre de progression
function FlightProgressDisplay({
  departureAirport,
  departureName,
  departureTime,
  arrivalAirport,
  arrivalName,
  arrivalTime,
  flightNumber,
}: {
  departureAirport: string;
  departureName: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalName: string;
  arrivalTime: string;
  flightNumber: string;
}) {
  const { progress, eta } = useFlightProgress(departureTime, arrivalTime);

  return (
    <div className="w-full">
      {/* Titre IN FLIGHT - Numéro de vol */}
      <div className="text-xs sm:text-sm md:text-base font-bold text-gray-500 uppercase tracking-wider text-center mb-4 sm:mb-6 break-words">
        IN FLIGHT{flightNumber ? ` - ${flightNumber}` : ""}
      </div>

      {/* Section Départ */}
      <div className="flex items-start justify-between gap-2 sm:gap-4 md:gap-6">
        {/* Départ - Gauche */}
        <div className="flex-shrink-0 flex flex-col items-center text-center min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-blue-100 flex items-center justify-center mb-2 sm:mb-3 border-2 border-blue-200">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 break-all">
            {departureAirport}
          </div>
          <div className="text-xs sm:text-sm md:text-base text-gray-600 font-medium break-words">
            {departureName}
          </div>
        </div>

        {/* Centre - Flèche sur mobile, barre de progression sur desktop */}
        <div className="flex-1 flex flex-col items-center justify-center px-1 sm:px-2 md:px-4 min-w-0 max-w-full">
          {/* Version Mobile - Flèche avec % et ETA */}
          <div className="flex flex-col items-center justify-center sm:hidden">
            <div className="flex flex-col items-center mb-3">
              <div className="text-base font-bold text-blue-600">
                {Math.round(progress)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                ETA: {eta}
              </div>
            </div>
            {/* Flèche horizontale */}
            <div className="flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </div>

          {/* Version Desktop - Barre de progression */}
          <div className="hidden sm:block w-full relative pt-8 sm:pt-10 pb-4 sm:pb-6">
            {/* Pourcentage et ETA positionnés à l'endroit de la progression */}
            <div
              className="absolute top-0 flex flex-col items-center transform -translate-x-1/2 transition-all duration-1000 ease-out"
              style={{ left: `${Math.min(100, Math.max(0, progress))}%` }}
            >
              <div className="text-sm sm:text-base md:text-lg font-bold text-blue-600 whitespace-nowrap">
                {Math.round(progress)}%
              </div>
              <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 whitespace-nowrap">
                ETA: {eta}
              </div>
            </div>

            {/* Barre de progression avec labels collés */}
            <div className="w-full relative mt-3 sm:mt-4">
              {/* Labels Departure et Arrival juste au-dessus de la barre */}
              <div className="flex justify-between items-center mb-0.5">
                <div className="text-[10px] sm:text-xs text-gray-500">Departure</div>
                <div className="text-[10px] sm:text-xs text-gray-500">Arrival</div>
              </div>
              
              {/* Barre de progression */}
              <div className="w-full h-2 sm:h-3 bg-gray-200 rounded-full overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${Math.min(100, Math.max(0, progress))}%`,
                    background: `linear-gradient(to right, #3b82f6 0%, #10b981 100%)`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Arrivée - Droite */}
        <div className="flex-shrink-0 flex flex-col items-center text-center min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-green-100 flex items-center justify-center mb-2 sm:mb-3 border-2 border-green-200">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 break-all">
            {arrivalAirport}
          </div>
          <div className="text-xs sm:text-sm md:text-base text-gray-600 font-medium break-words">
            {arrivalName}
          </div>
        </div>
      </div>
    </div>
  );
}

interface AircraftStatus {
  registration: string;
  date: string;
  status: "in_flight" | "on_ground";
  message: string;
  location: string;
  flightInfo?: {
    number: string;
    departure?: {
      airport: string;
      name: string;
      time: string;
    };
    arrival?: {
      airport: string;
      name: string;
      time: string;
    };
  };
}

interface FleetAircraft {
  id: string;
  registration: string;
  type: string;
  airline: string;
  manufacturer: string;
  model: string;
  seats?: number;
  age?: number;
  engines?: string;
  hex?: string;
  addedDate: string;
  status?: AircraftStatus;
  statusLoading?: boolean;
  statusError?: string;
  imageUrl?: string;
  imageLoading?: boolean;
}

export default function DashboardPage() {
  const [fleetAircraft, setFleetAircraft] = useState<FleetAircraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [selectedAircraft, setSelectedAircraft] = useState<Set<string>>(new Set());
  const { user, isLoading } = useUserStatus();
  const router = useRouter();
  
  const favoritesLoadingRef = useRef(false);
  const lastLoadedUserIdRef = useRef<string | null>(null);
  const lastLoadTimeRef = useRef<number>(0);
  const CACHE_DURATION = 3000; // Cache de 3 secondes
  const CREDITS_PER_AIRCRAFT = 2; // 2 crédits par avion

  // Fonction pour charger les avions de la flotte
  // Cette fonction charge les informations de BASE depuis user_favorites
  // Ces infos proviennent de la requête API tier 1 effectuée lors de l'ajout en favoris
  // (type, manufacturer, model, airline, seats, age, engines, hex, etc.)
  const loadFleetAircraft = async (userId: string) => {
    console.log("[Dashboard] loadFleetAircraft called for user:", userId);
    
    if (favoritesLoadingRef.current) {
      console.log("[Dashboard] Already loading, skipping");
      return;
    }

    const now = Date.now();
    if (
      lastLoadedUserIdRef.current === userId &&
      now - lastLoadTimeRef.current < CACHE_DURATION
    ) {
      console.log("[Dashboard] Cache hit, skipping load");
      return;
    }
    
    console.log("[Dashboard] Starting to load fleet aircraft...");

    favoritesLoadingRef.current = true;
    lastLoadedUserIdRef.current = userId;
    lastLoadTimeRef.current = now;

    setFleetAircraft([]);

    try {
      const supabase = createClient();
      // Charger les informations de base depuis user_favorites
      // Ces données proviennent de la requête API tier 1 lors de l'ajout en favoris
      const { data, error } = await supabase
        .from("user_favorites")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[Dashboard] Error loading favorites:", error);
        return;
      }

      console.log("[Dashboard] Loaded favorites from DB:", data?.length || 0, "items");
      console.log("[Dashboard] Sample favorite data:", data?.[0]);

      // Formater les données de base depuis user_favorites
      const formattedFavorites: FleetAircraft[] =
        (data?.map((item) => ({
          id: item.id,
          registration: item.aircraft_registration,
          type: item.aircraft_type || "Unknown", // Depuis API tier 1
          airline: item.aircraft_airline || "Unknown", // Depuis API tier 1
          manufacturer: item.aircraft_manufacturer || "Unknown", // Depuis API tier 1
          model: item.aircraft_model || "Unknown", // Depuis API tier 1
          seats: item.aircraft_seats, // Depuis API tier 1
          age: item.aircraft_age, // Depuis API tier 1
          engines: item.aircraft_engines, // Depuis API tier 1
          hex: item.aircraft_hex, // Depuis API tier 1
          addedDate: new Date(item.created_at).toISOString().split("T")[0],
          // Les statuts détaillés (status, location, flightInfo) seront ajoutés par loadFleetStatusesFromDB
        })) || []).slice(0, 5); // Limiter à 5 avions

      console.log("[Dashboard] Formatted favorites:", formattedFavorites.length, "aircraft");
      console.log("[Dashboard] Formatted favorites data:", formattedFavorites);

      setFleetAircraft(formattedFavorites);
      
      // Charger les statuts détaillés depuis fleet_status (mis à jour toutes les 12h)
      // Ces statuts contiennent la position détaillée, le statut actuel, et les infos de vol
      loadFleetStatusesFromDB(formattedFavorites);
    } catch (error) {
      console.error("Error loading favorites:", error);
      lastLoadedUserIdRef.current = null;
      lastLoadTimeRef.current = 0;
    } finally {
      favoritesLoadingRef.current = false;
      setLoading(false);
    }
  };

  // Fonction pour charger les statuts détaillés depuis la base de données
  // Ces statuts proviennent de fleet_status et sont mis à jour toutes les 12h via le bouton "Update Fleet Status"
  // Ils contiennent : status (on_ground, in_flight, scheduled, etc.), location, message, flightInfo
  const loadFleetStatusesFromDB = async (aircraftList: FleetAircraft[]) => {
    try {
      const response = await fetch("/api/fleet/status", {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        // Si la table n'existe pas encore (404 ou 500), c'est normal, on continue sans statuts
        if (response.status === 404 || response.status === 500) {
          console.log("[Dashboard] Fleet status table may not exist yet, continuing without statuses");
          return;
        }
        console.error("Failed to load fleet statuses from DB:", response.status, response.statusText);
        return;
      }

      const data = await response.json();
      
      // Si pas de statuts sauvegardés, continuer sans erreur
      if (!data.statuses || data.statuses.length === 0) {
        return;
      }

      // Type pour les statuts retournés par l'API
      type FleetStatusFromDB = {
        registration: string;
        status: string;
        message: string;
        location: string;
        flightInfo?: any;
        updatedAt?: string;
      };

      const statusMap: Map<string, FleetStatusFromDB> = new Map(
        data.statuses.map((s: FleetStatusFromDB) => [s.registration, s] as [string, FleetStatusFromDB])
      );

      // Mapper les statuts aux avions
      setFleetAircraft((prev) =>
        prev.map((aircraft) => {
          const savedStatus: FleetStatusFromDB | undefined = statusMap.get(aircraft.registration);
          if (savedStatus) {
            console.log(`[Dashboard] Loading status for ${aircraft.registration}:`, savedStatus);
            // Normaliser le statut : simplifier à seulement "in_flight" ou "on_ground"
            let normalizedStatus = (() => {
              const s = savedStatus.status?.toLowerCase() || "";
              // Seul "in_flight" reste "in_flight", tout le reste devient "on_ground"
              if (s === "in_flight" || s === "inflight" || s === "in flight") {
                return "in_flight";
              }
              // Tout le reste (on_ground, scheduled, no_flights, unknown) devient "on_ground"
              return "on_ground";
            })();
            
            console.log(`[Dashboard] Normalized status for ${aircraft.registration}: "${savedStatus.status}" → "${normalizedStatus}" (message: "${savedStatus.message}")`);
            
            // Recalculer dynamiquement le statut basé sur l'heure actuelle
            let dynamicStatus = normalizedStatus;
            const now = new Date();
            
            if (savedStatus.flightInfo) {
              const { departure, arrival } = savedStatus.flightInfo;
              
              // Si on a les heures de départ et d'arrivée, recalculer le statut
              if (departure?.time && arrival?.time) {
                try {
                  const depTime = new Date(departure.time);
                  const arrTime = new Date(arrival.time);
                  
                  // Vol en cours (départé mais pas encore arrivé)
                  if (now >= depTime && now < arrTime) {
                    dynamicStatus = "in_flight";
                  }
                  // Vol terminé (arrivé)
                  else if (now >= arrTime) {
                    dynamicStatus = "on_ground";
                  }
                  // Vol futur (pas encore parti)
                  else if (now < depTime) {
                    dynamicStatus = "scheduled";
                  }
                } catch (e) {
                  console.error(`[Dashboard] Error recalculating status for ${aircraft.registration}:`, e);
                }
              }
              // Si on a seulement l'heure d'arrivée (vol terminé)
              else if (arrival?.time && !departure?.time) {
                try {
                  const arrTime = new Date(arrival.time);
                  if (now >= arrTime) {
                    dynamicStatus = "on_ground";
                  }
                } catch (e) {
                  console.error(`[Dashboard] Error recalculating status for ${aircraft.registration}:`, e);
                }
              }
            }
            
            return {
              ...aircraft,
              status: {
                registration: savedStatus.registration,
                date: savedStatus.updatedAt ? new Date(savedStatus.updatedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
                status: dynamicStatus as AircraftStatus["status"],
                message: savedStatus.message || "",
                location: savedStatus.location || "",
                flightInfo: savedStatus.flightInfo || null,
              },
            };
          }
          return aircraft;
        })
      );
    } catch (error) {
      // Ne pas afficher d'erreur si c'est juste que la table n'existe pas encore
      console.log("Fleet statuses not available (table may not exist yet):", error);
    }
  };

  // Fonction pour charger le statut d'un avion via API (seulement lors de la mise à jour)
  const loadAircraftStatus = async (aircraft: FleetAircraft) => {
    setFleetAircraft((prev) =>
      prev.map((a) =>
        a.id === aircraft.id ? { ...a, statusLoading: true, statusError: undefined } : a
      )
    );

    try {
      const response = await fetch(`/api/aircraft/${aircraft.registration}/status`, {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch status: ${response.status}`);
      }

      const statusData: AircraftStatus = await response.json();

      setFleetAircraft((prev) =>
        prev.map((a) =>
          a.id === aircraft.id
            ? { ...a, status: statusData, statusLoading: false }
            : a
        )
      );

      return statusData;
    } catch (error: any) {
      console.error(`Error loading status for ${aircraft.registration}:`, error);
      setFleetAircraft((prev) =>
        prev.map((a) =>
          a.id === aircraft.id
            ? { ...a, statusLoading: false, statusError: error.message || "Failed to load status" }
            : a
        )
      );
      throw error;
    }
  };

  // Fonction pour récupérer le solde de crédits
  const fetchCreditBalance = async () => {
    try {
      const response = await fetch("/api/credits/balance", {
        credentials: "include",
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        // L'API retourne 'credits' et non 'balance'
        const balance = data.credits ?? data.balance ?? 0;
        console.log("[Dashboard] Credit balance fetched:", balance, "from data:", data);
        setCreditBalance(balance);
        return balance;
      } else {
        console.error("Failed to fetch credit balance:", response.status, response.statusText);
        // En cas d'erreur, retourner la valeur actuelle si disponible
        return creditBalance ?? 0;
      }
    } catch (error) {
      console.error("Error fetching credit balance:", error);
      // En cas d'erreur, retourner la valeur actuelle si disponible
      return creditBalance ?? 0;
    }
  };

  // Fonction pour charger les statuts de tous les avions via API et sauvegarder dans la DB
  // Cette fonction est appelée lors du clic sur "Update Fleet Status" (toutes les 12h)
  // Elle fait des appels API pour obtenir la position détaillée de chaque avion
  // et sauvegarde les résultats dans fleet_status pour les afficher ensuite
  const loadAircraftStatuses = async (aircraftList: FleetAircraft[]) => {
    const statusesToSave: any[] = [];

    // Charger les statuts en parallèle avec un délai pour éviter de surcharger l'API
    for (const aircraft of aircraftList) {
      try {
        const statusData = await loadAircraftStatus(aircraft);
        if (statusData) {
          statusesToSave.push({
            registration: aircraft.registration,
            status: statusData.status,
            message: statusData.message,
            location: statusData.location,
            flightInfo: statusData.flightInfo || null,
          });
        }
        // Petit délai entre chaque requête (100ms)
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to load status for ${aircraft.registration}:`, error);
      }
    }

    // Sauvegarder tous les statuts dans la base de données
    if (statusesToSave.length > 0) {
      try {
        const response = await fetch("/api/fleet/status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ statuses: statusesToSave }),
        });

        if (!response.ok) {
          console.error("Failed to save fleet statuses to DB");
        }
      } catch (error) {
        console.error("Error saving fleet statuses to DB:", error);
      }
    }
  };

  // Fonction pour sélectionner/désélectionner un avion
  const toggleAircraftSelection = (aircraftId: string) => {
    setSelectedAircraft((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(aircraftId)) {
        newSet.delete(aircraftId);
      } else {
        newSet.add(aircraftId);
      }
      return newSet;
    });
  };

  // Fonction pour sélectionner/désélectionner tous les avions
  const toggleSelectAll = () => {
    if (selectedAircraft.size === fleetAircraft.length) {
      // Tout désélectionner
      setSelectedAircraft(new Set());
    } else {
      // Tout sélectionner
      setSelectedAircraft(new Set(fleetAircraft.map((a) => a.id)));
    }
  };

  // Fonction pour rafraîchir les statuts des avions sélectionnés
  const refreshAllStatuses = async () => {
    if (fleetAircraft.length === 0) {
      alert("No aircraft in your fleet to update.");
      return;
    }

    // Filtrer les avions sélectionnés
    const selectedAircraftList = fleetAircraft.filter((aircraft) =>
      selectedAircraft.has(aircraft.id)
    );

    if (selectedAircraftList.length === 0) {
      alert("Please select at least one aircraft to update.");
      return;
    }

    // Récupérer le solde de crédits (toujours rafraîchir pour avoir la valeur à jour)
    const balance = await fetchCreditBalance();
    const totalCost = selectedAircraftList.length * CREDITS_PER_AIRCRAFT;

    // Vérifier si l'utilisateur a assez de crédits
    if (balance < totalCost) {
      const buyCredits = window.confirm(
        `Insufficient credits!\n\n` +
        `Required: ${totalCost} credits\n` +
        `Your balance: ${balance} credits\n\n` +
        `Do you want to go to the credits page to purchase more?`
      );
      if (buyCredits) {
        router.push("/credits");
      }
      return;
    }

    // Confirmation simple avec window.confirm
    const confirmed = window.confirm(
      `Update Fleet Status\n\n` +
      `Selected aircraft: ${selectedAircraftList.length}\n` +
      `This will cost ${totalCost} credits from your balance.\n` +
      `Your current balance: ${balance} credits\n\n` +
      `Do you want to continue?`
    );

    if (!confirmed) {
      return;
    }

    // Procéder à la mise à jour
    setRefreshing(true);
    try {
      await loadAircraftStatuses(selectedAircraftList);
      // Rafraîchir le solde après la mise à jour
      await fetchCreditBalance();
    } finally {
      setRefreshing(false);
    }
  };


  // Rediriger si pas d'utilisateur
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [isLoading, user, router]);

  // Charger les avions quand l'utilisateur est disponible
  useEffect(() => {
    console.log("[Dashboard] useEffect triggered - isLoading:", isLoading, "user:", user?.id, "lastLoadedUserId:", lastLoadedUserIdRef.current);
    if (user?.id) {
      if (lastLoadedUserIdRef.current !== user.id) {
        console.log("[Dashboard] Loading fleet aircraft for user:", user.id);
        loadFleetAircraft(user.id);
        fetchCreditBalance();
      } else {
        console.log("[Dashboard] User ID unchanged, skipping load");
      }
    } else {
      console.log("[Dashboard] No user ID available yet");
    }
  }, [user?.id, isLoading]);

  // Recalculer dynamiquement les statuts toutes les minutes
  useEffect(() => {
    if (fleetAircraft.length === 0) return;

    const updateStatuses = () => {
      setFleetAircraft((prev) => {
        let hasChanges = false;
        const updated = prev.map((aircraft) => {
          if (!aircraft.status?.flightInfo) return aircraft;

          const { departure, arrival } = aircraft.status.flightInfo;
          const now = new Date();
          let newStatus = aircraft.status.status;

          // Si on a les heures de départ et d'arrivée, recalculer le statut
          if (departure?.time && arrival?.time) {
            try {
              const depTime = new Date(departure.time);
              const arrTime = new Date(arrival.time);

              // Vol en cours (départé mais pas encore arrivé)
              if (now >= depTime && now < arrTime) {
                newStatus = "in_flight";
              }
              // Vol terminé (arrivé) - devient "on_ground"
              else if (now >= arrTime && aircraft.status.status === "in_flight") {
                newStatus = "on_ground";
              }
              // Vol futur (pas encore parti) - reste "on_ground" (pas besoin de changer)
            } catch (e) {
              console.error(`[Dashboard] Error updating status for ${aircraft.registration}:`, e);
            }
          }
          // Si on a seulement l'heure d'arrivée (vol terminé)
          else if (arrival?.time && !departure?.time) {
            try {
              const arrTime = new Date(arrival.time);
              if (now >= arrTime && aircraft.status.status === "in_flight") {
                newStatus = "on_ground";
              }
            } catch (e) {
              console.error(`[Dashboard] Error updating status for ${aircraft.registration}:`, e);
            }
          }

          // Ne mettre à jour que si le statut a changé
          if (newStatus !== aircraft.status.status) {
            hasChanges = true;
            return {
              ...aircraft,
              status: {
                ...aircraft.status,
                status: newStatus as AircraftStatus["status"],
              },
            };
          }

          return aircraft;
        });
        
        // Ne retourner que si il y a des changements pour éviter les re-renders inutiles
        return hasChanges ? updated : prev;
      });
    };

    // Mettre à jour immédiatement
    updateStatuses();

    // Puis toutes les minutes
    const interval = setInterval(updateStatuses, 60000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fleetAircraft.length]); // Utiliser seulement la longueur pour éviter les boucles

  // Fonction pour charger l'image Wikimedia Commons pour un avion
  const loadAircraftImage = async (registration: string) => {
    try {
      const response = await fetch(`/api/images?q=${encodeURIComponent(registration)}&limit=1`, {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const images = data?.images || [];
      
      if (images.length > 0) {
        // Utiliser la miniature (thumbnail) pour l'affichage dans le dashboard
        return images[0].url || images[0].original || null;
      }

      return null;
    } catch (error) {
      console.error(`Error loading image for ${registration}:`, error);
      return null;
    }
  };

  // Charger les images pour tous les avions
  useEffect(() => {
    if (fleetAircraft.length === 0) return;

    const loadImages = async () => {
      for (const aircraft of fleetAircraft) {
        // Ne charger que si l'image n'est pas déjà chargée
        if (!aircraft.imageUrl && !aircraft.imageLoading) {
          setFleetAircraft((prev) =>
            prev.map((a) =>
              a.id === aircraft.id ? { ...a, imageLoading: true } : a
            )
          );

          const imageUrl = await loadAircraftImage(aircraft.registration);
          
          setFleetAircraft((prev) =>
            prev.map((a) =>
              a.id === aircraft.id
                ? { ...a, imageUrl: imageUrl || undefined, imageLoading: false }
                : a
            )
          );
        }
      }
    };

    loadImages();
  }, [fleetAircraft.length]);

  const removeFavoriteAircraft = async (
    id: string,
    aircraftRegistration: string
  ) => {
    if (!user) return;

    const confirmed = window.confirm(
      `Are you sure you want to remove aircraft ${aircraftRegistration} from your fleet?`
    );

    if (!confirmed) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error removing favorite:", error);
        return;
      }

      // Retirer l'avion de la sélection s'il était sélectionné
      setSelectedAircraft((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });

      lastLoadedUserIdRef.current = null;
      await loadFleetAircraft(user.id);
    } catch (error) {
      console.error("Error removing favorite:", error);
    }
  };

  // Fonction pour obtenir le badge de statut
  const getStatusBadge = (status?: AircraftStatus) => {
    if (!status) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Unknown
        </span>
      );
    }

    switch (status.status) {
      case "in_flight":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 uppercase tracking-wide">
            In Flight
          </span>
        );
      case "on_ground":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 uppercase tracking-wide">
            On Ground
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Unknown
          </span>
        );
    }
  };

  if (isLoading || loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading fleet...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="mx-auto max-w-7xl px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8 overflow-x-hidden">
        {/* Header */}
        <div className="mb-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            My Fleet Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Track your fleet of up to 5 aircraft in real-time
          </p>
          <div className="text-sm text-gray-500 mt-2">
            {fleetAircraft.length} / 5 aircraft
          </div>
        </div>
        
        {/* Selection controls - Réorganisé pour PC */}
        {fleetAircraft.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Left side: Select All button */}
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSelectAll}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                >
                  {selectedAircraft.size === fleetAircraft.length ? "Deselect All" : "Select All"}
                </button>
                <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>
                <div className="text-sm text-gray-600">
                  {selectedAircraft.size > 0 ? (
                    <span>
                      <span className="font-semibold text-gray-900">{selectedAircraft.size}</span>
                      <span className="text-gray-500"> of </span>
                      <span className="font-semibold text-gray-900">{fleetAircraft.length}</span>
                      <span className="text-gray-500"> selected</span>
                      {selectedAircraft.size > 0 && (
                        <span className="ml-2 font-semibold text-blue-600">
                          ({selectedAircraft.size * CREDITS_PER_AIRCRAFT} credits)
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-gray-400 italic">No aircraft selected</span>
                  )}
                </div>
              </div>

              {/* Right side: Update button */}
              <button
                onClick={refreshAllStatuses}
                disabled={refreshing || fleetAircraft.length === 0 || selectedAircraft.size === 0}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#178cf2] text-white rounded-lg hover:brightness-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-medium shadow-sm hover:shadow-md disabled:hover:shadow-sm flex items-center justify-center gap-2"
                title={
                  selectedAircraft.size > 0
                    ? `Update ${selectedAircraft.size} selected aircraft (${selectedAircraft.size * CREDITS_PER_AIRCRAFT} credits required)`
                    : "Please select at least one aircraft to update"
                }
              >
                {refreshing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <span>
                      Update Fleet Status
                      {selectedAircraft.size > 0 && ` (${selectedAircraft.size})`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Update button when no aircraft (fallback) */}
        {fleetAircraft.length === 0 && (
          <div className="flex justify-center">
            <button
              onClick={refreshAllStatuses}
              disabled={true}
              className="px-6 py-2.5 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed text-sm sm:text-base font-medium opacity-50"
            >
              Update Fleet Status
            </button>
          </div>
        )}
      </div>

      {/* Fleet Limit Warning */}
      {fleetAircraft.length >= 5 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-yellow-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-yellow-800">
              <span className="font-semibold">Fleet limit reached:</span> You have{" "}
              {fleetAircraft.length} aircraft in your fleet. Maximum allowed is 5.
              Please remove an aircraft to add a new one.
            </p>
          </div>
        </div>
      )}

      {/* Fleet Status Table */}
      {fleetAircraft.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-900" colSpan={6}>
                    Aircraft Information & Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {fleetAircraft.map((aircraft) => (
                  <Fragment key={aircraft.id}>
                    {/* Refonte totale - Structure simple et claire */}
                    <tr>
                      <td className="px-2 sm:px-4 md:px-6 py-4 sm:py-6" colSpan={6}>
                        <div className="bg-white rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
                          {/* Section 1: Immatriculation */}
                          <div className="bg-[#178cf2] px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {/* Checkbox élégant pour sélectionner l'avion */}
                                <label className="relative flex items-center cursor-pointer flex-shrink-0 group">
                                  <input
                                    type="checkbox"
                                    checked={selectedAircraft.has(aircraft.id)}
                                    onChange={() => toggleAircraftSelection(aircraft.id)}
                                    className="sr-only"
                                  />
                                  <div className={`relative w-6 h-6 sm:w-7 sm:h-7 border-2 rounded-md transition-all duration-300 flex items-center justify-center shadow-lg ${
                                    selectedAircraft.has(aircraft.id)
                                      ? "bg-white border-white scale-105"
                                      : "bg-white/20 border-white group-hover:bg-white/30 group-hover:scale-105"
                                  }`}>
                                    {selectedAircraft.has(aircraft.id) && (
                                      <svg
                                        className="w-4 h-4 sm:w-5 sm:h-5 text-[#178cf2] transform transition-all duration-200 scale-100"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={3}
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                    )}
                                  </div>
                                </label>
                                <Link
                                  href={`/aircraft/${aircraft.registration}`}
                                  className="text-2xl sm:text-3xl md:text-4xl font-black text-white hover:text-blue-100 transition-colors break-all flex-1"
                                >
                                  {aircraft.registration}
                                </Link>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Link
                                  href={`/aircraft/${aircraft.registration}`}
                                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                                  title="View aircraft details"
                                >
                                  <svg
                                    className="w-5 h-5 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                    />
                                  </svg>
                                </Link>
                                <button
                                  onClick={() =>
                                    removeFavoriteAircraft(
                                      aircraft.id,
                                      aircraft.registration
                                    )
                                  }
                                  className="p-2 bg-white/20 hover:bg-red-500/30 rounded-lg transition-colors"
                                  title="Remove from fleet"
                                >
                                  <svg
                                    className="w-5 h-5 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Section 2: Image */}
                          <div className="px-3 sm:px-4 md:px-6 py-4 sm:py-6 bg-gray-50">
                            <Link
                              href={`/aircraft/${aircraft.registration}`}
                              className="block group"
                            >
                              <div className="relative w-full h-48 md:h-64 lg:h-80 rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100 shadow-md group-hover:shadow-lg transition-all">
                                {aircraft.imageLoading ? (
                                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                                  </div>
                                ) : aircraft.imageUrl ? (
                                  <Image
                                    src={aircraft.imageUrl}
                                    alt={aircraft.registration}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 100vw, 1200px"
                                    unoptimized={aircraft.imageUrl.startsWith("http://") || aircraft.imageUrl.startsWith("https://")}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                    <svg
                                      className="w-24 h-24 text-gray-400"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                      />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </Link>
                          </div>

                          {/* Section 3: Infos de l'avion */}
                          <div className="px-3 sm:px-4 md:px-6 py-4 sm:py-6 border-t border-gray-200">
                            <div className="mb-4 sm:mb-6 text-center">
                              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 break-words">
                                {aircraft.type}
                                {aircraft.airline && aircraft.airline !== "Unknown" && (
                                  <span className="text-gray-600"> - {aircraft.airline}</span>
                                )}
                              </div>
                            </div>
                            
                            {/* Grille d'informations techniques - Design uniforme blanc moderne avec effet bleu */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                              {aircraft.seats && (
                                <div className="bg-white rounded-lg p-2 sm:p-3 md:p-4 border-2 border-gray-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all duration-300 group text-center">
                                  <div className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 sm:mb-2 group-hover:text-blue-600 transition-colors">
                                    Seats
                                  </div>
                                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors break-words">
                                    {aircraft.seats}
                                  </div>
                                </div>
                              )}
                              {aircraft.age && (
                                <div className="bg-white rounded-lg p-2 sm:p-3 md:p-4 border-2 border-gray-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all duration-300 group text-center">
                                  <div className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 sm:mb-2 group-hover:text-blue-600 transition-colors">
                                    Age
                                  </div>
                                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors break-words">
                                    {aircraft.age} years
                                  </div>
                                </div>
                              )}
                              {aircraft.engines && (
                                <div className="bg-white rounded-lg p-2 sm:p-3 md:p-4 border-2 border-gray-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all duration-300 group text-center">
                                  <div className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 sm:mb-2 group-hover:text-blue-600 transition-colors">
                                    Engines
                                  </div>
                                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors break-words">
                                    {aircraft.engines}
                                  </div>
                                </div>
                              )}
                              {aircraft.hex && (
                                <div className="bg-white rounded-lg p-2 sm:p-3 md:p-4 border-2 border-gray-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all duration-300 group text-center">
                                  <div className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 sm:mb-2 group-hover:text-blue-600 transition-colors">
                                    Hex Code
                                  </div>
                                  <div className="text-sm sm:text-base md:text-lg font-bold text-gray-900 font-mono group-hover:text-blue-600 transition-colors break-all">
                                    {aircraft.hex}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Section 4: Emplacement de l'avion - Design moderne et invitant */}
                          <div className="px-3 sm:px-4 md:px-6 py-4 sm:py-6 bg-gradient-to-br from-gray-50 to-blue-50 border-t border-gray-200">
                            <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg p-3 sm:p-4 md:p-6 hover:shadow-xl transition-shadow">
                              {aircraft.statusLoading ? (
                                <div className="flex items-center justify-center gap-3 py-8">
                                  <div className="animate-spin rounded-full h-6 w-6 border-3 border-blue-600 border-t-transparent"></div>
                                  <span className="text-base text-gray-500">Loading status...</span>
                                </div>
                              ) : aircraft.statusError ? (
                                <div className="text-center py-8">
                                  <span className="text-base text-red-600">{aircraft.statusError}</span>
                                </div>
                              ) : aircraft.status ? (
                                (() => {
                                  // Fonction pour formater l'heure avec fuseau horaire
                                  const formatTimeWithTimezone = (timeString: string) => {
                                    if (!timeString) return "";
                                    try {
                                      const date = new Date(timeString);
                                      return date.toLocaleTimeString("en-US", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        timeZoneName: "short",
                                      });
                                    } catch {
                                      return timeString;
                                    }
                                  };

                                  // Fonction pour calculer le temps depuis
                                  const getTimeSince = (timeString: string) => {
                                    if (!timeString) return "";
                                    try {
                                      const time = new Date(timeString);
                                      const now = new Date();
                                      const diffMs = now.getTime() - time.getTime();
                                      if (diffMs > 0) {
                                        const hours = Math.floor(diffMs / (1000 * 60 * 60));
                                        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                                        if (hours > 0) {
                                          return `${hours}h ${minutes > 0 ? `${minutes}m` : ""}`.trim();
                                        } else {
                                          return `${minutes}m`;
                                        }
                                      }
                                    } catch (e) {
                                      console.error("Error calculating time since:", e);
                                    }
                                    return "";
                                  };

                                  const { status, flightInfo } = aircraft.status;
                                  const registration = aircraft.registration;

                                  // Design pour IN FLIGHT avec barre de progression
                                  if (status === "in_flight" && flightInfo) {
                                    const departureAirport = flightInfo.departure?.airport || "";
                                    const departureName = flightInfo.departure?.name || "";
                                    const departureTime = flightInfo.departure?.time || "";
                                    const arrivalAirport = flightInfo.arrival?.airport || "";
                                    const arrivalName = flightInfo.arrival?.name || "";
                                    const flightNumber = flightInfo.number || "";

                                    return (
                                      <FlightProgressDisplay
                                        departureAirport={departureAirport}
                                        departureName={departureName}
                                        departureTime={departureTime}
                                        arrivalAirport={arrivalAirport}
                                        arrivalName={arrivalName}
                                        arrivalTime={flightInfo.arrival?.time || ""}
                                        flightNumber={flightNumber}
                                      />
                                    );
                                  }

                                  // Pour ON_GROUND, afficher l'emplacement le plus récent (arrivée ou départ)
                                  if (status === "on_ground") {
                                    // Prioriser l'arrivée si disponible, sinon utiliser le départ
                                    const airport = flightInfo?.arrival?.airport || flightInfo?.departure?.airport || "";
                                    const airportName = flightInfo?.arrival?.name || flightInfo?.departure?.name || "";
                                    const arrivalTime = flightInfo?.arrival?.time || "";
                                    const departureTime = flightInfo?.departure?.time || "";
                                    const flightNumber = flightInfo?.number || "";
                                    
                                    // Utiliser l'heure d'arrivée si disponible, sinon l'heure de départ
                                    const timeToUse = arrivalTime || departureTime;

                                    return (
                                      <div className="w-full">
                                        {/* Titre ON GROUND - Numéro de vol */}
                                        <div className="text-xs sm:text-sm md:text-base font-bold text-gray-500 uppercase tracking-wider text-center mb-4 sm:mb-6 break-words">
                                          ON GROUND{flightNumber ? ` - ${flightNumber}` : ""}
                                        </div>

                                        {/* Section Aéroport - Centré avec hauteur compressée */}
                                        <div className="flex flex-col items-center text-center">
                                          {/* Code aéroport */}
                                          {airport && (
                                            <>
                                              <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                                                {airport}
                                              </div>

                                              {/* Nom complet de l'aéroport centré */}
                                              {airportName && (
                                                <div className="text-sm md:text-base text-gray-600 font-medium mb-3">
                                                  {airportName}
                                                </div>
                                              )}

                                              {/* Décompte "Since" si on a une heure d'arrivée */}
                                              {arrivalTime && (
                                                <div className="flex flex-col items-center">
                                                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                                    Since
                                                  </span>
                                                  <LiveCountdown arrivalTime={arrivalTime} />
                                                </div>
                                              )}
                                            </>
                                          )}
                                          
                                          {/* Si pas d'aéroport, afficher le message */}
                                          {!airport && (
                                            <div className="text-base text-gray-600">
                                              {aircraft.status.message || "Location unknown"}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  }
                                })()
                              ) : (
                                <div className="text-center py-8">
                                  <span className="text-base text-gray-400">No status available</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Aircraft in Your Fleet
          </h3>
          <p className="text-gray-600 mb-6">
            Add up to 5 aircraft to your fleet to track their status in real-time.
            Search for an aircraft and click the heart icon to add it to your fleet.
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 bg-[#178cf2] text-white rounded-lg hover:brightness-110 transition-colors"
          >
            Search Aircraft
          </Link>
        </div>
      )}

    </main>
  );
}

