import * as cdk from 'aws-cdk-lib';
import * as ecspattern from 'aws-cdk-lib/aws-ecs-patterns';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface EcsFargateProps {
  vpc: ec2.Vpc
  ecrRepository: ecr.Repository
  secret: secrets.Secret
  clusterName?: string
  serviceName?: string
  loadBalancerName?: string
  bucketName?: string
}

export class EcsFargate extends Construct {

  constructor(scope: Construct, id: string, props: EcsFargateProps) {
    super(scope, id);

    // Create Cluster
    const cluster = new ecs.Cluster(this, 'Cluster', {
      clusterName: props.clusterName,
      vpc: props.vpc,
      containerInsights: true,
    });

    // Create Fargate Service
    const fargateService = new ecspattern.ApplicationLoadBalancedFargateService(this, 'FargateService', {
      serviceName: props.serviceName,
      loadBalancerName: props.loadBalancerName,
      cluster,
      taskImageOptions: {
        image: ecs.ContainerImage.fromEcrRepository(props.ecrRepository, 'latest'),
        secrets: {
          'DB_HOST': ecs.Secret.fromSecretsManager(props.secret, 'host'),
          'DB_NAME': ecs.Secret.fromSecretsManager(props.secret, 'dbname'),
          'DB_PORT': ecs.Secret.fromSecretsManager(props.secret, 'port'),
          'DB_USER': ecs.Secret.fromSecretsManager(props.secret, 'username'),
          'DB_PASS': ecs.Secret.fromSecretsManager(props.secret, 'password'),
        },
      },
    });

    // Permission settings
    const executionRole = fargateService.taskDefinition.executionRole!;
    props.secret.grantRead(executionRole);
    props.ecrRepository.grantPull(executionRole);

    // Create S3 Bucket for Access Log to ALB.
    const bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: props.bucketName,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Add Access Log to ALB
    fargateService.loadBalancer.logAccessLogs(bucket);

    // Set Result
  }
}