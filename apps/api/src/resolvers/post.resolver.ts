import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import {
  AuthGuard,
  CloudinaryService,
  Comment,
  CreateCommentInput,
  CreatePostInput,
  CurrentUser,
  Like,
  Post,
  RemoveLikeObject,
  SignUrlInput,
  SignUrlOutput,
} from '@app/shared';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { GraphQLError } from 'graphql';

@Resolver('Post')
export class PostResolver {
  constructor(
    @Inject('POST_SERVICE')
    private readonly postService: ClientProxy,

    private readonly cloudinaryService: CloudinaryService,
  ) {}
  @Mutation(() => Post)
  @UseGuards(AuthGuard)
  async createPost(
    @Args('input') input: CreatePostInput,
    @CurrentUser() user: any,
  ) {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }
    try {
      const post = await firstValueFrom<Post>(
        this.postService.send(
          {
            cmd: 'create_post',
          },
          {
            userId: user._id,
            ...input,
          },
        ),
      );
      return post;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: { ...error },
      });
    }
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
      apiKey: process.env.CLD_API_KEY,
    };
  }

  @Query(() => Post)
  async getPost(@Args('postId') postId: string): Promise<Post> {
    try {
      const post = await firstValueFrom<Post>(
        this.postService.send(
          {
            cmd: 'get_post',
          },
          {
            postId: postId,
          },
        ),
      );
      return post;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: { ...error },
      });
    }
  }

  @Mutation(() => Like)
  @UseGuards(AuthGuard)
  async addLikePost(@Args('postId') postId: string, @CurrentUser() user: any) {
    if (!user) {
      throw new GraphQLError('You must be logged in to like a post', {
        extensions: { code: 'UNAUTHORIZED' },
      });
    }
    try {
      const like = await firstValueFrom<Like>(
        this.postService.send(
          {
            cmd: 'add_like_post',
          },
          {
            postId: postId,
            userId: user._id,
          },
        ),
      );
      return like;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }

  @Mutation(() => RemoveLikeObject)
  @UseGuards(AuthGuard)
  async removeLikePost(
    @Args('postId') postId: string,
    @CurrentUser() user: any,
  ): Promise<RemoveLikeObject> {
    if (!user) {
      throw new GraphQLError('You must be logged in to like a post', {
        extensions: { code: 'UNAUTHORIZED' },
      });
    }
    try {
      const like = await firstValueFrom<RemoveLikeObject>(
        this.postService.send(
          {
            cmd: 'remove_like_post',
          },
          {
            postId: postId,
            userId: user._id,
          },
        ),
      );
      return like;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }

  @Mutation(() => Comment)
  @UseGuards(AuthGuard)
  async createComment(
    @Args('input') input: CreateCommentInput,
    @CurrentUser() user: any,
  ): Promise<Comment> {
    if (!user) {
      throw new GraphQLError('You must be logged in to comment a post', {
        extensions: { code: 'UNAUTHORIZED' },
      });
    }

    try {
      const comment = await firstValueFrom<Comment>(
        this.postService.send(
          {
            cmd: 'create_comment',
          },
          {
            userId: user._id,
            ...input,
          },
        ),
      );
      return comment;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }
}
