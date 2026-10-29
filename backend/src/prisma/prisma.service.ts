import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { runImmeubleSchemaBootstrap } from './immeuble-schema-bootstrap';
import { runAuditSchemaBootstrap } from './audit-schema-bootstrap';
import { runAccountingClosureBootstrap } from './accounting-closure-bootstrap';
import { runSignatureAndReceiptShareBootstrap } from './signature-and-receipt-share-bootstrap';
import { runRentCollectionBootstrap } from './rent-collection-bootstrap';
import { runWebAuthnBootstrap } from './webauthn-bootstrap';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    await runImmeubleSchemaBootstrap(this);
    await runAuditSchemaBootstrap(this);
    await runAccountingClosureBootstrap(this);
    await runSignatureAndReceiptShareBootstrap(this);
    await runRentCollectionBootstrap(this);
    await runWebAuthnBootstrap(this);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
