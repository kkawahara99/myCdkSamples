import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface IResult {
  dbSecret: secrets.Secret
  aurora: rds.DatabaseCluster
}

export interface IConstructProps {
  dbUserName: string
  vpc: ec2.Vpc
  subnets: ec2.ISubnet[]
  dbSecurityGroups: ec2.SecurityGroup[]
  endpointSecurityGroups: ec2.SecurityGroup[]
  secretName?: string
  clusterIdentifier?: string
  endpointName?: string
}

export class AuroraConstruct extends Construct {
  public readonly result: IResult;

  constructor(scope: Construct, id: string, props: IConstructProps) {
    super(scope, id);

    // Create Secret
    const dbSecret = new secrets.Secret(this, 'Secret', {
      secretName: props.secretName,
      description: 'Secret for DB auth info',
      generateSecretString: {
        excludeCharacters: '@%*()_+=`~{}|[]\\:";\'?,./',
        generateStringKey: 'password',
        secretStringTemplate: JSON.stringify({username: props.dbUserName}),
      },
    })

    // Create Aurora Serverless v2.
    const aurora = new rds.DatabaseCluster(this, 'Aurora', {
      clusterIdentifier: props.clusterIdentifier,
      backtrackWindow: cdk.Duration.hours(1),
      credentials: rds.Credentials.fromSecret(dbSecret),
      engine: rds.DatabaseClusterEngine.auroraMysql({
        version: rds.AuroraMysqlEngineVersion.VER_3_04_1
      }),
      deletionProtection: true,
      defaultDatabaseName: 'mydb',
      writer: rds.ClusterInstance.serverlessV2('writer'),
      readers: [
        rds.ClusterInstance.serverlessV2('reader', { scaleWithWriter: true }),
      ],
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 1,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      storageEncrypted: true,
      vpc: props.vpc,
      vpcSubnets: {
        subnets: props.subnets
      },
      securityGroups: props.dbSecurityGroups,
    });

    aurora.addRotationSingleUser({
      automaticallyAfter: cdk.Duration.days(30),
      excludeCharacters: "\"@/\\ '",
      vpcSubnets: {
        subnets: props.subnets
      },
    });

    // Create VPC Endpoint for SecretsManager
    const endpoint = new ec2.InterfaceVpcEndpoint(this, 'SecretsManagerEndpoint', {
      vpc: props.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      securityGroups: props.endpointSecurityGroups
    });
    if (props.endpointName) {
      cdk.Tags.of(endpoint).add('Name', props.endpointName);
    }

    // Set Result
    this.result = {
      dbSecret: dbSecret,
      aurora: aurora,
    }
  }
}