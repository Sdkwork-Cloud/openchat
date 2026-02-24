import {
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { BaseEntity } from '../base.entity';
import { BaseEntityService } from '../base/entity.service';
import { PaginationDto } from '../dto/pagination.dto';
import { PagedResponseDto } from '../dto/response.dto';

export interface CrudControllerOptions {
  entityName: string;
  entityNamePlural?: string;
  defaultLimit?: number;
  maxLimit?: number;
  enableCache?: boolean;
}

export function createCrudController<T extends BaseEntity>(
  serviceToken: symbol | string,
  options: CrudControllerOptions,
): any {
  const { entityName, entityNamePlural = `${entityName}s` } = options;

  @ApiTags(entityNamePlural)
  class BaseCrudController {
    protected readonly service: BaseEntityService<T>;

    @Get()
    @ApiOperation({ summary: `Get all ${entityNamePlural}` })
    @ApiResponse({ status: 200, description: `List of ${entityNamePlural}` })
    async findAll(@Query() pagination: PaginationDto): Promise<PagedResponseDto<T>> {
      return this.service.findWithPagination(pagination);
    }

    @Get(':id')
    @ApiOperation({ summary: `Get ${entityName} by ID` })
    @ApiResponse({ status: 200, description: `The ${entityName}` })
    @ApiResponse({ status: 404, description: `${entityName} not found` })
    async findOne(@Param('id') id: string): Promise<any> {
      const entity = await this.service.findOneOrFail(id);
      return { success: true, code: 200, data: entity };
    }

    @Post()
    @ApiOperation({ summary: `Create ${entityName}` })
    @ApiResponse({ status: 201, description: `The ${entityName} has been created` })
    async create(@Body() createDto: any): Promise<any> {
      const entity = await this.service.create(createDto);
      return { success: true, code: 201, data: entity, message: `${entityName} created successfully` };
    }

    @Put(':id')
    @ApiOperation({ summary: `Update ${entityName}` })
    @ApiResponse({ status: 200, description: `The ${entityName} has been updated` })
    @ApiResponse({ status: 404, description: `${entityName} not found` })
    async update(
      @Param('id') id: string,
      @Body() updateDto: any,
    ): Promise<any> {
      const entity = await this.service.update(id, updateDto);
      return { success: true, code: 200, data: entity, message: `${entityName} updated successfully` };
    }

    @Delete(':id')
    @ApiOperation({ summary: `Delete ${entityName}` })
    @ApiResponse({ status: 200, description: `The ${entityName} has been deleted` })
    @ApiResponse({ status: 404, description: `${entityName} not found` })
    async remove(@Param('id') id: string): Promise<any> {
      await this.service.remove(id);
      return { success: true, code: 200, data: null, message: `${entityName} deleted successfully` };
    }
  }

  return BaseCrudController;
}

export abstract class BaseController<T extends BaseEntity> {
  protected abstract readonly service: BaseEntityService<T>;
  protected abstract readonly entityName: string;

  protected success<R>(data: R, message?: string): any {
    return { success: true, code: 200, data, message };
  }

  protected error(message: string, code: number = 500): any {
    return { success: false, code, message };
  }

  protected paginated<R>(
    list: R[],
    total: number,
    page: number,
    pageSize: number,
  ): any {
    return PagedResponseDto.create(list, { page, pageSize, total });
  }

  protected async getEntityOrThrow(id: string): Promise<T> {
    return this.service.findOneOrFail(id);
  }

  protected async existsEntity(where: any): Promise<boolean> {
    return this.service.exists(where);
  }
}

export abstract class OwnedEntityController<T extends BaseEntity & { ownerId: string }> extends BaseController<T> {
  protected async checkOwnership(id: string, userId: string): Promise<T> {
    const entity = await this.getEntityOrThrow(id);
    if (entity.ownerId !== userId) {
      throw new Error(`You don't have permission to access this ${this.entityName}`);
    }
    return entity;
  }
}
