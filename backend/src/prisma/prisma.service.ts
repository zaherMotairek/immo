import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { runImmeubleSchemaBootstrap } from './immeuble-schema-bootstrap';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    await runImmeubleSchemaBootstrap(this);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
