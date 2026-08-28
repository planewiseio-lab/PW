export type PhotoSource = "planespotters" | "airport-data" | "commons";

export type Photo = {
  url: string;
  width?: number;
  height?: number;
  link: string;
  photographer: string;
  source: PhotoSource;
  sourceName: string;
};

export type DataSource = {
  name: string;
  url: string;
};

export type AircraftFactSheet = {
  registration: string;
  type?: string;
  manufacturer?: string;
  yearBuilt?: number;
  ageYears?: number;
  serial?: string;
  operator?: string;
  owner?: string;
  status?: string;
  icaoType?: string;
  iataType?: string;
  icao24?: string;
  deliveryDate?: string;
  previousRegistrations?: string[];
  engines?: string;
  country?: string;
  photos: Photo[];
  sources: DataSource[];
};

export type LookupResult =
  | { status: "invalid" }
  | { status: "not_found"; registration: string }
  | { status: "error"; registration: string }
  | { status: "ok"; aircraft: AircraftFactSheet };
