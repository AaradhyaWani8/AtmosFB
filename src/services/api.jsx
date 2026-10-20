import { LOCATION_DATA } from "../data/climateData";

const API_DELAY_MS = 800;

/**
 * Simulates fetching the latest climate conditions from an API.
 * The delay keeps loading states representative of a real network request.
 */
export function getClimateData(location) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const climateData = LOCATION_DATA[location];

      if (!climateData) {
        reject(new Error(`Climate data is unavailable for ${location}.`));
        return;
      }

      resolve({
        ...climateData,
        location,
        fetchedAt: new Date().toISOString(),
      });
    }, API_DELAY_MS);
  });
}
