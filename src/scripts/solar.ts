/**
 * Solar position for the Halde site in Copenhagen, using NOAA's general solar
 * position equations. Pure functions with no DOM or WebGL, so the page can
 * render the same values on the server that the 3D scene starts from.
 * https://gml.noaa.gov/grad/solcalc/solareqns.PDF
 */

export const SITE = { lat: 55.676, lon: 12.568 };

export type SunDate = {
  id: string;
  label: string;
  long: string;
  /** Day of the year, 2026. */
  day: number;
  /** Hours ahead of UTC on that date: CET in winter, CEST in summer. */
  utcOffset: number;
};

export const SUN_DATES: SunDate[] = [
  { id: 'mar', label: '21 Mar', long: 'Spring equinox', day: 80, utcOffset: 1 },
  { id: 'jun', label: '21 Jun', long: 'Summer solstice', day: 172, utcOffset: 2 },
  { id: 'sep', label: '23 Sep', long: 'Autumn equinox', day: 266, utcOffset: 2 },
  { id: 'dec', label: '21 Dec', long: 'Winter solstice', day: 355, utcOffset: 1 },
];

export const DEFAULT_DATE = SUN_DATES[1];

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
/** Atmospheric refraction plus the sun's radius, in degrees below the horizon. */
const HORIZON = 90.833;

function orbit(day: number) {
  const g = ((2 * Math.PI) / 365) * (day - 1);
  const equationOfTime =
    229.18 *
    (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const declination =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);
  return { equationOfTime, declination };
}

/** Elevation and azimuth (degrees clockwise from north) at a local clock time. */
export function sunPosition(day: number, hour: number, utcOffset: number) {
  const { equationOfTime, declination } = orbit(day);
  const lat = SITE.lat * RAD;
  const solarMinutes = hour * 60 + equationOfTime + 4 * SITE.lon - 60 * utcOffset;
  const hourAngle = (solarMinutes / 4 - 180) * RAD;

  const elevation =
    90 -
    Math.acos(Math.sin(lat) * Math.sin(declination) + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle)) * DEG;
  const azimuth =
    (Math.atan2(Math.sin(hourAngle), Math.cos(hourAngle) * Math.sin(lat) - Math.tan(declination) * Math.cos(lat)) * DEG +
      180) %
    360;
  return { elevation, azimuth };
}

/** Local sunrise and sunset, in decimal hours. */
export function daylight(day: number, utcOffset: number) {
  const { equationOfTime, declination } = orbit(day);
  const lat = SITE.lat * RAD;
  const halfDay =
    Math.acos(Math.cos(HORIZON * RAD) / (Math.cos(lat) * Math.cos(declination)) - Math.tan(lat) * Math.tan(declination)) * DEG;
  const noon = (720 - 4 * SITE.lon - equationOfTime + 60 * utcOffset) / 60;
  return { sunrise: noon - (4 * halfDay) / 60, sunset: noon + (4 * halfDay) / 60 };
}

/**
 * The clock span the scroll travels. It trims the first and last stretch of
 * daylight, when the sun is so low that the board falls into its own shadow.
 */
export function dayRange(day: number, utcOffset: number) {
  const { sunrise, sunset } = daylight(day, utcOffset);
  const trim = (sunset - sunrise) * 0.12;
  return { start: sunrise + trim, end: sunset - trim };
}

export function formatHour(hour: number) {
  const totalMinutes = Math.floor(hour * 60);
  const h = Math.floor(totalMinutes / 60);
  return `${String(h).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}

/** Whole hours inside a range, placed along the 0 to 1 track. */
export function hourTicks(start: number, end: number) {
  const ticks: { hour: number; at: number }[] = [];
  for (let hour = Math.ceil(start); hour <= end; hour++) ticks.push({ hour, at: (hour - start) / (end - start) });
  return ticks;
}
