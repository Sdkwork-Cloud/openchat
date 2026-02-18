import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CrudService } from '../base/crud.service';
import { BaseEntity } from '../base.entity';
import { PaginationDto, IdParamDto, UuidParamDto } from '../dto/pagination.dto';
import { ApiResponseDto, PagedResponseDto } from '../dto/response.dto';
import {
  ApiSuccessResponse,
  ApiPagedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '../decorators/response.decorator';
import { ObjectLiteral } from 'typeorm';

export interface CrudControllerOptions {
  name: string;
  path: string;
  tag?: string;
  bearerAuth?: boolean;
}

export function createCrudController<T extends BaseEntity & ObjectLiteral>(
  service: new (...args: any[]) => CrudService<T>,
  createDto: new (...args: any[]) => any,
  updateDto: new (...args: any[]) => any,
  options: CrudControllerOptions,
): any {
  const { name, path, tag, bearerAuth = true } = options;
  const tagName = tag || name;

  @ApiTags(tagName)
  @Controller(path)
  class CrudControllerBase {
    constructor(protected readonly crudService: CrudService<T>) {}

    @Post()
    @ApiOperation({ summary: `Create ${name}` })
    @ApiSuccessResponse(`Created successfully`, { type: createDto })
    @ApiBadRequestResponse('Invalid input data')
    async create(@Body() dto: InstanceType<typeof createDto>): Promise<T> {
      return this.crudService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: `Get all ${name} list` })
    @ApiPagedResponse(`Success`, createDto)
    async findAll(@Query() pagination: PaginationDto): Promise<PagedResponseDto<T>> {
      return this.crudService.findWithPagination(pagination);
    }

    @Get(':id')
    @ApiOperation({ summary: `Get ${name} by ID` })
    @ApiSuccessResponse(`Success`, { type: createDto })
    @ApiNotFoundResponse(`${name} not found`)
    async findOne(@Param() params: IdParamDto): Promise<T> {
      return this.crudService.findOneOrFail(params.id);
    }

    @Put(':id')
    @ApiOperation({ summary: `Update ${name}` })
    @ApiSuccessResponse(`Updated successfully`, { type: updateDto })
    @ApiNotFoundResponse(`${name} not found`)
    async update(
      @Param() params: IdParamDto,
      @Body() dto: InstanceType<typeof updateDto>,
    ): Promise<T> {
      return this.crudService.update(params.id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: `Delete ${name}` })
    @ApiSuccessResponse(`Deleted successfully`)
    @ApiNotFoundResponse(`${name} not found`)
    async remove(@Param() params: IdParamDto): Promise<{ success: boolean }> {
      await this.crudService.remove(params.id);
      return { success: true };
    }
  }

  if (bearerAuth) {
    ApiBearerAuth()(CrudControllerBase);
  }

  return CrudControllerBase;
}

export abstract class BaseController<T extends BaseEntity & ObjectLiteral> {
  constructor(protected readonly crudService: CrudService<T>) {}

  protected success<R>(data: R, message: string = 'success'): ApiResponseDto<R> {
    return ApiResponseDto.success(data, message);
  }

  protected paged<R>(
    list: R[],
    total: number,
    page: number,
    pageSize: number,
  ): PagedResponseDto<R> {
    return PagedResponseDto.create(list, total, page, pageSize);
  }
}
