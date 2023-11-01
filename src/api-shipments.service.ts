import { Injectable } from '@nestjs/common';
import { ShipmentsDto } from './dto/shipments.dto';
import { LoggerService } from './common/logger/logger.service';
import { OrdersService } from './services/orders.service';
import { CitiesService } from './services/cities.service';
import { HttpStatusCode } from 'axios';
import { SubsidiariesService } from './services/subsidiaries.services';
import { DestinyTypesService } from './services/destiny-types.service';
import { DateFunctions } from './common/utils/date-functions';
import { ShipmentsService } from './services/shipments.service';
import { PartsDto } from './dto/parts.dto';
import { ClientQuotesService } from './services/client-quotes.service';
import { SettingsService } from './services/settings.service';
import { ConfigurationSiesaDto } from './dto/configuration-siesa.dto';
import { CoverageMatrixService } from './services/coverage-matrix.service';
import { TextFunctions } from './common/utils/text-functions';
@Injectable()
export class ApiShipmentsService {
  constructor(
    private readonly logger: LoggerService,
    private readonly ordersService: OrdersService,
    private readonly citiesService: CitiesService,
    private readonly subsidiaryService: SubsidiariesService,
    private readonly destinyTypeService: DestinyTypesService,
    private readonly shipmentsService: ShipmentsService,
    private readonly clientQuotesService: ClientQuotesService,
    private readonly settingsService: SettingsService,
    private readonly coverageMatrixService: CoverageMatrixService,
  ) { }

  async create(client, shipments: ShipmentsDto[]) {
    const response = [];
    const orders = [];
    try {

      const packageType = client.packageType;
      // validate transaction

      for (const shipment of shipments) {
        const time: number =
          shipment.tipo_de_servicio.toUpperCase() === 'NORMAL' ?
            Number(process.env['NORMAL_TIME']) :
            Number(process.env['URGENT_TIME']);

        const order = await this.ordersService._getOrder(
          client.id,
          client.cutoffTime,
          time,
          shipment
        );

        if (order !== undefined) {
          let flag = true;
          orders.forEach((value, index) => {
            if (order.id === value.order.id) {
              flag = false;
              orders[index].shipments.push(shipment);
            }
          })
          if (flag) {
            orders.push({ 
              order, 
              shipments: [shipment],
              timeId: time, 
              time: shipment.tipo_de_servicio.toUpperCase(), 
            });
          }
        } else {
          // ERRORES EN CREACION ORDENES POR GUIA
        }
      }

      for (const element of orders) {
        const {order, timeId} = element;
        const _shipments: ShipmentsDto[] = element.shipments;
        const shipmentInformation = await this._putShipments(_shipments, client, order, timeId, packageType);

        shipmentInformation.forEach(shipment => {
          if (Number(packageType) === Number(process.env['LOADED_PACKAGE_TYPE'])) {
            if (shipment.statusCode === HttpStatusCode.Conflict || shipment.statusCode === HttpStatusCode.NotFound) {
              response.push(shipment);
            } else {
              response.push({
                guia: shipment.guia.guia,
                status: shipment.status,
                reason: shipment.reason,
                url: shipment.url,
                cantidad: shipment.guia.cantidad_piezas,
                peso_volumetrico_total: shipment.guia.peso_volumentrico_total,
                peso_total: shipment.guia.peso_total,
                valor_recaudo: shipment.guia.valor_recaudo,
                valor_flete: shipment.guia.valor_flete,
                valor_manejo: shipment.guia.valor_manejo,
                costo_recaudo: shipment.guia.costo_recaudo,
                costo_total: shipment.guia.costo_total,
                descuento: shipment.guia.descuento,
              });
            }
          } else {
            let obj;
            if (shipment.statusCode === HttpStatusCode.Conflict || shipment.statusCode === HttpStatusCode.NotFound) {
              obj = shipment;
            } else {
              obj = {
                ...shipment.guia,
                status: shipment.status,
                reason: shipment.reason,
                url: shipment.url,
              };
            }

            if (shipment.reason) {
              obj.guia = 0;
            }
            response.push(obj);
          }
        });
      }
    } catch (error) {
      console.log(error);
    }

    return response;
  }

  private async _putShipments(
    shipments: ShipmentsDto[],
    client,
    order,
    typeTimeId: number,
    packageType: number
  ) {
    const responses = [];

    for (let i = 0; i < shipments.length; i++) {
      let subsidiaryId;
      
      const createdAt = DateFunctions.getDateLong();

      shipments[i].orden_servicio = order.id;

      const originDestiny = await this._validateOriginDestiny(shipments[i]);

      if (originDestiny.destinyId === 0) {
        responses.push({
          statusCode: HttpStatusCode.NotFound,
          status: 'Conflict',
          reason: `No se tiene configurada una ciudad destino con el nombre ${shipments[i].ciudad_destino}-${shipments[i].departamento_destino}`
        });
        continue;
      }

      if (originDestiny.originId === 0) {
        responses.push({
          statusCode: HttpStatusCode.NotFound,
          status: 'Conflict',
          reason: `No se tiene configurada una ciudad origen con el nombre ${shipments[i].ciudad_origen}-${shipments[i].departamento_origen}`
        });
        continue;
      }

      const {destinyId, destinyCity, originCity, originId} = originDestiny;

      shipments[i] = originDestiny.shipment;

      if (client.hasMatrix) {
        const matrix = await this._getPackageMatrix(client.id, originId, destinyId);
        if (!matrix) {
          responses.push({
            statusCode: HttpStatusCode.NotFound,
            status: 'Conflict',
            reason: `No se tiene configurada tarifa de ${originCity.name} a ${destinyCity.name} debido a que no se tiene cobertura.`
          });
          continue;
        }
      }

      if (originCity.subsidiaryPackageCollectionId !== '') {
        subsidiaryId = originCity.subsidiaryPackageCollectionId;
      } else {
        subsidiaryId = await this._getSubsidiaryId(originCity.id);
      }

      const destinyTypeId = await this._getDestinyTypeId(
        originId,
        subsidiaryId
      );

      const _shipment = {
        createdAt,
        destinyId,
        originId,
        statusDate:   createdAt,
        loadedDate:   createdAt,
        updatedAt:    createdAt,
        orderId:      order.id,
        statusUserId: client.id,
        loadedUserId: client.id,
        account:      shipments[i].cuenta,
        phone:        shipments[i].telefono,
        city:         shipments[i].ciudad_destino.toUpperCase(),
        department:   shipments[i].departamento_destino.toUpperCase(),
        recipient:    shipments[i].destinatario.toUpperCase(),
        address:      shipments[i].direccion_destino.toUpperCase(),
        statusId:     Number(process.env['LOADED_ON_BASE_STATUS_ID']),
      };

      const shipmentId = await this.shipmentsService.putShipment(_shipment);

      const shippingMetrics = await this._processShippingMetrics(shipments[i]);
      shipments[i] = shippingMetrics.shipment;

      const ecommerce = {
        url_notificacion:
          shipments[i].urlNotification === 'N/A' ?
            '' :
            shipments[i].urlNotification,
        piezas: shipments[i].piezas,
      };

      const generalCollected =
        client.generalCollectedPorcent !== undefined ?
          client.generalCollectedPorcent :
          null;

      const collectedValue = shipments[i].hasOwnProperty('valor_recaudo') ?
        shipments[i].valor_recaudo :
        0;

      const declaredValue = shipments[i].hasOwnProperty('valor_declarado') ?
        shipments[i].valor_declarado :
        0;

      const responseANS = await this._getQuoteANS(
        packageType,
        shipments[i],
        shippingMetrics,
        {
          declaredValue,
          subsidiaryId,
          destinyTypeId,
          client,
          typeTimeId,
          payMethod: order.payMethod
        }
      );
      let quoteANS;
      if (responseANS.statusCode === HttpStatusCode.Conflict) {
        responses.push(responseANS);
        continue;
      } else {
        quoteANS = responseANS.quoteANS;
        shipments[i] = responseANS.shipment;
      }

      if (!quoteANS.status) {
        responses.push({
          statusCode: HttpStatusCode.Conflict,
          status: 'Conflict',
          reason: quoteANS.message
        });
        continue;
      }

      if (generalCollected !== null) {
        shipments[i].costo_recaudo = Number(collectedValue) * (generalCollected / 100);
      } else {
        shipments[i].costo_recaudo = Number(collectedValue) * 0.025;
      }

      quoteANS.shipmentCost += shipments[i].costo_recaudo;
      shipments[i].costo_total = quoteANS.shipmentCost;
      shipments[i].descuento = quoteANS.discount;

      const aditionalFields = await this._processAditionalFields(
        client.aditionalFields,
        shipments[i],
        shippingMetrics,
        collectedValue,
        quoteANS
      );

      const quotes = await this._processQuotes(
        quoteANS,
        generalCollected,
        shipments[i].costo_recaudo
      );

      await this.putComplementShipment(
        aditionalFields,
        quotes,
        ecommerce,
        shipmentId
      );

      if (declaredValue === 0) {
        shipments[i].reason = 'ALERTA: El campo valor declarado se encuentra en $0, recuerde que los objetos postales con valor declarado $0 no estarán asegurados en caso de sinestro.';
      } else if (declaredValue <= Number(process.env['DECLARED_VALUE_LIMIT'])) {
        shipments[i].reason =
          `ALERTA: El campo valor declarado se encuentre entre $1 a $${process.env['DECLARED_VALUE_LIMIT']}, por favor revisar base procesada.`;
      } else {
        /** Nothing to do */
      }

      const url = process.env['URL_TRACKING'];
      shipments[i].guia = shipmentId;
      responses.push({
        guia: shipments[i],
        status: process.env['STATUS_CREATED_SHIPMENT'],
        url: url.replace(/&guia%/g, `${shipmentId}`),
      });
    }

    return responses;
  }

  private async _getCityIdDivipola(
    divipola: string,
    defaultValue: number
  ) {
    const city: any = await this.citiesService.getIdByDivipola(divipola);

    return city.Items[0] === undefined ? defaultValue : city.Items[0].id;
  }

  private async _getCityByNameDepartment(
    name: string,
    department: string,
    defaultValue: number
  ) {
    const city: any = await this.citiesService.getCityByNameDepartment(
      name,
      department
    );

    return city.Items[0] === undefined ? defaultValue : city.Items[0].id;
  }

  private async _getCityById(id: number) {
    const city: any = await this.citiesService.getCityById(id);

    const cityArr = city.Item.name.split('-');
    city.Item.name = cityArr[0];
    city.Item.department = cityArr[1];
    return city.Item;
  }

  private async _validateOriginDestiny(shipment: ShipmentsDto) {
    let destinyId;
    let originId;

    if (shipment.hasOwnProperty('divipola_destino') && shipment.divipola_destino !== '') {
      destinyId = await this._getCityIdDivipola(
        shipment.divipola_destino,
        0
      );
    } else {
      destinyId = await this._getCityByNameDepartment(
        shipment.ciudad_destino,
        shipment.departamento_destino,
        0
      );
    }

    if (destinyId === 0) {
      return {
        destinyId,
        originId,
        shipment
      };
    }

    const destinyCity = await this._getCityById(destinyId);
    shipment.ciudad_destino = destinyCity.name;
    shipment.departamento_destino = destinyCity.department;

    if (shipment.hasOwnProperty('divipola_origen') && shipment.divipola_origen !== '') {
      originId = await this._getCityIdDivipola(
        shipment.divipola_origen,
        1 // Default MEDELLIN
      );
    } else if (
      shipment.hasOwnProperty('ciudad_origen') &&
      shipment.hasOwnProperty('departamento_origen') &&
      shipment.ciudad_origen !== '' &&
      shipment.departamento_origen !== ''
    ) {
      originId = await this._getCityByNameDepartment(
        shipment.ciudad_origen,
        shipment.departamento_origen,
        1 // Default MEDELLIN
      );
    } else {
      originId = 1; // Default MEDELLIN
    }

    const originCity = await this._getCityById(originId);
    shipment.ciudad_origen = originCity.name;
    shipment.departamento_origen = originCity.department;

    return {
      destinyCity,
      destinyId,
      originCity,
      originId,
      shipment
    };
  }

  private async _getSubsidiaryId(cityId: number) {
    const subsidiary: any = await this.subsidiaryService.getByCityId(cityId);
    return subsidiary.Items.id ?? 0;
  }

  private async _getDestinyTypeId(
    cityId: number,
    subsidiaryId: number
  ) {
    const destinyType: any = await this.destinyTypeService.getDestinyTypeByCitySubsidiary(
      cityId,
      subsidiaryId
    );

    return destinyType.Items[0] === undefined ? 0 : destinyType.Items[0].destinyTypeId;
  }

  private async _processAditionalFields(
    aditionalFields,
    shipment: ShipmentsDto,
    shippingMetrics,
    collectedValue,
    quoteANS
  ) {
    const _aditionalFields = [];
    const originAddress = shipment.hasOwnProperty('direccion_origen') ?
      TextFunctions.cleanSpecialCharacters(shipment.direccion_origen) :
      null;
    const originCellar = shipment.hasOwnProperty('nombre_origen') ?
      TextFunctions.cleanSpecialCharacters(shipment.nombre_origen) :
      null;
    const originPhone = shipment.hasOwnProperty('tel_origen') ?
      shipment.tel_origen :
      null;
    const originCellphone = shipment.hasOwnProperty('cel_origen') ?
      shipment.cel_origen :
      null;
    let freight = shipment.hasOwnProperty('flete') ? 
      shipment.flete :
      null;

    if (aditionalFields !== undefined) {
      Object.keys(aditionalFields).forEach(aditionalField => {
        const value = shipment[aditionalField];
        if (
          [
            process.env['NUMBER_PARTS_PROPERTY'],
            process.env['DECLARED_VALUE_PROPERTY']
          ].indexOf(aditionalField) >= 0
        ) {
          const _value = value.toString().replace(',', '.');
          _aditionalFields.push({
            id: aditionalField,
            valor: Math.round(_value)
          });
        } else if (
          [
            process.env['INVOICE_PROPERTY'],
            process.env['REQUEST_NUMBER_PROPERTY'],
            process.env['PRODUCT_PROPERTY'],
            process.env['SERVICE_TYPE_PROPERTY']
          ].indexOf(aditionalField) >= 0
        ) {
          _aditionalFields.push({
            id: aditionalField,
            valor: TextFunctions.cleanSpecialCharacters(value),
          });
        } else {
          if (
            [
              process.env['HIGH_PROPERTY'],
              process.env['WIDTH_PROPERTY'],
              process.env['LENGTH_PROPERTY'],
              process.env['WEIGHT_PROPERTY'],
              process.env['VALUE_COLLECTED_PROPERTY']
            ].indexOf(aditionalField) === -1
          ) {
            _aditionalFields.push({
              id: aditionalField,
              valor: 'N/A',
            });
          }
        }
      });
    }

    if (shipment.complementos !== undefined) {
      shipment.complementos.forEach(value => {
        Object.keys(value).forEach(key => {
          let valueComp = value[key].replace(/\n|\r/g, '');
          valueComp = valueComp.replace(/['"]+/g, '');
          _aditionalFields.push({
            id: key,
            valor: valueComp.trim()
          });
        });
      });
    }

    _aditionalFields.push({ id: 'alto', valor: shippingMetrics.totalHigh });
    _aditionalFields.push({ id: 'ancho', valor: shippingMetrics.totalWidth });
    _aditionalFields.push({ id: 'largo', valor: shippingMetrics.totalLength });
    _aditionalFields.push({ id: 'peso', valor: quoteANS.kg });
    _aditionalFields.push({ id: 'detalle_piezas', valor: shippingMetrics.fieldsString, });
    _aditionalFields.push({ id: 'pesocubicados', valor: shippingMetrics.globalVolumetricWeight, });
    _aditionalFields.push({ id: 'peso_total', valor: shippingMetrics.totalWeight });
    _aditionalFields.push({ id: 'valor_a_recaudar', valor: Math.round(collectedValue), });
    _aditionalFields.push({ id: 'tarifa_envio', valor: quoteANS.shipmentCost, });
    if (freight !== null) {
      const tmpFreight = String(freight);
      if (tmpFreight.length === 0) {
        freight = 0;
      }
    } else {
      freight = 0;
    }
    _aditionalFields.push({ id: 'valor_flete', valor: freight });
    _aditionalFields.push({
      id: 'direccion_origen',
      valor: originAddress??''
    });
    _aditionalFields.push({
      id: 'bodega_origen',
      valor: originCellar??''
    });
    _aditionalFields.push({ id: 'tel_origen', valor: originPhone });
    _aditionalFields.push({ id: 'cel_origen', valor: originCellphone });

    return _aditionalFields;
  }

  private async _processShippingMetrics(shipment: ShipmentsDto) {
    let totalHigh = 0;
    let totalLength = 0;
    let totalWidth = 0;
    let totalWeight = 0;
    let globalVolumetricWeight = 0;
    let fieldsString = '';
    shipment.piezas.forEach((element, index) => {
      element.producto = TextFunctions.cleanSpecialCharacters(element.producto);
      shipment.piezas[index].producto = element.producto;
      const product = element.producto;

      if (element.cantidad === undefined || !element.cantidad) {
        element.cantidad = 1;
      }

      const totalVolumentricWeight =
        ((Number(element.alto) *
          Number(element.ancho) *
          Number(element.largo)) /
          1000000) *
        400 *
        Number(element.cantidad);

      fieldsString = `Producto:${product},` +
        `Cantidad:${element.cantidad},` +
        `Alto:${element.alto},` +
        `Ancho:${element.ancho},` +
        `Largo:${element.largo},` +
        `Peso:${element.peso},` +
        `Pesocubicado:${totalVolumentricWeight};`;
      totalHigh += Number(element.alto) * Number(element.cantidad);
      totalLength += Number(element.ancho) * Number(element.cantidad);
      totalWidth += Number(element.largo) * Number(element.cantidad);
      totalWeight += Number(element.peso) * Number(element.cantidad);
      globalVolumetricWeight += totalVolumentricWeight;
      shipment.piezas[index].pesocubicado = totalVolumentricWeight;
      shipment.peso_volumetrico_total = totalVolumentricWeight;
    });


    return {
      totalHigh,
      totalLength,
      totalWidth,
      totalWeight,
      globalVolumetricWeight,
      shipment,
      fieldsString
    };
  }

  private async _processQuote(
    piece,
    declaredValue: number,
    subsidiaryId: number,
    destinyTypeId: number,
    client,
    timeTypeId: number,
    payMethod: number,
    packageType: number,
    globalVolumentricWeight: number
  ) {
    const quoteModel = client.quoteModel || '0';
    const matrix = client.matrix || [];
    const handlingCost = client.handlingCost || '0';
    const discountQuote = client.discount || '0';
    const handlingValue = client.handlingValue || '0';
    let handlingQuote = 0;
    let kg = 0;

    if (declaredValue <= parseInt(handlingValue, 10)) {
      handlingQuote = 0;
    } else {
      handlingQuote = declaredValue * (parseInt(handlingCost, 10) / 100)
    }
    let values;
    if (Number(packageType) === Number(process.env['LOADED_PACKAGE_TYPE'])) {
      const kgVol = piece.globalVolumentricWeight / piece.parts.length;
      kg = kgVol > piece.totalWeight ?
        kgVol :
        piece.totalWeight;
      const numberParts = Number(piece.shipment.cantidad_piezas);
      const weightLimit = numberParts * Number(process.env['KG_LIMIT']);
      const weightParts = numberParts * kg;

      if (weightParts <= weightLimit) {
        if (Number(payMethod) === Number(process.env['PAY_METHOD_CREDIT'])) {
          values = await this._processCreditValues(
            {
              matrix,
              destinyTypeId,
              kg,
              quoteModel,
              timeTypeId,
              payMethod,
              discountQuote,
              handlingQuote,
              subsidiaryId,
              piece,
              numberParts
            },
            client
          );
        } else if (Number(payMethod) === Number(process.env['PAY_METHOD_CASH'])) {
          values = await this._processCashValues(
            {
              destinyTypeId,
              kg,
              quoteModel,
              timeTypeId,
              payMethod,
              subsidiaryId,
              piece,
              discountQuote,
              numberParts
            },
            client
          );
        } else {
          return {
            status: false,
            message: `No tiene configurado tarifas para el tipo de servicio ${piece.shipment.tipo_de_servicio}`
          }
        }
      } else {
        return {
          status: false,
          message: `El peso indicado [${piece.totalWeight}] para la guía sobrepasa el tope de ${process.env['KG_LIMIT']}Kg por pieza.`
        }
      }
    } else { // ECOMMERCE
      for (const element of piece) {
        if (element.cantidad === null || !element.cantidad) {
          element.cantidad = 1;
        }

        const weightLimit = piece.length * Number(process.env['KG_LIMIT']);

        if (globalVolumentricWeight <= weightLimit) {
          const kgVol = element.pesocubicado || 0;
          kg = kgVol > Number(element.peso) ?
            kgVol :
            Number(element.peso);

          if (Number(payMethod) === Number(process.env['PAY_METHOD_CREDIT'])) {
            values = await this._processCreditValues(
              {
                matrix,
                destinyTypeId,
                kg,
                quoteModel,
                timeTypeId,
                payMethod,
                discountQuote,
                handlingQuote,
                subsidiaryId,
                piece: element,
                numberParts: element.cantidad
              },
              client
            );
          } else if (Number(payMethod) === Number(process.env['PAY_METHOD_CASH'])) {
            values = await this._processCashValues(
              {
                destinyTypeId,
                kg,
                quoteModel,
                timeTypeId,
                payMethod,
                subsidiaryId,
                discountQuote,
                piece:        element,
                numberParts:  element.cantidad
              },
              client
            );
          } else {
            return {
              status: false,
              message: `No tiene configurado tarifas para este tipo de servicio`
            }
          }
        } else {
          return {
            status: false,
            message: `El peso indicado [${element.totalWeight}] para la guía sobrepasa el tope de ${process.env['KG_LIMIT']}Kg por pieza.`
          }
        }
      }
    }

    return {
      handlingCost,
      discountQuote,
      handlingValue,
      handlingQuote,
      kg,
      shipmentCost:             values.shipmentCost,
      ans:                      values.ans,
      status:                   values.status,
      message:                  values.message,
      initialSiesaReference:    values.initialSiesaReference,
      aditionalSiesaReference:  values.aditionalSiesaReference,
      finalQuote:               values.finalQuote,
      aditionalCost:            values.aditionalCost,
      discount:                 values.discount,
      aditionalKilo:            values.aditionalKilo??0,
      normalAditionalQuote:     values.normalAditionalQuote??0,
    };
  }

  private async _getItemShipping(
    matrix,
    destinyTypeId,
    kg,
    quoteModel,
    timeTypeId,
    payMethod
  ): Promise<ConfigurationSiesaDto> {

    for (const matrixItem of matrix) {
      if (Number(payMethod) === Number(process.env['PAY_METHOD_CREDIT'])) {
        if (matrixItem.tipo_tiempo === undefined) {
          matrixItem.tipo_tiempo = process.env['NORMAL_TIME'];
        }
      } else {
        matrixItem.tipo_tiempo = timeTypeId;
      }
      if (
        Number(quoteModel) === Number(process.env['EXTRA_KILO_QUOTE_MODEL']) &&
        Number(matrixItem.tipo_destino) === Number(destinyTypeId) &&
        Number(matrixItem.tipo_tiempo) === Number(timeTypeId)
      ) {
        return matrixItem;
      } else {
        if (
          Number(quoteModel) === Number(process.env['WEIGHT_RANGE_QUOTE_MODEL']) &&
          Number(matrixItem.tipo_destino) === Number(destinyTypeId) &&
          kg >= parseFloat(matrixItem.kg_inicial) &&
          kg <= parseFloat(matrixItem.kg_final) &&
          Number(matrixItem.tipo_tiempo) === Number(timeTypeId)
        ) {
          return matrixItem
        }
      }
    }
    
    return null;
  }

  private async _getQuote(
    clientId: number,
    timeTypeId: number,
    destinyTypeId: number,
    weight: number | null,
    payMethod: number,
    subsidiaryId: number,
    siesaReference: string
  ) {
    const quote: any = await this.clientQuotesService.getQuote(
      clientId,
      timeTypeId,
      destinyTypeId,
      payMethod,
      subsidiaryId,
      siesaReference,
    );

    let _quote;
    if (quote.Items !== undefined && quote.Items.length !== 0) {
      if (weight !== null) {
        if (
          Number(weight) >= parseFloat(quote.Items[0].initialWeight) &&
          Number(weight) <= parseFloat(quote.Items[0].finalWeight)
        ) {
          _quote = quote.Items[0].quoteValue;
        } else {
          _quote = 0;
        }
      } else {
        _quote = quote.Items[0].quoteValue;
      }
    } else {
      _quote = 0;
    }

    return _quote;
  }

  private async _processQuotes(
    quoteANS,
    generalCollected,
    collectedCost
  ) {
    const quotes = {
      tarifa: quoteANS.shipmentCost,
      tarifa_normal: quoteANS.finalQuote,
      tarifa_adicional: quoteANS.aditionalCost,
      tarifa_adicional_normal: quoteANS.normalAditionalQuote,
      servicio: 0,
      referencia_siesa: quoteANS.initialSiesaReference,
      referencia_siesa_adicional: quoteANS.aditionalSiesaReference,
      kilo_adicional: quoteANS.aditionalKilo,
      descuento: quoteANS.discount,
      costo_manejo: quoteANS.handlingQuote,
      porcentaje_cuota_manejo: quoteANS.handlingCost,
      procentaje_descuento: quoteANS.discountQuote,
      valor_aplicar_cuota_manejo: quoteANS.handlingValue,
      recaudo_general: generalCollected === null ?
        '2.5' :
        generalCollected,
      costo_admin_recaudo: Math.round(Number(collectedCost))
    };

    return quotes;
  }

  private async putComplementShipment(
    aditionalFields,
    quotes,
    ecommerce,
    shipmentId
  ) {
    const updatedAt = DateFunctions.getDateLong();
    const item = {
      aditionalFields,
      quotes,
      ecommerce,
      updatedAt
    };

    await this.shipmentsService.updateShipment(shipmentId, item);
  }

  private async _getPackageMatrix(
    clientId: number,
    originId: number,
    destinyId: number
  ) {
    let validation = false;
    const coverageMatrix: any = await this.coverageMatrixService.getPackageMatrixByClientId(
      clientId
    );

    if (coverageMatrix.Items.length > 0) {
      coverageMatrix.Items[0].matrix.forEach(element => {
        if (element.destinyId === destinyId) {
          const coverage = element.originsList.find(origin => origin === originId);
          if (coverage !== undefined) {
            validation = true;
          }
        }
      });
    }

    return validation;
  }

  private async _processCreditValues(
    params,
    client
  ) {
    let globalWeight = 0;
    let aditionalKilo = 0;
    let discount = 0;
    let finalQuote = 0;
    let aditionalCost = 0;
    let shipmentCost = 0;
    let ans = '';
    let initialSiesaReference = '';
    let aditionalSiesaReference = '';
    let normalAditionalQuote = 0;

    const configurationSiesa: ConfigurationSiesaDto = await this._getItemShipping(
      params.matrix,
      params.destinyTypeId,
      params.kg,
      params.quoteModel,
      params.timeTypeId,
      params.payMethod
    );

    if (
      configurationSiesa !== null &&
      Number(params.quoteModel) === Number(process.env['EXTRA_KILO_QUOTE_MODEL'])
    ) {
      const weight = null;
      const initialQuote = await this._getQuote(
        client.id,
        params.timeTypeId,
        params.destinyTypeId,
        weight,
        params.payMethod,
        params.subsidiaryId,
        configurationSiesa.referencia_kg_inicial
      );

      let aditionalQuote = await this._getQuote(
        client.id,
        params.timeTypeId,
        params.destinyTypeId,
        weight,
        params.payMethod,
        params.subsidiaryId,
        configurationSiesa.referencia_kg_adicional
      );

      if (initialQuote === 0 || aditionalQuote === 0) {
        return {
          status: false,
          message: `No tiene configurado tarifas para el tipo de servicio`
        }
      }

      const substractKilo = params.kg > parseFloat(configurationSiesa.kg_final) ?
        parseFloat(configurationSiesa.kg_final) :
        0;
      const finalKg = params.kg;
      globalWeight = finalKg * params.numberParts;

      if (substractKilo === 0) {
        aditionalQuote = 0;
      } else {
        aditionalKilo = Math.ceil(globalWeight - substractKilo);
      }

      discount = initialQuote * (parseFloat(params.discountQuote) / 100);
      finalQuote = initialQuote - discount;
      aditionalCost = aditionalKilo * aditionalQuote;
      shipmentCost = aditionalKilo * aditionalQuote +
        initialQuote +
        params.handlingQuote -
        discount;
      ans = `${configurationSiesa.ans} día(s)`;
      initialSiesaReference = configurationSiesa.referencia_kg_inicial;
      aditionalSiesaReference = configurationSiesa.referencia_kg_adicional;
      normalAditionalQuote = aditionalQuote;
    } else if (
      configurationSiesa !== null &&
      Number(params.quoteModel) === Number(process.env['WEIGHT_RANGE_QUOTE_MODEL'])
    ) {
      const quote = await this._getQuote(
        client.id,
        params.timeTypeId,
        params.destinyTypeId,
        params.kg,
        params.payMethod,
        params.subsidiaryId,
        configurationSiesa.referencia_kg
      );

      if (quote === 0) {
        return {
          status: false,
          message: `No tiene configurado tarifas para el tipo de servicio`
        }
      }

      discount = quote * (parseFloat(params.discountQuote) / 100);
      shipmentCost = quote * params.numberParts +
        params.handlingQuote -
        discount * params.numberParts;
      finalQuote = quote - discount;
      ans = `${configurationSiesa.ans} día(s)`;
      initialSiesaReference = configurationSiesa.referencia_kg;
      aditionalSiesaReference = '';
    } else {
      return {
        status: false,
        message: `No tiene configurado tarifas para el tipo de servicio`
      }
    }

    return {
      status: true,
      ans,
      discount,
      finalQuote,
      shipmentCost,
      aditionalKilo,
      aditionalCost,
      normalAditionalQuote,
      initialSiesaReference,
      aditionalSiesaReference,
    }
  }

  private async _processCashValues(
    params,
    client
  ) {
    let discount = 0;
    let finalQuote = 0;
    let shipmentCost = 0;
    let ans = '';
    let initialSiesaReference = '';
    const aditionalSiesaReference = '';

    const matrixCashId = Number(process.env['MATRIX_CASH_ID']);
    const matrixCash: any = await this.settingsService.getById(matrixCashId);
    const configurationSiesa: ConfigurationSiesaDto = await this._getItemShipping(
      matrixCash.Item,
      params.destinyTypeId,
      params.kg,
      params.quoteModel,
      params.timeTypeId,
      params.payMethod
    );

    const quote = await this._getQuote(
      client.id,
      params.timeTypeId,
      params.destinyTypeId,
      params.kg,
      params.payMethod,
      params.subsidiaryId,
      configurationSiesa.referencia
    );

    if (quote === 0) {
      return {
        status: false,
        message: `No tiene configurado tarifas para el tipo de servicio ${params.piece.shipment.tipo_de_servicio}`
      }
    }

    discount = quote * (parseFloat(params.discountQuote) / 100);
    finalQuote = quote - discount;
    shipmentCost = quote * params.numberParts +
      params.handlingCost -
      discount * params.numberParts;
    ans = `${configurationSiesa.ans} día(s)`;
    initialSiesaReference = configurationSiesa.referencia;

    return {
      shipmentCost,
      ans,
      initialSiesaReference,
      aditionalSiesaReference,
      finalQuote,
      discount
    };
  }

  private async _getQuoteANS(
    packageType, 
    shipment, 
    shippingMetrics,
    generalVariables 
  ) {
    let quoteANS;
    if (Number(packageType) === Number(process.env['LOADED_PACKAGE_TYPE'])) {
      if (shipment.hasOwnProperty('peso_volumentrico_total')) {
        if (
          Number(shippingMetrics.globalVolumetricWeight) <
          shipment.peso_volumetrico_total
        ) {
          shippingMetrics.globalVolumetricWeight = shipment.peso_volumetrico_total;
        } else {
          shipment.peso_volumetrico_total = shippingMetrics.globalVolumetricWeight;
          shipment.peso_total = shippingMetrics.globalVolumetricWeight /
                                    shipment.cantidad_piezas;
        }
      }
      const piece = {
        shipment,
        globalVolumentricWeight: shippingMetrics.globalVolumetricWeight,
        collectedValue: Number(shipment.valor_recaudo),
        totalWeight: shipment.peso_total,
        parts: shipment.piezas,
      };
      
      quoteANS = await this._processQuote(
        piece,
        generalVariables.declaredValue,
        generalVariables.subsidiaryId,
        generalVariables.destinyTypeId,
        generalVariables.client,
        generalVariables.typeTimeId,
        generalVariables.payMethod,
        packageType,
        shippingMetrics.globalVolumetricWeight
      );
      shipment.valor_flete = quoteANS.finalQuote;
    } else {
      if (
        shipment.hasOwnProperty('peso_volumetrico_total') &&
        shipment.peso_volumetrico_total
      ) {
        let diff = Number(shippingMetrics.globalVolumetricWeight) -  
                      Number(shipment.peso_volumetrico_total);
        
        if (diff < 0) {
          diff *= -1;
        }

        if (diff > parseFloat(process.env['KG_TOLERANCE'])) {
          return {
            statusCode: HttpStatusCode.Conflict,
            statusText: 'Conflict',
            message: `El peso volumétrico total indicado (${shipment.peso_volumetrico_total}) tiene una diferencia superior al ${process.env['KG_TOLERANCE']}Kg respecto al peso volumétrico (${shippingMetrics.globalVolumetricWeight}) calculado con las medidas de las piezas.`
          };
        }

        if (
          shippingMetrics.globalVolumetricWeight < 
          Number(shipment.peso_volumetrico_total)
        ) {
          shippingMetrics.globalVolumetricWeight = Number(shipment.peso_volumetrico_total);
        } else {
          shipment.peso_volumetrico_total = shippingMetrics.globalVolumetricWeight;
        }
      } else {
        shipment.peso_volumetrico_total = shippingMetrics.globalVolumetricWeight;
      }
      
      quoteANS = await this._processQuote(
        shipment.piezas,
        generalVariables.declaredValue,
        generalVariables.subsidiaryId,
        generalVariables.destinyTypeId,
        generalVariables.client,
        generalVariables.typeTimeId,
        generalVariables.payMethod,
        packageType,
        shippingMetrics.globalVolumetricWeight
      );
    }
    shipment.valor_manejo = quoteANS.handlingQuote;

    return {
      statusCode: HttpStatusCode.Ok,
      quoteANS,
      shipment
    }
  }

  public async generateQuote(client, shipment: ShipmentsDto) {
    let response;

    try {
      const packageType = client.packageType;
      let piecesCount = 0;
      shipment.piezas.forEach(piece => (piecesCount += piece.cantidad));
      if (
        shipment.cantidad_piezas !== piecesCount && 
        Number(packageType) === Number(process.env['ECOMMERCE_PACKAGE_TYPE'])
      ) {
        return {
          statusCode: HttpStatusCode.Conflict,
          statusText: 'Conflict',
          message: 'La cantidad de piezas es diferente a la sumatoría de cantidades de productos a entregar'
        }
      }

      let subsidiaryId;
      const originDestiny = await this._validateOriginDestiny(shipment);

      if (originDestiny.destinyId === 0) {
        return {
          statusCode: HttpStatusCode.NotFound,
          statusText: 'not found',
          message: `No se tiene configurada una ciudad destino con el nombre ${shipment.ciudad_destino}-${shipment.departamento_destino}`
        };
      }

      if (originDestiny.originId === 0) {
        return {
          statusCode: HttpStatusCode.NotFound,
          statusText: 'not found',
          message: `No se tiene configurada una ciudad origen con el nombre ${shipment.ciudad_origen}-${shipment.departamento_origen}`
        };
      }

      const {destinyId, destinyCity, originCity, originId} = originDestiny;

      shipment = originDestiny.shipment;

      if (client.hasMatrix) {
        const matrix = await this._getPackageMatrix(client.id, originId, destinyId);
        if (!matrix) {
          return {
            statusCode: HttpStatusCode.NotFound,
            statusText: 'not found',
            message: `No se tiene configurada tarifa de ${originCity.name} a ${destinyCity.name} debido a que no se tiene cobertura.`
          };
        }
      }

      if (originCity.subsidiaryPackageCollectionId !== '') {
        subsidiaryId = originCity.subsidiaryPackageCollectionId;
      } else {
        subsidiaryId = await this._getSubsidiaryId(originCity.id);
      }

      const destinyTypeId = await this._getDestinyTypeId(
        originId,
        subsidiaryId
      );

      const shippingMetrics = await this._processShippingMetrics(shipment);
      shipment = shippingMetrics.shipment;

      const generalCollected =
        client.generalCollectedPorcent !== undefined ?
          client.generalCollectedPorcent :
          null;

      const collectedValue = shipment.hasOwnProperty('valor_recaudo') ?
        shipment.valor_recaudo :
        0;

      const declaredValue = shipment.hasOwnProperty('valor_declarado') ?
        shipment.valor_declarado :
        0;
      const payMethod: string = (shipment.forma_pago === 'CREDITO' || shipment.forma_pago === undefined) ? process.env['PAY_METHOD_CREDIT'] : process.env['PAY_METHOD_CASH'];
      let typeTimeId;
      switch (shipment.tipo_de_servicio) {
        case 'INMEDIATO':
          typeTimeId = process.env['INMEDIATE_TIME'];
          break;
        case 'URGENTE':
          typeTimeId = process.env['URGENT_TIME'];
          break;
        default:
          typeTimeId = process.env['NORMAL_TIME'];
          break;
      }

      const responseANS = await this._getQuoteANS(
        packageType,
        shipment,
        shippingMetrics,
        {
          declaredValue,
          subsidiaryId,
          destinyTypeId,
          client,
          typeTimeId,
          payMethod
        }
      );
      let quoteANS;
      if (responseANS.statusCode === HttpStatusCode.Conflict) {
        return responseANS;
      } else {
        quoteANS = responseANS.quoteANS;
        shipment = responseANS.shipment;
      }

      if (!quoteANS.status) {
        return {
          statusCode: HttpStatusCode.Conflict,
          statusText: 'Conflict',
          message: quoteANS.message
        };
      }

      if (generalCollected !== null) {
        shipment.costo_recaudo = Number(collectedValue) * (generalCollected / 100);
      } else {
        shipment.costo_recaudo = Number(collectedValue) * 0.025;
      }

      quoteANS.shipmentCost += shipment.costo_recaudo;
      shipment.costo_total = quoteANS.shipmentCost;
      shipment.descuento = quoteANS.discount;

      const destinyTypeName = await this._getDestinyTypeName(destinyTypeId);

      response = {
        statusCode: HttpStatusCode.Ok,
        statusText: 'success',
        data: {
          tiempo_entrega: quoteANS.ans,
          tarifa: quoteANS.shipmentCost,
          tipo_destino: destinyTypeName,
          tipo_destino_id: destinyTypeId,
          peso_total: shippingMetrics.totalWeight,
          cantidad: shipment.cantidad_piezas,
          valor_recaudo: collectedValue,
          valor_flete: shipment.valor_flete,
          valor_manejo: quoteANS.handlingQuote,
          costo_recaudo: shipment.costo_recaudo,
          descuento: quoteANS.discount
        }
      }

      if (declaredValue <= 0) {
        response.message = 'OK. ALERTA: El campo valor declarado se encuentra en $0, recuerde que los objetos postales con valor declarado $0 no estarán asegurados en caso de sinestro.';
      } else if (declaredValue <= 2000) {
        response.message = 'OK. ALERTA: El campo valor declarado se encuentre entre $1 a $2000, por favor revisar base procesada';
      } else {
        response.message = 'OK';
      }
    } catch (error) {
      response = {
        statusCode: HttpStatusCode.InternalServerError,
        statusText: 'Internal Error',
        message: 'Ha ocurrido un error inesperado. Por favor contacte con el área de soporte técnico de Domina.'
      };
    }

    return response;
  }

  private async _getDestinyTypeName(destinyTypeId) {
    const destinyType: any = await this.destinyTypeService.getDestinyTypeNameById(
      destinyTypeId
    );

    return destinyType.Items[0].name;
  }
}