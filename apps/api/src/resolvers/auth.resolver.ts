import {
  ActivationUserInput,
  AuthGuard,
  CurrentUser,
  LoginUserInput,
  LoginUserObject,
  RegisterUserInput,
  RegisterUserObject,
  User,
} from '@app/shared';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreateUserInput } from '../inputTypes/CreateUserInput';
import { Inject, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { GraphQLError } from 'graphql';

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
}
