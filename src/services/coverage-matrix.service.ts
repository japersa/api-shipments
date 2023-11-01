import { Injectable, Inject } from '@nestjs/common';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

@Injectable()
export class CoverageMatrixService {
  constructor(
    @Inject('DYNAMODB_CONNECTION')
    private readonly dynamoDB: DocumentClient,
  ) {}

  async getPackageMatrixByClientId(
    clientId: number
  ) {
    const params = {
      TableName: process.env['COVERAGE_MATRIX_TABLE_NAME'],
      IndexName: process.env['INDEX_COVERAGE_MATRIX_CLIENTID'],
      KeyConditionExpression:'#clientId = :clientId',
      ExpressionAttributeNames:{
        '#clientId': 'clientId'
      },
      ExpressionAttributeValues: {
        ':clientId': clientId
      },
    };

    return this.dynamoDB.query(params);
  }
}