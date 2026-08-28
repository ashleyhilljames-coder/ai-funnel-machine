import { SITE_CONFIG } from '../config/site';

/**
 * Returns formatted local time string in America/Los_Angeles timezone (Las Vegas local time)
 */
export const formatLasVegasTime = (timestamp: number = Date.now()): string => {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: SITE_CONFIG.timezone,
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(timestamp));
};

/**
 * Returns local hour (0-23) in America/Los_Angeles timezone
 */
export const getLasVegasHour = (timestamp: number = Date.now()): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SITE_CONFIG.timezone,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date(timestamp));

  const hourPart = parts.find((p) => p.type === 'hour');
  return hourPart ? parseInt(hourPart.value, 10) : new Date(timestamp).getHours();
};

/**
 * Evaluates if a given timestamp was submitted before 3:00 PM (15:00) local Las Vegas time
 */
export const isBeforeSameDayCutoff = (timestamp: number = Date.now()): boolean => {
  const hour = getLasVegasHour(timestamp);
  return hour < SITE_CONFIG.guarantee.cutoffHourLocal;
};

/**
 * Constructs local submission metadata object for lead payloads
 */
export const getLocalSubmissionMetadata = () => {
  const now = Date.now();
  return {
    createdAt: now,
    localTimeString: formatLasVegasTime(now),
    localTimezone: SITE_CONFIG.timezone,
    qualifiesForSameDayGuarantee: isBeforeSameDayCutoff(now),
  };
};
