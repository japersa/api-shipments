import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { Injectable, Inject } from '@nestjs/common/decorators';

@Injectable()
export class ShipmentsService {
  constructor(
    @Inject('DYNAMODB_CONNECTION')
    private readonly dynamoDB: DocumentClient,
  ) {}

  async putShipment(item) {
    const consecutive: any = await this._getConsecutiveId();
    const id = Number(consecutive.Item.value) + 1;
    const params = {
      TableName: process.env['SHIPMENTS_TABLE_NAME'],
      Item: {
        ...item,
        id
      },
    };
    this.dynamoDB.put(params);
    this._updateConsecutive(id);

    return id;
  }

  async updateShipment(id, item) {
    const params = {
      TableName: process.env['SHIPMENTS_TABLE_NAME'],
      Key: { id },
      UpdateExpression:
                      'set #aditionalFields = :aditionalFields, '+
                        '#quotes = :quotes, '+
                        '#ecommerce = :ecommerce, '+
                        '#updatedAt = :updatedAt',
      ExpressionAttributeNames:{
        '#aditionalFields': 'aditionalFields',
        '#quotes':'quotes',
        '#ecommerce' :'ecommerce',
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: {
        ':aditionalFields':  item.aditionalFields,
        ':quotes': item.quotes,
        ':ecommerce': item.ecommerce,
        ':updatedAt': item.updatedAt
      },
      ReturnValues:'UPDATED_NEW'
    };

    this.dynamoDB.update(params);
  }

  private async _getConsecutiveId() {
    const params = {
      TableName: process.env['SETTINGS_TABLE_NAME'],
      Key: {'id': Number(process.env['CONSECUTIVE_SETTINGS_ID']) },
    };
    return this.dynamoDB.get(params);
  }

  private async _updateConsecutive(id) {
    const params = {
      TableName: process.env['SETTINGS_TABLE_NAME'],
      Key: {id: Number(process.env['CONSECUTIVE_SETTINGS_ID'])},
      UpdateExpression: 'set #value = :value',
      ExpressionAttributeNames: {
        '#value':'value'
      },
      ExpressionAttributeValues: {
        ':value': id
      }
    };

    this.dynamoDB.update(params);
  }
}