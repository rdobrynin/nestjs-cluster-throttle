import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ExampleService, ExampleData } from './example.service';

interface CreateExampleDto {
  name: string;
  value: number;
  metadata?: Record<string, any>;
}

interface UpdateExampleDto {
  name?: string;
  value?: number;
  metadata?: Record<string, any>;
}

@Controller('example')
export class ExampleController {
  constructor(private readonly exampleService: ExampleService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateExampleDto): Promise<{
    success: boolean;
    data: ExampleData;
    message: string;
  }> {
    if (!createDto.name || createDto.value === undefined) {
      throw new BadRequestException('Name and value are required');
    }

    const data = await this.exampleService.create(createDto);

    return {
      success: true,
      data,
      message: 'Example created successfully',
    };
  }

  @Get()
  async findAll(): Promise<{
    success: boolean;
    data: ExampleData[];
    count: number;
  }> {
    const data = await this.exampleService.findAll();

    return {
      success: true,
      data,
      count: data.length,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<{
    success: boolean;
    data: ExampleData | null;
  }> {
    const data = await this.exampleService.findOne(id);

    if (!data) {
      throw new NotFoundException(`Example with id ${id} not found`);
    }

    return {
      success: true,
      data,
    };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateExampleDto,
  ): Promise<{
    success: boolean;
    data: ExampleData | null;
    message: string;
  }> {
    const data = await this.exampleService.update(id, updateDto);

    if (!data) {
      throw new NotFoundException(`Example with id ${id} not found`);
    }

    return {
      success: true,
      data,
      message: 'Example updated successfully',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const deleted = await this.exampleService.delete(id);

    if (!deleted) {
      throw new NotFoundException(`Example with id ${id} not found`);
    }

    return {
      success: true,
      message: 'Example deleted successfully',
    };
  }

  @Get('search/name')
  async searchByName(@Query('q') query: string): Promise<{
    success: boolean;
    data: ExampleData[];
    count: number;
  }> {
    if (!query) {
      throw new BadRequestException('Search query is required');
    }

    const data = await this.exampleService.searchByName(query);

    return {
      success: true,
      data,
      count: data.length,
    };
  }

  @Get('stats/summary')
  async getStats(): Promise<{
    success: boolean;
    stats: {
      total: number;
      averageValue: number;
      lastUpdated: Date | null;
    };
  }> {
    const stats = await this.exampleService.getStats();

    return {
      success: true,
      stats,
    };
  }

  @Post('batch')
  @HttpCode(HttpStatus.CREATED)
  async createBatch(
    @Body() createDtos: CreateExampleDto[],
  ): Promise<{
    success: boolean;
    created: number;
    failed: number;
    results: Array<{ success: boolean; data?: ExampleData; error?: string }>;
  }> {
    if (!Array.isArray(createDtos) || createDtos.length === 0) {
      throw new BadRequestException('Array of examples is required');
    }

    const results = await Promise.allSettled(
      createDtos.map(dto => this.exampleService.create(dto))
    );

    const successResults = results.filter(r => r.status === 'fulfilled');
    const failedResults = results.filter(r => r.status === 'rejected');

    return {
      success: true,
      created: successResults.length,
      failed: failedResults.length,
      results: results.map(result => {
        if (result.status === 'fulfilled') {
          return { success: true, data: result.value };
        } else {
          return { success: false, error: result.reason.message };
        }
      }),
    };
  }
}
