import { Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import { ITrustedLandingZone } from "@gd-safeguard/godaddy-constructs";
import * as path from "path";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as kms from "aws-cdk-lib/aws-kms";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";


export interface LambdaRotatorProps {
  readonly accountId: string;
  readonly privateDxSubnetsSSMParam: string;
  readonly vpc: ec2.IVpc;
  readonly gdTrustedLandingZone: ITrustedLandingZone;
  readonly redisClusterName: string;
  readonly region: string;
}

export class LambdaRotator extends Construct {
  constructor(scope: Construct, id: string, props: LambdaRotatorProps) {
    super(scope, id);

    // Create secret
    const kmsKeyArn = ssm.StringParameter.valueForStringParameter(
      this,
      "/AdminParams/Team/KMSKey"
    );
    const kmsKey = kms.Key.fromKeyArn(this, 'KmsKey', kmsKeyArn);
    const secret = new secretsmanager.Secret(this, "TestSecret", {
      description: "A test secret for CCAPI POC", encryptionKey: kmsKey,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: "" }),
        generateStringKey: "_",
      }
    });

    // Create lambda execution role
    const lambdaBasicExecutionRole = iam.ManagedPolicy.fromAwsManagedPolicyName(
      "service-role/AWSLambdaBasicExecutionRole",
    );
    const lambdaVPCAccessExecutionRolePerms =
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaVPCAccessExecutionRole",
      );
    const customPB = iam.ManagedPolicy.fromManagedPolicyArn(
      this, 'PermissionsBoundary', `arn:aws:iam::${props.accountId}:policy/GD-AWS-SSG-PB-TESTFORCLOUDCONTROL`
    )
    const executionRole = new iam.Role(this, "RotatorExecutionRole", {
      roleName: "RotatorExecutionRole",
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal("lambda.amazonaws.com"),
      ),
      permissionsBoundary: customPB,
    });
    executionRole.addManagedPolicy(lambdaBasicExecutionRole);
    executionRole.addManagedPolicy(lambdaVPCAccessExecutionRolePerms);
    executionRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue", "secretsmanager:PutSecretValue", "secretsmanager:DescribeSecret", "secretsmanager:UpdateSecret"],
        resources: [secret.secretArn],
      }),
    )
    executionRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["cloudformation:UpdateResource", "cloudwatch:*", "logs:*"],
        resources: ["*"],
      }),
    )
    executionRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["kms:Decrypt", "kms:Encrypt", "kms:GenerateDataKey"],
        resources: ["*"],
      }),
    )

    const lambdaRotator = new lambda.Function(this, "RotatorLambda", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "rotator_lambda/dist/rotator_lambda-1.0.0.zip"),
      ),
      handler: "rotator_lambda.index.handler",
      runtime: lambda.Runtime.PYTHON_3_12,
      role: executionRole,
      timeout: Duration.minutes(5),
    });

    new events.Rule(this, "SecretRotationRule", {
      schedule: events.Schedule.rate(Duration.minutes(5)),
      targets: [new targets.LambdaFunction(lambdaRotator, {
        event: events.RuleTargetInput.fromObject({
          secretArn: secret.secretArn,
          keyToUpdate: "username",
          clusterArn: `arn:aws:elasticache:${props.region}:${props.accountId}:replicationgroup:${props.redisClusterName}`
        }),
      })],
    });
  }
}
