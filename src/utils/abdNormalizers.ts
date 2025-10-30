export function normalizeAirportInfo(u: any) {
	const getName = (obj: any) => {
		if (typeof obj === "string") return obj;
		if (obj && typeof obj === "object") return obj.name || obj.fullName || obj.text || "";
		return "";
	};
	const getCity = (obj: any) => {
		if (typeof obj === "string") return obj;
		if (obj && typeof obj === "object") return obj.name || obj.city || obj.municipality || "";
		return "";
	};
	const getCountry = (obj: any) => {
		if (typeof obj === "string") return obj;
		if (obj && typeof obj === "object") return obj.name || obj.country || obj.countryName || "";
		return "";
	};
	const getElevation = (obj: any) => {
		if (typeof obj === "number") return obj;
		if (obj && typeof obj === "object") return obj.feet || obj.meter || obj.km || obj.mile || obj.nm || null;
		return null;
	};
	return {
		name: getName(u?.name) || getName(u?.fullName) || "",
		iata: u?.iata || u?.iataCode || "",
		icao: u?.icao || u?.icaoCode || "",
		city: getCity(u?.city) || getCity(u?.municipality) || "",
		country: getCountry(u?.country) || getCountry(u?.countryName) || "",
		countryCode: u?.countryCode || u?.countryIso || "",
		timezone: u?.timezone || u?.timeZone || "",
		latitude: u?.latitude || u?.lat || null,
		longitude: u?.longitude || u?.lng || u?.lon || null,
		elevation: getElevation(u?.elevation) || getElevation(u?.elevationFeet) || null,
		website: u?.website || u?.url || "",
		description: u?.description || u?.summary || "",
	};
}

export type Direction = "departures" | "arrivals";

export function normalizeFids(u: any, direction: Direction = "departures") {
	const list = Array.isArray(u) ? u : u?.departures || u?.arrivals || u?.items || u?.data || [];
	return (list as any[]).map((x) => {
		const status = x?.status || x?.movement?.status || {};
		const statusText = status?.text || status?.generic?.statusText || status || "Unknown";
		const flight = x?.flight || {};
		const number = flight?.number || x?.number || x?.callsign || "";
		const icao = flight?.icao || x?.icao || "";
		const iata = flight?.iata || x?.iata || "";
		let time = "";
		let timeObj = x?.movement?.scheduledTime;
		if (typeof timeObj === "string") time = timeObj;
		else if (timeObj && typeof timeObj === "object") time = timeObj.local || timeObj.utc || timeObj.scheduled || "";
		let airport: any = x?.movement?.airport || {};
		const airportCode = airport?.iata || airport?.icao || airport?.code || "";
		const airportName = airport?.name || airport?.shortName || airport?.city || "";
		const aircraft = x?.aircraft || {};
		const reg = aircraft?.reg || aircraft?.registration || x?.registration || "";
		const gate = x?.departure?.gate || x?.arrival?.gate || x?.gate || "";
		const terminal = x?.departure?.terminal || x?.arrival?.terminal || x?.terminal || "";
		const gateInfo = gate || terminal || "";
		return {
			id: String(x?.id || `${number}-${time}-${Math.random()}`),
			number: number || iata || icao,
			airline: (x?.airline || x?.airlineName || x?.operator || {}).name || (x?.airline || x?.airlineName || x?.operator || ""),
			to: direction === "departures" ? airportCode : "",
			from: direction === "arrivals" ? airportCode : "",
			airportName,
			reg,
			status: statusText,
			time,
			gate: gateInfo,
		};
	});
}


