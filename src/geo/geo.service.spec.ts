import { Test, TestingModule } from '@nestjs/testing';
import { GeoService } from './geo.service';
import { InternalGeoProvider } from '../providers/internal-geo.provider';
import { IpApiGeoProvider } from '../providers/ip-api-geo.provider';

describe('GeoService', () => {
    let service: GeoService;
    let internalProvider: InternalGeoProvider;
    let ipApiProvider: IpApiGeoProvider;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [GeoService, InternalGeoProvider, IpApiGeoProvider],
        }).compile();

        service = module.get<GeoService>(GeoService);
        internalProvider = module.get<InternalGeoProvider>(InternalGeoProvider);
        ipApiProvider = module.get<IpApiGeoProvider>(IpApiGeoProvider);
    });

    describe('setProvider', () => {
        it('should set internal provider', () => {
            service.setProvider('internal');
            expect(service['provider']).toBe(internalProvider);
        });

        it('should set ip-api provider', () => {
            service.setProvider('ip-api');
            expect(service['provider']).toBe(ipApiProvider);
        });

        it('should set custom provider', () => {
            const customProvider = {
                lookup: jest.fn().mockResolvedValue({ countryCode: 'US' }),
            };

            service.setProvider(customProvider);
            expect(service['provider']).toBe(customProvider);
        });

        it('should throw error for unknown provider', () => {
            expect(() => service.setProvider('unknown' as any)).toThrow();
        });
    });

    describe('lookup', () => {
        it('should lookup IP address', async () => {
            jest.spyOn(internalProvider, 'lookup').mockResolvedValue({
                countryCode: 'US',
                country: 'United States',
            });

            const result = await service.lookup('1.2.3.4');

            expect(result).toEqual({
                countryCode: 'US',
                country: 'United States',
            });
        });

        it('should return null for unknown IP', async () => {
            jest.spyOn(internalProvider, 'lookup').mockResolvedValue(null);

            const result = await service.lookup('999.999.999.999');

            expect(result).toBeNull();
        });
    });

    describe('isCountryAllowed', () => {
        it('should allow when no restrictions', async () => {
            jest.spyOn(service, 'lookup').mockResolvedValue({
                countryCode: 'US',
                country: 'United States',
            });

            const result = await service.isCountryAllowed('1.2.3.4');

            expect(result.allowed).toBe(true);
            expect(result.countryCode).toBe('US');
        });

        it('should allow country in allowed list', async () => {
            jest.spyOn(service, 'lookup').mockResolvedValue({
                countryCode: 'US',
                country: 'United States',
            });

            const result = await service.isCountryAllowed('1.2.3.4', ['US', 'CA']);

            expect(result.allowed).toBe(true);
        });

        it('should block country not in allowed list', async () => {
            jest.spyOn(service, 'lookup').mockResolvedValue({
                countryCode: 'RU',
                country: 'Russia',
            });

            const result = await service.isCountryAllowed('1.2.3.4', ['US', 'CA']);

            expect(result.allowed).toBe(false);
            expect(result.countryCode).toBe('RU');
        });

        it('should block country in blocked list', async () => {
            jest.spyOn(service, 'lookup').mockResolvedValue({
                countryCode: 'CN',
                country: 'China',
            });

            const result = await service.isCountryAllowed('1.2.3.4', undefined, ['CN', 'RU']);

            expect(result.allowed).toBe(false);
        });

        it('should allow country not in blocked list', async () => {
            jest.spyOn(service, 'lookup').mockResolvedValue({
                countryCode: 'US',
                country: 'United States',
            });

            const result = await service.isCountryAllowed('1.2.3.4', undefined, ['CN', 'RU']);

            expect(result.allowed).toBe(true);
        });

        it('should be case-insensitive', async () => {
            jest.spyOn(service, 'lookup').mockResolvedValue({
                countryCode: 'us',
                country: 'United States',
            });

            const result = await service.isCountryAllowed('1.2.3.4', ['US']);

            expect(result.allowed).toBe(true);
        });

        it('should allow when country cannot be determined (fail-open)', async () => {
            jest.spyOn(service, 'lookup').mockResolvedValue(null);

            const result = await service.isCountryAllowed('1.2.3.4', ['US']);

            expect(result.allowed).toBe(true);
        });

        it('should block first if both allowed and blocked lists exist', async () => {
            jest.spyOn(service, 'lookup').mockResolvedValue({
                countryCode: 'CN',
                country: 'China',
            });

            const result = await service.isCountryAllowed('1.2.3.4', ['CN', 'US'], ['CN']);

            expect(result.allowed).toBe(false);
        });
    });
});
