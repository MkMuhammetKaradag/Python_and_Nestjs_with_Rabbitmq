import { Controller, Get, Inject } from '@nestjs/common';
import { PostService } from './post.service';
import {
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { RegisterUserInput, SharedService } from '@app/shared';
import { UserService } from './user.service';

@Controller()
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly userService: UserService,
    @Inject('SharedServiceInterface')
    private readonly sharedService: SharedService,
  ) {}

  @MessagePattern({
    cmd: 'create_post',
  })
  async getUser(
    @Ctx() context: RmqContext,
    @Payload()
    createPost: {
      userId: string;
      title: string;
      tags: string[];
      media: [
        {
          url: string;
          type: string;
        },
      ];
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return await this.postService.createPost(createPost);
  }
  @MessagePattern({
    cmd: 'get_post',
  })
  async getPost(
    @Ctx() context: RmqContext,
    @Payload()
    getPost: {
      postId: string;
      currentUserId: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);

    return await this.postService.getPost(
      getPost.postId,
      getPost.currentUserId,
    );
  }

  @MessagePattern({
    cmd: 'get_posts_i_liked',
  })
  async getPostsILiked(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      currentUserId: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);

    return await this.postService.getPostsILiked(payload.currentUserId);
  }

  @MessagePattern({
    cmd: 'add_like_post',
  })
  async addLikePost(
    @Ctx() context: RmqContext,
    @Payload()
    addLikePost: {
      userId: string;
      postId: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return await this.postService.addLikePost(addLikePost);
  }

  @MessagePattern({
    cmd: 'remove_like_post',
  })
  async removeLikePost(
    @Ctx() context: RmqContext,
    @Payload()
    removeLikePost: {
      userId: string;
      postId: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return await this.postService.removeLikePost(removeLikePost);
  }

  @MessagePattern({
    cmd: 'create_comment',
  })
  async createComment(
    @Ctx() context: RmqContext,
    @Payload()
    createComment: {
      userId: string;
      postId: string;
      content: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return await this.postService.createComment(createComment);
  }

  @MessagePattern({
    cmd: 'update_comment',
  })
  async updateComment(
    @Ctx() context: RmqContext,
    @Payload()
    updateComment: {
      userId: string;
      commentId: string;
      content: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return await this.postService.updateComment(updateComment);
  }

  @MessagePattern({
    cmd: 'get_posts_from_followed_users',
  })
  async getPostsFromFollowedUsers(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      userId: string;
      page: number;
      pageSize: number;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return await this.postService.getPostsFromFollowedUsers(
      payload.userId,
      payload.page,
      payload.pageSize,
    );
  }

  @MessagePattern({
    cmd: 'discover_posts',
  })
  async discoverPosts(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      userId: string;
      page: number;
      pageSize: number;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return await this.postService.discoverPosts(
      payload.userId,
      payload.page,
      payload.pageSize,
    );
  }

  @MessagePattern({
    cmd: 'get_post_comments',
  })
  async postcomments(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      userId: string;
      postId: string;
      page: number;
      pageSize: number;
      extraPassValue: number;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return await this.postService.getPostComments(
      payload.postId,
      payload.userId,
      payload.page,
      payload.pageSize,
      payload.extraPassValue,
    );
  }
}
