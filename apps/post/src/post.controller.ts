import { Controller, Get, Inject } from '@nestjs/common';
import { PostService } from './post.service';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { SharedService } from '@app/shared';

@Controller()
export class PostController {
  constructor(
    private readonly postService: PostService,
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
      title: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return createPost.title;
  }
}
