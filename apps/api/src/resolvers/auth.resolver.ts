import {
  ActivationUserInput,
  AuthGuard,
  CurrentUser,
  ForgotPasswordInput,
  LoginUserInput,
  LoginUserObject,
  RegisterUserInput,
  RegisterUserObject,
  ResetPasswordInput,
  User,
} from '@app/shared';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreateUserInput } from '../inputTypes/CreateUserInput';
import { Inject, UseGuards } from '@nestjs/common';
import { ClientProxy, MessagePattern } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { GraphQLError } from 'graphql';
import { Response } from 'express';

@Resolver('auth')
export class AuthResolver {
  constructor(
    @Inject('AUTH_SERVICE')
    private readonly authService: ClientProxy,
  ) {}

  @Query(() => String)
  async getQuery() {
    return 'Hello World';
  }

  @Mutation(() => User)
  async createUser(@Args('input') input: CreateUserInput): Promise<User> {
    const user = await firstValueFrom<User>(
      this.authService.send(
        {
          cmd: 'create_user',
        },
        {
          ...input,
        },
      ),
    );
    return user;
  }

  @Mutation(() => LoginUserObject)
  async loginUser(@Args('input') input: LoginUserInput, @Context() context) {
    const { req, res } = context;
    try {
      const data = await firstValueFrom<LoginUserObject>(
        this.authService.send(
          {
            cmd: 'login_user',
          },
          {
            ...input,
          },
        ),
      );
      if (data.refresh_token && data.access_token) {
        res.cookie('refresh_token', data.refresh_token);
        res.cookie('access_token', data.access_token);
      }

      return data;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: { ...error },
      });
    }
  }

  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async logout(@Context() context: { res: Response }) {
    const { res } = context;
    try {
      res.clearCookie('refresh_token', {
        path: '/', // Çerezin path ayarı
        httpOnly: true, // Çerezin httpOnly ayarı (varsa)
        secure: true, // Çerezin secure ayarı (eğer HTTPS üzerinde çalışıyorsanız)
        sameSite: 'strict', // Çerezin sameSite ayarı
      });
      res.clearCookie('access_token', {
        path: '/', // Çerezin path ayarı
        httpOnly: true, // Çerezin httpOnly ayarı (varsa)
        secure: true, // Çerezin secure ayarı (eğer HTTPS üzerinde çalışıyorsanız)
        sameSite: 'strict', // Çerezin sameSite ayarı
      });
      return 'successfully logged out ';
    } catch (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  @Mutation(() => RegisterUserObject)
  async registerUser(@Args('input') input: RegisterUserInput) {
    try {
      const data = await firstValueFrom<{
        activation_token: String;
      }>(
        this.authService.send(
          {
            cmd: 'register_user',
          },
          {
            ...input,
          },
        ),
      );
      return data;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: { ...error },
      });
    }
  }

  @Mutation(() => User)
  async activationUser(@Args('input') input: ActivationUserInput) {
    try {
      const data = await firstValueFrom<User>(
        this.authService.send(
          {
            cmd: 'activation_user',
          },
          {
            ...input,
          },
        ),
      );
      return data;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: { ...error },
      });
    }
  }

  @Query(() => User)
  @UseGuards(AuthGuard)
  async getMe(
    @CurrentUser()
    user: {
      _id: string;
      email: string;
    },
    @Context() context,
  ) {
    // const { req, res } = context;
    // console.log('req.user', req.user);
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }
    try {
      const data = await firstValueFrom<User>(
        this.authService.send(
          {
            cmd: 'get_me',
          },
          {
            userId: user._id,
          },
        ),
      );
      return data;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: { ...error },
      });
    }
  }

  @Mutation(() => String)
  async forgotPassword(@Args('input') input: ForgotPasswordInput) {
    try {
      const data = await firstValueFrom<string>(
        this.authService.send(
          {
            cmd: 'forgot_password',
          },
          {
            email: input.email,
          },
        ),
      );
      return data;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: { ...error },
      });
    }
  }

  @Mutation(() => User)
  async resetPassword(@Args('input') input: ResetPasswordInput) {
    try {
      const data = await firstValueFrom(
        this.authService.send(
          {
            cmd: 'reset_password',
          },
          {
            ...input,
          },
        ),
      );
      return data;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: { ...error },
      });
    }
  }
}
