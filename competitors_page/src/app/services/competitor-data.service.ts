import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import type {
  CompetitorData,
  CompetitorConfiguration,
  FeatureMatrix,
  PricingComparison,
  YourProductData,
} from '../models/competitor.interface';

/**
 * Service for managing competitor data loading, validation, and access
 * Implements requirements 6.1, 6.2, 6.3 for data management flexibility
 */
@Injectable({
  providedIn: 'root',
})
export class CompetitorDataService {
  private readonly configPath = './assets/config/competitors.json';
  private competitorsSubject = new BehaviorSubject<CompetitorData[]>([]);
  private yourProductSubject = new BehaviorSubject<YourProductData | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  public competitors$ = this.competitorsSubject.asObservable();
  public yourProduct$ = this.yourProductSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Load competitor data from JSON configuration file
   * Implements requirement 6.1: Store competitor data in easily editable configuration files
   */
  async loadCompetitorData(): Promise<CompetitorData[]> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    console.log('Loading competitor data from:', this.configPath);

    try {
      const config = await this.http
        .get<CompetitorConfiguration>(this.configPath)
        .pipe(
          map((data) => this.validateConfiguration(data)),
          catchError((error) => {
            console.error('Error loading competitor data:', error);
            const errorMessage = this.handleLoadError(error);
            this.errorSubject.next(errorMessage);
            return throwError(() => new Error(errorMessage));
          }),
        )
        .toPromise();

      if (!config) {
        throw new Error('Failed to load competitor configuration');
      }

      console.log('Successfully loaded competitor data:', config.competitors.length, 'competitors');

      // Cache the data for offline access
      this.cacheCompetitorData(config);

      this.competitorsSubject.next(config.competitors);
      this.yourProductSubject.next(config.yourProduct);
      this.loadingSubject.next(false);

      return config.competitors;
    } catch (error) {
      console.error('Failed to load competitor data, attempting recovery:', error);
      this.loadingSubject.next(false);

      // Attempt recovery with fallback data
      try {
        const fallbackData = await this.attemptDataRecovery();
        if (fallbackData.length > 0) {
          this.competitorsSubject.next(fallbackData);
          console.warn('Using fallback competitor data due to loading error');
          return fallbackData;
        }
      } catch (recoveryError) {
        console.error('Data recovery failed:', recoveryError);
      }

      throw error;
    }
  }

  /**
   * Get competitor by slug identifier
   * Implements requirement 6.2: Allow competitor lookup functionality
   */
  getCompetitorBySlug(slug: string): CompetitorData | undefined {
    const competitors = this.competitorsSubject.value;
    return competitors.find((competitor) => competitor.slug === slug);
  }

  /**
   * Get all loaded competitors
   */
  getAllCompetitors(): CompetitorData[] {
    return this.competitorsSubject.value;
  }

  /**
   * Get competitors filtered by criteria
   * Implements requirement 6.2: Allow competitor filtering functionality
   */
  getFilteredCompetitors(criteria: {
    name?: string;
    targetAudience?: string;
    hasFeature?: keyof CompetitorData['features'];
    maxPrice?: number;
  }): CompetitorData[] {
    const competitors = this.competitorsSubject.value;

    return competitors.filter((competitor) => {
      // Filter by name (case-insensitive partial match)
      if (criteria.name && !competitor.name.toLowerCase().includes(criteria.name.toLowerCase())) {
        return false;
      }

      // Filter by target audience (case-insensitive partial match)
      if (
        criteria.targetAudience &&
        !competitor.targetAudience.toLowerCase().includes(criteria.targetAudience.toLowerCase())
      ) {
        return false;
      }

      // Filter by feature availability
      if (
        criteria.hasFeature &&
        (competitor.features[criteria.hasFeature] === 'none' || competitor.features[criteria.hasFeature] === undefined)
      ) {
        return false;
      }

      // Filter by maximum price (considering lowest tier price, excluding custom pricing)
      if (criteria.maxPrice !== undefined) {
        const numericPrices = competitor.pricing
          .filter((tier) => typeof tier.price === 'number')
          .map((tier) => tier.price as number);

        if (numericPrices.length > 0) {
          const lowestPrice = Math.min(...numericPrices);
          if (lowestPrice > criteria.maxPrice) {
            return false;
          }
        }
      }

      return true;
    });
  }

  /**
   * Get feature comparison matrix for all competitors
   */
  getFeatureComparison(): FeatureMatrix {
    const competitors = this.competitorsSubject.value;
    const matrix: FeatureMatrix = {};

    competitors.forEach((competitor) => {
      matrix[competitor.slug] = competitor.features;
    });

    return matrix;
  }

  /**
   * Get pricing comparison for all competitors
   */
  getPricingComparison(): PricingComparison {
    const competitors = this.competitorsSubject.value;
    const comparison: PricingComparison = {};

    competitors.forEach((competitor) => {
      comparison[competitor.slug] = competitor.pricing;
    });

    return comparison;
  }

  /**
   * Get Your Product data
   */
  getYourProductData(): YourProductData | null {
    return this.yourProductSubject.value;
  }

  /**
   * Check if competitor data is outdated (older than 30 days)
   * Implements requirement 6.4: Display disclaimers for outdated information
   */
  isDataOutdated(competitor: CompetitorData): boolean {
    const lastUpdated = new Date(competitor.lastUpdated);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return lastUpdated < thirtyDaysAgo;
  }

  /**
   * Get list of competitors with outdated data
   */
  getOutdatedCompetitors(): CompetitorData[] {
    return this.competitorsSubject.value.filter((competitor) => this.isDataOutdated(competitor));
  }

  /**
   * Get data freshness status for a competitor
   * Returns detailed information about data age and freshness
   */
  getDataFreshnessStatus(competitor: CompetitorData): {
    isOutdated: boolean;
    daysSinceUpdate: number;
    lastUpdated: Date;
    freshnessLevel: 'fresh' | 'moderate' | 'outdated' | 'stale';
    disclaimer: string;
  } {
    const lastUpdated = new Date(competitor.lastUpdated);
    const now = new Date();
    const daysSinceUpdate = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));

    // Debug logging
    console.log(`Freshness calculation for ${competitor.name}:`, {
      lastUpdatedString: competitor.lastUpdated,
      lastUpdatedDate: lastUpdated,
      now: now,
      timeDiff: now.getTime() - lastUpdated.getTime(),
      daysSinceUpdate: daysSinceUpdate,
    });

    let freshnessLevel: 'fresh' | 'moderate' | 'outdated' | 'stale';
    let disclaimer: string;

    if (daysSinceUpdate <= 7) {
      freshnessLevel = 'fresh';
      disclaimer = '';
    } else if (daysSinceUpdate <= 30) {
      freshnessLevel = 'moderate';
      disclaimer = `Data last updated ${daysSinceUpdate} days ago. Information may have changed.`;
    } else if (daysSinceUpdate <= 90) {
      freshnessLevel = 'outdated';
      disclaimer = `Data is ${daysSinceUpdate} days old. Pricing and features may have changed significantly. Please verify current information on the competitor's website.`;
    } else {
      freshnessLevel = 'stale';
      disclaimer = `Data is over ${daysSinceUpdate} days old and may be significantly outdated. Please verify all information directly with the competitor.`;
    }

    return {
      isOutdated: daysSinceUpdate > 30,
      daysSinceUpdate,
      lastUpdated,
      freshnessLevel,
      disclaimer,
    };
  }

  /**
   * Get overall data freshness summary for all competitors
   */
  getOverallDataFreshness(): {
    totalCompetitors: number;
    freshCount: number;
    moderateCount: number;
    outdatedCount: number;
    staleCount: number;
    oldestDataAge: number;
    newestDataAge: number;
    averageDataAge: number;
    needsUpdateCount: number;
  } {
    const competitors = this.competitorsSubject.value;

    console.log(
      'Calculating overall data freshness for competitors:',
      competitors.map((c) => ({ name: c.name, lastUpdated: c.lastUpdated })),
    );

    let freshCount = 0;
    let moderateCount = 0;
    let outdatedCount = 0;
    let staleCount = 0;
    let totalDays = 0;
    let oldestAge = 0;
    let newestAge = Infinity;

    competitors.forEach((competitor) => {
      const status = this.getDataFreshnessStatus(competitor);
      const age = status.daysSinceUpdate;

      totalDays += age;
      oldestAge = Math.max(oldestAge, age);
      newestAge = Math.min(newestAge, age);

      switch (status.freshnessLevel) {
        case 'fresh':
          freshCount++;
          break;
        case 'moderate':
          moderateCount++;
          break;
        case 'outdated':
          outdatedCount++;
          break;
        case 'stale':
          staleCount++;
          break;
      }
    });

    const result = {
      totalCompetitors: competitors.length,
      freshCount,
      moderateCount,
      outdatedCount,
      staleCount,
      oldestDataAge: oldestAge,
      newestDataAge: newestAge === Infinity ? 0 : newestAge,
      averageDataAge: competitors.length > 0 ? Math.round(totalDays / competitors.length) : 0,
      needsUpdateCount: outdatedCount + staleCount,
    };

    console.log('Overall data freshness result:', result);

    return result;
  }

  /**
   * Validate timestamp format and range for competitor data
   * Ensures lastUpdated dates are valid and reasonable
   */
  validateTimestamp(
    timestamp: string,
    competitorName: string,
  ): {
    isValid: boolean;
    error?: string;
    parsedDate?: Date;
  } {
    try {
      const date = new Date(timestamp);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return {
          isValid: false,
          error: `Invalid date format for ${competitorName}: ${timestamp}`,
        };
      }

      // Check if date is not in the future
      const now = new Date();
      if (date > now) {
        return {
          isValid: false,
          error: `Future date not allowed for ${competitorName}: ${timestamp}`,
        };
      }

      // Check if date is not too old (more than 2 years)
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      if (date < twoYearsAgo) {
        return {
          isValid: false,
          error: `Date too old for ${competitorName}: ${timestamp}. Data older than 2 years should be refreshed.`,
        };
      }

      return {
        isValid: true,
        parsedDate: date,
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Failed to parse date for ${competitorName}: ${timestamp}`,
      };
    }
  }

  /**
   * Validate pricing tier data for completeness and consistency
   */
  validatePricingTier(
    tier: unknown,
    competitorName: string,
    tierIndex: number,
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Type guard to ensure tier is an object
    if (!tier || typeof tier !== 'object') {
      errors.push(`Pricing tier ${tierIndex} for ${competitorName} must be an object`);
      return { isValid: false, errors };
    }

    const tierObj = tier as Record<string, unknown>;

    // Required fields
    const requiredFields = ['name', 'price', 'billing', 'features', 'limitations'];
    requiredFields.forEach((field) => {
      if (tierObj[field] === undefined || tierObj[field] === null) {
        errors.push(`Missing required field '${field}' in pricing tier ${tierIndex} for ${competitorName}`);
      }
    });

    // Validate price
    if (
      (typeof tierObj['price'] !== 'number' && tierObj['price'] !== 'Custom') ||
      (typeof tierObj['price'] === 'number' && (tierObj['price'] as number) < 0)
    ) {
      errors.push(
        `Invalid price in pricing tier ${tierIndex} for ${competitorName}: must be a non-negative number or 'Custom'`,
      );
    }

    // Validate billing cycle
    if (tierObj['billing'] && !['monthly', 'annual', 'custom'].includes(tierObj['billing'] as string)) {
      errors.push(
        `Invalid billing cycle in pricing tier ${tierIndex} for ${competitorName}: must be 'monthly', 'annual', or 'custom'`,
      );
    }

    // Validate features array
    if (tierObj['features'] && !Array.isArray(tierObj['features'])) {
      errors.push(`Features must be an array in pricing tier ${tierIndex} for ${competitorName}`);
    }

    // Validate limitations array
    if (tierObj['limitations'] && !Array.isArray(tierObj['limitations'])) {
      errors.push(`Limitations must be an array in pricing tier ${tierIndex} for ${competitorName}`);
    }

    // Validate tier name
    if (tierObj['name'] && typeof tierObj['name'] !== 'string') {
      errors.push(`Tier name must be a string in pricing tier ${tierIndex} for ${competitorName}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate feature status values
   */
  validateFeatureStatus(
    status: unknown,
    featureName: string,
    competitorName: string,
  ): {
    isValid: boolean;
    error?: string;
  } {
    const validStatuses = ['full', 'partial', 'none', 'premium'];

    if (typeof status !== 'string' || !validStatuses.includes(status as string)) {
      return {
        isValid: false,
        error: `Invalid feature status '${status}' for feature '${featureName}' in ${competitorName}. Must be one of: ${validStatuses.join(', ')}`,
      };
    }

    return { isValid: true };
  }

  /**
   * Validate URL format
   */
  validateUrl(
    url: string,
    fieldName: string,
    competitorName: string,
  ): {
    isValid: boolean;
    error?: string;
  } {
    try {
      const urlObj = new URL(url);

      // Must be HTTP or HTTPS
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return {
          isValid: false,
          error: `Invalid protocol in ${fieldName} for ${competitorName}: must be HTTP or HTTPS`,
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: `Invalid URL format in ${fieldName} for ${competitorName}: ${url}`,
      };
    }
  }

  /**
   * Validate array field for minimum length and content
   */
  validateArrayField(
    array: unknown,
    fieldName: string,
    competitorName: string,
    minLength: number = 1,
  ): {
    isValid: boolean;
    error?: string;
  } {
    if (!Array.isArray(array)) {
      return {
        isValid: false,
        error: `${fieldName} must be an array for ${competitorName}`,
      };
    }

    if (array.length < minLength) {
      return {
        isValid: false,
        error: `${fieldName} must have at least ${minLength} item(s) for ${competitorName}`,
      };
    }

    // Check for empty strings
    const hasEmptyStrings = array.some((item) => typeof item === 'string' && item.trim().length === 0);
    if (hasEmptyStrings) {
      return {
        isValid: false,
        error: `${fieldName} contains empty strings for ${competitorName}`,
      };
    }

    return { isValid: true };
  }

  /**
   * Comprehensive validation of competitor data with detailed error reporting
   */
  validateCompetitorDataComprehensive(
    competitor: unknown,
    index: number,
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Type guard to ensure competitor is an object
    if (!competitor || typeof competitor !== 'object') {
      return {
        isValid: false,
        errors: [`Competitor at index ${index} must be an object`],
        warnings: [],
      };
    }

    const competitorObj = competitor as Record<string, unknown>;
    const competitorName = (competitorObj['name'] as string) || `competitor at index ${index}`;

    // Basic required fields validation
    const requiredFields = [
      'name',
      'slug',
      'tagline',
      'logo',
      'website',
      'pricing',
      'features',
      'pros',
      'cons',
      'targetAudience',
      'lastUpdated',
    ];
    requiredFields.forEach((field) => {
      if (!competitorObj[field]) {
        errors.push(`Missing required field '${field}' for ${competitorName}`);
      }
    });

    if (errors.length > 0) {
      return { isValid: false, errors, warnings };
    }

    // Validate slug format
    if (typeof competitorObj['slug'] === 'string' && !/^[a-z0-9-]+$/.test(competitorObj['slug'] as string)) {
      errors.push(
        `Invalid slug format '${competitorObj['slug']}' for ${competitorName}. Should contain only lowercase letters, numbers, and hyphens.`,
      );
    }

    // Validate URL fields
    if (typeof competitorObj['website'] === 'string') {
      const urlValidation = this.validateUrl(competitorObj['website'] as string, 'website', competitorName);
      if (!urlValidation.isValid) {
        errors.push(urlValidation.error!);
      }
    }

    // Validate timestamp
    if (typeof competitorObj['lastUpdated'] === 'string') {
      const timestampValidation = this.validateTimestamp(competitorObj['lastUpdated'] as string, competitorName);
      if (!timestampValidation.isValid) {
        errors.push(timestampValidation.error!);
      } else if (timestampValidation.parsedDate) {
        // Add warning for old data
        const daysSinceUpdate = Math.floor(
          (Date.now() - timestampValidation.parsedDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysSinceUpdate > 30) {
          warnings.push(`Data for ${competitorName} is ${daysSinceUpdate} days old and may need updating`);
        }
      }
    }

    // Validate pricing array
    if (Array.isArray(competitorObj['pricing'])) {
      const pricingValidation = this.validateArrayField(competitorObj['pricing'], 'pricing', competitorName);
      if (!pricingValidation.isValid) {
        errors.push(pricingValidation.error!);
      } else {
        // Validate each pricing tier
        (competitorObj['pricing'] as unknown[]).forEach((tier: unknown, tierIndex: number) => {
          const tierValidation = this.validatePricingTier(tier, competitorName, tierIndex);
          if (!tierValidation.isValid) {
            errors.push(...tierValidation.errors);
          }
        });
      }
    } else {
      errors.push(`Pricing must be an array for ${competitorName}`);
    }

    // Validate features object
    if (competitorObj['features'] && typeof competitorObj['features'] === 'object') {
      const featuresObj = competitorObj['features'] as Record<string, unknown>;
      const requiredFeatures = [
        'multiPlatformPosting',
        'aiContentGeneration',
        'scheduling',
        'analytics',
        'teamCollaboration',
        'mentionResolution',
        'contentRecycling',
        'visualPlanning',
        'socialListening',
      ];
      requiredFeatures.forEach((feature) => {
        if (!featuresObj[feature]) {
          errors.push(`Missing feature '${feature}' for ${competitorName}`);
        } else {
          const featureValidation = this.validateFeatureStatus(featuresObj[feature], feature, competitorName);
          if (!featureValidation.isValid) {
            errors.push(featureValidation.error!);
          }
        }
      });
    } else {
      errors.push(`Features must be an object for ${competitorName}`);
    }

    // Validate array fields
    if (Array.isArray(competitorObj['pros'])) {
      const prosValidation = this.validateArrayField(competitorObj['pros'], 'pros', competitorName);
      if (!prosValidation.isValid) {
        errors.push(prosValidation.error!);
      }
    } else {
      errors.push(`Pros must be an array for ${competitorName}`);
    }

    if (Array.isArray(competitorObj['cons'])) {
      const consValidation = this.validateArrayField(competitorObj['cons'], 'cons', competitorName);
      if (!consValidation.isValid) {
        errors.push(consValidation.error!);
      }
    } else {
      errors.push(`Cons must be an array for ${competitorName}`);
    }

    // Validate string fields for minimum length
    const stringFields = ['name', 'tagline', 'targetAudience'];
    stringFields.forEach((field) => {
      const value = competitorObj[field];
      if (typeof value !== 'string' || (value as string).trim().length === 0) {
        errors.push(`${field} must be a non-empty string for ${competitorName}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate configuration data with detailed error reporting and recovery suggestions
   */
  validateConfigurationComprehensive(config: unknown): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    recoverySuggestions: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recoverySuggestions: string[] = [];

    if (!config || typeof config !== 'object') {
      errors.push('Configuration data is null, undefined, or not an object');
      recoverySuggestions.push('Ensure the configuration file exists and contains valid JSON');
      return { isValid: false, errors, warnings, recoverySuggestions };
    }

    const configObj = config as Record<string, unknown>;

    // Validate competitors array
    if (!configObj['competitors'] || !Array.isArray(configObj['competitors'])) {
      errors.push('Invalid or missing competitors array in configuration');
      recoverySuggestions.push('Ensure the configuration file has a "competitors" array');
    } else if ((configObj['competitors'] as unknown[]).length === 0) {
      warnings.push('No competitors found in configuration');
      recoverySuggestions.push('Add at least one competitor to the configuration');
    } else {
      // Validate each competitor
      (configObj['competitors'] as unknown[]).forEach((competitor: unknown, index: number) => {
        const validation = this.validateCompetitorDataComprehensive(competitor, index);
        errors.push(...validation.errors);
        warnings.push(...validation.warnings);
      });

      // Check for duplicate slugs
      const slugs = (configObj['competitors'] as unknown[])
        .map((c: unknown) => {
          if (c && typeof c === 'object') {
            return (c as Record<string, unknown>)['slug'] as string;
          }
          return undefined;
        })
        .filter(Boolean) as string[];
      const duplicateSlugs = slugs.filter((slug: string, index: number) => slugs.indexOf(slug) !== index);
      if (duplicateSlugs.length > 0) {
        errors.push(`Duplicate competitor slugs found: ${duplicateSlugs.join(', ')}`);
        recoverySuggestions.push('Ensure all competitor slugs are unique');
      }
    }

    // Validate Your Product data
    if (!configObj['yourProduct']) {
      errors.push('Missing Your Product data in configuration');
      recoverySuggestions.push('Add "yourProduct" object to configuration with uniqueFeatures and pricing arrays');
    } else {
      const yourProductValidation = this.validateYourProductDataComprehensive(configObj['yourProduct']);
      errors.push(...yourProductValidation.errors);
      warnings.push(...yourProductValidation.warnings);
      recoverySuggestions.push(...yourProductValidation.recoverySuggestions);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recoverySuggestions,
    };
  }

  /**
   * Validate Your Product data with comprehensive checks
   */
  private validateYourProductDataComprehensive(yourProduct: unknown): {
    errors: string[];
    warnings: string[];
    recoverySuggestions: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recoverySuggestions: string[] = [];

    if (!yourProduct || typeof yourProduct !== 'object') {
      errors.push('Your Product data must be an object');
      recoverySuggestions.push('Add "yourProduct" object to configuration');
      return { errors, warnings, recoverySuggestions };
    }

    const yourProductObj = yourProduct as Record<string, unknown>;

    // Validate unique features
    if (!yourProductObj['uniqueFeatures'] || !Array.isArray(yourProductObj['uniqueFeatures'])) {
      errors.push('Invalid or missing uniqueFeatures array in Your Product data');
      recoverySuggestions.push('Add "uniqueFeatures" array to yourProduct configuration');
    } else if ((yourProductObj['uniqueFeatures'] as unknown[]).length === 0) {
      warnings.push('No unique features listed for Your Product');
      recoverySuggestions.push('Add unique features that differentiate Your Product from competitors');
    }

    // Validate pricing
    if (
      !yourProductObj['pricing'] ||
      !Array.isArray(yourProductObj['pricing']) ||
      (yourProductObj['pricing'] as unknown[]).length === 0
    ) {
      errors.push('Invalid or empty pricing array in Your Product data');
      recoverySuggestions.push('Add pricing tiers to yourProduct configuration');
    } else {
      // Validate each pricing tier
      (yourProductObj['pricing'] as unknown[]).forEach((tier: unknown, index: number) => {
        const tierValidation = this.validatePricingTier(tier, 'Your Product', index);
        if (!tierValidation.isValid) {
          errors.push(...tierValidation.errors);
        }
      });

      // Check for free tier
      const hasFreeOption = (yourProductObj['pricing'] as unknown[]).some((tier: unknown) => {
        if (tier && typeof tier === 'object') {
          return (tier as Record<string, unknown>)['price'] === 0;
        }
        return false;
      });
      if (!hasFreeOption) {
        warnings.push('No free pricing tier found for Your Product');
        recoverySuggestions.push('Consider adding a free tier to remain competitive');
      }
    }

    return { errors, warnings, recoverySuggestions };
  }

  /**
   * Validate competitor configuration data
   * Implements requirement 6.3: Validate competitor data for consistency and completeness
   */
  private validateConfiguration(config: CompetitorConfiguration): CompetitorConfiguration {
    const validation = this.validateConfigurationComprehensive(config);

    if (!validation.isValid) {
      const errorMessage = `Configuration validation failed:\n${validation.errors.join('\n')}`;

      if (validation.recoverySuggestions.length > 0) {
        const suggestions = `\n\nRecovery suggestions:\n${validation.recoverySuggestions.join('\n')}`;
        throw new Error(errorMessage + suggestions);
      }

      throw new Error(errorMessage);
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn('Configuration warnings:', validation.warnings);
    }

    return config;
  }

  /**
   * Validate individual competitor data
   */
  private validateCompetitorData(competitor: CompetitorData, index: number): void {
    const requiredFields = [
      'name',
      'slug',
      'tagline',
      'logo',
      'website',
      'pricing',
      'features',
      'pros',
      'cons',
      'targetAudience',
      'lastUpdated',
    ];

    requiredFields.forEach((field) => {
      if (!competitor[field as keyof CompetitorData]) {
        throw new Error(`Missing required field '${field}' in competitor at index ${index}`);
      }
    });

    // Validate slug format (should be URL-friendly)
    if (!/^[a-z0-9-]+$/.test(competitor.slug)) {
      throw new Error(
        `Invalid slug format '${competitor.slug}' at competitor index ${index}. Should contain only lowercase letters, numbers, and hyphens.`,
      );
    }

    // Validate pricing array
    if (!Array.isArray(competitor.pricing) || competitor.pricing.length === 0) {
      throw new Error(`Invalid or empty pricing array for competitor at index ${index}`);
    }

    // Validate features object
    const requiredFeatures = [
      'multiPlatformPosting',
      'aiContentGeneration',
      'scheduling',
      'analytics',
      'teamCollaboration',
      'mentionResolution',
      'contentRecycling',
      'visualPlanning',
      'socialListening',
    ];
    requiredFeatures.forEach((feature) => {
      if (!competitor.features[feature as keyof typeof competitor.features]) {
        throw new Error(`Missing feature '${feature}' for competitor at index ${index}`);
      }
    });

    // Validate lastUpdated date format and range
    const timestampValidation = this.validateTimestamp(competitor.lastUpdated, competitor.name);
    if (!timestampValidation.isValid) {
      throw new Error(`${timestampValidation.error} at competitor index ${index}`);
    }
  }

  /**
   * Validate Your Product data
   */
  private validateYourProductData(yourProduct: YourProductData): void {
    if (!yourProduct.uniqueFeatures || !Array.isArray(yourProduct.uniqueFeatures)) {
      throw new Error('Invalid or missing uniqueFeatures array in Your Product data');
    }

    if (!yourProduct.pricing || !Array.isArray(yourProduct.pricing) || yourProduct.pricing.length === 0) {
      throw new Error('Invalid or empty pricing array in Your Product data');
    }
  }

  /**
   * Handle loading errors with appropriate error messages and recovery suggestions
   * Implements requirement 6.3: Include error handling
   */
  private handleLoadError(error: unknown): string {
    // Type guard to ensure error is an object with properties we can check
    if (!error || typeof error !== 'object') {
      return 'Unknown error occurred while loading competitor data. Please try refreshing the page.';
    }

    const errorObj = error as Record<string, unknown>;

    if (errorObj['status'] === 404) {
      return 'Competitor configuration file not found. Please ensure the configuration file exists at /assets/config/competitors.json';
    }

    if (errorObj['status'] === 0) {
      return 'Network error: Unable to load competitor data. Please check your internet connection and try again.';
    }

    if (errorObj['name'] === 'SyntaxError') {
      return 'Invalid JSON format in competitor configuration file. Please check the file syntax and ensure it contains valid JSON.';
    }

    // Handle validation errors with detailed information
    if (
      typeof errorObj['message'] === 'string' &&
      (errorObj['message'] as string).includes('Configuration validation failed')
    ) {
      return `Data validation error: ${errorObj['message']}`;
    }

    // Handle timeout errors
    if (errorObj['name'] === 'TimeoutError') {
      return 'Request timeout: The competitor data is taking too long to load. Please try again.';
    }

    // Handle CORS errors
    if (typeof errorObj['message'] === 'string' && (errorObj['message'] as string).includes('CORS')) {
      return 'Cross-origin request blocked: Unable to load competitor data due to security restrictions.';
    }

    const message = typeof errorObj['message'] === 'string' ? errorObj['message'] : 'Unknown error occurred';
    return `Failed to load competitor data: ${message}. Please try refreshing the page.`;
  }

  /**
   * Attempt to recover from data loading errors with fallback strategies
   */
  private async attemptDataRecovery(): Promise<CompetitorData[]> {
    // In development mode, don't use cache recovery to avoid stale data
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.warn('Development mode: skipping cache recovery to avoid stale data');
      return this.getFallbackCompetitorData();
    }

    // Try to load from browser cache if available
    try {
      const cachedData = localStorage.getItem('competitor-data-cache');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        const cacheTimestamp = localStorage.getItem('competitor-data-cache-timestamp');

        if (cacheTimestamp) {
          const cacheAge = Date.now() - parseInt(cacheTimestamp);
          const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours

          if (cacheAge < maxCacheAge) {
            console.warn('Using cached competitor data due to loading error');
            return parsed.competitors || [];
          }
        }
      }
    } catch (cacheError) {
      console.warn('Failed to load from cache:', cacheError);
    }

    // Return minimal fallback data
    return this.getFallbackCompetitorData();
  }

  /**
   * Provide minimal fallback competitor data when main data fails to load
   */
  private getFallbackCompetitorData(): CompetitorData[] {
    return [
      {
        name: 'Buffer',
        slug: 'buffer',
        tagline: 'Social media management platform',
        logo: '/assets/images/competitors/buffer-logo.png',
        website: 'https://buffer.com',
        pricing: [
          {
            name: 'Free',
            price: 0,
            billing: 'monthly',
            features: ['3 social channels', '10 posts per channel'],
            limitations: ['Limited features'],
          },
        ],
        features: {
          multiPlatformPosting: 'full',
          aiContentGeneration: 'none',
          scheduling: 'full',
          analytics: 'partial',
          teamCollaboration: 'premium',
          mentionResolution: 'none',
          contentRecycling: 'none',
          visualPlanning: 'partial',
          socialListening: 'none',
        },
        pros: ['User-friendly interface', 'Reliable scheduling'],
        cons: ['No AI features', 'Limited free plan'],
        targetAudience: 'Small businesses',
        lastUpdated: new Date().toISOString().split('T')[0],
      },
    ];
  }

  /**
   * Cache competitor data for offline access
   */
  private cacheCompetitorData(config: CompetitorConfiguration): void {
    try {
      localStorage.setItem('competitor-data-cache', JSON.stringify(config));
      localStorage.setItem('competitor-data-cache-timestamp', Date.now().toString());
    } catch (error) {
      console.warn('Failed to cache competitor data:', error);
    }
  }

  /**
   * Refresh competitor data by reloading from configuration
   */
  async refreshData(): Promise<CompetitorData[]> {
    // Clear cache to force fresh data load
    try {
      localStorage.removeItem('competitor-data-cache');
      localStorage.removeItem('competitor-data-cache-timestamp');
    } catch (error) {
      console.warn('Failed to clear cache during refresh:', error);
    }

    return this.loadCompetitorData();
  }

  /**
   * Clear all loaded data and reset service state
   */
  clearData(): void {
    this.competitorsSubject.next([]);
    this.yourProductSubject.next(null);
    this.errorSubject.next(null);
    this.loadingSubject.next(false);

    // Clear localStorage cache
    try {
      localStorage.removeItem('competitor-data-cache');
      localStorage.removeItem('competitor-data-cache-timestamp');
    } catch (error) {
      console.warn('Failed to clear competitor data cache:', error);
    }
  }

  /**
   * Get validation status for currently loaded data
   */
  getDataValidationStatus(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    competitorCount: number;
    lastValidated: Date;
  } {
    const competitors = this.competitorsSubject.value;
    const yourProduct = this.yourProductSubject.value;

    if (competitors.length === 0) {
      return {
        isValid: false,
        errors: ['No competitor data loaded'],
        warnings: [],
        competitorCount: 0,
        lastValidated: new Date(),
      };
    }

    const config = { competitors, yourProduct };
    const validation = this.validateConfigurationComprehensive(config);

    return {
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings,
      competitorCount: competitors.length,
      lastValidated: new Date(),
    };
  }

  /**
   * Validate and repair data inconsistencies where possible
   */
  validateAndRepairData(): {
    repaired: boolean;
    changes: string[];
    remainingIssues: string[];
  } {
    const competitors = this.competitorsSubject.value;
    const changes: string[] = [];
    const remainingIssues: string[] = [];
    let repaired = false;

    competitors.forEach((competitor, index) => {
      // Repair common issues

      // Fix slug format
      if (competitor.slug && !/^[a-z0-9-]+$/.test(competitor.slug)) {
        const originalSlug = competitor.slug;
        competitor.slug = competitor.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        changes.push(`Fixed slug format for ${competitor.name}: ${originalSlug} → ${competitor.slug}`);
        repaired = true;
      }

      // Trim whitespace from string fields
      const stringFields: (keyof CompetitorData)[] = ['name', 'tagline', 'targetAudience'];
      stringFields.forEach((field) => {
        const value = competitor[field];
        if (value && typeof value === 'string') {
          const original = value;
          const trimmed = value.trim();
          if (original !== trimmed) {
            // Use type assertion to safely update the field
            (competitor as unknown as Record<string, unknown>)[field] = trimmed;
            changes.push(`Trimmed whitespace from ${field} for ${competitor.name}`);
            repaired = true;
          }
        }
      });

      // Validate remaining issues that can't be auto-repaired
      const validation = this.validateCompetitorDataComprehensive(competitor, index);
      remainingIssues.push(...validation.errors);
    });

    if (repaired) {
      this.competitorsSubject.next([...competitors]);
    }

    return {
      repaired,
      changes,
      remainingIssues,
    };
  }
}
