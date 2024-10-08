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

    const data = this.authService.loginUser(loginUser);
    return data;
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

  @MessagePattern({
    cmd: 'verify_access_token',
  })
  async verifyAcccessToken(
    @Ctx() context: RmqContext,
    @Payload()
    verifyAcccessToken: {
      jwt: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);

    return this.authService.verifyAcccessToken(verifyAcccessToken.jwt);
  }

  @MessagePattern({
    cmd: 'refresh_access_token',
  })
  async refreshAcccessToken(
    @Ctx() context: RmqContext,
    @Payload()
    verifyAcccessToken: {
      refreshToken: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);

    return this.authService.refreshAccessToken(verifyAcccessToken.refreshToken);
  }

  @MessagePattern({
    cmd: 'get_me',
  })
  async GetMe(
    @Ctx() context: RmqContext,
    @Payload()
    getMe: {
      userId: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return this.authService.getMe(getMe.userId);
  }

  @MessagePattern({
    cmd: 'forgot_password',
  })
  async forgotPassword(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      email: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return this.authService.forgotPassword(payload.email);
  }

  @MessagePattern({
    cmd: 'reset_password',
  })
  async resetPassword(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      password: string;
      token: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return this.authService.resetPassword(payload.password, payload.token);
  }
}
