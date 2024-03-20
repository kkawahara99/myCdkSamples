import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as utils from './utils/index';
import { Vpc } from './constructs/baseline/vpc';
import { AuroraMySql } from './constructs/databases/auroraMySql';
import { Ecr } from './constructs/registries/ecr';
import { EcsFargate } from './constructs/servers/ecsFargate';

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

    const vpcConstruct = new Vpc(this, 'VpcConstruct', {
      bucketName: `${props.sysId}-${props.envId}-s3-flowlog-${props.env!.account}`,
      vpcName: `${props.sysId}-${props.envId}-vpc-main`,
      sgPubricName: `${props.sysId}-${props.envId}-sg-public`,
      sgPrivateName: `${props.sysId}-${props.envId}-sg-private`,
      sgSecureName: `${props.sysId}-${props.envId}-sg-secure`,
    });

    // ------------------------------
    // Database
    // ------------------------------

    const auroraConstruct = new AuroraMySql(this, 'AuroraPostgreSqlConstruct', {
      dbUserName: 'admin',
      vpc: vpcConstruct.vpc,
      subnets: utils.getIsolatedSubnetsFromVpc(vpcConstruct.vpc),
      dbSecurityGroups: [vpcConstruct.securityGroup.secure],
      endpointSecurityGroups:  [vpcConstruct.securityGroup.private],
      secretName: `${props.sysId}-${props.envId}-secret-aurora`,
      clusterIdentifier: `${props.sysId}-${props.envId}-rds-cluster`,
    });

    // ------------------------------
    // Container
    // ------------------------------

    const ecrConstruct = new Ecr(this, 'EcrConstruct', {
      env: props.env!,
      repositoryName: `${props.sysId}-${props.envId}-ecr-repo`,
    });

    const ecsConstruct = new EcsFargate(this, 'EcsConstruct', {
      vpc: vpcConstruct.vpc,
      ecrRepository: ecrConstruct.ecrRepository,
      secret: auroraConstruct.dbSecret,
      clusterName: `${props.sysId}-${props.envId}-ecs-cluster-sample`,
      serviceName: `${props.sysId}-${props.envId}-ecs-service-sample`,
      loadBalancerName: `${props.sysId}-${props.envId}-alb-sample`,
      bucketName: `${props.sysId}-${props.envId}-s3-accesslog-${props.env!.account}`,
    });
  }
}
