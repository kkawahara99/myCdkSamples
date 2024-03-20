import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface VpcProps {
  bucketName?: string
  vpcName?: string
  sgPubricName?: string
  sgPrivateName?: string
  sgSecureName?: string
}

export class Vpc extends Construct {
  public readonly vpc: ec2.Vpc;
  public readonly securityGroup: {
    public: ec2.SecurityGroup
    private: ec2.SecurityGroup
    secure: ec2.SecurityGroup
  };

  constructor(scope: Construct, id: string, props: VpcProps) {
    super(scope, id);

    // Create S3 Bucket for Flowlogs.
    const bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: props.bucketName,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Create VPC.
    const vpc = new ec2.Vpc(this, 'Vpc', {
      vpcName: props.vpcName,
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      natGateways: 0,
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: 'secure',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        }
      ],
      flowLogs: {
        'FlowLogS3': {
          destination: ec2.FlowLogDestination.toS3(bucket),
        }
      }
    });

    // Create SecurityGroups
    const sgPubric = new ec2.SecurityGroup(this, 'SecurityGroupPublic', {
      vpc,
      securityGroupName: props.sgPubricName,
      description: 'Public SecurityGroup',
      allowAllOutbound: true,
      disableInlineRules: true,
    });
    sgPubric.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'allow https from the world'
    );

    const sgPrivate = new ec2.SecurityGroup(this, 'SecurityGroupPrivate', {
      vpc,
      securityGroupName: props.sgPrivateName,
      description: 'Private SecurityGroup',
      allowAllOutbound: true,
      disableInlineRules: true,
    });
    sgPrivate.addIngressRule(
      ec2.Peer.securityGroupId(sgPubric.securityGroupId),
      ec2.Port.tcp(80),
      'allow http from Public SecurityGroup'
    );
    sgPrivate.addIngressRule(
      ec2.Peer.securityGroupId(sgPrivate.securityGroupId),
      ec2.Port.allTraffic(),
      'allow all traffic from Private SecurityGroup'
    );

    const sgSecure = new ec2.SecurityGroup(this, 'SecurityGroupSecure', {
      vpc,
      securityGroupName: props.sgSecureName,
      description: 'Secure SecurityGroup',
      allowAllOutbound: true,
      disableInlineRules: true,
    });
    sgSecure.addIngressRule(
      ec2.Peer.securityGroupId(sgPrivate.securityGroupId),
      ec2.Port.allTraffic(),
      'allow all traffic from Private SecurityGroup'
    );

    // Set Result
    this.vpc = vpc;
    this.securityGroup = {
      public: sgPubric,
      private: sgPrivate,
      secure: sgSecure,
    };
  }
}