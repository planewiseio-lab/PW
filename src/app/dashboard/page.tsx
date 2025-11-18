"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUserStatus } from "@/contexts/UserStatusContext";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { FleetAircraft, AircraftStatus } from "@/components/dashboard/FleetTable";

// Lazy load les composants dashboard
const FleetTable = dynamic(
  () => import("@/components/dashboard/FleetTable"),
  {
    ssr: true,
    loading: () => (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading fleet table...</p>
      </div>
    ),
  }
);


export default function DashboardPage() {
  const [fleetAircraft, setFleetAircraft] = useState<FleetAircraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [selectedAircraft, setSelectedAircraft] = useState<Set<string>>(new Set());
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());
  const { user, isLoading, subscription } = useUserStatus();
  const router = useRouter();
  
  const favoritesLoadingRef = useRef(false);
  const lastLoadedUserIdRef = useRef<string | null>(null);
  const lastLoadTimeRef = useRef<number>(0);
  const CACHE_DURATION = 1000; // Cache de 1 seconde (réduit pour éviter les problèmes de cache)
  const CREDITS_PER_AIRCRAFT = 2; // 2 crédits par avion
  const mountedRef = useRef(false);

  // Fonction pour obtenir la limite d'avions selon le plan - mémorisée pour éviter les recalculs
  const fleetLimit = useMemo((): number => {
    if (!subscription) return 1; // Par défaut 1 pour FREE ou pas d'abonnement
    
    const plan = subscription.plan?.toUpperCase();
    const status = subscription.status?.toUpperCase();
    const renewsAt = subscription.renewsAt ? new Date(subscription.renewsAt) : null;
    const now = new Date();
    
    // Vérifier si le plan est actif ou annulé mais encore valide (renewsAt dans le futur)
    const isPlanValid = renewsAt && renewsAt > now && (status === "ACTIVE" || status === "CANCELED");
    
    if (plan === "BASIC" && isPlanValid) {
      return 5;
    } else if (plan === "PRO" && isPlanValid) {
      return 15;
    }
    
    // Par défaut 1 pour FREE ou plan expiré
    return 1;
  }, [subscription?.plan, subscription?.status, subscription?.renewsAt]);

  // Fonction pour charger les avions de la flotte
  // Cette fonction charge les informations de BASE depuis user_favorites
  // Ces infos proviennent de la requête API tier 1 effectuée lors de l'ajout en favoris
  // (type, manufacturer, model, airline, seats, age, engines, hex, etc.)
  const loadFleetAircraft = async (userId: string, forceReload: boolean = false) => {
    // Utiliser la limite mémorisée (recalculée automatiquement si subscription change)
    const currentLimit = fleetLimit;
    console.log("[Dashboard] loadFleetAircraft called for user:", userId, "forceReload:", forceReload);
    
    if (favoritesLoadingRef.current && !forceReload) {
      console.log("[Dashboard] Already loading, skipping");
      return;
    }

    const now = Date.now();
    if (
      !forceReload &&
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

    // Ne pas vider immédiatement pour éviter le flash
    if (forceReload) {
      setFleetAircraft([]);
    }

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
        setLoading(false);
        favoritesLoadingRef.current = false;
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
        })) || []).slice(0, currentLimit); // Limiter selon le plan

      console.log("[Dashboard] Formatted favorites:", formattedFavorites.length, "aircraft");
      console.log("[Dashboard] Formatted favorites data:", formattedFavorites);

      // Mettre à jour l'état avec tous les avions d'un coup
      setFleetAircraft(formattedFavorites);
      setLoading(false);
      
      // Charger les statuts détaillés depuis fleet_status (mis à jour toutes les 12h)
      // Ces statuts contiennent la position détaillée, le statut actuel, et les infos de vol
      // Utiliser requestAnimationFrame pour s'assurer que le rendu est terminé avant de charger les statuts
      requestAnimationFrame(() => {
        // Utiliser un setTimeout pour garantir que l'état est bien mis à jour
        setTimeout(() => {
          loadFleetStatusesFromDB(formattedFavorites);
        }, 50);
      });
    } catch (error) {
      console.error("Error loading favorites:", error);
      setLoading(false);
      lastLoadedUserIdRef.current = null;
      lastLoadTimeRef.current = 0;
      favoritesLoadingRef.current = false;
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

      // Mapper les statuts aux avions de manière atomique
      // TOUJOURS utiliser aircraftList comme source de vérité pour garantir que tous les avions sont affichés
      setFleetAircraft((prev) => {
        // Créer une map des avions existants pour préserver les données déjà chargées (images, etc.)
        const prevMap = new Map(prev.map(a => [a.id, a]));
        
        // Utiliser aircraftList comme source de vérité pour garantir tous les avions
        return aircraftList.map((aircraft) => {
          // Récupérer l'avion existant s'il existe, sinon utiliser le nouveau
          const existingAircraft = prevMap.get(aircraft.id) || aircraft;
          
          const savedStatus: FleetStatusFromDB | undefined = statusMap.get(aircraft.registration);
          if (savedStatus) {
            // Utiliser la même logique de mapping que ci-dessous
            let normalizedStatus = (() => {
              const s = savedStatus.status?.toLowerCase() || "";
              if (s === "in_flight" || s === "inflight" || s === "in flight") {
                return "in_flight";
              }
              return "on_ground";
            })();
            
            let dynamicStatus = normalizedStatus;
            const now = new Date();
            
            if (savedStatus.flightInfo) {
              const { departure, arrival } = savedStatus.flightInfo;
              if (departure?.time && arrival?.time) {
                try {
                  const depTime = new Date(departure.time);
                  const arrTime = new Date(arrival.time);
                  if (now >= depTime && now < arrTime) {
                    dynamicStatus = "in_flight";
                  } else if (now >= arrTime) {
                    dynamicStatus = "on_ground";
                  }
                } catch (e) {
                  console.error(`[Dashboard] Error recalculating status for ${aircraft.registration}:`, e);
                }
              }
            }
            
            return {
              ...existingAircraft,
              // Préserver les données de base de l'avion
              ...aircraft,
              status: {
                registration: savedStatus.registration,
                date: savedStatus.updatedAt ? new Date(savedStatus.updatedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
                status: dynamicStatus as AircraftStatus["status"],
                message: savedStatus.message || "",
                location: savedStatus.location || "",
                updatedAt: savedStatus.updatedAt,
                flightInfo: savedStatus.flightInfo || null,
              },
            };
          }
          // Si pas de statut, retourner l'avion existant avec les données de base mises à jour
          return {
            ...existingAircraft,
            ...aircraft,
          };
        });
      });
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

      // Ajouter updatedAt si non présent (utiliser l'heure actuelle car le statut vient d'être mis à jour)
      const statusWithUpdatedAt: AircraftStatus = {
        ...statusData,
        updatedAt: statusData.updatedAt || new Date().toISOString(),
      };

      setFleetAircraft((prev) =>
        prev.map((a) =>
          a.id === aircraft.id
            ? { ...a, status: statusWithUpdatedAt, statusLoading: false }
            : a
        )
      );

      return statusWithUpdatedAt;
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

  // Fonction pour sélectionner/désélectionner un avion - mémorisée avec useCallback
  const toggleAircraftSelection = useCallback((aircraftId: string) => {
    setSelectedAircraft((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(aircraftId)) {
        newSet.delete(aircraftId);
      } else {
        newSet.add(aircraftId);
      }
      return newSet;
    });
  }, []);

  // Fonction pour sélectionner/désélectionner tous les avions - mémorisée avec useCallback
  const toggleSelectAll = useCallback(() => {
    setSelectedAircraft((prev) => {
      if (prev.size === fleetAircraft.length) {
        // Tout désélectionner
        return new Set();
      } else {
        // Tout sélectionner
        return new Set(fleetAircraft.map((a) => a.id));
      }
    });
  }, [fleetAircraft]);

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

    // Vérifier si le dernier refresh date de moins de 8h
    const now = new Date();
    const eightHoursAgo = now.getTime() - (8 * 60 * 60 * 1000);
    const recentlyRefreshedAircraft: string[] = [];
    
    selectedAircraftList.forEach((aircraft) => {
      if (aircraft.status?.updatedAt) {
        try {
          const lastUpdate = new Date(aircraft.status.updatedAt).getTime();
          if (lastUpdate > eightHoursAgo) {
            recentlyRefreshedAircraft.push(aircraft.registration);
          }
        } catch (e) {
          console.error("Error parsing updatedAt:", e);
        }
      }
    });

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

    // Construire le message de confirmation
    let confirmMessage = `Update Fleet Status\n\n` +
      `Selected aircraft: ${selectedAircraftList.length}\n` +
      `This will cost ${totalCost} credits from your balance.\n` +
      `Your current balance: ${balance} credits\n`;
    
    // Ajouter l'avertissement si des avions ont été rafraîchis récemment
    if (recentlyRefreshedAircraft.length > 0) {
      confirmMessage += `\n⚠️ WARNING:\n` +
        `The following aircraft were refreshed less than 8 hours ago:\n` +
        `${recentlyRefreshedAircraft.join(", ")}\n\n` +
        `There is a risk that the data may remain similar.\n\n`;
    }
    
    confirmMessage += `Do you want to continue?`;

    // Confirmation simple avec window.confirm
    const confirmed = window.confirm(confirmMessage);

    if (!confirmed) {
      return;
    }

    // Procéder à la mise à jour
    setRefreshing(true);
    try {
      await loadAircraftStatuses(selectedAircraftList);
      // Rafraîchir le solde après la mise à jour
      await fetchCreditBalance();
      // Désélectionner automatiquement les avions après le refresh
      setSelectedAircraft(new Set());
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

  // Charger les avions quand l'utilisateur est disponible ou quand la subscription change
  useEffect(() => {
    console.log("[Dashboard] useEffect triggered - isLoading:", isLoading, "user:", user?.id, "lastLoadedUserId:", lastLoadedUserIdRef.current, "mounted:", mountedRef.current);
    
    // Marquer comme monté au premier rendu
    if (!mountedRef.current) {
      mountedRef.current = true;
    }
    
    if (user?.id && !isLoading) {
      // Toujours recharger au montage initial ou si l'utilisateur change
      const shouldReload = 
        lastLoadedUserIdRef.current !== user.id || 
        !mountedRef.current ||
        Date.now() - lastLoadTimeRef.current > CACHE_DURATION;
      
      if (shouldReload) {
        console.log("[Dashboard] Loading fleet aircraft for user:", user.id);
        // Réinitialiser les refs pour forcer le rechargement
        lastLoadedUserIdRef.current = null;
        lastLoadTimeRef.current = 0;
        favoritesLoadingRef.current = false;
        // Réinitialiser l'état avant de charger
        setFleetAircraft([]);
        setLoading(true);
        loadFleetAircraft(user.id, true); // Force reload
        fetchCreditBalance();
      } else {
        console.log("[Dashboard] Cache hit or already loading, skipping load");
      }
    } else if (!user && !isLoading) {
      console.log("[Dashboard] No user ID available");
    }
  }, [user?.id, isLoading, subscription?.plan, subscription?.status, subscription?.renewsAt]);

  // Force re-render every minute to update stale status messages
  useEffect(() => {
    if (fleetAircraft.length === 0) return;

    const interval = setInterval(() => {
      // Update timestamp to force re-render and re-evaluate stale status messages
      setRefreshTimestamp(Date.now());
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [fleetAircraft.length]);

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

  // Charger les images pour tous les avions (en parallèle pour améliorer les performances)
  useEffect(() => {
    if (fleetAircraft.length === 0) return;

    const loadImages = async () => {
      // Charger toutes les images en parallèle au lieu de séquentiellement
      const imagePromises = fleetAircraft
        .filter((aircraft) => !aircraft.imageUrl && !aircraft.imageLoading)
        .map(async (aircraft) => {
          // Marquer comme en cours de chargement
          setFleetAircraft((prev) =>
            prev.map((a) =>
              a.id === aircraft.id ? { ...a, imageLoading: true } : a
            )
          );

          try {
            const imageUrl = await loadAircraftImage(aircraft.registration);
            
            // Mettre à jour avec l'image chargée
            setFleetAircraft((prev) =>
              prev.map((a) =>
                a.id === aircraft.id
                  ? { ...a, imageUrl: imageUrl || undefined, imageLoading: false }
                  : a
              )
            );
          } catch (error) {
            console.error(`Error loading image for ${aircraft.registration}:`, error);
            // Marquer comme terminé même en cas d'erreur
            setFleetAircraft((prev) =>
              prev.map((a) =>
                a.id === aircraft.id
                  ? { ...a, imageLoading: false }
                  : a
              )
            );
          }
        });

      // Attendre que toutes les images soient chargées (ou échouent)
      await Promise.allSettled(imagePromises);
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
            Track your fleet of up to {fleetLimit} aircraft in real-time
          </p>
          <div className="text-sm text-gray-500 mt-2">
            {fleetAircraft.length} / {fleetLimit} aircraft
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
      {fleetAircraft.length >= fleetLimit && (
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
              {fleetAircraft.length} aircraft in your fleet. Maximum allowed is {fleetLimit}.
              Please remove an aircraft to add a new one.
            </p>
          </div>
        </div>
      )}

      {/* Fleet Status Table */}
      <FleetTable
        fleetAircraft={fleetAircraft}
        selectedAircraft={selectedAircraft}
        toggleAircraftSelection={toggleAircraftSelection}
        removeFavoriteAircraft={removeFavoriteAircraft}
      />

    </main>
  );
}

