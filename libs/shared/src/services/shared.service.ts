import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RmqContext, RmqOptions, Transport } from '@nestjs/microservices';
import { SharedServiceInterface } from '../interfaces/shared.service.interface';
import { Channel, Connection, connect } from 'amqplib';
@Injectable()
export class SharedService implements SharedServiceInterface {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  constructor(private readonly configService: ConfigService) {}

  getRmqOptions(queueName: string): RmqOptions {
    const USER = this.configService.get<string>('RABBITMQ_USER');
    const PASS = this.configService.get<string>('RABBITMQ_PASS');
    const HOST = this.configService.get<string>('RABBITMQ_HOST');
    const QUEUE = this.configService.get<string>(`RABBITMQ_${queueName}_QUEUE`);
    // const URI = this.configService.get<string>('RABBITMQ_URI');

    return {
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://${USER}:${PASS}@${HOST}`],
        // urls: [URI],
        queue: QUEUE,
        noAck: false,
        persistent: true,
        queueOptions: {
          durable: true,
        },
      },
    };
  }
  acknowledgeMessage(context: RmqContext): void {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    channel.ack(message);
  }

  async connect(): Promise<void> {
    const USER = this.configService.get<string>('RABBITMQ_USER');
    const PASS = this.configService.get<string>('RABBITMQ_PASS');
    const HOST = this.configService.get<string>('RABBITMQ_HOST');

    this.connection = await connect(`amqp://${USER}:${PASS}@${HOST}`);
    this.channel = await this.connection.createChannel();
  }

  async onModuleInit() {
    await this.connect();
    await this.setupExchangesAndQueues();
  }

  private async setupExchangesAndQueues() {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }

    // create Exchange
    await this.channel.assertExchange('user_events', 'topic', {
      durable: true,
    });

    // Create a durable queue
    const queueName = 'user_followed_queue';
    await this.channel.assertQueue(queueName, { durable: true });
    await this.channel.bindQueue(queueName, 'user_events', 'user.followed');
    // await this.channel.bindQueue(queueName, 'user_events', 'user.followedd');
  }

  async publishEvent(
    exchange: string,
    routingKey: string,
    message: any,
  ): Promise<void> {
    if (!this.channel) {
      await this.connect();
    }
    this.channel!.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        // We specify which queue the message will go to
        headers: { 'x-queue-name': 'user_followed_queue' },
      },
    );
  }

  async subscribeToEvent(
    exchange: string,
    routingKey: string,
    callback: (message: any) => void,
  ): Promise<void> {
    if (!this.channel) {
      await this.connect();
    }

    const queueName = 'user_followed_queue';

    this.channel!.consume(
      queueName,
      (msg) => {
        if (msg) {
          const content = JSON.parse(msg.content.toString());
          callback(content);
          this.channel!.ack(msg);
        }
      },
      { noAck: false },
    );
  }
}
