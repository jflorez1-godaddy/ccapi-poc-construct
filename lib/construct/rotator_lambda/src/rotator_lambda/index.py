import json
import boto3
import random
import string
from botocore.exceptions import ClientError
from rotator_lambda import logger
from crhelper import CfnResource


helper = CfnResource(json_logging=True)
cloud_control_client = boto3.client('cloudcontrol')


@helper.create
@helper.update
def handler(event, context):
    logger.info("Rotator Lambda started")

    # Get the secret id from the event
    secret_arn = event['secretArn']
    key_to_update = event['keyToUpdate']
    cluster_arn = event['clusterArn']
    secret_dict = {}
    try:
        # Update the secret
        secret_dict = rotate_secret(secret_arn, key_to_update, "replace")
    except ClientError as client_error:
        logger.info(f"Error updating secret: {client_error}: Trying with add operation")
        secret_dict = rotate_secret(secret_arn, key_to_update, "add")
    except Exception as exc:
        logger.error(f"Secret was not properly created by construct code: {exc}")
        return

    set_secret_in_cluster(cluster_arn, secret_dict, key_to_update)


def set_secret_in_cluster(cluster_arn, secret_dict, key_to_update):
    logger.info("Setting secret in cluster")
    # Get the secret value
    token_value = secret_dict[key_to_update]

    update_resource_input = json.dumps([
        {"op": "replace", "path": "/AuthToken", "value": json.dumps(
                token_value
            )},
        {"op": "replace", "path": "/AuthTokenUpdateStrategy", "value": "ROTATE"}
        ])
    logger.info("Running CCAPI on redis cluster")
    cloud_control_client.update_resource(
        TypeName="AWS::ElastiCache::ReplicationGroup",
        Identifier=cluster_arn,
        PatchDocument=update_resource_input
    )


def rotate_secret(secret_arn, key_to_update, operation):
    logger.info(f"Updating secret: {secret_arn} with key: {key_to_update}")
    logger.info(f"Using operation: {operation}")

    # Get the random password
    new_password = get_random_password()
    secret_dict = {key_to_update: new_password}

    update_resource_input = json.dumps([
        {"op": f"{operation}", "path": "/SecretString", "value": json.dumps(
                secret_dict
            )}
        ])

    response = cloud_control_client.update_resource(
        TypeName="AWS::SecretsManager::Secret",
        Identifier=secret_arn,
        PatchDocument=update_resource_input
    )
    logger.info(f"Secret updated: {response}")
    return secret_dict


def get_random_password():
    length = random.randint(8, 32)
    characters = string.ascii_letters + string.digits + string.punctuation
    return ''.join(random.choice(characters) for i in range(length))
