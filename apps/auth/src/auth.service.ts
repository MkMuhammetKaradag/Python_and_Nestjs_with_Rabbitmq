import {
  ActivationUserInput,
  CreateUserInput,
  EmailService,
  LoginUserInput,
  Product,
  ProductDocument,
  RegisterUserInput,
  User,
  UserDocument,
} from '@app/shared';
import {
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name, 'auth')
    private userModel: Model<UserDocument>, // AUTH veritabanından User modeli
    @InjectModel(Product.name, 'product')
    private productModel: Model<ProductDocument>, // PRODUCT veritabanından Product modeli

    private readonly jwtService: JwtService,

    private readonly emailService: EmailService,

    private readonly configService: ConfigService,

    @Inject('POST_SERVICE')
    private readonly postService: ClientProxy,
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

    const token = await this.jwtService.signAsync(
      {
        user,
        activationCode,
      },
      {
        expiresIn: '5m',
      },
    );

    this.emailService.sendMail({
      email: user.email,
      subject: 'activate code',
      template: './activation-mail',
      name: user.firstName + user.lastName,
      activationCode,
    });

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

  async activationUser(activationUser: ActivationUserInput) {
    const { activationCode, activationToken } = activationUser;
    const activationData: { user: RegisterUserInput; activationCode: string } =
      (await this.jwtService.verifyAsync(activationToken)) as {
        user: RegisterUserInput;
        activationCode: string;
      };

    if (activationData.activationCode !== activationCode) {
      throw new RpcException({
        message: 'Invalid activation code',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
    const existingUser = await this.userModel.findOne({
      email: activationData.user.email,
    });
    if (existingUser) {
      throw new RpcException({
        message: 'User  already exist',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const user = new this.userModel(activationData.user);
    this.postService.emit(
      {
        cmd: 'created_user',
      },
      {
        userId: user._id,
        user: activationData.user,
      },
    );
    return user.save();
  }
  async doesPasswordMatch(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
  async validateUser(email: string, password: string): Promise<User> {
    const existingUser = await this.userModel.findOne({ email });
    if (!existingUser) {
      throw new RpcException({
        message: 'Invalid email or password',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const doesPasswordMatch = await this.doesPasswordMatch(
      password,
      existingUser.password,
    );
    if (!doesPasswordMatch) {
      throw new RpcException({
        message: 'Invalid credentials!',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }
    return existingUser;
  }
  async loginUser(loginUser: LoginUserInput) {
    const { email, password } = loginUser;

    const user = await this.validateUser(email, password);
    const payload = { email: user.email, sub: user._id };
    const access_token = await this.jwtService.signAsync(payload);
    const refresh_token = this.generateRefreshToken(user);
    return { user, access_token, refresh_token };
  }
  private generateRefreshToken(user: User): string {
    const payload = { email: user.email, sub: user._id };
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d', // Refresh token için 7 gün
    });
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      console.log('access token için girdi');

      const user = await this.userModel
        .findById(payload.sub)
        .select('email _id');

      if (!user) {
        throw new RpcException({
          message: 'Invalid refresh token',
          statusCode: HttpStatus.UNAUTHORIZED,
        });
      }
      const access_token = await this.jwtService.signAsync({
        email: user.email,
        sub: user._id,
      });
      return {
        user,
        access_token,
      };
    } catch (e) {
      throw new RpcException({
        message: 'Invalid refresh token',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }
  }

  async verifyAcccessToken(jwt: string) {
    if (!jwt) {
      throw new RpcException({
        message: 'Invalid credentials!',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }
    try {
      const { email, sub, exp } = await this.jwtService.verifyAsync(jwt);

      return {
        user: {
          _id: sub,
          email: email,
        },
        exp,
      };
    } catch (error) {
      throw new RpcException({
        message: 'Invalid credentials!',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }
  }

  async getMe(_id: string) {
    const user = await this.getUserId(_id);
    if (!user) {
      throw new RpcException({
        message: 'User not found',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    return user;
  }

  async getUserId(_id: string) {
    return await this.userModel.findOne({
      _id,
      deletedAt: { $exists: false },
    });
  }

  async forgotPassword(email: string) {
    const user = await this.userModel.findOne({
      email,
    });

    if (!user) {
      throw new RpcException({
        message: 'User not found',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    const forgotPasswordToken = await this.generateForgotPasswordLink(user);
    const resetPasswordUrl =
      this.configService.get<string>('CLIENT_SIDE_URI') +
      `reset-password?verify=${forgotPasswordToken}`;

    await this.emailService.sendMail({
      email,
      subject: 'Reset your Password!',
      template: './forgot-password',
      name: user.firstName + user.lastName,
      activationCode: resetPasswordUrl,
    });

    return `Your forgot password request succesful!`;
  }

  async generateForgotPasswordLink(user: User) {
    const forgotPasswordToken = this.jwtService.sign(
      {
        user,
      },
      {
        secret: this.configService.get<string>('FORGOT_PASSWORD_SECRET'),
        expiresIn: '5m',
      },
    );
    return forgotPasswordToken;
  }

  async resetPassword(password: string, token: string) {
    const decoded = await this.jwtService.decode(token);

    if (!decoded || decoded?.exp * 1000 < Date.now()) {
      throw new RpcException({
        message: 'Invalid token!',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
    const user = await this.userModel.findOne({ email: decoded.user.email });
    user.password = await this.hashPassword(password);
    await user.save();

    return user;
  }
}
