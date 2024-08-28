import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser } from '@app/shared';
import { ClientProxy } from '@nestjs/microservices';
import { GraphQLError } from 'graphql';
import { firstValueFrom } from 'rxjs';

@Resolver('User')
export class UserResolver {
  constructor(
    @Inject('USER_SERVICE')
    private readonly userService: ClientProxy,
  ) {}
  @Query(() => String)
  @UseGuards(AuthGuard)
  async protectedQuery(@CurrentUser() user: any) {
    console.log('clear', user); // Bu, kimliği doğrulanmış kullanıcının bilgilerini içerecek
    return `Merhaba , bu veri korunuyor!`;
  }

  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async followUser(
    @Args('targetUserId') targetUserId: string,
    @CurrentUser() user: any,
  ) {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }
    try {
      const data = await firstValueFrom<{
        message: string;
      }>(
        this.userService.send(
          {
            cmd: 'follow_user',
          },
          {
            currentUserId: user._id,
            targetUserId: targetUserId,
          },
        ),
      );

      return data.message;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }
}
