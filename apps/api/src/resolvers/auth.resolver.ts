import { User } from '@app/shared';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreateUserInput } from '../inputTypes/CreateUserInput';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

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
}
