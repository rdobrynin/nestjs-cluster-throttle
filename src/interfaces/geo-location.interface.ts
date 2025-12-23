export interface GeoLocationResult {
    country?: string;
    countryCode?: string;
    region?: string;
    city?: string;
    lat?: number;
    lon?: number;
    timezone?: string;
}

export interface GeoLocationProvider {
    lookup(ip: string): Promise<GeoLocationResult | null>;
}

export interface GeoLocationOptions {
    provider?: 'internal' | 'ip-api' | 'ipapi' | 'custom';
    customProvider?: GeoLocationProvider;
    allowedCountries?: string[]; // ISO country codes (e.g., ['US', 'CA', 'GB'])
    blockedCountries?: string[]; // ISO country codes to block
    onGeoBlock?: (ip: string, country: string, request: any) => void;
    message?: string;
    statusCode?: number;
}
