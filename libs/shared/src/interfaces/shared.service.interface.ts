import { RmqContext, RmqOptions } from '@nestjs/microservices';

export interface SharedServiceInterface {
  getRmqOptions(queueName: string): RmqOptions;
  acknowledgeMessage(context: RmqContext): void;
}
