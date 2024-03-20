import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { DockerImageAsset, Platform } from 'aws-cdk-lib/aws-ecr-assets';
import * as ecrdeploy from 'cdk-ecr-deployment';
import { Construct } from 'constructs';
import * as path from 'path';

export interface EcrProps {
  env: cdk.Environment
  repositoryName?: string
}

export class Ecr extends Construct {
  public readonly ecrRepository: ecr.Repository;

  constructor(scope: Construct, id: string, props: EcrProps) {
    super(scope, id);

    // Create ECR Repository
    const ecrRepository = new ecr.Repository(this, 'EcrRepo', {
      repositoryName: props.repositoryName,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    // Create Docker Image Asset
    const dockerImageAsset = new DockerImageAsset(this, 'DockerImageAsset', {
      directory: path.join(__dirname, 'assets'),
    });

    // Deploy Docker Image to ECR Repository
    new ecrdeploy.ECRDeployment(this, 'DeployDockerImage', {
      src: new ecrdeploy.DockerImageName(dockerImageAsset.imageUri),
      dest: new ecrdeploy.DockerImageName(
        `${props.env.account}.dkr.ecr.${props.env.region}.amazonaws.com/${ecrRepository.repositoryName}:latest`
      ),
    });

    // Set Result
    this.ecrRepository = ecrRepository;
  }
}