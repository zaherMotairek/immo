import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Identifiants invalides');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Identifiants invalides');

    const payload: { sub: string; email: string; organizationId: string } = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
    };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: { id: user.id, email: user.email, name: user.name, organizationId: user.organizationId },
    };
  }
}
