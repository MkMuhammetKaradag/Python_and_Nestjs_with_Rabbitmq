import { Query, Resolver } from '@nestjs/graphql';

@Resolver('auth')
export class AuthResolver {
  constructor() {}

  @Query(() => String)
  async getQuery() {
    return 'Hello World';
  }
}
