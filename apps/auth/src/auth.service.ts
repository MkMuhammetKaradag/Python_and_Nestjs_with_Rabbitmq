import {
  CreateUserInput,
  Product,
  ProductDocument,
  RegisterUserInput,
  User,
  UserDocument,
} from '@app/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name, 'auth')
    private userModel: Model<UserDocument>, // AUTH veritabanından User modeli
    @InjectModel(Product.name, 'product')
    private productModel: Model<ProductDocument>, // PRODUCT veritabanından Product modeli

    private readonly jwtService: JwtService,
  ) {}
  getHello(): string {
    return 'Hello World! auth users';
  }

  async create(input: CreateUserInput) {
    try {
      const createProduct = new this.productModel({
        name: input.firstName,
      });
      const data = await createProduct.save();
      console.log(data);
    } catch (error) {
      console.log(error);
    }
    const createdUser = new this.userModel(input);
    return createdUser.save();
  }

  async createActivateToken(user: RegisterUserInput) {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();
    console.log(activationCode);
    const token = await this.jwtService.signAsync(
      {
        user,
        activationCode,
      },
      {
        expiresIn: '5m',
      },
    );

    return token;
  }
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }
  async registerUser(registerUser: RegisterUserInput) {
    const { email, firstName, lastName, password, roles } = registerUser;
    const existingUser = await this.userModel.findOne({
      email: email,
    });

    if (existingUser) {
      throw new RpcException({
        message: 'An account with that email already exists!',
        statusCode: HttpStatus.CONFLICT,
      });
    }
    const hashedPassword = await this.hashPassword(password);
    registerUser.password = hashedPassword;
    const createActivationToken = await this.createActivateToken(registerUser);
    return { activationToken: createActivationToken };
  }


  async activateUser(){

  }
}
