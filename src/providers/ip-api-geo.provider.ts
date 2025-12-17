import { Injectable } from '@nestjs/common';
import { GeoLocationProvider, GeoLocationResult } from '../interfaces/geo-location.interface';

/**
 * IP-API.com provider (free service)
 * Rate limit: 45 requests per minute
 * Docs: https://ip-api.com/docs/api:json
 */
@Injectable()
export class IpApiGeoProvider implements GeoLocationProvider {
    private readonly baseUrl = 'http://ip-api.com/json';
    private cache: Map<string, { result: GeoLocationResult | null; timestamp: number }> = new Map();
    private readonly cacheTTL = 3600000; // 1 hour

    async lookup(ip: string): Promise<GeoLocationResult | null> {
        if (this.isPrivateIP(ip)) {
            return {
                countryCode: 'XX',
                country: 'Private/Local',
            };
        }

        const cached = this.cache.get(ip);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.result;
        }

        try {
            const response = await fetch(
                `${this.baseUrl}/${ip}?fields=status,country,countryCode,region,city,lat,lon,timezone`,
            );

            if (!response.ok) {
                console.error(`IP-API returned status: ${response.status}`);
                return null;
            }

            const data: any = await response.json();

            if (data.status === 'fail') {
                console.error('IP-API lookup failed:', data.message);
                return null;
            }

            const result: GeoLocationResult = {
                country: data.country,
                countryCode: data.countryCode,
                region: data.region,
                city: data.city,
                lat: data.lat,
                lon: data.lon,
                timezone: data.timezone,
            };

            this.cache.set(ip, { result, timestamp: Date.now() });

            return result;
        } catch (error) {
            console.error('Error fetching geo data from IP-API:', error);
            return null;
        }
    }

    private isPrivateIP(ip: string): boolean {
        const parts = ip.split('.').map(Number);

        if (parts[0] === 10) return true;
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
        if (parts[0] === 192 && parts[1] === 168) return true;
        if (parts[0] === 127) return true;

        return false;
    }

    clearCache(): void {
        this.cache.clear();
    }
}
