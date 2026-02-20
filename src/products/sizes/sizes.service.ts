import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like } from "typeorm";
import { ProductVariant } from "src/products/varients/entities/varients.entity";
import { Size } from "./entities/sizes.entity";
import { CreateSizeDto } from "./dtos/create-sizes.dto";
import { QuerySizeDto } from "./dtos/query-sizes.dto";
import { QueryVariantDto } from "./dtos/query-varient.dto";
import { UpdateSizeDto } from "./dtos/update-sizes.dto";

@Injectable()
export class SizesService {
  constructor(
    @InjectRepository(Size)
    private readonly sizeRepository: Repository<Size>
  ) {}

  /**
   * Create a new size
   */
  async create(createSizeDto: CreateSizeDto): Promise<Size> {
    try {
      const size = this.sizeRepository.create(createSizeDto);
      return await this.sizeRepository.save(size);
    } catch (error) {
      throw new BadRequestException("Failed to create size");
    }
  }

  /**
   * Get all sizes with pagination and optional name filter
   */
  async findAll(query: QuerySizeDto) {
    const { page = 1, limit = 10, name } = query;
    const skip = (page - 1) * limit;

    const whereCondition: any = {};
    if (name) {
      whereCondition.type = Like(`%${name}%`);
    }

    const [data, total] = await this.sizeRepository.findAndCount({
      where: whereCondition,
      take: limit,
      skip: skip,
      order: { createdAt: "DESC" },
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single size by ID
   */
  async findOne(id: number): Promise<Size> {
    const size = await this.sizeRepository.findOne({
      where: { id },
    });

    if (!size) {
      throw new NotFoundException(`Size with ID ${id} not found`);
    }

    return size;
  }

  /**
   * Get all product variants by size ID with pagination
   */
  //   async findVariantsBySizeId(sizeId: number, query: QueryVariantDto) {
  //     const { page = 1, limit = 10 } = query;
  //     const skip = (page - 1) * limit;

  //     // First check if the size exists
  //     const size = await this.findOne(sizeId);

  //     const [data, total] = await this.productVariantRepository.findAndCount({
  //       where: { size: { id: sizeId } },
  //       relations: ['size', 'product', 'color'],
  //       take: limit,
  //       skip: skip,
  //     //   order: { : 'DESC' },
  //     });

  //     return {
  //       data,
  //       meta: {
  //         total,
  //         page,
  //         limit,
  //         totalPages: Math.ceil(total / limit),
  //         size: {
  //           id: size.id,
  //           type: size.type,
  //           desc: size.desc,
  //         },
  //       },
  //     };
  //   }

  /**
   * Update a size
   */
  async update(id: number, updateSizeDto: UpdateSizeDto): Promise<Size> {
    const size = await this.findOne(id);

    Object.assign(size, updateSizeDto);

    try {
      return await this.sizeRepository.save(size);
    } catch (error) {
      throw new BadRequestException("Failed to update size");
    }
  }

  /**
   * Delete a size
   */
  async remove(id: number): Promise<{ message: string }> {
    const size = await this.findOne(id);

    await this.sizeRepository.remove(size);

    return { message: `Size with ID ${id} has been successfully deleted` };
  }
}
