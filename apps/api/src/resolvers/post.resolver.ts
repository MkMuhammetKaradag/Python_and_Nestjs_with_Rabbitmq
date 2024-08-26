import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import {
  AuthGuard,
  CloudinaryService,
  CreatePostInput,
  CurrentUser,
  SignUrlInput,
  SignUrlOutput,
} from '@app/shared';
import { ClientProxy } from '@nestjs/microservices';

@Resolver('Post')
export class PostResolver {
  constructor(
    @Inject('POST_SERVICE')
    private readonly postService: ClientProxy,

    private readonly cloudinaryService: CloudinaryService,
  ) {}
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async createPost(
    @Args('input') input: CreatePostInput,
    @CurrentUser() user: any,
  ) {
    // console.log('clear', user); // Bu, kimliği doğrulanmış kullanıcının bilgilerini içerecek
    // console.log('input', input);
    return `Merhaba , bu veri korunuyor! post oluşturma işlemi `;
  }

  @Mutation(() => SignUrlOutput)
  @UseGuards(AuthGuard)
  async getSignedUploadUrl(
    @Args('input') input: SignUrlInput,
  ): Promise<SignUrlOutput> {
    const { signature, timestamp } =
      await this.cloudinaryService.generateSignature(input.publicId, 'posts');
    return {
      signature,
      timestamp,
      cloudName: process.env.CLD_CLOUD_NAME,
      apiKey: process.env.CLD_API_SECRET,
    };
  }
}
