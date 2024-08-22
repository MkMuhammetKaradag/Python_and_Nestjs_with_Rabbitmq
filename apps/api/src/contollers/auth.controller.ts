import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject('AUTH_SERVICE')
    private readonly authService: ClientProxy,
  ) {}

  @Get()
  getHello() {
    return this.authService.send(
      {
        cmd: 'get_users',
      },
      {},
    );
  }

  @Get('clg')
  getHelloClg() {
    try {
      return this.authService.emit('get_users_clg', {
        userId: 1,
        timestamp: new Date(),
      });
    } catch (error) {
      console.log(error);
    }
  }
}
