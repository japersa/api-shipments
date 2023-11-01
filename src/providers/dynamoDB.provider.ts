import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const marshallOptions = {
  removeUndefinedValues: true,
  convertClassInstanceMap: true,
};

export const DynamoDBProvider = {
  provide: 'DYNAMODB_CONNECTION',
  useFactory: () => DynamoDBDocument.from(new DynamoDB({}), { marshallOptions }),
};
