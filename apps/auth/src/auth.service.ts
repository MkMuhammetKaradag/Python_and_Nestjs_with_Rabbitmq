import {
  CreateUserInput,
  Product,
  ProductDocument,
  User,
  UserDocument,
} from '@app/shared';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name, 'auth')
    private userModel: Model<UserDocument>, // AUTH veritabanından User modeli
    @InjectModel(Product.name, 'product')
    private productModel: Model<ProductDocument>, // PRODUCT veritabanından Product modeli
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
}
