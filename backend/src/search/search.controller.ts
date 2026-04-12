import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtAuthUser } from '../auth/jwt-user.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SearchService } from './search.service';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /** Recherche globale (biens, locataires, unités, baux, charges, paiements) — q ≥ 2 caractères. */
  @Get()
  async lookup(@CurrentUser() user: JwtAuthUser, @Query('q') q?: string) {
    const s = (q ?? '').trim().slice(0, 96);
    return this.searchService.global(s, user.organizationId);
  }
}
