import * as ec2 from 'aws-cdk-lib/aws-ec2';

export function getPublicSubnetsFromVpc(vpc: ec2.Vpc): ec2.ISubnet[] {
  return vpc.selectSubnets({
    subnetType: ec2.SubnetType.PUBLIC
  }).subnets;
}

export function getPrivateSubnetsFromVpc(vpc: ec2.Vpc): ec2.ISubnet[] {
  return vpc.selectSubnets({
    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
  }).subnets;
}

export function getIsolatedSubnetsFromVpc(vpc: ec2.Vpc): ec2.ISubnet[] {
  return vpc.selectSubnets({
    subnetType: ec2.SubnetType.PRIVATE_ISOLATED
  }).subnets;
}
