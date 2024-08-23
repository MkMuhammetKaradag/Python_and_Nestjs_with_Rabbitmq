import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response } from 'express';
import { catchError, Observable, of, switchMap } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject('AUTH_SERVICE')
    private readonly authService: ClientProxy,
  ) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    if (
      context.getType() !== 'http' &&
      context.getType().toString() !== 'graphql'
    ) {
      return false;
    }
    const gqlContext = GqlExecutionContext.create(context);
    const request =
      context.getType().toString() !== 'graphql'
        ? context.switchToHttp().getRequest()
        : gqlContext.getContext().req;
    const response =
      context.getType().toString() !== 'graphql'
        ? context.switchToHttp().getResponse()
        : gqlContext.getContext().res;

    // const authHeader = request.headers.authorization as string;

    // if (!authHeader) return false;
    // const authHeaderParts = (authHeader as string).split(' ');

    // if (authHeaderParts.length !== 2) return false;

    // const [, jwt] = authHeaderParts;

    const jwt = request.cookies['access_token'];
    if (!jwt) {
      return false;
    }

    return this.authService.send({ cmd: 'verify_access_token' }, { jwt }).pipe(
      switchMap(({ user, exp }) => {
        // if (!exp) return of(false);

        const TOKEN_EXP_MS = exp * 1000;

        const isJwtValid = Date.now() < TOKEN_EXP_MS;
        if (isJwtValid) {
          request.user = user;

          return of(true);
        } else {
          // Token süresi dolmuşsa, refresh token ile yenilemeyi dene
          return this.refreshToken(request, response);
        }
      }),
      catchError((e) => {
        return this.refreshToken(request, response);
      }),
    );
  }

  private refreshToken(
    request: Request,
    response: Response,
  ): Observable<boolean> {
    const refreshToken = request.cookies['refresh_token']; // refresh token'ı cookie'den al
    if (!refreshToken) {
      console.log('refresh token yok');
      return of(false);
    }

    return this.authService
      .send({ cmd: 'refresh_access_token' }, { refreshToken })
      .pipe(
        switchMap(({ access_token, user }) => {
          if (!access_token) {
            return of(false);
          }
          // Yeni access token'ı header'a ekle
          request.headers['authorization'] = `Bearer ${access_token}`;
          response.cookie('access_token', access_token);
          request.user = user;

          return of(true);
        }),
        catchError(() => of(false)),
      );
  }
}
