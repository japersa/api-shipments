import { Injectable, Inject } from '@nestjs/common';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

@Injectable()
export class SubsidiariesService {
  constructor(
    @Inject('DYNAMODB_CONNECTION')
    private readonly dynamoDB: DocumentClient,
  ) {}

  async getByCityId(id: number) {
    const params = {
      TableName: process.env['SUBSIDIARIES_TABLE_NAME'],
      IndexName: process.env['INDEX_SUBSIDIARIES_CITY'],
      KeyConditionExpression: '#cityId = :cityId',
      ExpressionAttributeNames: { '#cityId': 'cityId' },
      ExpressionAttributeValues: {
        ':cityId': id,
      },
    };
    
    return this.dynamoDB.query(params);
  }
}