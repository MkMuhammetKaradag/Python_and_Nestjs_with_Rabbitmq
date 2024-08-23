import { Controller, Get, Inject } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import {
  ActivationUserInput,
  CreateUserInput,
  LoginUserInput,
  RegisterUserInput,
  SharedService,
} from '@app/shared';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject('SharedServiceInterface')
    private readonly sharedService: SharedService,
  ) {}

  @MessagePattern({ cmd: 'get_users' })
  async getUser(@Ctx() context: RmqContext) {
    this.sharedService.acknowledgeMessage(context);

    const data = this.authService.getHello();

    return data;
  }

  @EventPattern('get_users_clg')
  async getUserClg(data: { userId: number; timestamp: Date }) {
    console.log('Received auth event:', data);
  }

  @MessagePattern({ cmd: 'create_user' })
  async createUser(
    @Ctx() context: RmqContext,
    @Payload()
    createUser: CreateUserInput,
  ) {
    this.sharedService.acknowledgeMessage(context);

    const data = await this.authService.create(createUser);

    return data;
  }

  @MessagePattern({
    cmd: 'login_user',
  })
  async loginUser(
    @Ctx() context: RmqContext,
    @Payload() loginUser: LoginUserInput,
  ) {
    this.sharedService.acknowledgeMessage(context);
    console.log(loginUser);
    // const data = this.authService.login(loginUser);
    // return data;
  }

  @MessagePattern({
    cmd: 'register_user',
  })
  async registerUser(
    @Ctx() context: RmqContext,
    @Payload() registerUser: RegisterUserInput,
  ) {
    this.sharedService.acknowledgeMessage(context);

    const data = await this.authService.registerUser(registerUser);
    return data;
  }

  @MessagePattern({
    cmd: 'activation_user',
  })
  async activationUser(
    @Ctx() context: RmqContext,
    @Payload() avtivationUser: ActivationUserInput,
  ) {
    this.sharedService.acknowledgeMessage(context);

    const data = await this.authService.activationUser(avtivationUser);
    return data;
  }
}
