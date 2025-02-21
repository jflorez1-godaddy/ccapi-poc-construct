"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LambdaRotator = void 0;
const JSII_RTTI_SYMBOL_1 = Symbol.for("jsii.rtti");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const constructs_1 = require("constructs");
const path = require("path");
const lambda = require("aws-cdk-lib/aws-lambda");
const iam = require("aws-cdk-lib/aws-iam");
const ssm = require("aws-cdk-lib/aws-ssm");
const secretsmanager = require("aws-cdk-lib/aws-secretsmanager");
const kms = require("aws-cdk-lib/aws-kms");
const events = require("aws-cdk-lib/aws-events");
const targets = require("aws-cdk-lib/aws-events-targets");
class LambdaRotator extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        // Create secret
        const kmsKeyArn = ssm.StringParameter.valueForStringParameter(this, "/AdminParams/Team/KMSKey");
        const kmsKey = kms.Key.fromKeyArn(this, 'KmsKey', kmsKeyArn);
        const secret = new secretsmanager.Secret(this, "TestSecret", {
            description: "A test secret for CCAPI POC", encryptionKey: kmsKey,
            generateSecretString: {
                secretStringTemplate: JSON.stringify({ username: "" }),
                generateStringKey: "_",
            }
        });
        // Create lambda execution role
        const lambdaBasicExecutionRole = iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole");
        const lambdaVPCAccessExecutionRolePerms = iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole");
        const customPB = iam.ManagedPolicy.fromManagedPolicyArn(this, 'PermissionsBoundary', `arn:aws:iam::${props.accountId}:policy/GD-AWS-SSG-PB-TESTFORCLOUDCONTROL`);
        const executionRole = new iam.Role(this, "RotatorExecutionRole", {
            roleName: "RotatorExecutionRole",
            assumedBy: new iam.CompositePrincipal(new iam.ServicePrincipal("lambda.amazonaws.com")),
            permissionsBoundary: customPB,
        });
        executionRole.addManagedPolicy(lambdaBasicExecutionRole);
        executionRole.addManagedPolicy(lambdaVPCAccessExecutionRolePerms);
        executionRole.addToPrincipalPolicy(new iam.PolicyStatement({
            actions: ["secretsmanager:GetSecretValue", "secretsmanager:PutSecretValue", "secretsmanager:DescribeSecret", "secretsmanager:UpdateSecret"],
            resources: [secret.secretArn],
        }));
        executionRole.addToPrincipalPolicy(new iam.PolicyStatement({
            actions: ["cloudformation:UpdateResource", "cloudwatch:*", "logs:*"],
            resources: ["*"],
        }));
        executionRole.addToPrincipalPolicy(new iam.PolicyStatement({
            actions: ["kms:Decrypt", "kms:Encrypt", "kms:GenerateDataKey"],
            resources: ["*"],
        }));
        const lambdaRotator = new lambda.Function(this, "RotatorLambda", {
            code: lambda.Code.fromAsset(path.join(__dirname, "rotator_lambda/dist/rotator_lambda-1.0.0.zip")),
            handler: "rotator_lambda.index.handler",
            runtime: lambda.Runtime.PYTHON_3_12,
            role: executionRole,
            timeout: aws_cdk_lib_1.Duration.minutes(5),
        });
        // Establish rotation schedule
        /* new secretsmanager.CfnRotationSchedule( this, "RotationSchedule", {
          secretId: secret.secretArn,
          rotationLambdaArn: lambdaRotator.functionArn, // Fix here
          rotationRules: {
            scheduleExpression: "cron(0/5 * * * ? *)",
          },
        }); */
        new events.Rule(this, "SecretRotationRule", {
            schedule: events.Schedule.rate(aws_cdk_lib_1.Duration.minutes(5)),
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
exports.LambdaRotator = LambdaRotator;
_a = JSII_RTTI_SYMBOL_1;
LambdaRotator[_a] = { fqn: "lambda-rotator-construct.LambdaRotator", version: "0.1.0" };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLDZDQUF1QztBQUN2QywyQ0FBdUM7QUFFdkMsNkJBQTZCO0FBQzdCLGlEQUFpRDtBQUNqRCwyQ0FBMkM7QUFFM0MsMkNBQTJDO0FBQzNDLGlFQUFpRTtBQUNqRSwyQ0FBMkM7QUFDM0MsaURBQWlEO0FBQ2pELDBEQUEwRDtBQVkxRCxNQUFhLGFBQWMsU0FBUSxzQkFBUztJQUMxQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXlCO1FBQ2pFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsZ0JBQWdCO1FBQ2hCLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxlQUFlLENBQUMsdUJBQXVCLENBQzNELElBQUksRUFDSiwwQkFBMEIsQ0FDM0IsQ0FBQztRQUNGLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDN0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDM0QsV0FBVyxFQUFFLDZCQUE2QixFQUFFLGFBQWEsRUFBRSxNQUFNO1lBQ2pFLG9CQUFvQixFQUFFO2dCQUNwQixvQkFBb0IsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDO2dCQUN0RCxpQkFBaUIsRUFBRSxHQUFHO2FBQ3ZCO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsK0JBQStCO1FBQy9CLE1BQU0sd0JBQXdCLEdBQUcsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FDekUsMENBQTBDLENBQzNDLENBQUM7UUFDRixNQUFNLGlDQUFpQyxHQUNyQyxHQUFHLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUN4Qyw4Q0FBOEMsQ0FDL0MsQ0FBQztRQUNKLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUMsb0JBQW9CLENBQ3JELElBQUksRUFBRSxxQkFBcUIsRUFBRSxnQkFBZ0IsS0FBSyxDQUFDLFNBQVMsMkNBQTJDLENBQ3hHLENBQUE7UUFDRCxNQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQy9ELFFBQVEsRUFBRSxzQkFBc0I7WUFDaEMsU0FBUyxFQUFFLElBQUksR0FBRyxDQUFDLGtCQUFrQixDQUNuQyxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQyxDQUNqRDtZQUNELG1CQUFtQixFQUFFLFFBQVE7U0FDOUIsQ0FBQyxDQUFDO1FBQ0gsYUFBYSxDQUFDLGdCQUFnQixDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFDekQsYUFBYSxDQUFDLGdCQUFnQixDQUFDLGlDQUFpQyxDQUFDLENBQUM7UUFDbEUsYUFBYSxDQUFDLG9CQUFvQixDQUNoQyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDdEIsT0FBTyxFQUFFLENBQUMsK0JBQStCLEVBQUUsK0JBQStCLEVBQUUsK0JBQStCLEVBQUUsNkJBQTZCLENBQUM7WUFDM0ksU0FBUyxFQUFFLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQztTQUM5QixDQUFDLENBQ0gsQ0FBQTtRQUNELGFBQWEsQ0FBQyxvQkFBb0IsQ0FDaEMsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO1lBQ3RCLE9BQU8sRUFBRSxDQUFDLCtCQUErQixFQUFFLGNBQWMsRUFBRSxRQUFRLENBQUM7WUFDcEUsU0FBUyxFQUFFLENBQUMsR0FBRyxDQUFDO1NBQ2pCLENBQUMsQ0FDSCxDQUFBO1FBQ0QsYUFBYSxDQUFDLG9CQUFvQixDQUNoQyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDdEIsT0FBTyxFQUFFLENBQUMsYUFBYSxFQUFFLGFBQWEsRUFBRSxxQkFBcUIsQ0FBQztZQUM5RCxTQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUM7U0FDakIsQ0FBQyxDQUNILENBQUE7UUFFRCxNQUFNLGFBQWEsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUMvRCxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQ3pCLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLDhDQUE4QyxDQUFDLENBQ3JFO1lBQ0QsT0FBTyxFQUFFLDhCQUE4QjtZQUN2QyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLElBQUksRUFBRSxhQUFhO1lBQ25CLE9BQU8sRUFBRSxzQkFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7U0FDN0IsQ0FBQyxDQUFDO1FBRUgsOEJBQThCO1FBQzlCOzs7Ozs7Y0FNTTtRQUVOLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDMUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLHNCQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25ELE9BQU8sRUFBRSxDQUFDLElBQUksT0FBTyxDQUFDLGNBQWMsQ0FBQyxhQUFhLEVBQUU7b0JBQ2xELEtBQUssRUFBRSxNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQzt3QkFDdkMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxTQUFTO3dCQUMzQixXQUFXLEVBQUUsVUFBVTt3QkFDdkIsVUFBVSxFQUFFLHVCQUF1QixLQUFLLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxTQUFTLHFCQUFxQixLQUFLLENBQUMsZ0JBQWdCLEVBQUU7cUJBQ2hILENBQUM7aUJBQ0gsQ0FBQyxDQUFDO1NBQ0osQ0FBQyxDQUFDO0lBQ0wsQ0FBQzs7QUF0Rkgsc0NBdUZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRHVyYXRpb24gfSBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgeyBJVHJ1c3RlZExhbmRpbmdab25lIH0gZnJvbSBcIkBnZC1zYWZlZ3VhcmQvZ29kYWRkeS1jb25zdHJ1Y3RzXCI7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSBcImF3cy1jZGstbGliL2F3cy1sYW1iZGFcIjtcbmltcG9ydCAqIGFzIGlhbSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWlhbVwiO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZWMyXCI7XG5pbXBvcnQgKiBhcyBzc20gZnJvbSBcImF3cy1jZGstbGliL2F3cy1zc21cIjtcbmltcG9ydCAqIGFzIHNlY3JldHNtYW5hZ2VyIGZyb20gXCJhd3MtY2RrLWxpYi9hd3Mtc2VjcmV0c21hbmFnZXJcIjtcbmltcG9ydCAqIGFzIGttcyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWttc1wiO1xuaW1wb3J0ICogYXMgZXZlbnRzIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZXZlbnRzXCI7XG5pbXBvcnQgKiBhcyB0YXJnZXRzIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZXZlbnRzLXRhcmdldHNcIjtcblxuXG5leHBvcnQgaW50ZXJmYWNlIExhbWJkYVJvdGF0b3JQcm9wcyB7XG4gIHJlYWRvbmx5IGFjY291bnRJZDogc3RyaW5nO1xuICByZWFkb25seSBwcml2YXRlRHhTdWJuZXRzU1NNUGFyYW06IHN0cmluZztcbiAgcmVhZG9ubHkgdnBjOiBlYzIuSVZwYztcbiAgcmVhZG9ubHkgZ2RUcnVzdGVkTGFuZGluZ1pvbmU6IElUcnVzdGVkTGFuZGluZ1pvbmU7XG4gIHJlYWRvbmx5IHJlZGlzQ2x1c3Rlck5hbWU6IHN0cmluZztcbiAgcmVhZG9ubHkgcmVnaW9uOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBMYW1iZGFSb3RhdG9yIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IExhbWJkYVJvdGF0b3JQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICAvLyBDcmVhdGUgc2VjcmV0XG4gICAgY29uc3Qga21zS2V5QXJuID0gc3NtLlN0cmluZ1BhcmFtZXRlci52YWx1ZUZvclN0cmluZ1BhcmFtZXRlcihcbiAgICAgIHRoaXMsXG4gICAgICBcIi9BZG1pblBhcmFtcy9UZWFtL0tNU0tleVwiXG4gICAgKTtcbiAgICBjb25zdCBrbXNLZXkgPSBrbXMuS2V5LmZyb21LZXlBcm4odGhpcywgJ0ttc0tleScsIGttc0tleUFybik7XG4gICAgY29uc3Qgc2VjcmV0ID0gbmV3IHNlY3JldHNtYW5hZ2VyLlNlY3JldCh0aGlzLCBcIlRlc3RTZWNyZXRcIiwge1xuICAgICAgZGVzY3JpcHRpb246IFwiQSB0ZXN0IHNlY3JldCBmb3IgQ0NBUEkgUE9DXCIsIGVuY3J5cHRpb25LZXk6IGttc0tleSxcbiAgICAgIGdlbmVyYXRlU2VjcmV0U3RyaW5nOiB7XG4gICAgICAgIHNlY3JldFN0cmluZ1RlbXBsYXRlOiBKU09OLnN0cmluZ2lmeSh7IHVzZXJuYW1lOiBcIlwiIH0pLFxuICAgICAgICBnZW5lcmF0ZVN0cmluZ0tleTogXCJfXCIsXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgbGFtYmRhIGV4ZWN1dGlvbiByb2xlXG4gICAgY29uc3QgbGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlID0gaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKFxuICAgICAgXCJzZXJ2aWNlLXJvbGUvQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlXCIsXG4gICAgKTtcbiAgICBjb25zdCBsYW1iZGFWUENBY2Nlc3NFeGVjdXRpb25Sb2xlUGVybXMgPVxuICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKFxuICAgICAgICBcInNlcnZpY2Utcm9sZS9BV1NMYW1iZGFWUENBY2Nlc3NFeGVjdXRpb25Sb2xlXCIsXG4gICAgICApO1xuICAgIGNvbnN0IGN1c3RvbVBCID0gaWFtLk1hbmFnZWRQb2xpY3kuZnJvbU1hbmFnZWRQb2xpY3lBcm4oXG4gICAgICB0aGlzLCAnUGVybWlzc2lvbnNCb3VuZGFyeScsIGBhcm46YXdzOmlhbTo6JHtwcm9wcy5hY2NvdW50SWR9OnBvbGljeS9HRC1BV1MtU1NHLVBCLVRFU1RGT1JDTE9VRENPTlRST0xgXG4gICAgKVxuICAgIGNvbnN0IGV4ZWN1dGlvblJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgXCJSb3RhdG9yRXhlY3V0aW9uUm9sZVwiLCB7XG4gICAgICByb2xlTmFtZTogXCJSb3RhdG9yRXhlY3V0aW9uUm9sZVwiLFxuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLkNvbXBvc2l0ZVByaW5jaXBhbChcbiAgICAgICAgbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKFwibGFtYmRhLmFtYXpvbmF3cy5jb21cIiksXG4gICAgICApLFxuICAgICAgcGVybWlzc2lvbnNCb3VuZGFyeTogY3VzdG9tUEIsXG4gICAgfSk7XG4gICAgZXhlY3V0aW9uUm9sZS5hZGRNYW5hZ2VkUG9saWN5KGxhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZSk7XG4gICAgZXhlY3V0aW9uUm9sZS5hZGRNYW5hZ2VkUG9saWN5KGxhbWJkYVZQQ0FjY2Vzc0V4ZWN1dGlvblJvbGVQZXJtcyk7XG4gICAgZXhlY3V0aW9uUm9sZS5hZGRUb1ByaW5jaXBhbFBvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgYWN0aW9uczogW1wic2VjcmV0c21hbmFnZXI6R2V0U2VjcmV0VmFsdWVcIiwgXCJzZWNyZXRzbWFuYWdlcjpQdXRTZWNyZXRWYWx1ZVwiLCBcInNlY3JldHNtYW5hZ2VyOkRlc2NyaWJlU2VjcmV0XCIsIFwic2VjcmV0c21hbmFnZXI6VXBkYXRlU2VjcmV0XCJdLFxuICAgICAgICByZXNvdXJjZXM6IFtzZWNyZXQuc2VjcmV0QXJuXSxcbiAgICAgIH0pLFxuICAgIClcbiAgICBleGVjdXRpb25Sb2xlLmFkZFRvUHJpbmNpcGFsUG9saWN5KFxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBhY3Rpb25zOiBbXCJjbG91ZGZvcm1hdGlvbjpVcGRhdGVSZXNvdXJjZVwiLCBcImNsb3Vkd2F0Y2g6KlwiLCBcImxvZ3M6KlwiXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdLFxuICAgICAgfSksXG4gICAgKVxuICAgIGV4ZWN1dGlvblJvbGUuYWRkVG9QcmluY2lwYWxQb2xpY3koXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGFjdGlvbnM6IFtcImttczpEZWNyeXB0XCIsIFwia21zOkVuY3J5cHRcIiwgXCJrbXM6R2VuZXJhdGVEYXRhS2V5XCJdLFxuICAgICAgICByZXNvdXJjZXM6IFtcIipcIl0sXG4gICAgICB9KSxcbiAgICApXG5cbiAgICBjb25zdCBsYW1iZGFSb3RhdG9yID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBcIlJvdGF0b3JMYW1iZGFcIiwge1xuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KFxuICAgICAgICBwYXRoLmpvaW4oX19kaXJuYW1lLCBcInJvdGF0b3JfbGFtYmRhL2Rpc3Qvcm90YXRvcl9sYW1iZGEtMS4wLjAuemlwXCIpLFxuICAgICAgKSxcbiAgICAgIGhhbmRsZXI6IFwicm90YXRvcl9sYW1iZGEuaW5kZXguaGFuZGxlclwiLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfMTIsXG4gICAgICByb2xlOiBleGVjdXRpb25Sb2xlLFxuICAgICAgdGltZW91dDogRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICB9KTtcblxuICAgIC8vIEVzdGFibGlzaCByb3RhdGlvbiBzY2hlZHVsZVxuICAgIC8qIG5ldyBzZWNyZXRzbWFuYWdlci5DZm5Sb3RhdGlvblNjaGVkdWxlKCB0aGlzLCBcIlJvdGF0aW9uU2NoZWR1bGVcIiwge1xuICAgICAgc2VjcmV0SWQ6IHNlY3JldC5zZWNyZXRBcm4sXG4gICAgICByb3RhdGlvbkxhbWJkYUFybjogbGFtYmRhUm90YXRvci5mdW5jdGlvbkFybiwgLy8gRml4IGhlcmVcbiAgICAgIHJvdGF0aW9uUnVsZXM6IHtcbiAgICAgICAgc2NoZWR1bGVFeHByZXNzaW9uOiBcImNyb24oMC81ICogKiAqID8gKilcIixcbiAgICAgIH0sXG4gICAgfSk7ICovXG5cbiAgICBuZXcgZXZlbnRzLlJ1bGUodGhpcywgXCJTZWNyZXRSb3RhdGlvblJ1bGVcIiwge1xuICAgICAgc2NoZWR1bGU6IGV2ZW50cy5TY2hlZHVsZS5yYXRlKER1cmF0aW9uLm1pbnV0ZXMoNSkpLFxuICAgICAgdGFyZ2V0czogW25ldyB0YXJnZXRzLkxhbWJkYUZ1bmN0aW9uKGxhbWJkYVJvdGF0b3IsIHtcbiAgICAgICAgZXZlbnQ6IGV2ZW50cy5SdWxlVGFyZ2V0SW5wdXQuZnJvbU9iamVjdCh7XG4gICAgICAgICAgc2VjcmV0QXJuOiBzZWNyZXQuc2VjcmV0QXJuLFxuICAgICAgICAgIGtleVRvVXBkYXRlOiBcInVzZXJuYW1lXCIsXG4gICAgICAgICAgY2x1c3RlckFybjogYGFybjphd3M6ZWxhc3RpY2FjaGU6JHtwcm9wcy5yZWdpb259OiR7cHJvcHMuYWNjb3VudElkfTpyZXBsaWNhdGlvbmdyb3VwOiR7cHJvcHMucmVkaXNDbHVzdGVyTmFtZX1gXG4gICAgICAgIH0pLFxuICAgICAgfSldLFxuICAgIH0pO1xuICB9XG59XG4iXX0=