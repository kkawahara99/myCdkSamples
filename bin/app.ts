#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MyStack } from '../lib/myStack';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag'

const app = new cdk.App();

// Get system ID.
const sysId: string = app.node.tryGetContext('sysId');

// Get environment ID.
const envId: 'prd' | 'stg' | 'dev' = app.node.tryGetContext('envId');

// Create Stack.
const stack = new MyStack(app, 'MyStack', {
  stackName: `${sysId}-${envId}-stack`,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  },
  terminationProtection: false,
  sysId: sysId,
  envId: envId,
});

// Add tags.
cdk.Tags.of(app).add('sysId', sysId);
cdk.Tags.of(app).add('envId', envId);

// cdk-nag suppressions.
NagSuppressions.addStackSuppressions(stack, [
  {
    id: 'AwsSolutions-S1',
    reason: 'Server access logs are not required'
  },
  {
    id: 'AwsSolutions-EC23',
    reason: 'Use 0.0.0.0/0 for DMZ'
  },
])

// cdk-nag check.
cdk.Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }))
