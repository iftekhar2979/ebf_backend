import { Injectable, NotFoundException, BadRequestException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like } from "typeorm";
import { ProductVariant } from "../varients/entities/varients.entity";
import { CreateColorDto } from "./dto/create-color.dto";
import { UpdateColorDto } from "./dto/update-color.dto";
import { QueryColorDto } from "./dto/query-color.dto";
import { ProductColor } from "./entities/colors.entity";
import { QueryVariantDto } from "./dto/query-varient.dto";

@Injectable()
export class ColorsService {
  constructor(
    @InjectRepository(ProductColor)
    private readonly colorRepository: Repository<ProductColor>,
    @InjectRepository(ProductVariant)
    private readonly productVariantRepository: Repository<ProductVariant>
  ) {}

  /**
   * Create a new color
   */
  async create(createColorDto: CreateColorDto): Promise<ProductColor> {
    // Check if color with same name already exists
    const existingColor = await this.colorRepository.findOne({
      where: { name: createColorDto.name },
    });

    if (existingColor) {
      throw new ConflictException(`Color with name "${createColorDto.name}" already exists`);
    }

    try {
      const color = this.colorRepository.create(createColorDto);
      return await this.colorRepository.save(color);
    } catch (error) {
      throw new BadRequestException("Failed to create color");
    }
  }

  /**
   * Get all colors (without pagination - for dropdowns)
   */
  async findAllColors(): Promise<ProductColor[]> {
    return await this.colorRepository.find({
      order: { name: "ASC" },
    });
  }

  /**
   * Get all colors with pagination and optional name filter
   */
  async findAll(query: QueryColorDto) {
    const { page = 1, limit = 10, name } = query;
    const skip = (page - 1) * limit;

    const whereCondition: any = {};
    if (name) {
      whereCondition.name = Like(`%${name}%`);
    }

    const [data, total] = await this.colorRepository.findAndCount({
      where: whereCondition,
      take: limit,
      skip: skip,
      order: { name: "ASC" },
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
   * Get a single color by ID
   */
  async findOne(id: number): Promise<ProductColor> {
    const color = await this.colorRepository.findOne({
      where: { id },
    });

    if (!color) {
      throw new NotFoundException(`Color with ID ${id} not found`);
    }

    return color;
  }

  /**
   * Get a single color by ID with variants count
   */
  async findOneWithCount(id: number) {
    const color = await this.findOne(id);

    const variantCount = await this.productVariantRepository.count({
      where: { color: { id } },
    });

    return {
      ...color,
      variantsCount: variantCount,
    };
  }

  /**
   * Get all product variants by color ID with pagination
   */
  async findVariantsByColorId(colorId: number, query: QueryVariantDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // First check if the color exists
    const color = await this.findOne(colorId);

    const [data, total] = await this.productVariantRepository.findAndCount({
      where: { color: { id: colorId } },
      relations: ["color", "product", "size"],
      take: limit,
      skip: skip,
      //   order: { cr : 'DESC' },
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        color: {
          id: color.id,
          name: color.name,
          image: color.image,
        },
      },
    };
  }

  /**
   * Update a color
   */
  async update(id: number, updateColorDto: UpdateColorDto): Promise<ProductColor> {
    const color = await this.findOne(id);

    // If name is being updated, check for duplicates
    if (updateColorDto.name && updateColorDto.name !== color.name) {
      const existingColor = await this.colorRepository.findOne({
        where: { name: updateColorDto.name },
      });

      if (existingColor) {
        throw new ConflictException(`Color with name "${updateColorDto.name}" already exists`);
      }
    }

    Object.assign(color, updateColorDto);

    try {
      return await this.colorRepository.save(color);
    } catch (error) {
      throw new BadRequestException("Failed to update color");
    }
  }

  /**
   * Delete a color
   */
  async remove(id: number): Promise<{ message: string }> {
    const color = await this.findOne(id);

    // Check if color has associated variants
    const variantCount = await this.productVariantRepository.count({
      where: { color: { id } },
    });

    if (variantCount > 0) {
      throw new BadRequestException(
        `Cannot delete color. It has ${variantCount} associated product variant(s)`
      );
    }

    await this.colorRepository.remove(color);

    return { message: `Color with ID ${id} has been successfully deleted` };
  }

  /**
   * Get colors with variants count
   */
  async findAllWithVariantCount(query: QueryColorDto) {
    const result = await this.findAll(query);

    const dataWithCounts = await Promise.all(
      result.data.map(async (color) => {
        const variantCount = await this.productVariantRepository.count({
          where: { color: { id: color.id } },
        });
        return {
          ...color,
          variantsCount: variantCount,
        };
      })
    );

    return {
      data: dataWithCounts,
      meta: result.meta,
    };
  }
}
