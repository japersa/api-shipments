import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class CitiesService {
  constructor(
    @Inject('DYNAMODB_CONNECTION')
    private readonly dynamoDB: DocumentClient,
  ) { }

  async getIdByDivipola(divipola) {
    const params = {
      TableName: process.env['CITIES_TABLE_NAME'],
      IndexName: process.env['INDEX_CITIES_DIVIPOLA'],
      KeyConditionExpression: '#divipola = :divipola',
      ExpressionAttributeNames: { '#divipola': 'divipola' },
      ExpressionAttributeValues: { ':divipola': divipola },
    };

    return this.dynamoDB.query(params);
  }

  async getCityById(id) {
    const params = {
      TableName: process.env['CITIES_TABLE_NAME'],
      Key: { id },
    };
    return this.dynamoDB.get(params);
  }

  async getCityByNameDepartment(name, department) {
    const params = {
      TableName: process.env['CITIES_TABLE_NAME'],
      IndexName: process.env['INDEX_CITIES_NAME'],
      KeyConditionExpression: '#city = :city',
      ExpressionAttributeNames: {
        '#city': 'name',
      },
      ExpressionAttributeValues: {
        ':city': `${name}-${department}`,
      },
    };

    return this.dynamoDB.query(params);
  }
}