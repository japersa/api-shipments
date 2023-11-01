import { Inject, Injectable } from '@nestjs/common';
import { ShipmentsDto } from '../dto/shipments.dto';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { DateFunctions } from '../common/utils/date-functions';

@Injectable()
export class OrdersService {
    constructor(
        @Inject('DYNAMODB_CONNECTION')
        private readonly dynamoDB: DocumentClient,
    ) {}

    async _getOrder(
        clientId: number,
        cutoffTime: string,
        time: number, 
        shipment: ShipmentsDto
    ) {
        if (cutoffTime === '') {
            cutoffTime = '00:00:00';
        }
        const createdAt = `${DateFunctions.getDateShort()} ${cutoffTime}`;

        const originCity = await this._getCity(
            shipment,
            clientId
        );

        let orders;
        if (originCity !== undefined ) {
            // return order
            const params = {
                TableName: process.env['ORDERS_TABLE_NAME'],
                IndexName: process.env['INDEX_ORDERS_CLIENTID'],
                FilterExpression:'#timeTypeid = :timeTypeId AND #date = :date AND #deliveryManager = :deliveryManager AND #status = :status AND #cityId = :cityId',
                ExpressionAttributeNames:{
                    '#clientId': 'clientId', 
                    '#status':'status',
                    '#timeTypeid' :'timeTypeId',
                    '#deliveryManager' :'deliveryManager',
                    '#cityId': 'physicalOriginCityId',
                    '#date': 'createdAt',
                },
                ExpressionAttributeValues: {
                    ':clientId': Number(clientId),
                    ':timeTypeId': Number(time),
                    ':status': true,
                    ':deliveryManager': process.env['DELIVERY_MANAGER_ECOMMERCE'],
                    ':cityId': Number(originCity.cityId),
                    ':date': createdAt,
                },
                KeyConditionExpression:'#clientId=:clientId',
            };
            orders = await this.dynamoDB.query(params);
            

            if (shipment.orden_servicio !== undefined && shipment.orden_servicio !== '') {
                orders = orders.Items.filter(order => order.id === shipment.orden_servicio);
            } else {
                orders = orders.Items;
            }
        }
        let _order;
        if (orders === undefined || orders.length === 0) {
            const id = new Date().getTime();
            const order = {
              id,
              createdAt,
              physicalOriginCityId: originCity !== undefined ?
                  originCity.cityId :
                  1, // Default Medellin
              clientId: Number(clientId),
              payMethod: process.env['PAYMENT_METHOD_CREDIT'],
              observations: process.env['OBSERVATION_ORDER'],
              productId: process.env['PACKAGE_PRODUCT_ID'],
              deliveryManager: process.env['DELIVERY_MANAGER_ECOMMERCE'],
              subsidiaryId: originCity !== undefined ?
                  originCity.subsidiaryId :
                  1,
              status: true,
              timeTypeId: time,
            };

            const params = {
              Item: order,
              TableName: process.env['ORDERS_TABLE_NAME'],
            };
            
            this.dynamoDB.put(params);

            _order = {
              id,
              payMethod: process.env['PAYMENT_METHOD_CREDIT']
            };
        } else {
            _order = orders[0];
        }

        return _order;
    }

    private async _getCity(
        shipment: ShipmentsDto,
        clientId: number, 

    ) {
        let params;
        let originCity;
        let response;

        if (shipment.orden_servicio !== undefined) {
            // SEARCH CITY BY NUMBER ORDER
            params = {
                TableName: process.env['ORDERS_TABLE_NAME'],
                Key: {
                    'id': shipment.orden_servicio,
                },
                ProjectionExpression: '#cityId,#subsidiaryId',
                ExpressionAttributeNames:{
                    '#cityId': 'physicalOriginCityId',
                    '#subsidiaryId': 'subsidiaryId',
                },
            };
            
            originCity = await this.dynamoDB.get(params);
            if (originCity.Item !== undefined) {
              response = {
                cityId: originCity.Item.physicalOriginCityId,
                subsidiaryId: originCity.Item.subsidiaryId
              };
            }
        } else if (shipment.divipola_origen !== undefined) {
            // SEARCH CITY BY DIVIPOLA
            params = {
                TableName: process.env['CITIES_TABLE_NAME'],
                IndexName: process.env['INDEX_CITIES_DIVIPOLA'],
                KeyConditionExpression:'#divipola = :divipola',
                ExpressionAttributeValues: {
                    ':divipola': `${shipment.divipola_origen}`,
                },
                ExpressionAttributeNames: {
                    '#divipola':'divipola',
                },
            };
            originCity = await this.dynamoDB.query(params);
            if (originCity.Items.length > 0) {
              response = {
                cityId: originCity.Items[0].id,
                subsidiaryId: originCity.Items[0].subsidiaryPackageCollectionId
              }
            }
        } else if (shipment.ciudad_origen !== undefined && shipment.departamento_origen !== undefined) {
            // SEARCH CITY BY NAME
            params = {
                TableName: process.env['CITIES_TABLE_NAME'],
                IndexName: process.env['INDEX_CITIES_NAME'],
                KeyConditionExpression: '#name = :name',
                ExpressionAttributeValues: {
                    ':name': `${shipment.ciudad_origen}-${shipment.departamento_origen}`,
                },
                ExpressionAttributeNames: {
                    '#name': 'name',
                },
            }
            
            
            originCity = await this.dynamoDB.query(params);
            if (originCity.Items.length > 0) {
              response = {
                cityId: originCity.Items[0].id,
                subsidiaryId: originCity.Items[0].subsidiaryPackageCollectionId
              }
            }
        } else {
            // SEARCH CITY BY CLIENT
            params = {
                TableName: 'clients',
                Key: {'id': clientId},
                ProjectionExpression: '#cityId,#subsidiaryId',
                ExpressionAttributeNames:{
                    '#cityId': 'cityId',
                    '#subsidiaryId': 'subsidiaryPackageColletionId'
                }
            };
            
            
            originCity = await this.dynamoDB.get(params);
            if (originCity.Item !== undefined) {
              response = {
                cityId: originCity.Item.physicalOriginCityId,
                subsidiaryId: originCity.Item.subsidiaryPackageColletionId
              };
            }
        }
        return response;
    }
}