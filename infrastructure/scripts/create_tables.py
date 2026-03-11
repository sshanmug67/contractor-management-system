"""Create CMS DynamoDB table with GSIs for local development."""

import boto3
from botocore.config import Config

ENDPOINT = "http://127.0.0.1:8000"
TABLE_NAME = "CMS_Main_dev"
REGION = "us-east-1"

boto_config = Config(
    connect_timeout=5,
    read_timeout=10,
    retries={"max_attempts": 0},
    proxies={},  # bypass any system proxy
)


def create_table():
    print("Connecting to DynamoDB Local...")
    dynamodb = boto3.client(
        "dynamodb",
        endpoint_url=ENDPOINT,
        region_name=REGION,
        aws_access_key_id="dummy",
        aws_secret_access_key="dummy",
        config=boto_config,
    )

    print("Listing tables...")
    existing = dynamodb.list_tables()["TableNames"]
    print(f"Existing tables: {existing}")
    if TABLE_NAME in existing:
        print(f"Table '{TABLE_NAME}' already exists. Deleting and recreating...")
        dynamodb.delete_table(TableName=TABLE_NAME)
        waiter = dynamodb.get_waiter("table_not_exists")
        waiter.wait(TableName=TABLE_NAME)

    dynamodb.create_table(
        TableName=TABLE_NAME,
        KeySchema=[
            {"AttributeName": "PK", "KeyType": "HASH"},
            {"AttributeName": "SK", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "PK", "AttributeType": "S"},
            {"AttributeName": "SK", "AttributeType": "S"},
            {"AttributeName": "GSI1PK", "AttributeType": "S"},
            {"AttributeName": "GSI1SK", "AttributeType": "S"},
            {"AttributeName": "GSI2PK", "AttributeType": "S"},
            {"AttributeName": "GSI2SK", "AttributeType": "S"},
        ],
        GlobalSecondaryIndexes=[
            {
                "IndexName": "GSI1",
                "KeySchema": [
                    {"AttributeName": "GSI1PK", "KeyType": "HASH"},
                    {"AttributeName": "GSI1SK", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
            {
                "IndexName": "GSI2",
                "KeySchema": [
                    {"AttributeName": "GSI2PK", "KeyType": "HASH"},
                    {"AttributeName": "GSI2SK", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
        ],
        BillingMode="PAY_PER_REQUEST",
    )

    waiter = dynamodb.get_waiter("table_exists")
    waiter.wait(TableName=TABLE_NAME)
    print(f"✅ Table '{TABLE_NAME}' created successfully.")


if __name__ == "__main__":
    create_table()