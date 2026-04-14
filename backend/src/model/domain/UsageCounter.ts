/**
 * Domain model for UsageCounter entity
 * Tracks per-user usage of limited resources (image scans, vocabulary lists)
 */

export interface UsageCounter {
  userId: string;
  imageScansCount: number;
  vocabularyListsCount: number;
  imageScanPeriodStart?: string;
  updatedAt: string;
}
