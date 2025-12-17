import { Injectable } from '@nestjs/common';
import { GeoLocationProvider, GeoLocationResult } from '../interfaces/geo-location.interface';
import { InternalGeoProvider } from '../providers/internal-geo.provider';
import { IpApiGeoProvider } from '../providers/ip-api-geo.provider';

@Injectable()
export class GeoService {
    private provider: GeoLocationProvider;

    constructor(
        private internalProvider: InternalGeoProvider,
        private ipApiProvider: IpApiGeoProvider,
    ) {
        this.provider = this.internalProvider;
    }

    setProvider(provider: 'internal' | 'ip-api' | GeoLocationProvider): void {
        if (typeof provider === 'string') {
            switch (provider) {
                case 'internal':
                    this.provider = this.internalProvider;
                    break;
                case 'ip-api':
                    this.provider = this.ipApiProvider;
                    break;
                default:
                    throw new Error(`Unknown provider: ${provider}`);
            }
        } else {
            this.provider = provider;
        }
    }

    async lookup(ip: string): Promise<GeoLocationResult | null> {
        return this.provider.lookup(ip);
    }

    async isCountryAllowed(
        ip: string,
        allowedCountries?: string[],
        blockedCountries?: string[],
    ): Promise<{ allowed: boolean; country?: string; countryCode?: string }> {
        const geoResult = await this.lookup(ip);

        if (!geoResult || !geoResult.countryCode) {
            return { allowed: true };
        }

        const countryCode = geoResult.countryCode.toUpperCase();

        if (blockedCountries && blockedCountries.length > 0) {
            const blocked = blockedCountries.some((code) => code.toUpperCase() === countryCode);
            if (blocked) {
                return {
                    allowed: false,
                    country: geoResult.country,
                    countryCode: geoResult.countryCode,
                };
            }
        }

        if (allowedCountries && allowedCountries.length > 0) {
            const allowed = allowedCountries.some((code) => code.toUpperCase() === countryCode);
            return {
                allowed,
                country: geoResult.country,
                countryCode: geoResult.countryCode,
            };
        }

        return {
            allowed: true,
            country: geoResult.country,
            countryCode: geoResult.countryCode,
        };
    }
}
