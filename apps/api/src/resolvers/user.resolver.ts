import { Resolver, Query } from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser } from '@app/shared';
import { ClientProxy } from '@nestjs/microservices';

@Resolver('User')
export class UserResolver {
  constructor(
    @Inject('AUTH_SERVICE')
    private readonly authService: ClientProxy,
  ) {}
  @Query(() => String)
  @UseGuards(AuthGuard)
  async protectedQuery(@CurrentUser() user: any) {
    console.log('clear', user); // Bu, kimliği doğrulanmış kullanıcının bilgilerini içerecek
    return `Merhaba , bu veri korunuyor!`;
  }
}
