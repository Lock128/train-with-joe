// Amplify configuration for minimal SaaS template
// This file should be generated or updated with actual AWS resource IDs after deployment

const String amplifyconfig = '''
{
    "UserAgent": "aws-amplify-cli/2.0",
    "Version": "1.0",
    "auth": {
        "plugins": {
            "awsCognitoAuthPlugin": {
                "UserAgent": "aws-amplify-cli/0.1.0",
                "Version": "0.1.0",
                "IdentityManager": {
                    "Default": {}
                },
                "CognitoUserPool": {
                    "Default": {
                        "PoolId": "REPLACE_WITH_USER_POOL_ID",
                        "AppClientId": "REPLACE_WITH_APP_CLIENT_ID",
                        "Region": "REPLACE_WITH_REGION"
                    }
                },
                "Auth": {
                    "Default": {
                        "authenticationFlowType": "USER_SRP_AUTH",
                        "socialProviders": [],
                        "usernameAttributes": ["EMAIL"],
                        "signupAttributes": ["EMAIL"],
                        "passwordProtectionSettings": {
                            "passwordPolicyMinLength": 8,
                            "passwordPolicyCharacters": []
                        },
                        "mfaConfiguration": "OFF",
                        "mfaTypes": ["SMS"],
                        "verificationMechanisms": ["EMAIL"]
                    }
                },
                "CredentialsProvider": {
                    "CognitoIdentity": {
                        "Default": {
                            "PoolId": "REPLACE_WITH_IDENTITY_POOL_ID",
                            "Region": "REPLACE_WITH_REGION"
                        }
                    }
                }
            }
        }
    },
    "api": {
        "plugins": {
            "awsAPIPlugin": {
                "minimalSaasApi": {
                    "endpointType": "GraphQL",
                    "endpoint": "https://localhost:3000/graphql",
                    "region": "REPLACE_WITH_REGION",
                    "authorizationType": "AMAZON_COGNITO_USER_POOLS",
                    "additionalAuthorizationModes": [
                        {
                            "authorizationType": "AWS_IAM"
                        }
                    ]
                }
            }
        }
    }
}
''';
