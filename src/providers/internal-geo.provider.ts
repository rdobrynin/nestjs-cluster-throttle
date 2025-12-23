import { Injectable } from '@nestjs/common';
import { GeoLocationProvider, GeoLocationResult } from '../interfaces/geo-location.interface';

/**
 * Internal geo provider using simple IP range checks
 * For production, consider using external services or maxmind database
 */
@Injectable()
export class InternalGeoProvider implements GeoLocationProvider {
    private readonly ipRanges: Map<string, { start: number; end: number; country: string }[]> =
        new Map();

    constructor() {
        this.initializeBasicRanges();
    }

    async lookup(ip: string): Promise<GeoLocationResult | null> {
        try {
            const ipNum = this.ipToNumber(ip);

            for (const [countryCode, ranges] of this.ipRanges.entries()) {
                for (const range of ranges) {
                    if (ipNum >= range.start && ipNum <= range.end) {
                        return {
                            countryCode,
                            country: range.country,
                        };
                    }
                }
            }

            return null;
        } catch (error) {
            console.error('Error looking up IP:', error);
            return null;
        }
    }

    private ipToNumber(ip: string): number {
        const parts = ip.split('.');
        if (parts.length !== 4) {
            throw new Error('Invalid IP address');
        }

        return parts.reduce((acc, part, index) => {
            return acc + (parseInt(part, 10) << (8 * (3 - index)));
        }, 0);
    }

    private initializeBasicRanges(): void {
        // Basic IP ranges for testing/demo purposes
        // In production, use a proper GeoIP database like MaxMind

        // US ranges (example)
        this.ipRanges.set('US', [
            {
                start: this.ipToNumber('3.0.0.0'),
                end: this.ipToNumber('3.255.255.255'),
                country: 'United States',
            },
            {
                start: this.ipToNumber('4.0.0.0'),
                end: this.ipToNumber('4.255.255.255'),
                country: 'United States',
            },
        ]);

        // GB ranges (example)
        this.ipRanges.set('GB', [
            {
                start: this.ipToNumber('2.16.0.0'),
                end: this.ipToNumber('2.16.255.255'),
                country: 'United Kingdom',
            },
        ]);

        // Local/Private IPs - mark as XX (unknown)
        this.ipRanges.set('XX', [
            {
                start: this.ipToNumber('127.0.0.0'),
                end: this.ipToNumber('127.255.255.255'),
                country: 'Localhost',
            },
            {
                start: this.ipToNumber('10.0.0.0'),
                end: this.ipToNumber('10.255.255.255'),
                country: 'Private',
            },
            {
                start: this.ipToNumber('172.16.0.0'),
                end: this.ipToNumber('172.31.255.255'),
                country: 'Private',
            },
            {
                start: this.ipToNumber('192.168.0.0'),
                end: this.ipToNumber('192.168.255.255'),
                country: 'Private',
            },
        ]);
    }
}
