import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Controller('math')
export class MathController {
  constructor(
    @Inject('MATH_SERVICE')
    private readonly mathService: ClientProxy,
  ) {}

  @Post('add')
  async addNumbers(@Body() data: { x: number; y: number }) {
    const pattern = { cmd: 'add' };
    const payload = { x: data.x, y: data.y };
    try {
      const data = await lastValueFrom(
        this.mathService.send<{
          result: number;
        }>(pattern, payload),
      );
      console.log(data);
      if (typeof data.result !== 'number') {
        throw new Error('Invalid response from Python service');
      }
      return data;
    } catch (error) {
      console.error('Error in addNumbers:', error);
      throw new Error('Failed to add numbers');
    }
  }
}
