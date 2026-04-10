import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError, AxiosHeaders } from 'axios';
import type { AxiosRequestConfig } from 'axios';
import type { Product, Order, InventoryEntry } from './interfaces';

interface OpenCartCredentialsResponse {
  success?: string;
  api_token?: string;
  token?: string;
  error?: string;
}

interface AdapterEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

@Injectable()
export class OpenCartClientService {
  private readonly logger = new Logger(OpenCartClientService.name);
  private token: string | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) { }

  async listProducts(): Promise<Product[]> {
    return this.request<Product[]>({ method: 'GET', routeKey: 'productsRoute' });
  }

  async getProduct(productId: number): Promise<Product> {
    return this.request<Product>({
      method: 'GET',
      routeKey: 'productsRoute',
      params: { product_id: productId },
    });
  }

  async createProduct(payload: Record<string, unknown>): Promise<Product> {
    return this.request<Product>({ method: 'POST', routeKey: 'productsRoute', data: payload });
  }

  async updateProduct(productId: number, payload: Record<string, unknown>): Promise<Product> {
    return this.request<Product>({
      method: 'PATCH',
      routeKey: 'productsRoute',
      params: { product_id: productId },
      data: payload,
    });
  }

  async deleteProduct(productId: number): Promise<void> {
    await this.request<void>({
      method: 'DELETE',
      routeKey: 'productsRoute',
      params: { product_id: productId },
    });
  }

  async createOrder(payload: Record<string, unknown>): Promise<any> {
    console.log('createOrder dto:', payload);
    return this.request<any>({
      method: 'POST',
      routeKey: 'ordersRoute',
      params: { action: 'create' },
      data: payload,
    });
  }

  async listOrders(filters: Record<string, unknown>): Promise<Order[]> {
    return this.request<Order[]>({ method: 'GET', routeKey: 'ordersRoute', params: filters });
  }

  async getOrder(orderId: number): Promise<Order> {
    return this.request<Order>({
      method: 'GET',
      routeKey: 'ordersRoute',
      params: { order_id: orderId },
    });
  }

  async updateOrderStatus(orderId: number, status: string): Promise<Order> {
    return this.request<Order>({
      method: 'PATCH',
      routeKey: 'ordersRoute',
      params: { order_id: orderId, action: 'status' },
      data: { status },
    });
  }

  async getInventory(productId?: number): Promise<InventoryEntry[]> {
    const params = typeof productId === 'number' ? { product_id: productId } : undefined;
    return this.request<InventoryEntry[]>({ method: 'GET', routeKey: 'inventoryRoute', params });
  }

  async updateInventory(
    productId: number,
    quantity: number,
    optionValueId?: number,
  ): Promise<InventoryEntry> {
    return this.request<InventoryEntry>({
      method: 'PATCH',
      routeKey: 'inventoryRoute',
      params: { product_id: productId },
      data: { quantity, optionValueId },
    });
  }

  private async request<T>(options: {
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    routeKey: 'productsRoute' | 'ordersRoute' | 'inventoryRoute';
    params?: Record<string, unknown>;
    data?: Record<string, unknown>;
  }): Promise<T> {
    return this.performRequest<T>(options, true);
  }

  private async performRequest<T>(
    options: {
      method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
      routeKey: 'productsRoute' | 'ordersRoute' | 'inventoryRoute';
      params?: Record<string, unknown>;
      data?: Record<string, unknown>;
    },
    allowAuthRetry: boolean,
  ): Promise<T> {
    const baseUrl = this.configService.getOrThrow<string>('app.opencart.baseUrl');
    const route = this.configService.getOrThrow<string>(`app.opencart.${options.routeKey}`);

    const { headers, token } = await this.buildAuthHeaders();
    const params = { ...(options.params ?? {}) };
    if (this.configService.get<boolean>('app.opencart.includeApiTokenQuery', false)) {
      params.api_token = token;
    }

    const config: AxiosRequestConfig = {
      method: options.method,
      url: `${baseUrl}${route}`,
      params,
      data: options.data,
      headers,
    };

    try {
      // get only one-time config and return payload data
      const response = await firstValueFrom(this.httpService.request<T>(config));
      return this.unwrapData(response.data);
    } catch (error) {
      if (allowAuthRetry && this.shouldRefreshToken(error)) {
        this.logger.warn(`Retrying OpenCart request with fresh token: ${options.method} ${config.url}`);
        this.token = null;
        return this.performRequest(options, false);
      }

      const axiosError = error as AxiosError;
      const status = axiosError.response?.status ?? 'unknown';
      const errorCode = axiosError.code ?? 'unknown';
      const errorMessage = axiosError.message ?? 'unknown';
      const responseBody =
        typeof axiosError.response?.data === 'string'
          ? axiosError.response?.data
          : JSON.stringify(axiosError.response?.data ?? {});

      this.logger.error(
        `OpenCart API request failed: ${options.method} ${config.url} (status=${status}) code=${errorCode} message=${errorMessage} body=${responseBody}`,
      );
      throw this.mapOpenCartError(errorMessage, axiosError.response?.status);
    }
  }

  private async buildAuthHeaders(): Promise<{ headers: Record<string, string>; token: string }> {
    const token = await this.getToken();
    const bridgeSecret = this.configService.get<string>('app.opencart.bridgeSecret', '');

    const headers = new AxiosHeaders({
      'Content-Type': 'application/json',
    });

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      headers.set('X-OpenCart-Api-Token', token);
    }

    if (bridgeSecret) {
      headers.set('X-OpenCart-Bridge-Secret', bridgeSecret);
    }

    return { headers, token };
  }

  private async getToken(): Promise<string> {
    const authMode = this.configService.get<string>('app.opencart.authMode', 'bridge');

    if (authMode !== 'login') {
      return '';
    }

    if (this.token) {
      return this.token;
    }

    const baseUrl = this.configService.getOrThrow<string>('app.opencart.baseUrl');
    const authRoute = this.configService.getOrThrow<string>('app.opencart.authRoute');
    const apiUsername = this.configService.getOrThrow<string>('app.opencart.apiUsername');
    const apiKey = this.configService.getOrThrow<string>('app.opencart.apiKey');
    try {
      const payload = new URLSearchParams({
        username: apiUsername,
        key: apiKey,
      });

      const response = await firstValueFrom(
        this.httpService.post<OpenCartCredentialsResponse>(`${baseUrl}${authRoute}`, payload.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );

      const token = response.data.api_token ?? response.data.token;

      if (!token) {
        throw new Error(response.data.error ?? 'Authentication token missing in OpenCart response');
      }

      this.token = token;
      return token;
    } catch (error) {
      const axiosError = error as AxiosError<OpenCartCredentialsResponse>;
      const status = axiosError.response?.status ?? 'unknown';
      const errorMessage =
        axiosError.response?.data?.error ??
        axiosError.message ??
        'OpenCart authentication failed';

      this.logger.error(`OpenCart authentication failed (status=${status}): ${errorMessage}`);
      throw new InternalServerErrorException('OpenCart authentication failed');
    }
  }

  private shouldRefreshToken(error: unknown): boolean {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    return status === 401 || status === 403;
  }

  private unwrapData<T>(payload: T | AdapterEnvelope<T>): T {
    if (payload && typeof payload === 'object' && ('data' in payload || 'success' in payload)) {
      const envelope = payload as AdapterEnvelope<T>;
      if (envelope.success === false) {
        throw this.mapOpenCartError(envelope.error ?? envelope.message ?? 'OpenCart API error');
      }

      if (typeof envelope.data !== 'undefined') {
        return envelope.data;
      }
    }

    return payload as T;
  }

  private mapOpenCartError(message: string, status?: number): Error {
    const normalized = (message || '').toLowerCase();

    if (normalized.includes('not found')) {
      return new NotFoundException(message);
    }

    if (normalized.includes('insufficient stock') || normalized.includes('invalid status')) {
      return new BadRequestException(message);
    }

    if (status === 404) {
      return new NotFoundException(message);
    }

    if (status === 400) {
      return new BadRequestException(message);
    }

    return new InternalServerErrorException(message || 'OpenCart API error');
  }

}
