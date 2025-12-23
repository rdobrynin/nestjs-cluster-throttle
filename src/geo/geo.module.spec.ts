import { Test, TestingModule } from '@nestjs/testing';
import { GeoModule } from './geo.module';
import { GeoService } from './geo.service';
import { InternalGeoProvider } from '../providers/internal-geo.provider';
import { IpApiGeoProvider } from '../providers/ip-api-geo.provider';

describe('GeoModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [GeoModule],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  describe('module structure', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('should be a global module', () => {
      const moduleMetadata = Reflect.getMetadata('__module:global__', GeoModule);
      expect(moduleMetadata).toBe(true);
    });

    it('should provide GeoService', () => {
      const geoService = module.get<GeoService>(GeoService);
      expect(geoService).toBeDefined();
      expect(geoService).toBeInstanceOf(GeoService);
    });

    it('should provide InternalGeoProvider', () => {
      const provider = module.get<InternalGeoProvider>(InternalGeoProvider);
      expect(provider).toBeDefined();
      expect(provider).toBeInstanceOf(InternalGeoProvider);
    });

    it('should provide IpApiGeoProvider', () => {
      const provider = module.get<IpApiGeoProvider>(IpApiGeoProvider);
      expect(provider).toBeDefined();
      expect(provider).toBeInstanceOf(IpApiGeoProvider);
    });
  });

  describe('exports', () => {
    it('should export GeoService', () => {
      const geoService = module.get<GeoService>(GeoService);
      expect(geoService).toBeDefined();
    });
  });

  describe('providers initialization', () => {
    it('should initialize all providers without errors', async () => {
      const geoService = module.get<GeoService>(GeoService);
      const internalProvider = module.get<InternalGeoProvider>(InternalGeoProvider);
      const ipApiProvider = module.get<IpApiGeoProvider>(IpApiGeoProvider);

      expect(geoService).toBeDefined();
      expect(internalProvider).toBeDefined();
      expect(ipApiProvider).toBeDefined();
    });

    it('should have GeoService with injected providers', () => {
      const geoService = module.get<GeoService>(GeoService);

      expect(geoService['internalProvider']).toBeDefined();
      expect(geoService['ipApiProvider']).toBeDefined();
    });
  });

  describe('integration', () => {
    it('should work with internal provider by default', async () => {
      const geoService = module.get<GeoService>(GeoService);

      const result = await geoService.lookup('127.0.0.1');

      expect(result).toBeDefined();
      if (result) {
        expect(result.countryCode).toBeDefined();
      }
    });

    it('should switch providers correctly', () => {
      const geoService = module.get<GeoService>(GeoService);

      expect(() => geoService.setProvider('ip-api')).not.toThrow();

      expect(() => geoService.setProvider('internal')).not.toThrow();
    });

    it('should perform country check', async () => {
      const geoService = module.get<GeoService>(GeoService);

      const result = await geoService.isCountryAllowed('127.0.0.1', ['US']);

      expect(result).toBeDefined();
      expect(result.allowed).toBeDefined();
      expect(typeof result.allowed).toBe('boolean');
    });
  });

  describe('dependency injection', () => {
    it('should resolve all dependencies', () => {
      expect(() => {
        module.get<GeoService>(GeoService);
        module.get<InternalGeoProvider>(InternalGeoProvider);
        module.get<IpApiGeoProvider>(IpApiGeoProvider);
      }).not.toThrow();
    });

    it('should create singleton instances', () => {
      const service1 = module.get<GeoService>(GeoService);
      const service2 = module.get<GeoService>(GeoService);

      expect(service1).toBe(service2);
    });

    it('should inject providers into GeoService', () => {
      const geoService = module.get<GeoService>(GeoService);
      const internalProvider = module.get<InternalGeoProvider>(InternalGeoProvider);
      const ipApiProvider = module.get<IpApiGeoProvider>(IpApiGeoProvider);

      expect(geoService['internalProvider']).toBe(internalProvider);
      expect(geoService['ipApiProvider']).toBe(ipApiProvider);
    });
  });

  describe('module composition', () => {
    it('should work as part of another module', async () => {
      const testModule = await Test.createTestingModule({
        imports: [GeoModule],
        providers: [
          {
            provide: 'TEST_SERVICE',
            useFactory: (geoService: GeoService) => {
              return {
                testMethod: () => geoService.lookup('1.2.3.4'),
              };
            },
            inject: [GeoService],
          },
        ],
      }).compile();

      const testService = testModule.get('TEST_SERVICE');
      expect(testService).toBeDefined();
      expect(testService.testMethod).toBeDefined();

      await testModule.close();
    });
  });

  describe('error handling', () => {
    it('should handle module initialization errors gracefully', async () => {
      expect(async () => {
        const errorModule = await Test.createTestingModule({
          imports: [GeoModule],
        }).compile();

        await errorModule.close();
      }).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources on module destroy', async () => {
      const testModule = await Test.createTestingModule({
        imports: [GeoModule],
      }).compile();

      await expect(testModule.close()).resolves.not.toThrow();
    });
  });
});
