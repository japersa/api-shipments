import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { Injectable, Inject } from '@nestjs/common';

@Injectable()
export class DestinyTypesService {
  constructor(
    @Inject('DYNAMODB_CONNECTION')
    private readonly dynamoDB: DocumentClient,
  ) {}

  async getDestinyTypeByCitySubsidiary(
    cityId: number,
    subsidiaryId: number
  ) {
    const params = {
      TableName: process.env['DESTINY_TYPES_TABLE_NAME'],
      IndexName: process.env['INDEX_DESTINYTYPES_CITY'],
      KeyConditionExpression: '#cityId = :cityId',
      ExpressionAttributeNames: {
        '#cityId': 'cityId',
        '#subsidiaryId': 'subsidiaryId',
        '#courierTypeId': 'courierTypeId',
      },
      ExpressionAttributeValues: {
        ':cityId': cityId,
        ':subsidiaryId': subsidiaryId,
        ':courierTypeId': Number(process.env['COURIER_TYPE_PACKAGE_ID']),
      },
      FilterExpression: '#subsidiaryId = :subsidiaryId AND #courierTypeId = :courierTypeId',
    };

    return this.dynamoDB.query(params);
  }

  async getDestinyTypeNameById(
    destinyTypeId: number
  ) {
    const params = {
      TableName: process.env['DESTINY_TYPES_TABLE_NAME'],
      IndexName: process.env['INDEX_DESTINYTYPES_DESTINY_TYPE_ID'],
      KeyConditionExpression: '#destinyTypeId = :destinyTypeId',
      ExpressionAttributeNames: {
        '#destinyTypeId' : 'destinyTypeId'
      },
      ExpressionAttributeValues: {
        ':destinyTypeId' : destinyTypeId
      },
    };
    return this.dynamoDB.query(params);
  }
}