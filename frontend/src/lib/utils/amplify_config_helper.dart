/// Helper class for generating Amplify configuration dynamically
/// This allows updating configuration without modifying the amplifyconfiguration.dart file
class AmplifyConfigHelper {
  /// Generate Amplify configuration JSON string
  /// 
  /// Parameters:
  /// - [userPoolId]: Cognito User Pool ID
  /// - [appClientId]: Cognito App Client ID
  /// - [identityPoolId]: Cognito Identity Pool ID
  /// - [region]: AWS Region (e.g., 'us-east-1')
  /// - [apiEndpoint]: AppSync GraphQL API endpoint URL
  /// - [apiName]: Name for the API configuration (default: 'trainWithJoeApi')
  static String generateConfig({
    required String userPoolId,
    required String appClientId,
    required String identityPoolId,
    required String region,
    required String apiEndpoint,
    String apiName = 'trainWithJoeApi',
  }) {
    return '''
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
                        "PoolId": "$userPoolId",
                        "AppClientId": "$appClientId",
                        "Region": "$region"
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
                            "PoolId": "$identityPoolId",
                            "Region": "$region"
                        }
                    }
                }
            }
        }
    },
    "api": {
        "plugins": {
            "awsAPIPlugin": {
                "$apiName": {
                    "endpointType": "GraphQL",
                    "endpoint": "$apiEndpoint",
                    "region": "$region",
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
  }
}
