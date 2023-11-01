import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { Injectable, Inject } from '@nestjs/common/decorators';

@Injectable()
export class SettingsService {
  constructor(
    @Inject('DYNAMODB_CONNECTION')
    private readonly dynamoDB: DocumentClient,
  ) {}

  async getById(id: number) {
    const params = {
      TableName: process.env['SETTINGS_TABLE_NAME'],
      Key: { id }
    };
    
    return this.dynamoDB.get(params);
  }
}