import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.header(REQUEST_ID_HEADER)?.trim();
    const id = incoming && incoming.length <= 128 ? incoming : randomUUID();
    (req as Request & { requestId?: string }).requestId = id;
    res.setHeader(REQUEST_ID_HEADER, id);
    next();
  }
}
