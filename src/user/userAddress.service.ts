import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserAddress } from "./entities/userAddresses.entity";
import { User } from "./entities/user.entity";
import { CreateUserAddressDto } from "./dto/create-user-address.dto";

@Injectable()
export class UserAddressService {
  constructor(
    @InjectRepository(UserAddress)
    private readonly _userAddressRepository: Repository<UserAddress>
  ) {}

  async createAddress(
    user: User,
    createDto: CreateUserAddressDto
  ): Promise<{ message: string; statusCode: number; data: UserAddress }> {
    const address = await this._userAddressRepository.findOne({ where: { user: { id: user.id } } });
    if (!address) {
      const newAddress = this._userAddressRepository.create({
        ...createDto,
        user,
      });
      await this._userAddressRepository.save(newAddress);
      return { message: "Address saved successfully!", statusCode: 201, data: newAddress };
    }
    Object.assign(address, createDto);
    console.log("Address", address);
    await this._userAddressRepository.save(address);
    return { message: "Address saved successfully!", statusCode: 201, data: address };
  }

  async findAll(): Promise<UserAddress[]> {
    return await this._userAddressRepository.find({ relations: ["user"] });
  }

}
