import { Injectable, Inject } from '@nestjs/common/decorators';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

@Injectable()
export class ClientQuotesService {
  constructor(
    @Inject('DYNAMODB_CONNECTION')
    private readonly dynamoDB: DocumentClient,
  ) {}

  async getQuote(
    clientId: number,
    timeTypeId: number,
    destinyTypeId: number,
    payMethod: number,
    subsidiaryId: number,
    siesaReference: string
  ) {
    const params = {
      TableName: process.env['CLIENT_QUOTES_TABLE_NAME'],
      IndexName: process.env['INDEX_CLIENTQUOTE_CLIENT_ID'],
      KeyConditionExpression: '#clientId = :clientId',
      FilterExpression:'#courierType = :courierType AND '+
        '#timeType = :timeType AND '+
        '#destinyType = :destinyType AND '+
        '#product = :product AND '+
        '#payMethod = :payMethod AND '+
        '#subsidiaryId = :subsidiaryId AND '+
        '#siesaReference = :siesaReference ',
      ExpressionAttributeNames: {
        '#clientId': 'clientId',
        '#courierType': 'courierTypeId',
        '#timeType':'timeTypeId',
        '#destinyType':  'destinyTypeId',
        '#product'   : 'productTypeId',
        '#payMethod': 'payMethodId',
        '#subsidiaryId':'subsidiaryId',
        '#siesaReference':'siesaReference'
      },
      ExpressionAttributeValues:{
        ':clientId': clientId,
        ':courierType': Number(process.env['COURIER_TYPE_PACKAGE_ID']),
        ':timeType': Number(timeTypeId),
        ':destinyType': destinyTypeId,
        ':product': Number(process.env['PRODUCT_TYPE_ID']),
        ':payMethod': Number(payMethod),
        ':subsidiaryId': subsidiaryId,
        ':siesaReference': siesaReference
      }
    };
    return this.dynamoDB.query(params);
  }
}