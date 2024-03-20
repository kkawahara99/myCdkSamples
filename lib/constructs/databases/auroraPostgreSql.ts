import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface AuroraPostgreSqlProps {
  dbUserName: string
  vpc: ec2.Vpc
  subnets: ec2.ISubnet[]
  dbSecurityGroups: ec2.SecurityGroup[]
  endpointSecurityGroups: ec2.SecurityGroup[]
  secretName?: string
  clusterIdentifier?: string
  endpointName?: string
}

export class AuroraPostgreSql extends Construct {
  public readonly dbSecret: secrets.Secret;
  public readonly aurora: rds.DatabaseCluster;

  constructor(scope: Construct, id: string, props: AuroraPostgreSqlProps) {
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

    // Create Aurora Serverless v2 : PostgreSQL.
    const aurora = new rds.DatabaseCluster(this, 'Aurora', {
      clusterIdentifier: props.clusterIdentifier,
      credentials: rds.Credentials.fromSecret(dbSecret),
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_2
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
    this.dbSecret = dbSecret;
    this.aurora = aurora;
  }
}