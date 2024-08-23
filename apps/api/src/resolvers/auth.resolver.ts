import { LoginUserInput, RegisterUserInput, RegisterUserObject, User } from '@app/shared';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreateUserInput } from '../inputTypes/CreateUserInput';
import { Inject } from '@nestjs/common';
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

  @Mutation(() => User)
  async loginUser(@Args('input') input: LoginUserInput) {
    try {
      const data = await firstValueFrom<User>(
        this.authService.send(
          {
            cmd: 'login_user',
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
}
