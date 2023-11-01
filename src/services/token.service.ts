import { Injectable, Inject } from '@nestjs/common';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

@Injectable()
export class TokenService {
  constructor(
    @Inject('DYNAMODB_CONNECTION')
    private readonly dynamoDb: DocumentClient,
  ) { }

  async getClient(token: string) {
    const params = {
      TableName: process.env['CLIENTS_TABLE_NAME'],
      IndexName: 'token-index',
      KeyConditionExpression: '#tkn=:tkn ',
      ExpressionAttributeNames: { '#tkn': 'token' },
      ExpressionAttributeValues: { ':tkn': token },
    };

    return this.dynamoDb.query(params);
  }
}