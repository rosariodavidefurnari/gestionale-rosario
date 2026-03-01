export type TravelRouteTripMode = "one_way" | "round_trip";

export type TravelRouteEstimateRequest = {
  origin: string;
  destination: string;
  tripMode: TravelRouteTripMode;
  kmRate?: number | null;
};

export type TravelRouteEstimate = {
  originQuery: string;
  destinationQuery: string;
  originLabel: string;
  destinationLabel: string;
  tripMode: TravelRouteTripMode;
  oneWayDistanceKm: number;
  totalDistanceKm: number;
  oneWayDurationMinutes: number;
  totalDurationMinutes: number;
  kmRate: number | null;
  reimbursementAmount: number | null;
  generatedDescription: string;
  generatedLocation: string;
};

export const buildTravelRouteDescription = ({
  origin,
  destination,
  tripMode,
}: {
  origin: string;
  destination: string;
  tripMode: TravelRouteTripMode;
}) =>
  `Spostamento — ${origin.trim()} - ${destination.trim()}${
    tripMode === "round_trip" ? " A/R" : ""
  }`;

