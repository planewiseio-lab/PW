/**
 * Règles centralisées pour la correction des statuts de vol
 * Garantit qu'un vol est marqué comme "Arrived" après 20h de départ
 */

export interface FlightData {
  status: string;
  departure: {
    scheduledTime?: string;
    actualTime?: string;
  };
  arrival: {
    scheduledTime?: string;
    estimatedTime?: string;
    actualTime?: string;
  };
}

/**
 * Détermine si un vol doit être marqué comme "Arrived" basé sur les règles temporelles
 * @param flight - Données du vol
 * @returns true si le vol doit être marqué comme arrivé
 */
export function shouldMarkAsArrived(flight: FlightData): boolean {
  const now = new Date();

  // 1. Si le vol a déjà un statut "Arrived" ou "Landed", ne pas changer
  const currentStatus = flight.status.toLowerCase();
  if (currentStatus === "arrived" || currentStatus === "landed") {
    return false;
  }

  // 2. Calculer le temps écoulé depuis le départ
  const departureTime =
    flight.departure.actualTime || flight.departure.scheduledTime;
  if (!departureTime) {
    return false; // Pas de temps de départ, on ne peut pas déterminer
  }

  const departureDate = new Date(departureTime);
  const hoursSinceDeparture =
    (now.getTime() - departureDate.getTime()) / (1000 * 60 * 60);

  // 3. Règle principale : 20h après le départ = Arrived (peu importe le statut)
  if (hoursSinceDeparture > 20) {
    return true;
  }

  // 4. Règle secondaire : Si arrivée prévue et 4h de retard = Arrived
  if (flight.arrival.scheduledTime || flight.arrival.estimatedTime) {
    const arrivalTime =
      flight.arrival.actualTime ||
      flight.arrival.estimatedTime ||
      flight.arrival.scheduledTime;

    if (arrivalTime) {
      const arrivalDate = new Date(arrivalTime);
      const hoursSinceArrival =
        (now.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60);

      if (hoursSinceArrival > 4) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Corrige le statut d'un vol selon les règles temporelles
 * @param flight - Données du vol
 * @returns Vol avec statut corrigé si nécessaire
 */
export function correctFlightStatus(flight: FlightData): FlightData {
  if (shouldMarkAsArrived(flight)) {
    return {
      ...flight,
      status: "Arrived",
    };
  }

  return flight;
}

/**
 * Corrige les statuts d'une liste de vols
 * @param flights - Liste des vols
 * @returns Liste des vols avec statuts corrigés
 */
export function correctFlightsStatus(flights: FlightData[]): FlightData[] {
  return flights.map(correctFlightStatus);
}

/**
 * Log les corrections de statut pour le debugging
 * @param originalStatus - Statut original
 * @param flightNumber - Numéro de vol
 * @param hoursDiff - Heures écoulées
 */
export function logStatusCorrection(
  originalStatus: string,
  flightNumber: string,
  hoursDiff: number
): void {
  console.log(
    `[Flight Status Rules] Status corrected from "${originalStatus}" to "Arrived" for ${flightNumber} (${hoursDiff.toFixed(
      1
    )}h elapsed)`
  );
}
