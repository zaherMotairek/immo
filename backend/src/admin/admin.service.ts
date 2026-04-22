import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Nouvelle organisation + utilisateur `USER` (le client change le mot de passe depuis Profil ou « oubli »).
   */
  async createClientOrganization(dto: CreateClientDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet e-mail.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const orgName = dto.organizationName.trim();

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: { name: orgName },
        });
        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            name: dto.ownerName?.trim() || null,
            organizationId: org.id,
            role: 'USER',
          },
          select: {
            id: true,
            email: true,
            name: true,
            organizationId: true,
          },
        });
        return { organization: org, user };
      });

      return {
        organizationId: result.organization.id,
        organizationName: result.organization.name,
        userId: result.user.id,
        email: result.user.email,
        name: result.user.name,
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Un compte existe déjà avec cet e-mail.');
      }
      throw e;
    }
  }
}
