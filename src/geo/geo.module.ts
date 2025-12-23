import { Module, Global } from '@nestjs/common';
import { GeoService } from './geo.service';
import { InternalGeoProvider } from '../providers/internal-geo.provider';
import { IpApiGeoProvider } from '../providers/ip-api-geo.provider';

@Global()
@Module({
    providers: [GeoService, InternalGeoProvider, IpApiGeoProvider],
    exports: [GeoService],
})
export class GeoModule {}
