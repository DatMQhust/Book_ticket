import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UserEntity, UserRole } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async findUserByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { email } });
  }
  async getUserWithPasswordField(email: string): Promise<UserEntity | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }
  private hashPassword(password: string): string {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  }
  async create(createUserDto: CreateUserDto) {
    const existed = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existed) {
      throw new Error('Email already exists');
    }
    const hashedPassword = this.hashPassword(createUserDto.password);

    const newUser = this.userRepository.create({
      name: createUserDto.name,
      email: createUserDto.email,
      phone: createUserDto.phone,
      password: hashedPassword,
      role: createUserDto.role ?? UserRole.USER,
      isActive: true,
    });
    const savedUser = await this.userRepository.save(newUser);
    delete savedUser.password;
    return savedUser;
  }
  isValidPassword(password: string, hashPassword: string): boolean {
    return bcrypt.compareSync(password, hashPassword);
  }

  async updateRefreshToken(id: string, refreshToken: string) {
    const existedUser = await this.userRepository.findOne({ where: { id } });
    if (!existedUser) {
      throw new NotFoundException(`User not found`);
    }
    await this.userRepository.update(id, { refreshToken });
  }
}
