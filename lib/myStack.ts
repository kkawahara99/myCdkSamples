import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { VpcConstruct } from './constructs/baseline/vpc';

export interface IMyStackProps extends cdk.StackProps {
  sysId: string
  envId: string
}

export class MyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IMyStackProps) {
    super(scope, id, props);

    // ------------------------------
    // VPC
    // ------------------------------

    const vpcConstruct = new VpcConstruct(this, 'VpcConstruct', {
      bucketName: `${props.sysId}-${props.envId}-s3-flowlog-${props.env!.account}`,
      vpcName: `${props.sysId}-${props.envId}-vpc-main`,
      sgPubricName: `${props.sysId}-${props.envId}-sg-public`,
      sgPrivateName: `${props.sysId}-${props.envId}-sg-private`,
      sgSecureName: `${props.sysId}-${props.envId}-sg-secure`,
    });

  }
}
