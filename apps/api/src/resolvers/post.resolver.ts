import { Resolver, Query, Args, Mutation, Subscription } from '@nestjs/graphql';
import { BadRequestException, Inject, UseGuards } from '@nestjs/common';
import {
  AuthGuard,
  CloudinaryService,
  Comment,
  CreateCommentInput,
  CreateMediaInput,
  CreatePostInput,
  CurrentUser,
  DiscoverPostsObject,
  GetPostCommentsInput,
  GetPostCommentsObject,
  GetPostObject,
  GetPostsFromFollowedUsersInput,
  GetPostsFromFollowedUsersObject,
  GetUserPostsInput,
  Like,
  Post,
  PUB_SUB,
  RemoveLikeObject,
  SignUrlInput,
  SignUrlOutput,
  UpdateCommentInput,
} from '@app/shared';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { GraphQLError } from 'graphql';
import { RedisPubSub } from 'graphql-redis-subscriptions';
// import { GetPostsFromFollowedUsers } from '@app/shared/types/input/GetPostsFromFollowedUsersInput';

const CREATE_COMMENT_POST = 'createCommentPost';
@Resolver('Post')
export class PostResolver {
  constructor(
    @Inject('POST_SERVICE')
    private readonly postService: ClientProxy,

    @Inject('IMAGE_SERVICE')
    private readonly imageService: ClientProxy,

    private readonly cloudinaryService: CloudinaryService,

    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
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
      const data = await lastValueFrom(
        this.imageService.send<{
          results: {
            url: string;
            publicId: string;
            human_detected: string;
          }[];
        }>(
          { cmd: 'check_human_in_image' },
          {
            media: input.media,
          },
        ),
      );
      const filteredPublicIds = data.results
        .filter((result) => result.human_detected !== 'no_human_detected')
        .map((result) => result.publicId);
      if (filteredPublicIds.length == input.media.length) {
        throw new GraphQLError('No human detected in image');
      }
      await this.cloudinaryService.deleteFilesFromCloudinary(filteredPublicIds);
      const media = input.media.filter(
        (res) => !filteredPublicIds.includes(res.publicId),
      );
      const post = await firstValueFrom<Post>(
        this.postService.send(
          {
            cmd: 'create_post',
          },
          {
            userId: user._id,
            title: input.title,
            media: media,
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

  @Query(() => GetPostObject)
  @UseGuards(AuthGuard)
  async getPost(
    @Args('postId') postId: string,
    @CurrentUser() user: any,
  ): Promise<Post> {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }
    try {
      const post = await firstValueFrom<Post>(
        this.postService.send(
          {
            cmd: 'get_post',
          },
          {
            postId: postId,
            currentUserId: user._id,
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

  @Mutation(() => String)
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
    console.log(postId);
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

  @Mutation(() => Comment)
  @UseGuards(AuthGuard)
  async updateComment(
    @Args('input') input: UpdateCommentInput,
    @CurrentUser() user: any,
  ) {
    if (!user) {
      throw new GraphQLError('You must be logged in to comment a post', {
        extensions: { code: 'UNAUTHORIZED' },
      });
    }

    try {
      const comment = await firstValueFrom<Comment>(
        this.postService.send(
          {
            cmd: 'update_comment',
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

  @UseGuards(AuthGuard)
  @Subscription(() => Comment, {
    filter: async function (payload, variables, context) {
      const { req, res } = context;
      if (!req?.user) {
        throw new BadRequestException();
      }

      return true;
    },
  })
  createCommentPost(@Args('postId') postId: string) {
    return this.pubSub.asyncIterator(CREATE_COMMENT_POST);
  }

  @Mutation(() => String)
  async checkHumanInMedia(@Args('input') input: CreatePostInput) {
    try {
      const data = await lastValueFrom(
        this.imageService.send<{
          results: {
            url: string;
            publicId: string;
            human_detected: string;
          }[];
        }>(
          { cmd: 'check_human_in_image' },
          {
            media: input.media,
          },
        ),
      );
      const filteredPublicIds = data.results
        .filter((result) => result.human_detected !== 'no_human_detected')
        .map((result) => result.publicId);
      console.log(filteredPublicIds);
      return 'asasa';
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }

  @Query(() => [GetPostsFromFollowedUsersObject])
  @UseGuards(AuthGuard)
  async getPostsFromFollowedUsers(
    @Args('input') input: GetPostsFromFollowedUsersInput,
    @CurrentUser() user: any,
  ) {
    if (!user) {
      throw new GraphQLError('You must be logged in to comment a post', {
        extensions: { code: 'UNAUTHORIZED' },
      });
    }
    try {
      const posts = await firstValueFrom<GetPostsFromFollowedUsersObject[]>(
        this.postService.send(
          {
            cmd: 'get_posts_from_followed_users',
          },
          {
            userId: user._id,
            page: input.page,
            pageSize: input.pageSize,
          },
        ),
      );

      return posts;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }

  @Query(() => DiscoverPostsObject)
  @UseGuards(AuthGuard)
  async discoverPosts(
    @Args('input') input: GetPostsFromFollowedUsersInput,
    @CurrentUser() user: any,
  ) {
    if (!user) {
      throw new GraphQLError('You must be logged in to comment a post', {
        extensions: { code: 'UNAUTHORIZED' },
      });
    }
    try {
      const data = await firstValueFrom<{ posts: Post[]; totalCount: number }>(
        this.postService.send(
          {
            cmd: 'discover_posts',
          },
          {
            userId: user._id,
            page: input.page,
            pageSize: input.pageSize,
          },
        ),
      );

      return data;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }

  @Query(() => GetPostCommentsObject)
  @UseGuards(AuthGuard)
  async getPostComments(
    @Args('input') input: GetPostCommentsInput,
    @CurrentUser() user: any,
  ) {
    if (!user) {
      throw new GraphQLError('You must be logged in to comment a post', {
        extensions: { code: 'UNAUTHORIZED' },
      });
    }
    try {
      const data = await firstValueFrom<{
        comments: Comment[];
        totalCount: number;
      }>(
        this.postService.send(
          {
            cmd: 'get_post_comments',
          },
          {
            userId: user._id,
            ...input,
          },
        ),
      );
      return data;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }

  @Query(() => DiscoverPostsObject)
  @UseGuards(AuthGuard)
  async getUserPosts(
    @Args('input') input: GetUserPostsInput,
    @CurrentUser() user: any,
  ) {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }
    try {
      const data = await firstValueFrom(
        this.postService.send(
          {
            cmd: 'get_user_posts',
          },
          {
            currentUserId: user._id,
            ...input,
          },
        ),
      );
      return data;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }
}
