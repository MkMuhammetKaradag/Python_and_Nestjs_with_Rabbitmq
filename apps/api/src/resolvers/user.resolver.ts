import { Resolver, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser } from '@app/shared';

@Resolver('User')
export class UserResolver {
  @Query(() => String)
  @UseGuards(AuthGuard)
  async protectedQuery(@CurrentUser() user: any) {
    console.log('clear', user); // Bu, kimliği doğrulanmış kullanıcının bilgilerini içerecek
    return `Merhaba , bu veri korunuyor!`;
  }
}
