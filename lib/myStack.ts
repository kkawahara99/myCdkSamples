import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as utils from './utils/index';
import { VpcConstruct } from './constructs/baseline/vpc';
import { AuroraConstruct } from './constructs/databases/aurora';

export interface IMyStackProps extends cdk.StackProps {
  sysId: string
  envId: string
}

export class MyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IMyStackProps) {
    super(scope, id, props);

    // ------------------------------
    // Network
    // ------------------------------

    const vpcConstruct = new VpcConstruct(this, 'VpcConstruct', {
      bucketName: `${props.sysId}-${props.envId}-s3-flowlog-${props.env!.account}`,
      vpcName: `${props.sysId}-${props.envId}-vpc-main`,
      sgPubricName: `${props.sysId}-${props.envId}-sg-public`,
      sgPrivateName: `${props.sysId}-${props.envId}-sg-private`,
      sgSecureName: `${props.sysId}-${props.envId}-sg-secure`,
    });

    // ------------------------------
    // Database
    // ------------------------------

    const auroraConstruct = new AuroraConstruct(this, 'AuroraConstruct', {
      dbUserName: 'admin',
      vpc: vpcConstruct.result.vpc,
      subnets: utils.getIsolatedSubnetsFromVpc(vpcConstruct.result.vpc),
      dbSecurityGroups: [vpcConstruct.result.securityGroup.secure],
      endpointSecurityGroups:  [vpcConstruct.result.securityGroup.private],
      secretName: `${props.sysId}-${props.envId}-secret-aurora`,
      clusterIdentifier: `${props.sysId}-${props.envId}-rds-cluster`,
    });
  }
}
