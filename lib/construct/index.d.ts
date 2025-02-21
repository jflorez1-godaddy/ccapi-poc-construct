import { Construct } from "constructs";
import { ITrustedLandingZone } from "@gd-safeguard/godaddy-constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
export interface LambdaRotatorProps {
    readonly accountId: string;
    readonly privateDxSubnetsSSMParam: string;
    readonly vpc: ec2.IVpc;
    readonly gdTrustedLandingZone: ITrustedLandingZone;
    readonly redisClusterName: string;
    readonly region: string;
}
export declare class LambdaRotator extends Construct {
    constructor(scope: Construct, id: string, props: LambdaRotatorProps);
}
